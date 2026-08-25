import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Falta userId." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("commercial_documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const documents = [...(data || [])].sort((a: any, b: any) => {
      const da = new Date(a.generated_at || a.created_at || 0).getTime();
      const db = new Date(b.generated_at || b.created_at || 0).getTime();

      if (db !== da) return db - da;
      return Number(b.version || 0) - Number(a.version || 0);
    });

    return NextResponse.json({
      ok: true,
      documents,
      count: documents.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "No se pudo cargar el histórico documental.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const b = await request.json();

    const userId = String(b.userId || "");
    const profileId = String(b.commercialProfileId || "");
    const type = String(b.documentType || "");

    if (!userId || !profileId) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos del comercial." },
        { status: 400 }
      );
    }

    if (!["Contrato comercial", "Anexo de comisiones"].includes(type)) {
      return NextResponse.json(
        { ok: false, error: "Tipo de documento no válido." },
        { status: 400 }
      );
    }

    const [
      { data: user, error: userError },
      { data: profile, error: profileError },
    ] = await Promise.all([
      supabaseAdmin
        .from("one_users")
        .select("*")
        .eq("id", userId)
        .single(),

      supabaseAdmin
        .from("commercial_profiles")
        .select("*")
        .eq("id", profileId)
        .single(),
    ]);

    if (userError || profileError || !user || !profile) {
      return NextResponse.json(
        {
          ok: false,
          error:
            userError?.message ||
            profileError?.message ||
            "No se encontraron los datos del comercial.",
        },
        { status: 500 }
      );
    }

    const { data: previous, error: previousError } = await supabaseAdmin
      .from("commercial_documents")
      .select("version")
      .eq("user_id", userId)
      .eq("document_type", type)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousError) {
      return NextResponse.json(
        { ok: false, error: previousError.message },
        { status: 500 }
      );
    }

    const version = Number(previous?.version || 0) + 1;
    const now = new Date().toISOString();

    // ============================================================
    // CONTRATO COMERCIAL
    // Se congela la versión PUBLICADA de la plantilla en el snapshot.
    // ============================================================
    if (type === "Contrato comercial") {
      const { data: template, error: templateError } = await supabaseAdmin
        .from("contract_templates")
        .select("*")
        .eq("code", "commercial-collaboration")
        .eq("active", true)
        .single();

      if (templateError || !template) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No existe la plantilla activa del contrato de colaboración.",
          },
          { status: 409 }
        );
      }

      const { data: templateVersion, error: versionError } =
        await supabaseAdmin
          .from("contract_template_versions")
          .select("*")
          .eq("template_id", template.id)
          .eq("status", "Publicado")
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (versionError) {
        return NextResponse.json(
          { ok: false, error: versionError.message },
          { status: 500 }
        );
      }

      if (!templateVersion) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No hay ninguna versión PUBLICADA de la plantilla contractual.",
          },
          { status: 409 }
        );
      }

      const title = `Contrato comercial · ${user.name}`;

      const { data, error } = await supabaseAdmin
        .from("commercial_documents")
        .insert({
          commercial_profile_id: profileId,
          user_id: userId,
          document_type: "Contrato comercial",
          title,
          version,
          status: "Borrador",
          profile_snapshot: b.profileSnapshot || user.profile_type || null,
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

            // Snapshot contractual inmutable.
            contract_template: {
              template_id: template.id,
              template_code: template.code,
              template_name: template.name,
              template_version_id: templateVersion.id,
              template_version: templateVersion.version,
              title: templateVersion.title,
              subtitle: templateVersion.subtitle,
              body_html: templateVersion.body_html,
              variables: templateVersion.variables || [],
              published_at: templateVersion.published_at,
            },
          },
          commission_snapshot: {},
          generated_at: now,
          updated_at: now,
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        document: data,
        template: {
          version: templateVersion.version,
          status: templateVersion.status,
        },
      });
    }

    // ============================================================
    // ANEXO
    // Se mantiene la compatibilidad con el flujo existente.
    // El anexo real continúa gestionándose por commercial-annex.
    // ============================================================
    let commissionSnapshot: any = {};

    const { data: rules, error: rulesError } = await supabaseAdmin
      .from("commercial_commission_rules")
      .select("*")
      .limit(1000);

    if (rulesError) {
      return NextResponse.json(
        { ok: false, error: rulesError.message },
        { status: 500 }
      );
    }

    commissionSnapshot = {
      profile: b.profileSnapshot || user.profile_type || null,
      rules: rules || [],
    };

    const title = `Anexo de comisiones · ${user.name}`;

    const { data, error } = await supabaseAdmin
      .from("commercial_documents")
      .insert({
        commercial_profile_id: profileId,
        user_id: userId,
        document_type: type,
        title,
        version,
        status: "Borrador",
        profile_snapshot: b.profileSnapshot || user.profile_type || null,
        data_snapshot: {
          user: {
            name: user.name,
            email: user.email,
            role: user.role,
            profile_type: user.profile_type,
            department: user.department,
          },
          commercial_profile: profile,
        },
        commission_snapshot: commissionSnapshot,
        generated_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, document: data });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "No se pudo generar el documento.",
      },
      { status: 500 }
    );
  }
}
