import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function num(v: any) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeProfile(v?: string | null) {
  const x = String(v || "").trim().toLowerCase();
  if (x.includes("premium")) return "premium";
  if (x.includes("avanz")) return "avanzado";
  if (x.includes("est")) return "estandar";
  if (x.includes("colab")) return "colaborador";
  return x;
}

function commissionLabel(row: any) {
  const fixed = num(row.fixed_amount);
  return fixed !== null && fixed > 0 ? `${fixed.toFixed(2)} €` : "—";
}

export async function GET(request: NextRequest) {
  try {
    const documentId = request.nextUrl.searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { ok: false, error: "Falta documentId." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("commercial_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Documento no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, document: data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "No se pudo cargar el anexo." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const userId = String(body.userId || "");
    const commercialProfileId = String(body.commercialProfileId || "");
    const profileSnapshot = String(body.profileSnapshot || "");
    const contractDocumentId = String(body.contractDocumentId || "");

    if (!userId || !commercialProfileId) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos del comercial." },
        { status: 400 }
      );
    }

    const [
      { data: user, error: userError },
      { data: profile, error: profileError },
      { data: rules, error: rulesError },
      { data: products, error: productsError },
      { data: providers, error: providersError },
    ] = await Promise.all([
      supabaseAdmin.from("one_users").select("*").eq("id", userId).single(),
      supabaseAdmin.from("commercial_profiles").select("*").eq("id", commercialProfileId).single(),
      supabaseAdmin.from("commercial_commission_rules").select("*"),
      supabaseAdmin.from("products").select("*"),
      supabaseAdmin.from("providers").select("*"),
    ]);

    if (userError || profileError || !user || !profile) {
      return NextResponse.json(
        {
          ok: false,
          error:
            userError?.message ||
            profileError?.message ||
            "No se pudieron leer los datos del comercial.",
        },
        { status: 500 }
      );
    }

    if (rulesError || productsError || providersError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            rulesError?.message ||
            productsError?.message ||
            providersError?.message ||
            "No se pudo leer el catálogo económico.",
        },
        { status: 500 }
      );
    }

    const effectiveProfile =
      profileSnapshot ||
      user.profile_type ||
      "";

    const wantedProfile = normalizeProfile(effectiveProfile);

    const productMap = new Map((products || []).map((p: any) => [p.id, p]));
    const providerMap = new Map((providers || []).map((p: any) => [p.id, p]));

    // Solo reglas activas del perfil actual y productos activos.
    const profileRules = (rules || []).filter((r: any) => {
      if (r.active === false) return false;

      const ruleProfile = normalizeProfile(r.profile_type);
      if (wantedProfile && ruleProfile && ruleProfile !== wantedProfile) {
        return false;
      }

      const product: any = productMap.get(r.product_id);
      if (!product || product.active === false) return false;

      // REGLA AN24 ONE:
      // El anexo comercial incluye exclusivamente comisiones FIJAS en euros.
      // Porcentajes, recurrentes porcentuales, puntos o reglas sin fijo quedan fuera.
      const fixed = Number(r.fixed_amount);
      if (!Number.isFinite(fixed) || fixed <= 0) return false;

      return true;
    });

    const rows = profileRules.map((r: any) => {
      const product: any = productMap.get(r.product_id) || {};
      const providerId = r.provider_id || product.provider_id || null;
      const provider: any = providerMap.get(providerId) || {};

      return {
        snapshot_key: `${r.id}:${r.product_id || ""}:${r.operation_type || ""}`,
        rule_id: r.id,
        service:
          provider.service ||
          product.service ||
          product.category ||
          "General",

        provider_id: providerId,
        provider_name: provider.name || "Sin proveedor",
        provider_logo: provider.logo || null,

        product_id: r.product_id || null,
        product_name: product.name || "Producto",
        product_reference:
          product.reference ||
          product.code ||
          product.sku ||
          "",
        product_type:
          product.product_type ||
          product.category ||
          "",
        description:
          product.description ||
          product.config?.features ||
          "",

        operation_type:
          r.operation_type ||
          product.operation_type ||
          "",

        profile_type:
          r.profile_type ||
          effectiveProfile,

        commission_mode: r.commission_mode || "fixed",
        fixed_amount: num(r.fixed_amount),
        percentage: num(r.percentage),
        percentage_base: r.percentage_base || null,
        recurring_amount: num(r.recurring_amount),
        recurring_percentage: num(r.recurring_percentage),
        recurring_base: r.recurring_base || null,
        points: num(r.points),

        side: r.side || null,
        role_context: r.role_context || null,

        commission_label: commissionLabel(r),

        // Copia completa para auditoría futura.
        raw_rule: r,
      };
    });

    rows.sort((a: any, b: any) =>
      `${a.service}|${a.provider_name}|${a.product_name}|${a.operation_type}`
        .localeCompare(
          `${b.service}|${b.provider_name}|${b.product_name}|${b.operation_type}`,
          "es"
        )
    );

    if (!rows.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `No hay comisiones activas configuradas para el perfil ${effectiveProfile || "del comercial"}.`,
        },
        { status: 409 }
      );
    }

    let contract: any = null;

    if (contractDocumentId) {
      const { data, error } = await supabaseAdmin
        .from("commercial_documents")
        .select("*")
        .eq("id", contractDocumentId)
        .eq("user_id", userId)
        .eq("document_type", "Contrato comercial")
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }

      contract = data || null;
    }

    // Evitamos duplicar el anexo inicial del mismo contrato.
    if (contractDocumentId) {
      const { data: existingDocs } = await supabaseAdmin
        .from("commercial_documents")
        .select("*")
        .eq("user_id", userId)
        .eq("document_type", "Anexo de comisiones")
        .order("created_at", { ascending: false });

      const existing = (existingDocs || []).find(
        (d: any) =>
          d.commission_snapshot?.document_kind === "initial_economic_annex" &&
          d.commission_snapshot?.contract_document_id === contractDocumentId
      );

      if (existing) {
        return NextResponse.json({
          ok: true,
          document: existing,
          reused: true,
        });
      }
    }

    // La columna version se conserva únicamente como contador técnico interno.
    const { data: previous } = await supabaseAdmin
      .from("commercial_documents")
      .select("version")
      .eq("user_id", userId)
      .eq("document_type", "Anexo de comisiones")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const internalVersion = Number(previous?.version || 0) + 1;
    const generatedAt = new Date().toISOString();
    const effectiveFrom = generatedAt.slice(0, 10);

    const commissionSnapshot = {
      document_kind: "initial_economic_annex",
      economic_document_number: 0,
      generated_at: generatedAt,
      effective_from: effectiveFrom,

      contract_document_id: contract?.id || contractDocumentId || null,
      contract_internal_version: contract?.version || null,
      contract_title: contract?.title || null,

      profile: effectiveProfile,
      rows,

      // Servirá después para comparar catálogo actual vs. condiciones firmadas.
      comparison_base: rows.map((r: any) => ({
        snapshot_key: r.snapshot_key,
        rule_id: r.rule_id,
        product_id: r.product_id,
        provider_id: r.provider_id,
        operation_type: r.operation_type,
        commission_mode: r.commission_mode,
        fixed_amount: r.fixed_amount,
        percentage: r.percentage,
        percentage_base: r.percentage_base,
        recurring_amount: r.recurring_amount,
        recurring_percentage: r.recurring_percentage,
        recurring_base: r.recurring_base,
        points: r.points,
      })),
    };

    const { data: document, error: documentError } = await supabaseAdmin
      .from("commercial_documents")
      .insert({
        commercial_profile_id: commercialProfileId,
        user_id: userId,
        document_type: "Anexo de comisiones",
        title: "Anexo de condiciones económicas",
        version: internalVersion,
        status: "Emitido",
        effective_from: effectiveFrom,
        profile_snapshot: effectiveProfile,
        data_snapshot: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            profile_type: user.profile_type,
            department: user.department,
          },
          commercial_profile: profile,
          linked_contract: contract
            ? {
                id: contract.id,
                title: contract.title,
                internal_version: contract.version,
                generated_at: contract.generated_at,
                template_version:
                  contract.data_snapshot?.contract_template?.template_version ||
                  null,
              }
            : null,
        },
        commission_snapshot: commissionSnapshot,
        generated_at: generatedAt,
        updated_at: generatedAt,
      })
      .select("*")
      .single();

    if (documentError) {
      return NextResponse.json(
        { ok: false, error: documentError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      document,
      rows: rows.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "No se pudo generar el anexo económico.",
      },
      { status: 500 }
    );
  }
}
