import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function currentOneUser(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;

  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data } = await supabaseAdmin
    .from("one_users")
    .select("id,name,role,active")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  return data;
}

export async function GET(request: NextRequest) {
  const user = await currentOneUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sesión no válida" }, { status: 401 });
  }

  if (user.role !== "Administrador" && user.role !== "BackOffice") {
    return NextResponse.json({ ok: false, error: "Sin permiso para consultar comerciales" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("one_users")
    .select("id,name")
    .eq("role", "Comercial")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, commercials: data || [] });
}
