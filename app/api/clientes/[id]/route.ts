import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: supabaseKey ?? "",
    Authorization: `Bearer ${supabaseKey ?? ""}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase no está configurado en Vercel." }, { status: 500 });
  }

  const { id } = await context.params;
  const response = await fetch(
    `${supabaseUrl}/rest/v1/clientes?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    { headers: headers(), cache: "no-store" },
  );

  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: response.status });
  }

  const [cliente] = await response.json();
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  return NextResponse.json(cliente);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase no está configurado en Vercel." }, { status: 500 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const response = await fetch(`${supabaseUrl}/rest/v1/clientes?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
  });

  if (!response.ok) return NextResponse.json({ error: await response.text() }, { status: response.status });
  const [cliente] = await response.json();
  return NextResponse.json(cliente);
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase no está configurado en Vercel." }, { status: 500 });
  }

  const { id } = await context.params;
  const response = await fetch(`${supabaseUrl}/rest/v1/clientes?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: headers({ Prefer: "return=minimal" }),
  });

  if (!response.ok) return NextResponse.json({ error: await response.text() }, { status: response.status });
  return NextResponse.json({ ok: true });
}
