import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserMailAccount, requireOneMailUser } from "@/lib/one-mail";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { oneUser } = await requireOneMailUser(request);
    const account = await getUserMailAccount(oneUser.id);
    if (!account) return NextResponse.json({ ok: true, connected: false, messages: [] });

    const { data, error } = await supabaseAdmin
      .from("one_mail_messages")
      .select("id,to_addresses,cc_addresses,subject,body_text,sent_at,status,client_id,contract_id,opportunity_id")
      .eq("one_user_id", oneUser.id)
      .eq("direction", "outbound")
      .order("sent_at", { ascending: false })
      .limit(50);

    if (error) {
      if (/one_mail_messages|does not exist|schema cache/i.test(error.message || "")) {
        return NextResponse.json({ ok: true, connected: true, messages: [] });
      }
      throw error;
    }

    return NextResponse.json({
      ok: true,
      connected: true,
      account: { emailAddress: account.email_address, displayName: account.display_name },
      messages: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "No se pudo cargar Enviados." },
      { status: error?.status || 500 },
    );
  }
}
