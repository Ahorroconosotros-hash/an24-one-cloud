import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function currentOneUser(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data } = await supabaseAdmin
    .from("one_users")
    .select("id,name,email,role,active")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  return data;
}

function toClient(row: any) {
  const d = row?.data || {};
  return {
    id: row.id,
    reference: row.reference || d.reference || "ONE-SINREF",
    type: d.type || row.client_type || "Particular",
    status: d.status || row.status || "Cliente",
    name: row.name,
    taxId: d.taxId || row.tax_id || "",
    birthDate: d.birthDate || "",
    incorporationDate: d.incorporationDate || "",
    iban: d.iban || "",
    phone: d.phone || "",
    mobile: d.mobile || "",
    email: d.email || "",
    address: d.address || "",
    postalCode: d.postalCode || "",
    city: d.city || "",
    province: d.province || "",
    sector: d.sector || "",
    commercial: row.commercial_name || d.commercial || "Sin asignar",
    services: Array.isArray(d.services) ? d.services : [],
    notes: d.notes || "",
    contacts: Array.isArray(d.contacts) ? d.contacts : [],
    createdAt: row.created_at || d.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || d.updatedAt || new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const user = await currentOneUser(request);
  if (!user) return NextResponse.json({ ok: false, error: "Sesión no válida" }, { status: 401 });
  const clientId = String(request.nextUrl.searchParams.get("clientId") || "").trim();
  if (!clientId) return NextResponse.json({ ok: false, error: "Falta clientId" }, { status: 400 });

  let clientQuery = supabaseAdmin.from("one_clients").select("*").eq("id", clientId);
  if (user.role === "Comercial") clientQuery = clientQuery.eq("commercial_user_id", user.id);
  const { data: clientRow, error: clientError } = await clientQuery.maybeSingle();
  if (clientError) return NextResponse.json({ ok: false, error: clientError.message }, { status: 500 });
  if (!clientRow) return NextResponse.json({ ok: false, error: "Cliente no encontrado o sin permiso" }, { status: 404 });

  const client = toClient(clientRow);

  let offers: any[] = [];
  try {
    const { data: rows, error } = await supabaseAdmin
      .from("opportunities")
      .select("id,client_id,title,service,stage,review_status,commercial_editable,estimated_value,notes,payload,product_id,provider_id,commercial_user_id,submitted_at,created_at,updated_at")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false });
    if (!error) offers = rows || [];
  } catch {}

  const offerIds = offers.map((o) => o.id).filter(Boolean);
  let workflow: any[] = [];
  if (offerIds.length) {
    const result = await supabaseAdmin.from("opportunity_workflow").select("*").in("opportunity_id", offerIds);
    if (!result.error) workflow = result.data || [];
  }
  const workflowById = new Map(workflow.map((w) => [String(w.opportunity_id), w]));
  offers = offers.map((offer) => ({ ...offer, workflow: workflowById.get(String(offer.id)) || null }));

  let contracts: any[] = [];
  try {
    const { data: rows, error } = await supabaseAdmin
      .from("one_contracts")
      .select("id,client_id,service_id,service_name,provider,status,start_date,end_date,monthly_value,external_reference,commercial_user_id,commercial_name,original_commercial_user_id,original_commercial_name,last_reassigned_at,last_reassignment_reason,data,created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (!error) contracts = rows || [];
  } catch {}

  const serviceIds = [...new Set(contracts.map((c) => c.service_id).filter(Boolean))];
  let services: any[] = [];
  if (serviceIds.length) {
    const result = await supabaseAdmin.from("services").select("id,name,category,provider").in("id", serviceIds);
    if (!result.error) services = result.data || [];
  }
  const serviceById = new Map(services.map((s) => [String(s.id), s]));
  contracts = contracts.map((contract) => ({ ...contract, service: serviceById.get(String(contract.service_id)) || (contract.service_name ? { name: contract.service_name, category: contract.service_name, provider: contract.provider } : null) }));

  let timeline: any[] = [];
  try {
    const result = await supabaseAdmin
      .from("one_client_timeline")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (!result.error) timeline = result.data || [];
  } catch {}

  return NextResponse.json({ ok: true, client, offers, contracts, timeline, viewer: { id: user.id, name: user.name, role: user.role } });
}
