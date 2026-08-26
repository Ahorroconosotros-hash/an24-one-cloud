import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserMailAccount, requireOneMailUser, sendMailWithAccount } from "@/lib/one-mail";

export const dynamic = "force-dynamic";

function emails(value: unknown) {
  return String(value || "")
    .split(/[;,]/)
    .map(item => item.trim())
    .filter(item => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));
}

async function canAccessClient(oneUser: any, clientId: string) {
  let query = supabaseAdmin.from("one_clients").select("id,commercial_user_id").eq("id", clientId);
  if (oneUser.role === "Comercial") query = query.eq("commercial_user_id", oneUser.id);
  const { data } = await query.maybeSingle();
  return Boolean(data);
}

export async function POST(request: NextRequest) {
  try {
    const { oneUser, tenantKey } = await requireOneMailUser(request);
    const account = await getUserMailAccount(oneUser.id);
    if (!account) {
      return NextResponse.json(
        { ok: false, error: "Conecta primero tu cuenta en ONE Mail." },
        { status: 409 },
      );
    }

    const body = await request.json();
    const to = emails(body.to);
    const cc = emails(body.cc);
    const subject = String(body.subject || "").trim();
    const bodyText = String(body.bodyText || "").trim();
    const clientId = String(body.clientId || "").trim() || null;
    const contractId = String(body.contractId || "").trim() || null;
    const opportunityId = String(body.opportunityId || "").trim() || null;

    if (!to.length || !subject || !bodyText) {
      return NextResponse.json(
        { ok: false, error: "Destinatario, asunto y mensaje son obligatorios." },
        { status: 400 },
      );
    }

    if (clientId && !(await canAccessClient(oneUser, clientId))) {
      return NextResponse.json({ ok: false, error: "Cliente no encontrado o sin permiso." }, { status: 404 });
    }

    const result = await sendMailWithAccount(account, { to, cc, subject, bodyText });
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin.from("one_mail_messages").insert({
      tenant_key: tenantKey,
      account_id: account.id,
      one_user_id: oneUser.id,
      client_id: clientId,
      contract_id: contractId,
      opportunity_id: opportunityId,
      direction: "outbound",
      message_id: result.messageId,
      from_address: account.email_address,
      to_addresses: to,
      cc_addresses: cc,
      subject,
      body_text: bodyText,
      status: "sent",
      sent_at: now,
    });
    if (error && !/one_mail_messages|does not exist|schema cache/i.test(error.message || "")) {
      console.error("ONE Mail log:", error.message);
    }

    if (clientId) {
      await supabaseAdmin.from("one_client_timeline").insert({
        client_id: clientId,
        event_type: "Email",
        channel: "ONE Mail",
        title: `Email enviado: ${subject}`,
        detail: `Enviado a ${to.join(", ")}`,
        actor_user_id: oneUser.id,
        actor_name: oneUser.name,
        metadata: {
          one_mail_message_id: result.messageId,
          contract_id: contractId,
          opportunity_id: opportunityId,
        },
        created_at: now,
      });
    }

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "No se pudo enviar el correo." },
      { status: error?.status || 500 },
    );
  }
}
