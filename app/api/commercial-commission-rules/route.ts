import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function cleanNumber(v: any) {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const productId = String(body.productId || "");
    const providerId = body.providerId ? String(body.providerId) : null;
    const operationType = body.operationType ? String(body.operationType) : null;
    const profiles = Array.isArray(body.profiles) ? body.profiles : [];

    if (!productId) {
      return NextResponse.json(
        { ok: false, error: "Falta productId." },
        { status: 400 }
      );
    }

    if (!profiles.length) {
      return NextResponse.json(
        { ok: false, error: "No hay perfiles de comisión para guardar." },
        { status: 400 }
      );
    }

    // Desactivamos reglas anteriores del producto para evitar duplicados históricos activos.
    const { error: deactivateError } = await supabaseAdmin
      .from("commercial_commission_rules")
      .update({ active: false })
      .eq("product_id", productId)
      .eq("active", true);

    if (deactivateError) {
      return NextResponse.json(
        { ok: false, error: deactivateError.message },
        { status: 500 }
      );
    }

    const rows = profiles
      .map((p: any) => {
        const mode = String(p.commissionMode || "fixed");
        const fixedAmount = cleanNumber(p.fixedAmount);
        const percentage = cleanNumber(p.percentage);
        const points = cleanNumber(p.points);

        // Si el perfil está totalmente vacío no creamos una regla falsa.
        const hasEconomicValue =
          fixedAmount !== null ||
          percentage !== null ||
          points !== null;

        if (!hasEconomicValue) return null;

        return {
          product_id: productId,
          provider_id: providerId,
          operation_type: operationType,
          profile_type: String(p.profileType || ""),
          commission_mode: mode,
          fixed_amount: fixedAmount,
          percentage,
          percentage_base: p.percentageBase
            ? String(p.percentageBase)
            : "provider_commission",
          points,
          active: true,
        };
      })
      .filter(Boolean);

    if (!rows.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No has indicado ninguna comisión. Escribe al menos un importe, porcentaje o puntos para algún perfil.",
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("commercial_commission_rules")
      .insert(rows)
      .select("*");

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      rules: data || [],
      count: data?.length || 0,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "No se pudieron guardar las comisiones.",
      },
      { status: 500 }
    );
  }
}
