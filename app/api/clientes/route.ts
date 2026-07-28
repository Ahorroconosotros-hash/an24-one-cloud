import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function configError() {
  return NextResponse.json(
    { error: "Falta configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local." },
    { status: 500 },
  );
}

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: supabaseKey ?? "",
    Authorization: `Bearer ${supabaseKey ?? ""}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseKey) return configError();

  try {
    const body = await request.json();
    const taxId = String(body.documento ?? "").trim().toUpperCase();
    const name = String(body.nombre ?? "").trim();

    if (!name || !taxId || !body.telefonoMovil || !body.email) {
      return NextResponse.json({ error: "Completa los campos obligatorios." }, { status: 400 });
    }

    const duplicateCheck = await fetch(
      `${supabaseUrl}/rest/v1/clients?tax_id=eq.${encodeURIComponent(taxId)}&select=id&limit=1`,
      { headers: headers(), cache: "no-store" },
    );
    if (!duplicateCheck.ok) {
      const detail = await duplicateCheck.text();
      throw new Error(detail || "No se pudo comprobar el documento fiscal.");
    }
    const duplicates = await duplicateCheck.json();
    if (duplicates.length) {
      return NextResponse.json({ error: "Ya existe un cliente con ese DNI/CIF." }, { status: 409 });
    }

    const address = [body.direccion, body.numero, body.bloque && `Bloque ${body.bloque}`, body.escalera && `Esc. ${body.escalera}`, body.piso && `Piso ${body.piso}`, body.puerta && `Puerta ${body.puerta}`]
      .filter(Boolean)
      .join(", ");

    const clientPayload = {
      code: `ONE-${Date.now().toString().slice(-6)}`,
      name,
      legal_name: body.tipoIdentidad === "empresa" ? name : null,
      tax_id: taxId,
      client_type: body.tipoIdentidad,
      status: "active",
      email: String(body.email).trim(),
      phone: String(body.telefonoMovil).trim(),
      phone_landline: body.telefonoFijo || null,
      address,
      address_number: body.numero || null,
      address_block: body.bloque || null,
      address_stair: body.escalera || null,
      address_floor: body.piso || null,
      address_door: body.puerta || null,
      city: body.poblacion,
      province: body.provincia,
      postal_code: body.codigoPostal,
      bank_holder: body.titularBanco || null,
      iban: body.iban ? String(body.iban).replace(/\s/g, "").toUpperCase() : null,
      marketing_email: Boolean(body.marketingEmail),
      marketing_whatsapp: Boolean(body.marketingWhatsapp),
      marketing_sms: Boolean(body.marketingSms),
      marketing_offers: Boolean(body.marketingOfertas),
      assigned_label: body.comercialAsignado || null,
      notes: body.observaciones || null,
    };

    const createClient = await fetch(`${supabaseUrl}/rest/v1/clients`, {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(clientPayload),
    });

    if (!createClient.ok) {
      const detail = await createClient.text();
      throw new Error(detail || "No se pudo guardar el cliente.");
    }

    const [client] = await createClient.json();

    if (body.tipoIdentidad === "empresa" && body.gerenteNombre) {
      const contactResponse = await fetch(`${supabaseUrl}/rest/v1/contacts`, {
        method: "POST",
        headers: headers({ Prefer: "return=minimal" }),
        body: JSON.stringify({
          client_id: client.id,
          full_name: body.gerenteNombre,
          position: "Responsable de la empresa",
          email: body.gerenteEmail || null,
          phone: body.gerenteTelefono || null,
          is_primary: true,
        }),
      });
      if (!contactResponse.ok) {
        const detail = await contactResponse.text();
        throw new Error(detail || "El cliente se guardó, pero falló el responsable.");
      }
    }

    return NextResponse.json({ id: client.id, code: client.code }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado al guardar el cliente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
