import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      providersResult,
      productsResult,
      commissionsResult,
      commercialCommissionsResult,
      targetsResult,
      acceleratorsResult,
      clawbacksResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("providers")
        .select("*")
        .order("name"),

      supabaseAdmin
        .from("products")
        .select("*")
        .order("name"),

      supabaseAdmin
        .from("commission_rules")
        .select("*"),

      supabaseAdmin
        .from("commercial_commission_rules")
        .select("*"),

      supabaseAdmin
        .from("target_rules")
        .select("*"),

      supabaseAdmin
        .from("accelerator_rules")
        .select("*"),

      supabaseAdmin
        .from("clawback_rules")
        .select("*"),
    ]);

    const errors = [
      providersResult.error,
      productsResult.error,
      commissionsResult.error,
      commercialCommissionsResult.error,
      targetsResult.error,
      acceleratorsResult.error,
      clawbacksResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error("ONE Cloud · errores catálogo:", errors);

      return NextResponse.json(
        {
          ok: false,
          error: errors.map((e) => e?.message).join(" | "),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,

      totals: {
        providers: providersResult.data?.length ?? 0,
        products: productsResult.data?.length ?? 0,
        commissions: commissionsResult.data?.length ?? 0,
        commercialCommissions:
          commercialCommissionsResult.data?.length ?? 0,
        targets: targetsResult.data?.length ?? 0,
        accelerators: acceleratorsResult.data?.length ?? 0,
        clawbacks: clawbacksResult.data?.length ?? 0,
      },

      providers: providersResult.data ?? [],
      products: productsResult.data ?? [],

      commissionRules:
        commissionsResult.data ?? [],

      commercialCommissionRules:
        commercialCommissionsResult.data ?? [],

      targetRules:
        targetsResult.data ?? [],

      acceleratorRules:
        acceleratorsResult.data ?? [],

      clawbackRules:
        clawbacksResult.data ?? [],
    });
  } catch (error: any) {
    console.error("ONE Cloud · catálogo:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Error inesperado cargando el catálogo ONE",
      },
      { status: 500 }
    );
  }
}