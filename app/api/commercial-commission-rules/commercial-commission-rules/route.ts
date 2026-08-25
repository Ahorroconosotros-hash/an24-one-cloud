import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fixedNumber(v: any) {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productId = String(body.productId || "");
    const providerId = body.providerId ? String(body.providerId) : null;
    const operationType = body.operationType ? String(body.operationType) : null;
    const profiles = Array.isArray(body.profiles) ? body.profiles : [];

    if (!productId) {
      return NextResponse.json({ ok:false, error:"Falta productId." }, { status:400 });
    }

    const { error: deactivateError } = await supabaseAdmin
      .from("commercial_commission_rules")
      .update({ active:false })
      .eq("product_id", productId)
      .eq("active", true);

    if (deactivateError) {
      return NextResponse.json({ ok:false, error:deactivateError.message }, { status:500 });
    }

    // Regla oficial AN24 ONE:
    // las comisiones del comercial son SIEMPRE importes fijos en euros.
    const rows = profiles
      .map((p:any)=>{
        const fixed = fixedNumber(p.fixedAmount);
        if (fixed === null) return null;

        return {
          product_id: productId,
          provider_id: providerId,
          operation_type: operationType,
          profile_type: String(p.profileType || ""),
          commission_mode: "fixed",
          fixed_amount: fixed,
          percentage: null,
          percentage_base: null,
          points: null,
          active: true,
        };
      })
      .filter(Boolean);

    if (!rows.length) {
      return NextResponse.json({
        ok:false,
        error:"No has indicado ninguna comisión fija para los perfiles comerciales."
      }, { status:409 });
    }

    const { data, error } = await supabaseAdmin
      .from("commercial_commission_rules")
      .insert(rows)
      .select("*");

    if (error) {
      return NextResponse.json({ ok:false, error:error.message }, { status:500 });
    }

    return NextResponse.json({ ok:true, rules:data||[], count:data?.length||0 });
  } catch (e:any) {
    return NextResponse.json({
      ok:false,
      error:e?.message||"No se pudieron guardar las comisiones fijas."
    }, { status:500 });
  }
}
