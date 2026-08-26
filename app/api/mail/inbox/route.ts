import { NextRequest, NextResponse } from "next/server";
import { getUserMailAccount, listInbox, requireOneMailUser } from "@/lib/one-mail";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { oneUser } = await requireOneMailUser(request);
    const account = await getUserMailAccount(oneUser.id);
    if (!account) return NextResponse.json({ ok: true, connected: false, messages: [] });

    const messages = await listInbox(account, 35);
    return NextResponse.json({
      ok: true,
      connected: true,
      account: { emailAddress: account.email_address, displayName: account.display_name },
      messages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "No se pudo leer la bandeja." },
      { status: error?.status || 500 },
    );
  }
}
