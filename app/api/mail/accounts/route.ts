import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  encryptMailSecret,
  getUserMailAccount,
  requireOneMailUser,
  testMailAccount,
} from "@/lib/one-mail";

export const dynamic = "force-dynamic";

function publicAccount(account: any) {
  return account ? {
    id: account.id,
    displayName: account.display_name,
    emailAddress: account.email_address,
    provider: account.provider,
    username: account.username,
    signatureText: account.signature_text || "",
    smtpHost: account.smtp_host,
    smtpPort: account.smtp_port,
    smtpSecure: account.smtp_secure,
    imapHost: account.imap_host,
    imapPort: account.imap_port,
    imapSecure: account.imap_secure,
    active: account.active,
  } : null;
}

export async function GET(request: NextRequest) {
  try {
    const { oneUser } = await requireOneMailUser(request);
    const account = await getUserMailAccount(oneUser.id);
    return NextResponse.json({ ok: true, account: publicAccount(account) });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "No se pudo cargar el correo." },
      { status: error?.status || 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { oneUser, tenantKey } = await requireOneMailUser(request);
    const body = await request.json();
    const provider = String(body.provider || "IMAP/SMTP");
    const displayName = String(body.displayName || oneUser.name || "").trim();
    const emailAddress = String(body.emailAddress || oneUser.email || "").trim().toLowerCase();
    const username = String(body.username || emailAddress).trim();
    const password = String(body.password || "");
    const signatureText = String(body.signatureText || "").trim();
    const smtpHost = String(body.smtpHost || "").trim();
    const smtpPort = Number(body.smtpPort || 465);
    const smtpSecure = body.smtpSecure !== false;
    const imapHost = String(body.imapHost || "").trim();
    const imapPort = Number(body.imapPort || 993);
    const imapSecure = body.imapSecure !== false;

    if (!displayName || !emailAddress || !username || !smtpHost || !imapHost) {
      return NextResponse.json(
        { ok: false, error: "Completa nombre, correo, usuario, SMTP e IMAP." },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
      return NextResponse.json({ ok: false, error: "La dirección de correo no es válida." }, { status: 400 });
    }

    const current = await getUserMailAccount(oneUser.id);
    if (!password && !current) {
      return NextResponse.json(
        { ok: false, error: "La contraseña es obligatoria la primera vez." },
        { status: 400 },
      );
    }

    if (password) {
      await testMailAccount({
        display_name: displayName,
        email_address: emailAddress,
        provider,
        username,
        password,
        signature_text: signatureText,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_secure: smtpSecure,
        imap_host: imapHost,
        imap_port: imapPort,
        imap_secure: imapSecure,
      });
    }

    const payload: any = {
      tenant_key: tenantKey,
      one_user_id: oneUser.id,
      display_name: displayName,
      email_address: emailAddress,
      provider,
      username,
      signature_text: signatureText || null,
      smtp_host: smtpHost,
      smtp_port: smtpPort,
      smtp_secure: smtpSecure,
      imap_host: imapHost,
      imap_port: imapPort,
      imap_secure: imapSecure,
      active: true,
      updated_at: new Date().toISOString(),
    };
    if (password) payload.password_encrypted = encryptMailSecret(password);

    let data: any;
    let error: any;
    if (current) {
      ({ data, error } = await supabaseAdmin
        .from("one_mail_accounts")
        .update(payload)
        .eq("id", current.id)
        .select("*")
        .single());
    } else {
      ({ data, error } = await supabaseAdmin
        .from("one_mail_accounts")
        .insert({ ...payload, password_encrypted: encryptMailSecret(password) })
        .select("*")
        .single());
    }

    if (error) {
      throw new Error(
        error.message.includes("one_mail_accounts")
          ? "Falta instalar la migración ONE Mail v18 en Supabase."
          : error.message,
      );
    }

    return NextResponse.json({ ok: true, account: publicAccount(data), tested: Boolean(password) });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "No se pudo guardar la cuenta." },
      { status: error?.status || 500 },
    );
  }
}
