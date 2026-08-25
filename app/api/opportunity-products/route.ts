import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type SaveOpportunityProductBody = {
  opportunityId?: string;
  productId?: string;
};

export async function GET(request: NextRequest) {
  try {
    const opportunityId = request.nextUrl.searchParams.get("opportunityId");

    if (!opportunityId) {
      return NextResponse.json(
        { ok: false, error: "Falta opportunityId" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("opportunity_products")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      total: data?.length ?? 0,
      items: data ?? [],
    });
  } catch (error: any) {
    console.error("ONE · GET opportunity_products:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "No se pudieron cargar los productos de la oportunidad",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SaveOpportunityProductBody;

    const opportunityId = String(body.opportunityId || "").trim();
    const productId = String(body.productId || "").trim();

    if (!opportunityId) {
      return NextResponse.json(
        { ok: false, error: "Falta opportunityId" },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { ok: false, error: "Falta productId" },
        { status: 400 }
      );
    }

    // 1. Leemos SIEMPRE el producto real desde ONE Cloud.
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        {
          ok: false,
          error: productError?.message || "Producto no encontrado",
        },
        { status: 404 }
      );
    }

    // 2. Leemos el proveedor real relacionado con el producto.
    let provider: any = null;

    if (product.provider_id) {
      const { data, error } = await supabaseAdmin
        .from("providers")
        .select("*")
        .eq("id", product.provider_id)
        .single();

      if (error) {
        throw error;
      }

      provider = data;
    }

    // 3. Como Telefonía actualmente trabaja con un producto principal
    // por oportunidad, sustituimos la relación anterior al cambiar de producto.
    const { error: deleteError } = await supabaseAdmin
      .from("opportunity_products")
      .delete()
      .eq("opportunity_id", opportunityId);

    if (deleteError) {
      throw deleteError;
    }

    // 4. Guardamos IDs reales + fotografía del producto vendido.
    const payload = {
      opportunity_id: opportunityId,
      product_id: product.id,
      provider_id: product.provider_id || null,

      service: product.service || product.category || "Telefonía",

      product_name_snapshot: product.name || "",
      provider_name_snapshot: provider?.name || "",
      product_type_snapshot:
        product.product_type ||
        product.config?.phone_type ||
        "",
      operation_type_snapshot: product.operation_type || "",
      product_description_snapshot: product.description || "",

      product_config_snapshot: {
        ...(product.config || {}),
        pvp: Number(product.pvp || 0),
        provider_logo: provider?.logo || null,
        provider_service: provider?.service || null,
      },

      quantity: 1,
      status: "Pendiente",
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error: insertError } = await supabaseAdmin
      .from("opportunity_products")
      .insert(payload)
      .select("*")
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      ok: true,
      item: saved,
    });
  } catch (error: any) {
    console.error("ONE · POST opportunity_products:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "No se pudo vincular el producto con la oportunidad",
      },
      { status: 500 }
    );
  }
}
