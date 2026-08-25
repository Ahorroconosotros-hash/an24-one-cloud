import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type OneUser = { id: string; name: string; role: "Administrador" | "BackOffice" | "Comercial"; active: boolean };

async function currentUser(request: NextRequest): Promise<OneUser | null> {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data } = await supabaseAdmin.from("one_users").select("id,name,role,active").eq("auth_user_id", user.id).eq("active", true).maybeSingle();
  return (data as OneUser | null) || null;
}

export async function GET(request: NextRequest) {
  const me = await currentUser(request);
  if (!me) return NextResponse.json({ ok: false, error: "Sesión no válida." }, { status: 401 });

  let query = supabaseAdmin.from("agenda_events").select("*").order("starts_at", { ascending: true });
  if (me.role === "Comercial") {
    query = query.eq("assigned_user_id", me.id);
  } else if (me.role === "BackOffice") {
    // BackOffice no navega por la agenda privada de los comerciales.
    // Ve su propia agenda y las tareas que él mismo ha creado/asignado para poder seguirlas.
    query = query.or(`assigned_user_id.eq.${me.id},created_by_user_id.eq.${me.id}`);
  }
  // Administrador conserva la visión global de agenda.

  const { data: events, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const userIds = Array.from(new Set((events || []).flatMap((e: any) => [e.assigned_user_id, e.created_by_user_id]).filter(Boolean)));
  let users: any[] = [];
  if (userIds.length) {
    const result = await supabaseAdmin.from("one_users").select("id,name,role").in("id", userIds);
    users = result.data || [];
  }
  const byId = new Map(users.map((u: any) => [u.id, u]));
  const enriched = (events || []).map((e: any) => ({ ...e, assigned_user: byId.get(e.assigned_user_id) || null, created_by_user: byId.get(e.created_by_user_id) || null }));
  return NextResponse.json({ ok: true, events: enriched, currentUser: me });
}

export async function POST(request: NextRequest) {
  const me = await currentUser(request);
  if (!me) return NextResponse.json({ ok: false, error: "Sesión no válida." }, { status: 401 });
  const body = await request.json();
  const title = String(body.title || "").trim();
  const startsAt = String(body.starts_at || "").trim();
  if (!title || !startsAt) return NextResponse.json({ ok: false, error: "Título y fecha son obligatorios." }, { status: 400 });

  const assignedUserId = me.role === "Comercial" ? me.id : String(body.assigned_user_id || me.id);
  const { data: assigned } = await supabaseAdmin.from("one_users").select("id,active").eq("id", assignedUserId).eq("active", true).maybeSingle();
  if (!assigned) return NextResponse.json({ ok: false, error: "Usuario asignado no válido." }, { status: 400 });

  const payload = {
    title,
    event_type: String(body.event_type || "Tarea"),
    description: String(body.description || "").trim() || null,
    starts_at: startsAt,
    ends_at: body.ends_at || null,
    status: "Pendiente",
    priority: String(body.priority || "Normal"),
    assigned_user_id: assignedUserId,
    created_by_user_id: me.id,
    client_id: body.client_id || null,
    opportunity_id: body.opportunity_id || null,
    ticket_id: body.ticket_id || null,
  };
  const { data, error } = await supabaseAdmin.from("agenda_events").insert(payload).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, event: data });
}

export async function PATCH(request: NextRequest) {
  const me = await currentUser(request);
  if (!me) return NextResponse.json({ ok: false, error: "Sesión no válida." }, { status: 401 });
  const body = await request.json();
  const id = String(body.id || "");
  const { data: event } = await supabaseAdmin.from("agenda_events").select("*").eq("id", id).maybeSingle();
  if (!event) return NextResponse.json({ ok: false, error: "Evento no encontrado." }, { status: 404 });
  if (me.role === "Comercial" && event.assigned_user_id !== me.id) return NextResponse.json({ ok: false, error: "No tienes acceso a esta tarea." }, { status: 403 });

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const key of ["title", "event_type", "description", "starts_at", "ends_at", "priority", "client_id", "opportunity_id", "ticket_id"]) {
    if (body[key] !== undefined) patch[key] = body[key] || null;
  }
  if (body.status !== undefined) {
    patch.status = body.status;
    patch.completed_at = body.status === "Completada" ? new Date().toISOString() : null;
  }
  if (me.role !== "Comercial" && body.assigned_user_id) patch.assigned_user_id = body.assigned_user_id;

  const { data, error } = await supabaseAdmin.from("agenda_events").update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, event: data });
}
