import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function currentOneUser(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data } = await supabaseAdmin
    .from("one_users")
    .select("id,name,email,role,active")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  return data;
}

async function canAccessClient(user: any, clientId: string) {
  let q = supabaseAdmin.from("one_clients").select("id,commercial_user_id").eq("id", clientId);
  if (user.role === "Comercial") q = q.eq("commercial_user_id", user.id);
  const { data } = await q.maybeSingle();
  return Boolean(data);
}

export async function GET(request: NextRequest) {
  const user = await currentOneUser(request);
  if (!user) return NextResponse.json({ ok: false, error: "Sesión no válida" }, { status: 401 });
  const clientId = String(request.nextUrl.searchParams.get("clientId") || "").trim();
  if (!clientId) return NextResponse.json({ ok: false, error: "Falta clientId" }, { status: 400 });
  if (!(await canAccessClient(user, clientId))) return NextResponse.json({ ok: false, error: "Cliente no encontrado o sin permiso" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("one_client_timeline")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, events: data || [] });
}

export async function POST(request: NextRequest) {
  const user = await currentOneUser(request);
  if (!user) return NextResponse.json({ ok: false, error: "Sesión no válida" }, { status: 401 });
  const body = await request.json();
  const clientId = String(body?.clientId || "").trim();
  const eventType = String(body?.eventType || "").trim();
  const title = String(body?.title || "").trim();
  if (!clientId || !eventType || !title) return NextResponse.json({ ok: false, error: "Faltan datos de la actividad" }, { status: 400 });
  if (!(await canAccessClient(user, clientId))) return NextResponse.json({ ok: false, error: "Cliente no encontrado o sin permiso" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("one_client_timeline")
    .insert({
      client_id: clientId,
      event_type: eventType,
      channel: body?.channel || null,
      title,
      detail: String(body?.detail || "").trim() || null,
      actor_user_id: user.id,
      actor_name: user.name,
      metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, event: data });
}
