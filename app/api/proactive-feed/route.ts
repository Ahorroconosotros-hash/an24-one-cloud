import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type OneRole = "Administrador" | "BackOffice" | "Comercial";
type OneUser = { id: string; name: string; email: string; role: OneRole; active: boolean };

type FeedItem = {
  id: string;
  type: "correction" | "processing" | "renewal" | "agenda";
  priority: "urgent" | "high" | "normal";
  title: string;
  detail: string;
  eyebrow: string;
  href: string;
  dueAt?: string | null;
};

async function currentOneUser(request: NextRequest): Promise<OneUser | null> {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data } = await supabaseAdmin
    .from("one_users")
    .select("id,name,email,role,active")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  return (data as OneUser | null) || null;
}

function isoDate(value: unknown) {
  const match = String(value || "").match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] || "";
}

function dateFrom(value: unknown) {
  const day = isoDate(value);
  if (!day) return null;
  const date = new Date(`${day}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(from: Date, to: Date) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12).getTime();
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 12).getTime();
  return Math.ceil((end - start) / 86400000);
}

function ageHours(value: unknown, now: Date) {
  const stamp = new Date(String(value || "")).getTime();
  if (!Number.isFinite(stamp)) return 0;
  return Math.max(0, (now.getTime() - stamp) / 3600000);
}

function priorityWeight(priority: FeedItem["priority"]) {
  return priority === "urgent" ? 0 : priority === "high" ? 1 : 2;
}

export async function GET(request: NextRequest) {
  const me = await currentOneUser(request);
  if (!me) return NextResponse.json({ ok: false, error: "Sesión no válida." }, { status: 401 });

  const now = new Date();
  const items: FeedItem[] = [];

  // Contratos: fuente viva para BackOffice, renovaciones y correcciones.
  try {
    let contractsQuery = supabaseAdmin
      .from("one_contracts")
      .select(
        "id,client_id,reference,external_reference,service_name,provider,status,start_date,end_date,commercial_user_id,commercial_name,data,created_at,updated_at"
      )
      .order("updated_at", { ascending: true });

    if (me.role === "Comercial") contractsQuery = contractsQuery.eq("commercial_user_id", me.id);

    const { data: contracts, error } = await contractsQuery;
    if (!error) {
      const rows = contracts || [];
      const clientIds = Array.from(new Set(rows.map((row: any) => row.client_id).filter(Boolean)));
      const clientById = new Map<string, string>();
      if (clientIds.length) {
        const clients = await supabaseAdmin.from("one_clients").select("id,name").in("id", clientIds);
        for (const client of clients.data || []) clientById.set(String(client.id), client.name || "Cliente");
      }

      for (const contract of rows) {
        const d = contract.data || {};
        const clientName = clientById.get(String(contract.client_id)) || "Cliente";
        const service = contract.service_name || "Contrato";
        const reference = contract.external_reference || contract.reference || "";
        const status = String(contract.status || "");

        // Una corrección es trabajo del comercial responsable. Administración la ve para supervisar.
        if ((me.role === "Comercial" || me.role === "Administrador") && Boolean(d.correction_requested)) {
          const reason = String(
            d.correction_reason || d.correction_requested_reason || d.last_correction_reason || "Revisa la corrección solicitada por BackOffice."
          );
          items.push({
            id: `correction:${contract.id}`,
            type: "correction",
            priority: "urgent",
            eyebrow: "CORRECCIÓN",
            title: `${clientName} · ${service}`,
            detail: reason,
            href: `/contratos/${contract.id}`,
            dueAt: contract.updated_at || null,
          });
        }

        // La cola operativa pertenece a BackOffice; Administración conserva supervisión global.
        if ((me.role === "BackOffice" || me.role === "Administrador") && status === "Pendiente de tramitación") {
          const hours = ageHours(d.submitted_for_processing_at || contract.updated_at || contract.created_at, now);
          const blocked = hours >= 48;
          items.push({
            id: `processing:${contract.id}`,
            type: "processing",
            priority: blocked ? "urgent" : "high",
            eyebrow: blocked ? "TRAMITACIÓN +48 H" : "TRAMITACIÓN",
            title: `${clientName} · ${service}`,
            detail: [reference, blocked ? `${Math.floor(hours)} h pendiente` : "Pendiente de revisar"].filter(Boolean).join(" · "),
            href: `/contratos/${contract.id}`,
            dueAt: d.submitted_for_processing_at || contract.updated_at || null,
          });
        }

        // ONE vigila la cartera: ningún activo con vencimiento cercano debe quedar olvidado.
        if ((me.role === "Comercial" || me.role === "Administrador") && status === "Activo") {
          const renewalDate = dateFrom(
            contract.end_date || d.renewal_date || d.expiry_date || d.contract_end_date || d.renewalDate
          );
          if (renewalDate) {
            const days = daysBetween(now, renewalDate);
            if (days >= 0 && days <= 90) {
              items.push({
                id: `renewal:${contract.id}`,
                type: "renewal",
                priority: days <= 30 ? "urgent" : days <= 60 ? "high" : "normal",
                eyebrow: "RENOVACIÓN",
                title: `${clientName} · ${service}`,
                detail: `Vence en ${days} día${days === 1 ? "" : "s"}${contract.provider ? ` · ${contract.provider}` : ""}`,
                href: `/contratos/${contract.id}`,
                dueAt: renewalDate.toISOString(),
              });
            }
          }
        }
      }
    }
  } catch {}

  // Agenda: hoy y vencidas. Se muestran a quien realmente tiene que actuar.
  try {
    let agendaQuery = supabaseAdmin
      .from("agenda_events")
      .select("id,title,event_type,description,starts_at,status,priority,assigned_user_id,created_by_user_id,client_id,opportunity_id")
      .neq("status", "Completada")
      .order("starts_at", { ascending: true })
      .limit(80);

    if (me.role === "Comercial") {
      agendaQuery = agendaQuery.eq("assigned_user_id", me.id);
    } else if (me.role === "BackOffice") {
      agendaQuery = agendaQuery.or(`assigned_user_id.eq.${me.id},created_by_user_id.eq.${me.id}`);
    } else {
      // El centro superior del Administrador muestra su trabajo personal. La supervisión global
      // ya entra por contratos para evitar convertir la campana en una agenda de todo el equipo.
      agendaQuery = agendaQuery.eq("assigned_user_id", me.id);
    }

    const { data: events, error } = await agendaQuery;
    if (!error) {
      for (const event of events || []) {
        const starts = new Date(event.starts_at);
        if (Number.isNaN(starts.getTime())) continue;
        const days = daysBetween(now, starts);
        if (days > 0) continue;
        const overdue = days < 0 || starts.getTime() < now.getTime();
        items.push({
          id: `agenda:${event.id}`,
          type: "agenda",
          priority: overdue ? "urgent" : String(event.priority || "").toLowerCase() === "alta" ? "high" : "normal",
          eyebrow: overdue ? "AGENDA VENCIDA" : "AGENDA · HOY",
          title: event.title || "Tarea pendiente",
          detail: event.description || event.event_type || "Tarea de agenda",
          href: "/agenda",
          dueAt: event.starts_at,
        });
      }
    }
  } catch {}

  items.sort((a, b) => {
    const p = priorityWeight(a.priority) - priorityWeight(b.priority);
    if (p !== 0) return p;
    const ad = new Date(a.dueAt || 0).getTime();
    const bd = new Date(b.dueAt || 0).getTime();
    return ad - bd;
  });

  const unique = Array.from(new Map(items.map((item) => [item.id, item])).values()).slice(0, 30);

  return NextResponse.json({
    ok: true,
    role: me.role,
    count: unique.length,
    items: unique,
    generatedAt: new Date().toISOString(),
  });
}
