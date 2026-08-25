import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function currentOneUser(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data } = await supabaseAdmin.from("one_users")
    .select("id,name,email,role,active")
    .eq("auth_user_id", user.id).eq("active", true).maybeSingle();
  return data;
}

function toClient(row: any) {
  const d = row.data || {};
  return {
    id: row.id,
    reference: row.reference || d.reference || "ONE-SINREF",
    type: d.type || row.client_type || "Particular",
    status: d.status || row.status || "Cliente",
    name: row.name,
    taxId: d.taxId || row.tax_id || "",
    birthDate: d.birthDate || "",
    incorporationDate: d.incorporationDate || "",
    iban: d.iban || "", phone: d.phone || "", mobile: d.mobile || "", email: d.email || "",
    address: d.address || "", postalCode: d.postalCode || "", city: d.city || "", province: d.province || "",
    sector: d.sector || "", commercial: row.commercial_name || (d.commercial && d.commercial !== "Sin asignar" ? d.commercial : "Cliente directo AN24"),
    services: d.services || [], notes: d.notes || "", contacts: d.contacts || [],
    createdAt: row.created_at || d.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || d.updatedAt || new Date().toISOString(),
    deletedAt: row.deleted_at || d.deletedAt || null,
  };
}

async function resolveCommercial(user: any, requestedName?: string | null) {
  if (user.role === "Comercial") return { id: user.id, name: user.name };
  const name = String(requestedName || "").trim();
  if (!name) return { id: null, name: null };
  const { data } = await supabaseAdmin.from("one_users")
    .select("id,name").eq("role", "Comercial").eq("active", true).ilike("name", name).maybeSingle();
  return data ? { id: data.id, name: data.name } : { id: null, name };
}

export async function GET(request: NextRequest) {
  const user = await currentOneUser(request);
  if (!user) return NextResponse.json({ ok:false, error:"Sesión no válida" }, { status:401 });

  const id = String(request.nextUrl.searchParams.get("id") || "").trim();

  if (id) {
    // Resolver único de cliente. Primero ID central; después referencias heredadas.
    // Esto permite abrir fichas antiguas mientras terminamos de migrar todas las rutas.
    const findOne = async (mode: "id" | "reference" | "legacy") => {
      let q = supabaseAdmin.from("one_clients").select("*");
      if (mode === "id") q = q.eq("id", id);
      if (mode === "reference") q = q.eq("reference", id);
      if (mode === "legacy") q = q.eq("data->>id", id);
      if (user.role === "Comercial") q = q.eq("commercial_user_id", user.id);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data;
    };

    try {
      let row = await findOne("id");
      if (!row) row = await findOne("reference");
      if (!row) row = await findOne("legacy");
      if (!row) {
        return NextResponse.json({
          ok:false,
          error: user.role === "Comercial"
            ? "Cliente no encontrado o no asignado a este comercial"
            : "Cliente no encontrado en la base central",
          lookup: id,
        }, { status:404 });
      }
      return NextResponse.json({ ok:true, client:toClient(row) });
    } catch (error:any) {
      return NextResponse.json({ ok:false, error:error?.message || "Error consultando cliente" }, { status:500 });
    }
  }

  let q = supabaseAdmin.from("one_clients").select("*");
  if (user.role === "Comercial") q = q.eq("commercial_user_id", user.id);
  const { data, error } = await q.order("updated_at", { ascending:false });
  if (error) return NextResponse.json({ok:false,error:error.message},{status:500});
  return NextResponse.json({ok:true,clients:(data||[]).map(toClient)});
}

export async function POST(request: NextRequest) {
  const user = await currentOneUser(request);
  if (!user) return NextResponse.json({ok:false,error:"Sesión no válida"},{status:401});
  const body = await request.json();

  // Alta real: Supabase es la fuente maestra. No dependemos de que el comercial
  // vuelva al listado para sincronizar localStorage.
  if (body?.client && !Array.isArray(body?.clients)) {
    const c = body.client;
    if (!String(c?.name || "").trim()) return NextResponse.json({ok:false,error:"El nombre es obligatorio"},{status:400});
    const commercial = await resolveCommercial(user, c.commercial);
    const now = new Date().toISOString();
    const id = String(c.id || crypto.randomUUID());
    const reference = String(c.reference || `ONE-${Date.now().toString().slice(-8)}`);
    const record = { ...c, id, reference, commercial: commercial.name || "", createdAt: c.createdAt || now, updatedAt: now, deletedAt: c.deletedAt || null };
    const { data, error } = await supabaseAdmin.from("one_clients").upsert({
      id, reference, name: record.name, tax_id: record.taxId || null, client_type: record.type || "Particular",
      status: record.status || "Cliente", commercial_user_id: commercial.id, commercial_name: commercial.name,
      data: record, created_at: record.createdAt, updated_at: now, deleted_at: record.deletedAt,
    }, { onConflict:"id" }).select("*").single();
    if (error) return NextResponse.json({ok:false,error:error.message},{status:500});
    return NextResponse.json({ok:true,client:toClient(data)});
  }

  // Compatibilidad temporal con el puente v8; ya no se usa desde el listado.
  const clients = Array.isArray(body?.clients) ? body.clients : [];
  const rows:any[] = [];
  for (const c of clients) {
    if (!c?.id || !c?.name) continue;
    if (user.role === "Comercial" && String(c.commercial||"").trim().toLowerCase() !== String(user.name||"").trim().toLowerCase()) continue;
    const commercial = await resolveCommercial(user, c.commercial);
    rows.push({id:String(c.id),reference:c.reference||null,name:c.name,tax_id:c.taxId||null,client_type:c.type||null,status:c.status||"Cliente",commercial_user_id:commercial.id,commercial_name:commercial.name,data:{...c,commercial:commercial.name||""},updated_at:new Date().toISOString(),deleted_at:c.deletedAt||null});
  }
  if (rows.length) {
    const {error}=await supabaseAdmin.from("one_clients").upsert(rows,{onConflict:"id"});
    if (error) return NextResponse.json({ok:false,error:error.message},{status:500});
  }
  return NextResponse.json({ok:true,count:rows.length});
}

export async function PATCH(request: NextRequest) {
  const user = await currentOneUser(request);
  if (!user) return NextResponse.json({ok:false,error:"Sesión no válida"},{status:401});
  const body = await request.json();
  const id = String(body?.id || "").trim();
  const c = body?.client;
  if (!id || !c) return NextResponse.json({ok:false,error:"Faltan datos del cliente"},{status:400});

  let existingQ = supabaseAdmin.from("one_clients").select("*").eq("id", id);
  if (user.role === "Comercial") existingQ = existingQ.eq("commercial_user_id", user.id);
  const { data: existing } = await existingQ.maybeSingle();
  if (!existing) return NextResponse.json({ok:false,error:"Cliente no encontrado o sin permiso"},{status:404});

  // En edición, un valor vacío de commercial significa expresamente
  // "Cliente directo AN24". No debemos usar || porque convertiría
  // ese vacío en el comercial anterior e impediría desasignarlo.
  const requestedCommercial = user.role === "Comercial"
    ? user.name
    : Object.prototype.hasOwnProperty.call(c, "commercial")
      ? c.commercial
      : existing.commercial_name;
  const commercial = await resolveCommercial(user, requestedCommercial);
  const now = new Date().toISOString();
  const record = { ...(existing.data || {}), ...c, id, reference: existing.reference, commercial: commercial.name || "", createdAt: existing.created_at, updatedAt: now };
  const { data, error } = await supabaseAdmin.from("one_clients").update({
    name: record.name, tax_id: record.taxId || null, client_type: record.type || "Particular", status: record.status || "Cliente",
    commercial_user_id: commercial.id, commercial_name: commercial.name, data: record, updated_at: now, deleted_at: record.deletedAt || null,
  }).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ok:false,error:error.message},{status:500});
  return NextResponse.json({ok:true,client:toClient(data)});
}
