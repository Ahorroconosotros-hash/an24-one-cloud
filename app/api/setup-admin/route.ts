import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isLocal(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase();
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

export async function POST(request: NextRequest) {
  try {
    if (!isLocal(request)) {
      return NextResponse.json(
        { ok: false, error: "Solo disponible en localhost." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Indica el correo." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          ok: false,
          error: "La contraseña debe tener al menos 8 caracteres.",
        },
        { status: 400 }
      );
    }

    // 1. Localizamos el usuario real en Supabase Auth.
    let authUser: any = null;

    for (let page = 1; page <= 20 && !authUser; page++) {
      const { data, error } =
        await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 100,
        });

      if (error) throw error;

      authUser = (data.users || []).find(
        (u) => String(u.email || "").toLowerCase() === email
      );

      if ((data.users || []).length < 100) break;
    }

    if (!authUser) {
      return NextResponse.json(
        {
          ok: false,
          error: "Ese correo no existe en Supabase Authentication.",
        },
        { status: 404 }
      );
    }

    // 2. Actualizamos contraseña y confirmación.
    const { error: updateAuthError } =
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
      });

    if (updateAuthError) throw updateAuthError;

    // 3. IMPORTANTE:
    // Primero buscamos por auth_user_id porque es el vínculo único real.
    const { data: byAuth, error: byAuthError } =
      await supabaseAdmin
        .from("one_users")
        .select("*")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

    if (byAuthError) throw byAuthError;

    if (byAuth) {
      const { data, error } =
        await supabaseAdmin
          .from("one_users")
          .update({
            email,
            role: "Administrador",
            active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", byAuth.id)
          .select("*")
          .single();

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        message: "Administrador actualizado correctamente.",
        user: data,
      });
    }

    // 4. Si no estaba vinculado por auth_user_id, buscamos una ficha ONE por correo.
    const { data: byEmail, error: byEmailError } =
      await supabaseAdmin
        .from("one_users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

    if (byEmailError) throw byEmailError;

    if (byEmail) {
      const { data, error } =
        await supabaseAdmin
          .from("one_users")
          .update({
            auth_user_id: authUser.id,
            role: "Administrador",
            active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", byEmail.id)
          .select("*")
          .single();

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        message: "Administrador vinculado correctamente.",
        user: data,
      });
    }

    // 5. Solo si no existe de ninguna de las dos formas, creamos uno.
    const displayName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      "Administrador ONE";

    const { data: created, error: createError } =
      await supabaseAdmin
        .from("one_users")
        .insert({
          auth_user_id: authUser.id,
          name: displayName,
          email,
          role: "Administrador",
          active: true,
        })
        .select("*")
        .single();

    if (createError) throw createError;

    return NextResponse.json({
      ok: true,
      message: "Administrador creado correctamente.",
      user: created,
    });
  } catch (e: any) {
    console.error("ONE · setup-admin", e);

    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "No se pudo activar el administrador.",
      },
      { status: 500 }
    );
  }
}
