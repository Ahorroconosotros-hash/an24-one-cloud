import { NextResponse } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase no está configurado." }, { status: 500 });
  }

  const { id } = await params;
  const response = await fetch(
    `${supabaseUrl}/rest/v1/clients?id=eq.${encodeURIComponent(id)}&select=*,contacts(*)`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) return NextResponse.json({ error: await response.text() }, { status: response.status });
  const [client] = await response.json();
  if (!client) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  return NextResponse.json(client);
}
