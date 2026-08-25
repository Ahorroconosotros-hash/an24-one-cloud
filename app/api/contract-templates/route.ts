import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { data: templates, error: tError } = await supabaseAdmin
      .from("contract_templates").select("*").order("name");
    if (tError) throw tError;

    const { data: versions, error: vError } = await supabaseAdmin
      .from("contract_template_versions").select("*").order("version", { ascending: false });
    if (vError) throw vError;

    return NextResponse.json({ ok: true, templates: templates || [], versions: versions || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "No se pudieron cargar las plantillas." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const b = await request.json();

    if (b.action === "create-version") {
      const templateId = String(b.template_id || "");
      if (!templateId) return NextResponse.json({ ok:false, error:"Falta template_id." }, { status:400 });

      const { data:last, error:lastError } = await supabaseAdmin
        .from("contract_template_versions").select("version")
        .eq("template_id", templateId).order("version", { ascending:false }).limit(1).maybeSingle();
      if (lastError) throw lastError;

      const { data, error } = await supabaseAdmin
        .from("contract_template_versions")
        .insert({
          template_id: templateId,
          version: Number(last?.version || 0) + 1,
          status: "Borrador",
          title: b.title || "Contrato de colaboración",
          subtitle: b.subtitle || "No exclusivo",
          body_html: b.body_html || "",
          variables: b.variables || [],
          notes: b.notes || null
        }).select("*").single();
      if (error) throw error;
      return NextResponse.json({ ok:true, version:data });
    }

    if (b.action === "duplicate-version") {
      const { data:source, error:sourceError } = await supabaseAdmin
        .from("contract_template_versions").select("*").eq("id", b.version_id).single();
      if (sourceError || !source) throw sourceError || new Error("Versión no encontrada.");

      const { data:last, error:lastError } = await supabaseAdmin
        .from("contract_template_versions").select("version")
        .eq("template_id", source.template_id).order("version", { ascending:false }).limit(1).maybeSingle();
      if (lastError) throw lastError;

      const { data, error } = await supabaseAdmin
        .from("contract_template_versions").insert({
          template_id: source.template_id,
          version: Number(last?.version || 0) + 1,
          status: "Borrador",
          title: source.title,
          subtitle: source.subtitle,
          body_html: source.body_html,
          variables: source.variables || [],
          notes: `Duplicada desde v${source.version}`
        }).select("*").single();
      if (error) throw error;
      return NextResponse.json({ ok:true, version:data });
    }

    return NextResponse.json({ ok:false, error:"Acción no válida." }, { status:400 });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message || "No se pudo guardar." }, { status:500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const b = await request.json();
    const versionId = String(b.version_id || "");
    if (!versionId) return NextResponse.json({ ok:false, error:"Falta version_id." }, { status:400 });

    if (b.action === "publish") {
      const { data:target, error:targetError } = await supabaseAdmin
        .from("contract_template_versions").select("*").eq("id", versionId).single();
      if (targetError || !target) throw targetError || new Error("Versión no encontrada.");

      const { error:archiveError } = await supabaseAdmin
        .from("contract_template_versions")
        .update({ status:"Archivado", updated_at:new Date().toISOString() })
        .eq("template_id", target.template_id).eq("status", "Publicado").neq("id", versionId);
      if (archiveError) throw archiveError;

      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from("contract_template_versions")
        .update({ status:"Publicado", published_at:now, updated_at:now })
        .eq("id", versionId).select("*").single();
      if (error) throw error;
      return NextResponse.json({ ok:true, version:data });
    }

    const update:any = { updated_at:new Date().toISOString() };
    if (typeof b.title === "string") update.title = b.title;
    if (typeof b.subtitle === "string") update.subtitle = b.subtitle;
    if (typeof b.body_html === "string") update.body_html = b.body_html;
    if (typeof b.notes === "string") update.notes = b.notes;
    if (Array.isArray(b.variables)) update.variables = b.variables;

    const { data, error } = await supabaseAdmin
      .from("contract_template_versions").update(update).eq("id", versionId).select("*").single();
    if (error) throw error;
    return NextResponse.json({ ok:true, version:data });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message || "No se pudo actualizar." }, { status:500 });
  }
}
