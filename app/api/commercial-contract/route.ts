import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const documentId = request.nextUrl.searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json({ ok:false, error:"Falta documentId." }, { status:400 });
    }

    const { data, error } = await supabaseAdmin
      .from("commercial_documents")
      .select("*")
      .eq("id", documentId)
      .eq("document_type", "Contrato comercial")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok:false, error:error?.message || "Contrato no encontrado." },
        { status:404 }
      );
    }

    return NextResponse.json({ ok:true, document:data });
  } catch (e:any) {
    return NextResponse.json(
      { ok:false, error:e?.message || "No se pudo cargar el contrato." },
      { status:500 }
    );
  }
}
