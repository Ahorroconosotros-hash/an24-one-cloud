import crypto from "node:crypto";
import net from "node:net";
import tls from "node:tls";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type OneMailAccount = {
  id: string;
  tenant_key: string;
  one_user_id: string;
  display_name: string;
  email_address: string;
  provider: string;
  username: string;
  password_encrypted: string;
  signature_text?: string | null;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  active: boolean;
};

export async function requireOneMailUser(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw Object.assign(new Error("Sesión no encontrada."), { status: 401 });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) throw Object.assign(new Error("Sesión no válida."), { status: 401 });

  const { data: oneUser, error } = await supabaseAdmin
    .from("one_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  if (!oneUser) throw Object.assign(new Error("Usuario ONE no encontrado."), { status: 403 });

  const tenantKey = String((oneUser as any).tenant_id || (oneUser as any).organization_id || "legacy-an24");
  return { authUser: user, oneUser, tenantKey };
}

function mailKey() {
  const material = process.env.ONE_MAIL_ENCRYPTION_KEY || "";
  if (!material) {
    throw new Error("Falta ONE_MAIL_ENCRYPTION_KEY en las variables de entorno de ONE.");
  }
  return crypto.createHash("sha256").update(material).digest();
}

export function encryptMailSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", mailKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptMailSecret(value: string) {
  const [ivPart, tagPart, dataPart] = String(value || "").split(".");
  if (!ivPart || !tagPart || !dataPart) throw new Error("Credencial de correo no válida.");

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    mailKey(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function getUserMailAccount(oneUserId: string): Promise<OneMailAccount | null> {
  const { data, error } = await supabaseAdmin
    .from("one_mail_accounts")
    .select("*")
    .eq("one_user_id", oneUserId)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (/one_mail_accounts|does not exist|schema cache/i.test(error.message || "")) return null;
    throw error;
  }
  return (data as OneMailAccount | null) || null;
}

function escapeHeader(value: string) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function mimeHeader(value: string) {
  const safe = escapeHeader(value);
  if (!/[^\x20-\x7E]/.test(safe)) return safe;
  return `=?UTF-8?B?${Buffer.from(safe, "utf8").toString("base64")}?=`;
}

function htmlEscape(value: string) {
  return String(value || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[c] || c));
}

async function waitForSmtp(socket: net.Socket | tls.TLSSocket, expected: number[]) {
  return await new Promise<string>((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => done(new Error("Tiempo de espera agotado con el servidor SMTP.")), 15000);

    function cleanup() {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
    }
    function done(err?: Error) {
      cleanup();
      if (err) reject(err);
      else resolve(buffer);
    }
    function onError(err: Error) { done(err); }
    function onData(chunk: Buffer | string) {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1] || "";
      const match = last.match(/^(\d{3})\s/);
      if (!match) return;
      const code = Number(match[1]);
      if (!expected.includes(code)) return done(new Error(`SMTP ${code}: ${last.slice(4)}`));
      done();
    }

    socket.on("data", onData);
    socket.once("error", onError);
  });
}

async function smtpCommand(socket: net.Socket | tls.TLSSocket, command: string, expected: number[]) {
  const waiting = waitForSmtp(socket, expected);
  socket.write(command + "\r\n");
  return waiting;
}

async function openSmtp(host: string, port: number, secure: boolean) {
  if (secure) {
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: true });
    await new Promise<void>((resolve, reject) => {
      socket.once("secureConnect", resolve);
      socket.once("error", reject);
    });
    await waitForSmtp(socket, [220]);
    return socket;
  }

  const plain = net.connect({ host, port });
  await new Promise<void>((resolve, reject) => {
    plain.once("connect", resolve);
    plain.once("error", reject);
  });
  await waitForSmtp(plain, [220]);
  await smtpCommand(plain, "EHLO one.local", [250]);
  await smtpCommand(plain, "STARTTLS", [220]);

  const secureSocket = tls.connect({ socket: plain, servername: host, rejectUnauthorized: true });
  await new Promise<void>((resolve, reject) => {
    secureSocket.once("secureConnect", resolve);
    secureSocket.once("error", reject);
  });
  return secureSocket;
}

async function smtpLogin(
  socket: net.Socket | tls.TLSSocket,
  username: string,
  password: string,
) {
  await smtpCommand(socket, "EHLO one.local", [250]);
  await smtpCommand(socket, "AUTH LOGIN", [334]);
  await smtpCommand(socket, Buffer.from(username).toString("base64"), [334]);
  await smtpCommand(socket, Buffer.from(password).toString("base64"), [235]);
}

function qImap(value: string) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function imapCommand(socket: tls.TLSSocket, tag: string, command: string) {
  return await new Promise<string>((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => finish(new Error("Tiempo de espera agotado con el servidor IMAP.")), 15000);

    function cleanup() {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
    }
    function finish(err?: Error) {
      cleanup();
      if (err) reject(err);
      else resolve(buffer);
    }
    function onError(err: Error) { finish(err); }
    function onData(chunk: Buffer | string) {
      buffer += chunk.toString();
      if (new RegExp(`(?:^|\\r?\\n)${tag} (OK|NO|BAD)`, "i").test(buffer)) {
        const ok = new RegExp(`(?:^|\\r?\\n)${tag} OK`, "i").test(buffer);
        if (!ok) {
          return finish(new Error(buffer.trim().split(/\r?\n/).slice(-1)[0] || "Error IMAP"));
        }
        finish();
      }
    }

    socket.on("data", onData);
    socket.once("error", onError);
    socket.write(`${tag} ${command}\r\n`);
  });
}

async function openImap(account: Pick<OneMailAccount, "imap_host" | "imap_port" | "imap_secure">) {
  if (!account.imap_secure) {
    throw new Error("ONE Mail v18 requiere IMAP SSL/TLS (normalmente puerto 993).");
  }
  const socket = tls.connect({
    host: account.imap_host,
    port: Number(account.imap_port),
    servername: account.imap_host,
    rejectUnauthorized: true,
  });
  await new Promise<void>((resolve, reject) => {
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
  });
  return socket;
}

async function testImap(account: {
  username: string;
  password: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
}) {
  const socket = await openImap(account as Pick<OneMailAccount, "imap_host" | "imap_port" | "imap_secure">);
  try {
    await imapCommand(socket, "A1", `LOGIN ${qImap(account.username)} ${qImap(account.password)}`);
    await imapCommand(socket, "A2", "LOGOUT").catch(() => "");
  } finally {
    socket.destroy();
  }
}

export async function testMailAccount(
  account: Omit<OneMailAccount, "id" | "tenant_key" | "one_user_id" | "password_encrypted" | "active"> & { password: string },
) {
  const smtp = await openSmtp(account.smtp_host, Number(account.smtp_port), Boolean(account.smtp_secure));
  try {
    await smtpLogin(smtp, account.username, account.password);
    await smtpCommand(smtp, "QUIT", [221]);
  } finally {
    smtp.destroy();
  }

  await testImap(account);
  return true;
}

export async function sendMailWithAccount(
  account: OneMailAccount,
  input: { to: string[]; cc?: string[]; subject: string; bodyText: string; replyTo?: string },
) {
  const password = decryptMailSecret(account.password_encrypted);
  const socket = await openSmtp(account.smtp_host, Number(account.smtp_port), Boolean(account.smtp_secure));

  try {
    await smtpLogin(socket, account.username, password);
    await smtpCommand(socket, `MAIL FROM:<${account.email_address}>`, [250]);
    for (const recipient of [...input.to, ...(input.cc || [])]) {
      await smtpCommand(socket, `RCPT TO:<${recipient}>`, [250, 251]);
    }
    await smtpCommand(socket, "DATA", [354]);

    const messageId = `<${crypto.randomUUID()}@${account.email_address.split("@")[1] || "one.local"}>`;
    const signature = String(account.signature_text || "").trim();
    const fullText = signature ? `${input.bodyText.trim()}\n\n${signature}` : input.bodyText.trim();
    const body = fullText.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#222">${htmlEscape(fullText).replace(/\r?\n/g, "<br>")}</div>`;
    const boundary = `ONE_${crypto.randomBytes(12).toString("hex")}`;

    const lines = [
      `From: ${mimeHeader(account.display_name)} <${account.email_address}>`,
      `To: ${input.to.join(", ")}`,
      input.cc?.length ? `Cc: ${input.cc.join(", ")}` : null,
      input.replyTo ? `Reply-To: ${escapeHeader(input.replyTo)}` : null,
      `Subject: ${mimeHeader(input.subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${messageId}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      body,
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      html,
      `--${boundary}--`,
      "",
      ".",
    ].filter((line): line is string => line !== null);

    const waiting = waitForSmtp(socket, [250]);
    socket.write(lines.join("\r\n") + "\r\n");
    await waiting;
    await smtpCommand(socket, "QUIT", [221]);
    return { messageId };
  } finally {
    socket.destroy();
  }
}

function decodeMimeWord(value: string) {
  return value.replace(/=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi, (_match, charset, encoding, data) => {
    try {
      if (String(encoding).toUpperCase() === "B") {
        return Buffer.from(data, "base64").toString("utf8");
      }
      const qp = String(data)
        .replace(/_/g, " ")
        .replace(/=([0-9A-F]{2})/gi, (_: string, hex: string) => String.fromCharCode(parseInt(hex, 16)));
      return Buffer.from(qp, "latin1").toString(String(charset).toLowerCase().includes("utf") ? "utf8" : "latin1");
    } catch {
      return data;
    }
  });
}

function headerValue(raw: string, name: string) {
  const unfolded = raw.replace(/\r?\n[ \t]+/g, " ");
  const match = unfolded.match(new RegExp(`^${name}:\\s*(.+)$`, "im"));
  return match ? decodeMimeWord(match[1].trim()) : "";
}

function decodeTransfer(body: string, encoding: string) {
  const enc = encoding.toLowerCase();
  if (enc.includes("base64")) {
    try { return Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8"); } catch { return body; }
  }
  if (enc.includes("quoted-printable")) {
    const compact = body.replace(/=\r?\n/g, "");
    const bytes = compact.replace(/=([0-9A-F]{2})/gi, (_: string, hex: string) => String.fromCharCode(parseInt(hex, 16)));
    try { return Buffer.from(bytes, "latin1").toString("utf8"); } catch { return bytes; }
  }
  return body;
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitRawMail(raw: string) {
  const idx = raw.search(/\r?\n\r?\n/);
  if (idx < 0) return { headers: raw, body: "" };
  const separator = raw.slice(idx).match(/^\r?\n\r?\n/)?.[0] || "\r\n\r\n";
  return { headers: raw.slice(0, idx), body: raw.slice(idx + separator.length) };
}

function readableBody(raw: string) {
  const { headers, body } = splitRawMail(raw);
  const contentType = headerValue(headers, "Content-Type");
  const transfer = headerValue(headers, "Content-Transfer-Encoding");
  const boundary = contentType.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.[1]
    || contentType.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.[2]
    || "";

  if (/multipart\//i.test(contentType) && boundary) {
    const parts = body.split(`--${boundary}`).filter(part => part.trim() && !part.trim().startsWith("--"));
    let htmlFallback = "";
    for (const part of parts) {
      const parsed = splitRawMail(part.replace(/^\r?\n/, ""));
      const partType = headerValue(parsed.headers, "Content-Type");
      const partTransfer = headerValue(parsed.headers, "Content-Transfer-Encoding");
      const decoded = decodeTransfer(parsed.body.trim(), partTransfer);
      if (/text\/plain/i.test(partType)) return decoded.trim();
      if (!htmlFallback && /text\/html/i.test(partType)) htmlFallback = stripHtml(decoded);
    }
    if (htmlFallback) return htmlFallback;
  }

  const decoded = decodeTransfer(body, transfer);
  return /text\/html/i.test(contentType) ? stripHtml(decoded) : decoded.trim();
}

export async function listInbox(account: OneMailAccount, limit = 35) {
  const password = decryptMailSecret(account.password_encrypted);
  const socket = await openImap(account);
  try {
    await imapCommand(socket, "A1", `LOGIN ${qImap(account.username)} ${qImap(password)}`);
    await imapCommand(socket, "A2", "SELECT INBOX");
    const search = await imapCommand(socket, "A3", "UID SEARCH ALL");
    const searchLine = search.split(/\r?\n/).find(line => /^\* SEARCH/i.test(line)) || "";
    const ids = searchLine
      .replace(/^\* SEARCH\s*/i, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-limit)
      .reverse();

    const messages: Array<Record<string, unknown>> = [];
    let seq = 4;
    for (const uid of ids) {
      const tag = `A${seq++}`;
      const result = await imapCommand(
        socket,
        tag,
        `UID FETCH ${uid} (FLAGS BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)])`,
      );
      const literalMatch = result.match(/\{(\d+)\}\r?\n([\s\S]*?)\r?\n\)/);
      const headers = literalMatch?.[2] || result;
      const flags = (result.match(/FLAGS \(([^)]*)\)/i)?.[1] || "").split(/\s+/).filter(Boolean);
      messages.push({
        uid,
        from: headerValue(headers, "From"),
        to: headerValue(headers, "To"),
        subject: headerValue(headers, "Subject") || "(Sin asunto)",
        date: headerValue(headers, "Date"),
        messageId: headerValue(headers, "Message-ID"),
        unread: !flags.some(flag => /\\Seen/i.test(flag)),
      });
    }

    await imapCommand(socket, `A${seq}`, "LOGOUT").catch(() => "");
    return messages;
  } finally {
    socket.destroy();
  }
}

export async function getInboxMessage(account: OneMailAccount, uid: string) {
  if (!/^\d+$/.test(uid)) throw Object.assign(new Error("Mensaje no válido."), { status: 400 });

  const password = decryptMailSecret(account.password_encrypted);
  const socket = await openImap(account);
  try {
    await imapCommand(socket, "A1", `LOGIN ${qImap(account.username)} ${qImap(password)}`);
    await imapCommand(socket, "A2", "SELECT INBOX");
    const result = await imapCommand(socket, "A3", `UID FETCH ${uid} (FLAGS RFC822)`);
    const literal = result.match(/RFC822 \{(\d+)\}\r?\n([\s\S]*?)\r?\n\)/i)?.[2];
    if (!literal) throw Object.assign(new Error("No se pudo leer el contenido del mensaje."), { status: 404 });

    const { headers } = splitRawMail(literal);
    await imapCommand(socket, "A4", `UID STORE ${uid} +FLAGS (\\Seen)`).catch(() => "");
    await imapCommand(socket, "A5", "LOGOUT").catch(() => "");

    return {
      uid,
      from: headerValue(headers, "From"),
      to: headerValue(headers, "To"),
      subject: headerValue(headers, "Subject") || "(Sin asunto)",
      date: headerValue(headers, "Date"),
      messageId: headerValue(headers, "Message-ID"),
      bodyText: readableBody(literal),
    };
  } finally {
    socket.destroy();
  }
}
