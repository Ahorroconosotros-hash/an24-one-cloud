import { NextRequest, NextResponse } from "next/server";
import { getInboxMessage, getUserMailAccount, requireOneMailUser } from "@/lib/one-mail";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { oneUser } = await requireOneMailUser(request);
    const account = await getUserMailAccount(oneUser.id);
    if (!account) {
      return NextResponse.json({ ok: false, error: "Conecta primero tu cuenta en ONE Mail." }, { status: 409 });
    }
    const uid = String(request.nextUrl.searchParams.get("uid") || "").trim();
    const message = await getInboxMessage(account, uid);
    return NextResponse.json({ ok: true, message });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "No se pudo leer el mensaje." },
      { status: error?.status || 500 },
    );
  }
}
