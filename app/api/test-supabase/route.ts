import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("providers")
    .select("*")
    .order("name");

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        details: error,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    total: data?.length ?? 0,
    proveedores: data,
  });
}
