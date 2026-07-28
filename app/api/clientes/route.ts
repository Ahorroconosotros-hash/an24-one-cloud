import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function configError() {
  return NextResponse.json(
    { error: "Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel." },
    { status: 500 },
  );
}

function apiHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: supabaseKey ?? "",
    Authorization: `Bearer ${supabaseKey ?? ""}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function clean(value: unknown): string | null {
  const result = String(value ?? "").trim();
  return result || null;
}

export async function GET() {
  if (!supabaseUrl || !supabaseKey) return configError();

  const response = await fetch(
    `${supabaseUrl}/rest/v1/clientes?select=*&order=created_at.desc`,
    { headers: apiHeaders(), cache: "no-store" },
  );

  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: response.status });
  }

  return NextResponse.json(await response.json());
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseKey) return configError();

  try {
    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const documento = String(body.documento ?? "").trim().toUpperCase();
    const telefonoMovil = String(body.telefonoMovil ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!nombre || !documento || !telefonoMovil || !email) {
      return NextResponse.json(
        { error: "Completa nombre, DNI/CIF, móvil y correo electrónico." },
        { status: 400 },
      );
    }

    const duplicateResponse = await fetch(
      `${supabaseUrl}/rest/v1/clientes?documento=eq.${encodeURIComponent(documento)}&select=id&limit=1`,
      { headers: apiHeaders(), cache: "no-store" },
    );

    if (!duplicateResponse.ok) {
      throw new Error(await duplicateResponse.text());
    }

    const duplicates = await duplicateResponse.json();
    if (duplicates.length > 0) {
      return NextResponse.json(
        { error: "Ya existe un cliente con ese DNI/CIF." },
        { status: 409 },
      );
    }

    const payload = {
      codigo: `ONE-${Date.now().toString().slice(-6)}`,
      nombre,
      documento,
      tipo: clean(body.tipoIdentidad) ?? "empresa",
      email,
      telefono: telefonoMovil,
      telefono_fijo: clean(body.telefonoFijo),
      direccion: clean(body.direccion),
      numero: clean(body.numero),
      bloque: clean(body.bloque),
      escalera: clean(body.escalera),
      piso: clean(body.piso),
      puerta: clean(body.puerta),
      poblacion: clean(body.poblacion),
      provincia: clean(body.provincia),
      codigo_postal: clean(body.codigoPostal),
      responsable_nombre: clean(body.gerenteNombre),
      responsable_email: clean(body.gerenteEmail),
      responsable_telefono: clean(body.gerenteTelefono),
      titular_banco: clean(body.titularBanco),
      iban: clean(body.iban)?.replace(/\s/g, "").toUpperCase() ?? null,
      marketing_email: Boolean(body.marketingEmail),
      marketing_whatsapp: Boolean(body.marketingWhatsapp),
      marketing_sms: Boolean(body.marketingSms),
      marketing_ofertas: Boolean(body.marketingOfertas),
      comercial_asignado: clean(body.comercialAsignado),
      observaciones: clean(body.observaciones),
      estado: "activo",
      updated_at: new Date().toISOString(),
    };

    const createResponse = await fetch(`${supabaseUrl}/rest/v1/clientes`, {
      method: "POST",
      headers: apiHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(payload),
    });

    if (!createResponse.ok) {
      throw new Error(await createResponse.text());
    }

    const [cliente] = await createResponse.json();
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar el cliente." },
      { status: 500 },
    );
  }
}
