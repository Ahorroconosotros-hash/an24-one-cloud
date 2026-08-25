import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const allowed = ["Firmado", "Sustituido", "Cancelado"];

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const documentId = String(body.documentId || "");
    const status = String(body.status || "");

    if (!documentId) {
      return NextResponse.json(
        { ok: false, error: "Falta documentId." },
        { status: 400 }
      );
    }

    if (!allowed.includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Estado no válido." },
        { status: 400 }
      );
    }

    const { data: current, error: currentError } = await supabaseAdmin
      .from("commercial_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (currentError || !current) {
      return NextResponse.json(
        { ok: false, error: currentError?.message || "Documento no encontrado." },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const payload: Record<string, any> = {
      status,
      updated_at: now,
    };

    if (status === "Firmado") {
      payload.signed_at = now;
      payload.effective_from = current.effective_from || today;
    }

    if (status === "Sustituido" || status === "Cancelado") {
      payload.effective_to = current.effective_to || today;
    }

    const { data: document, error } = await supabaseAdmin
      .from("commercial_documents")
      .update(payload)
      .eq("id", documentId)
      .select("*")
      .single();

    if (error || !document) {
      return NextResponse.json(
        { ok: false, error: error?.message || "No se pudo actualizar el documento." },
        { status: 500 }
      );
    }

    let replacedDocumentIds: string[] = [];

    // Regla documental:
    // Un contrato nuevo NO sustituye al anterior mientras sea borrador.
    // Solo cuando el nuevo contrato queda Firmado, sustituimos versiones anteriores
    // del mismo tipo que aún estuvieran activas.
    if (status === "Firmado" && current.document_type === "Contrato comercial") {
      const { data: olderDocuments } = await supabaseAdmin
        .from("commercial_documents")
        .select("id,status,version")
        .eq("user_id", current.user_id)
        .eq("document_type", "Contrato comercial")
        .lt("version", current.version)
        .not("status", "in", '("Sustituido","Cancelado")');

      replacedDocumentIds = (olderDocuments || []).map((d: any) => d.id);

      if (replacedDocumentIds.length) {
        await supabaseAdmin
          .from("commercial_documents")
          .update({
            status: "Sustituido",
            effective_to: today,
            updated_at: now,
          })
          .in("id", replacedDocumentIds);
      }
    }

    return NextResponse.json({
      ok: true,
      document,
      replaced_document_ids: replacedDocumentIds,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "No se pudo actualizar el documento." },
      { status: 500 }
    );
  }
}
