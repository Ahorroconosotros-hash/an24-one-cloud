import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type OneRole = "Administrador" | "BackOffice" | "Comercial";
type OneUser = { id: string; name: string; email: string; role: OneRole; active: boolean };

type SearchResult = {
  id: string;
  kind: "client" | "contract" | "offer" | "user";
  title: string;
  subtitle: string;
  meta?: string;
  href: string;
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

function safeTerm(value: string) {
  // Evita romper la sintaxis de .or() de PostgREST con separadores reservados.
  return value.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function text(value: unknown) {
  return String(value || "").trim();
}

export async function GET(request: NextRequest) {
  const me = await currentOneUser(request);
  if (!me) {
    return NextResponse.json({ ok: false, error: "Sesión no válida." }, { status: 401 });
  }

  const q = safeTerm(request.nextUrl.searchParams.get("q") || "");
  if (q.length < 2) {
    return NextResponse.json({ ok: true, query: q, results: [] as SearchResult[] });
  }

  const like = `%${q}%`;
  const results: SearchResult[] = [];

  // CLIENTES · el comercial solo busca dentro de su propia cartera.
  try {
    let clientsQuery = supabaseAdmin
      .from("one_clients")
      .select("id,reference,name,tax_id,commercial_user_id,commercial_name,data,status")
      .or(
        [
          `name.ilike.${like}`,
          `reference.ilike.${like}`,
          `tax_id.ilike.${like}`,
          `data->>phone.ilike.${like}`,
          `data->>mobile.ilike.${like}`,
          `data->>email.ilike.${like}`,
          `data->>taxId.ilike.${like}`,
        ].join(",")
      )
      .limit(8);

    if (me.role === "Comercial") clientsQuery = clientsQuery.eq("commercial_user_id", me.id);

    const { data, error } = await clientsQuery;
    if (!error) {
      for (const row of data || []) {
        const d = row.data || {};
        const contact = text(d.mobile || d.phone || d.email || row.tax_id || d.taxId);
        results.push({
          id: `client:${row.id}`,
          kind: "client",
          title: row.name || "Cliente sin nombre",
          subtitle: [row.reference, contact].filter(Boolean).join(" · ") || "Cliente",
          meta: row.commercial_name || text(d.commercial),
          href: `/clientes/${row.id}`,
        });
      }
    }
  } catch {
    // La búsqueda global no debe bloquear el resto de ONE si una fuente todavía es heredada.
  }

  // CONTRATOS · incluye CUPS y referencias guardadas dentro del JSON operativo.
  try {
    let contractsQuery = supabaseAdmin
      .from("one_contracts")
      .select(
        "id,reference,external_reference,client_id,service_name,provider,status,commercial_user_id,commercial_name,data"
      )
      .or(
        [
          `reference.ilike.${like}`,
          `external_reference.ilike.${like}`,
          `service_name.ilike.${like}`,
          `provider.ilike.${like}`,
          `status.ilike.${like}`,
          `data->>cups.ilike.${like}`,
        ].join(",")
      )
      .limit(8);

    if (me.role === "Comercial") contractsQuery = contractsQuery.eq("commercial_user_id", me.id);

    const { data, error } = await contractsQuery;
    if (!error) {
      const rows = data || [];
      const clientIds = Array.from(new Set(rows.map((row: any) => row.client_id).filter(Boolean)));
      const clientById = new Map<string, string>();

      if (clientIds.length) {
        const clients = await supabaseAdmin.from("one_clients").select("id,name").in("id", clientIds);
        for (const client of clients.data || []) clientById.set(String(client.id), client.name || "");
      }

      for (const row of rows) {
        const d = row.data || {};
        const clientName = clientById.get(String(row.client_id)) || "Cliente";
        const reference = row.external_reference || row.reference || text(d.reference);
        const cups = text(d.cups || d.CUPS);
        results.push({
          id: `contract:${row.id}`,
          kind: "contract",
          title: `${clientName} · ${row.service_name || "Contrato"}`,
          subtitle: [reference, row.provider, cups].filter(Boolean).join(" · "),
          meta: row.status || "Contrato",
          href: `/contratos/${row.id}`,
        });
      }
    }
  } catch {}

  // OFERTAS · centralizadas en opportunities. Si el módulo heredado no está disponible,
  // clientes y contratos siguen funcionando sin degradar el buscador.
  try {
    let offersQuery = supabaseAdmin
      .from("opportunities")
      .select("id,client_id,title,service,stage,commercial_user_id,updated_at")
      .or(`title.ilike.${like},service.ilike.${like},stage.ilike.${like}`)
      .limit(6);

    if (me.role === "Comercial") offersQuery = offersQuery.eq("commercial_user_id", me.id);

    const { data, error } = await offersQuery;
    if (!error) {
      const rows = data || [];
      const clientIds = Array.from(new Set(rows.map((row: any) => row.client_id).filter(Boolean)));
      const clientById = new Map<string, string>();
      if (clientIds.length) {
        const clients = await supabaseAdmin.from("one_clients").select("id,name").in("id", clientIds);
        for (const client of clients.data || []) clientById.set(String(client.id), client.name || "");
      }

      for (const row of rows) {
        results.push({
          id: `offer:${row.id}`,
          kind: "offer",
          title: row.title || `${row.service || "Oferta"}`,
          subtitle: [clientById.get(String(row.client_id)), row.service].filter(Boolean).join(" · "),
          meta: row.stage || "Oferta",
          href: `/oportunidades/${row.id}`,
        });
      }
    }
  } catch {}

  // USUARIOS · solo Administración puede localizar personas desde la lupa global.
  if (me.role === "Administrador") {
    try {
      const { data, error } = await supabaseAdmin
        .from("one_users")
        .select("id,name,email,role,active")
        .eq("active", true)
        .or(`name.ilike.${like},email.ilike.${like},role.ilike.${like}`)
        .limit(5);

      if (!error) {
        for (const row of data || []) {
          results.push({
            id: `user:${row.id}`,
            kind: "user",
            title: row.name || row.email || "Usuario",
            subtitle: row.email || "Usuario ONE",
            meta: row.role || "Usuario",
            href: "/usuarios",
          });
        }
      }
    } catch {}
  }

  return NextResponse.json({
    ok: true,
    query: q,
    results: results.slice(0, 24),
  });
}
