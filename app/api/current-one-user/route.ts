import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Sesión no encontrada." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Sesión no válida." },
        { status: 401 }
      );
    }

    const { data: oneUser, error } = await supabaseAdmin
      .from("one_users")
      .select("*")
      .eq("auth_user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (!oneUser) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Tu usuario de acceso existe, pero no está vinculado a un usuario activo de ONE.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      user: oneUser,
      auth: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "No se pudo leer el usuario actual." },
      { status: 500 }
    );
  }
}
