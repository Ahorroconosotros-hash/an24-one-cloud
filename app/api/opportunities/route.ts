import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      id,
      clientId,
      commercialUserId,
      productId,
      providerId,

      title,
      service = "Telefonía",

      stage = "draft",
      reviewStatus = "pending",
      commercialEditable = true,

      estimatedValue,
      notes,
      payload = {},

      submittedAt,
    } = body;

    if (!clientId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta el cliente de la oportunidad.",
        },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta el título de la oportunidad.",
        },
        { status: 400 }
      );
    }

    /*
      La tabla antigua obliga a tener owner_id.
      Temporalmente recuperamos el profile asociado al usuario ONE
      cuando exista auth_user_id.

      Más adelante eliminaremos esta dependencia antigua
      cuando migremos completamente ONE.
    */

    let ownerId: string | null = null;

    if (commercialUserId) {
      const { data: oneUser } = await supabaseAdmin
        .from("one_users")
        .select("auth_user_id")
        .eq("id", commercialUserId)
        .maybeSingle();

      if (oneUser?.auth_user_id) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("id", oneUser.auth_user_id)
          .maybeSingle();

        ownerId = profile?.id || null;
      }
    }

    /*
      Como owner_id pertenece al modelo antiguo y es obligatorio,
      si todavía no existe relación ONE ↔ profiles devolvemos
      un error claro en vez de inventar un usuario.
    */

    if (!ownerId) {
      return NextResponse.json(
        {
          ok: false,
          code: "OWNER_NOT_LINKED",
          error:
            "El comercial de ONE todavía no está vinculado a un perfil antiguo.",
        },
        { status: 409 }
      );
    }

    const opportunity = {
      client_id: clientId,
      owner_id: ownerId,

      product_id: productId || null,
      provider_id: providerId || null,
      commercial_user_id: commercialUserId || null,

      title,
      service,

      stage,
      review_status: reviewStatus,
      commercial_editable: commercialEditable,

      estimated_value:
        estimatedValue === "" ||
        estimatedValue === undefined ||
        estimatedValue === null
          ? null
          : Number(estimatedValue),

      notes: notes || null,

      payload,

      source: "ONE",

      submitted_at: submittedAt || null,

      updated_at: new Date().toISOString(),
    };

    let result;

    if (id) {
      result = await supabaseAdmin
        .from("opportunities")
        .update(opportunity)
        .eq("id", id)
        .select("*")
        .single();
    } else {
      result = await supabaseAdmin
        .from("opportunities")
        .insert(opportunity)
        .select("*")
        .single();
    }

    if (result.error) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      opportunity: result.data,
    });
  } catch (error: any) {
    console.error("ONE · opportunities POST:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "No se pudo guardar la oportunidad.",
      },
      { status: 500 }
    );
  }
}