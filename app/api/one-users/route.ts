import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const permissionKeys = [
  "can_create_clients",
  "can_edit_clients",
  "can_assign_clients",
  "can_create_opportunities",
  "can_assign_opportunities",
  "can_validate_opportunities",
  "can_return_to_draft",
  "can_process",
  "can_activate",
  "can_manage_catalog",
  "can_view_commissions",
  "can_print",
  "can_view_reports",
  "can_create_reports",
  "can_generate_commission_annex",
] as const;

const rolePermissions = {
  Administrador: Object.fromEntries(permissionKeys.map((k) => [k, true])),
  BackOffice: {
    can_create_clients: true, can_edit_clients: true, can_assign_clients: true,
    can_create_opportunities: true, can_assign_opportunities: true,
    can_validate_opportunities: true, can_return_to_draft: true,
    can_process: true, can_activate: true, can_manage_catalog: false,
    can_view_commissions: false, can_print: true, can_view_reports: true,
    can_create_reports: true, can_generate_commission_annex: false,
  },
  Comercial: {
    can_create_clients: false, can_edit_clients: false, can_assign_clients: false,
    can_create_opportunities: true, can_assign_opportunities: false,
    can_validate_opportunities: false, can_return_to_draft: false,
    can_process: false, can_activate: false, can_manage_catalog: false,
    can_view_commissions: true, can_print: true, can_view_reports: true,
    can_create_reports: false, can_generate_commission_annex: false,
  },
} as const;

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("one_users")
    .select("*")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, users: data || [] });
}

export async function POST(request: NextRequest) {
  let createdAuthUserId: string | null = null;

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || "Comercial");

    if (!name || !email || !password) {
      return NextResponse.json({ ok: false, error: "Nombre, email y contraseña inicial son obligatorios." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError || !authData.user) {
      return NextResponse.json({ ok: false, error: authError?.message || "No se pudo crear el acceso." }, { status: 500 });
    }

    createdAuthUserId = authData.user.id;

    const { data, error } = await supabaseAdmin
      .from("one_users")
      .insert({
        auth_user_id: createdAuthUserId,
        name,
        email,
        role,
        profile_type: role === "Comercial" ? body.profile_type || "Estándar" : null,
        department: body.department || "General",
        active: true,
        ...rolePermissions[role as keyof typeof rolePermissions],
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, user: data });
  } catch (error: any) {
    if (createdAuthUserId) {
      try { await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId); } catch {}
    }
    return NextResponse.json({ ok: false, error: error?.message || "No se pudo crear el usuario." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = String(body.id || "").trim();

    const { data: current, error: currentError } = await supabaseAdmin
      .from("one_users")
      .select("*")
      .eq("id", id)
      .single();

    if (currentError || !current) {
      return NextResponse.json({ ok: false, error: currentError?.message || "Usuario no encontrado." }, { status: 404 });
    }

    const newName = typeof body.name === "string" ? body.name.trim() : current.name;
    const newEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : current.email;
    const newPassword = typeof body.password === "string" && body.password.length ? body.password : null;

    if (newPassword && newPassword.length < 8) {
      return NextResponse.json({ ok: false, error: "La nueva contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }

    if (current.auth_user_id) {
      const authPatch: Record<string, any> = {
        email: newEmail,
        user_metadata: { name: newName },
      };
      if (newPassword) authPatch.password = newPassword;

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(current.auth_user_id, authPatch);
      if (authError) {
        return NextResponse.json({ ok: false, error: `Acceso: ${authError.message}` }, { status: 500 });
      }
    }

    const payload: Record<string, any> = {
      name: newName,
      email: newEmail,
      updated_at: new Date().toISOString(),
    };

    if (typeof body.role === "string") payload.role = body.role;
    if (body.profile_type === null || typeof body.profile_type === "string") payload.profile_type = body.profile_type || null;
    if (typeof body.department === "string") payload.department = body.department;
    if (typeof body.active === "boolean") payload.active = body.active;

    for (const key of permissionKeys) {
      if (typeof body[key] === "boolean") payload[key] = body[key];
    }

    const { data, error } = await supabaseAdmin
      .from("one_users")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, user: data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "No se pudo actualizar el usuario." }, { status: 500 });
  }
}
