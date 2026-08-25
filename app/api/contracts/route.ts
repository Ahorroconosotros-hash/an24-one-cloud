import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { alarmValidation, energyValidation, normalizeCups, normalizeIban } from "@/lib/contract-validation";

export const dynamic = "force-dynamic";

async function currentOneUser(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data } = await supabaseAdmin.from("one_users").select("id,name,email,role,active").eq("auth_user_id", user.id).eq("active", true).maybeSingle();
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
    notes: d.notes || "",
    contacts: Array.isArray(d.contacts) ? d.contacts : [],
  };
}

const contractSelect = "id,reference,client_id,service_id,service_name,provider,status,start_date,end_date,monthly_value,external_reference,commercial_user_id,commercial_name,original_commercial_user_id,original_commercial_name,last_reassigned_at,last_reassigned_by,last_reassignment_reason,data,created_at,updated_at";

async function cupsExists(cups: string, excludeId?: string) {
  const normalized = normalizeCups(cups);
  if (!normalized) return null;
  let q = supabaseAdmin.from("one_contracts").select("id,reference,external_reference,client_id,data,service_name").in("service_name", ["Energía", "Energia"]);
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).find((row:any) => normalizeCups(row?.data?.cups) === normalized) || null;
}

export async function GET(request: NextRequest) {
  const user = await currentOneUser(request);
  if (!user) return NextResponse.json({ ok:false,error:"Sesión no válida" }, { status:401 });
  const contractId = String(request.nextUrl.searchParams.get("contractId") || "").trim();

  if (!contractId) {
    let query = supabaseAdmin.from("one_contracts").select(contractSelect).order("created_at",{ascending:false});
    if (user.role === "Comercial") query = query.eq("commercial_user_id", user.id);
    const {data:contracts,error:listError}=await query;
    if(listError) return NextResponse.json({ok:false,error:listError.message},{status:500});
    const clientIds=[...new Set((contracts||[]).map((c:any)=>c.client_id).filter(Boolean))];
    let clients:any[]=[];
    if(clientIds.length){
      const r=await supabaseAdmin.from("one_clients").select("id,name,reference").in("id",clientIds);
      clients=r.data||[];
    }
    const byClient=new Map(clients.map((c:any)=>[c.id,c]));
    return NextResponse.json({ok:true,contracts:(contracts||[]).map((c:any)=>({...c,client:byClient.get(c.client_id)||null})),viewer:{id:user.id,name:user.name,role:user.role}});
  }

  const { data: contract, error } = await supabaseAdmin.from("one_contracts").select(contractSelect).eq("id", contractId).maybeSingle();
  if (error) return NextResponse.json({ ok:false,error:error.message }, { status:500 });
  if (!contract) return NextResponse.json({ ok:false,error:"Contrato no encontrado" }, { status:404 });
  if (user.role === "Comercial" && contract.commercial_user_id !== user.id) {
    return NextResponse.json({ ok:false,error:"Este contrato está asignado a otro comercial" }, { status:403 });
  }

  const [{ data: client }, { data: service }, { data: commercials }] = await Promise.all([
    supabaseAdmin.from("one_clients").select("*").eq("id", contract.client_id).maybeSingle(),
    contract.service_id ? supabaseAdmin.from("services").select("id,name,category,provider").eq("id", contract.service_id).maybeSingle() : Promise.resolve({ data:null } as any),
    (user.role === "Administrador" || user.role === "BackOffice") ? supabaseAdmin.from("one_users").select("id,name,role,active").eq("role","Comercial").eq("active",true).order("name") : Promise.resolve({ data:[] } as any),
  ]);
  return NextResponse.json({ ok:true, contract:{...contract,service: service || (contract.service_name ? { name: contract.service_name, category: contract.service_name, provider: contract.provider } : null)}, client: client ? toClient(client) : null, commercials:commercials||[], viewer:{id:user.id,name:user.name,role:user.role} });
}

export async function POST(request: NextRequest) {
  const user = await currentOneUser(request);
  if (!user) return NextResponse.json({ ok:false,error:"Sesión no válida" }, { status:401 });

  const body = await request.json();
  const clientId = String(body.clientId || "").trim();
  const serviceName = String(body.serviceName || "").trim();
  const provider = String(body.provider || "").trim();
  const productName = String(body.productName || "").trim();
  const requestedStatus = String(body.status || "Borrador").trim();
  const contractDate = String(body.contractDate || "").trim() || null;
  const activationDate = String(body.activationDate || "").trim() || null;
  const isDirect = body.attribution === "directo";
  const commercialUserId = isDirect ? null : (String(body.commercialUserId || "").trim() || null);
  const commercialName = isDirect ? "DIRECTO AN24" : (String(body.commercialName || "").trim() || null);

  if (!clientId || !serviceName || !provider || !productName) {
    return NextResponse.json({ ok:false,error:"Faltan datos obligatorios del contrato" }, { status:400 });
  }

  const { data: client, error: clientError } = await supabaseAdmin.from("one_clients").select("*").eq("id", clientId).maybeSingle();
  if (clientError || !client) return NextResponse.json({ ok:false,error:"Cliente no encontrado" }, { status:404 });

  if (user.role === "Comercial" && isDirect) return NextResponse.json({ ok:false,error:"Un comercial no puede crear contratos DIRECTO AN24" }, { status:403 });
  if (user.role === "Comercial" && commercialUserId !== user.id) return NextResponse.json({ ok:false,error:"El contrato debe quedar asignado al comercial que lo crea" }, { status:403 });

  const clientView = toClient(client);
  const energyData = serviceName.toLocaleLowerCase("es").includes("energ") ? {
    tax_id: String(body.taxId || clientView.taxId || "").trim(),
    birth_date: String(body.birthDate || clientView.birthDate || "").trim(),
    phone: String(body.phone || clientView.mobile || clientView.phone || "").trim(),
    email: String(body.email || clientView.email || "").trim(),
    supply_address: String(body.supplyAddress || [clientView.address,clientView.postalCode,clientView.city,clientView.province].filter(Boolean).join(", ") || "").trim(),
    cups: normalizeCups(body.cups),
    iban: normalizeIban(body.iban || clientView.iban),
  } : {};

  const alarmData = serviceName.toLocaleLowerCase("es").includes("alarm") ? {
    tax_id:String(body.taxId||clientView.taxId||"").trim(), phone:String(body.phone||clientView.mobile||clientView.phone||"").trim(), email:String(body.email||clientView.email||"").trim(),
    installation_address:String(body.supplyAddress||[clientView.address,clientView.postalCode,clientView.city,clientView.province].filter(Boolean).join(", ")||"").trim(),
    iban:normalizeIban(body.iban||clientView.iban), property_type:String(body.propertyType||"").trim(), installation_contact:String(body.installationContact||"").trim(),
    has_current_alarm:String(body.hasCurrentAlarm||"").trim(), current_alarm_company:String(body.currentAlarmCompany||"").trim(),
    manage_previous_alarm_cancellation:String(body.manageCancellation||"").trim(), current_alarm_end_date:String(body.currentAlarmEndDate||"").trim(),
    customer_type:String(body.customerType||clientView.type||"").trim(),
  }:{};

  if (serviceName.toLocaleLowerCase("es").includes("energ") && requestedStatus !== "Borrador") {
    const basic = energyValidation(energyData, [], false);
    if (basic.missing.length || basic.invalid.length) {
      return NextResponse.json({ok:false,error:`Energía incompleta. ${basic.missing.length?`Faltan: ${basic.missing.join(", ")}. `:""}${basic.invalid.length?`No válidos: ${basic.invalid.join(", ")}.`:""}`},{status:400});
    }
    const duplicate = await cupsExists(basic.cups);
    if (duplicate) return NextResponse.json({ok:false,error:`Ese CUPS ya existe en el contrato ${duplicate.external_reference || duplicate.reference || duplicate.id}. No se puede crear otro contrato con el mismo CUPS.`},{status:409});
  }

  const id = `ctr-direct-${crypto.randomUUID()}`;
  const reference = `ONE-CTR-${Date.now().toString().slice(-10)}`;
  const now = new Date().toISOString();
  const dbStatus = requestedStatus === "Borrador" ? "Borrador" : "Pendiente de tramitación";

  const { data: contract, error } = await supabaseAdmin.from("one_contracts").insert({
    id, reference, external_reference: reference, client_id: clientId, service_name: serviceName, provider, status: dbStatus,
    start_date: contractDate,
    commercial_user_id: commercialUserId, commercial_name: commercialName,
    original_commercial_user_id: commercialUserId, original_commercial_name: commercialName,
    data: {
      source:"direct_contract", product_name:productName, contract_date:contractDate, activation_date:activationDate,
      attribution:isDirect ? "directo" : "comercial", commission_an24:Number(body.commissionAN24 || 0),
      commission_commercial:Number(body.commissionCommercial || 0), margin_an24:Number(body.marginAN24 || 0),
      created_by_user_id:user.id, created_by_name:user.name,
      ...energyData,
      ...alarmData,
    },
    created_at: now, updated_at: now
  }).select(contractSelect).single();
  if (error) return NextResponse.json({ ok:false,error:error.message }, { status:500 });

  try {
    await supabaseAdmin.from("one_client_timeline").insert({
      client_id:clientId, type:"contract_created", title:dbStatus === "Borrador" ? "Borrador de contrato creado" : "Contrato creado",
      detail:`${serviceName} · ${provider} · ${productName} · ${commercialName || user.name}`,
      actor_user_id:user.id, actor_name:user.name, created_at:now
    });
  } catch {}

  return NextResponse.json({ ok:true, contract });
}

export async function PATCH(request: NextRequest) {
  const user = await currentOneUser(request);
  if (!user) return NextResponse.json({ ok:false,error:"Sesión no válida" }, { status:401 });

  const body = await request.json();
  const action = String(body.action || "").trim();
  const contractId = String(body.contractId || "").trim();
  if (!contractId) return NextResponse.json({ok:false,error:"Falta contrato"},{status:400});

  if (action === "submit_for_processing") {
    const { data: current, error: currentError } = await supabaseAdmin.from("one_contracts").select(contractSelect).eq("id",contractId).maybeSingle();
    if (currentError || !current) return NextResponse.json({ok:false,error:currentError?.message || "Contrato no encontrado"},{status:404});
    if (user.role === "Comercial" && current.commercial_user_id !== user.id) return NextResponse.json({ok:false,error:"No puedes enviar un contrato de otro comercial"},{status:403});
    const docs = Array.isArray(current.data?.contract_documents) ? current.data.contract_documents : [];
    if (String(current.service_name || "").toLocaleLowerCase("es").includes("energ")) {
      const check = energyValidation(current.data || {}, docs, false);
      if (!check.ok) return NextResponse.json({ok:false,error:`No se puede enviar a Tramitaciones. ${check.missing.length?`Faltan datos: ${check.missing.join(", ")}. `:""}${check.invalid.length?`Datos no válidos: ${check.invalid.join(", ")}. `:""}${check.missingDocuments.length?`Faltan documentos: ${check.missingDocuments.join(", ")}.`:""}`},{status:400});
      const duplicate = await cupsExists(check.cups, contractId);
      if (duplicate) return NextResponse.json({ok:false,error:`El CUPS ya está usado por ${duplicate.external_reference || duplicate.reference || duplicate.id}`},{status:409});
    }
    if (String(current.service_name || "").toLocaleLowerCase("es").includes("alarm")) {
      const check=alarmValidation(current.data||{},docs,false);
      if(!check.ok) return NextResponse.json({ok:false,error:`No se puede enviar a Tramitaciones. ${check.missing.length?`Faltan datos: ${check.missing.join(", ")}. `:""}${check.invalid.length?`Datos no válidos: ${check.invalid.join(", ")}. `:""}${check.missingDocuments.length?`Faltan documentos: ${check.missingDocuments.join(", ")}.`:""}`},{status:400});
    }
    const now = new Date().toISOString();
    const { data: updated, error } = await supabaseAdmin.from("one_contracts").update({status:"Pendiente de tramitación",data:{...(current.data||{}),submitted_for_processing_at:now,submitted_for_processing_by:user.id,submitted_for_processing_by_name:user.name},updated_at:now}).eq("id",contractId).select(contractSelect).single();
    if (error) return NextResponse.json({ok:false,error:error.message},{status:500});
    try { await supabaseAdmin.from("one_client_timeline").insert({client_id:current.client_id,type:"contract_submitted",title:"Contrato enviado a Tramitaciones",detail:`${current.service_name || "Contrato"} · ${current.external_reference || current.reference || current.id}`,actor_user_id:user.id,actor_name:user.name,created_at:now}); } catch {}
    return NextResponse.json({ok:true,contract:updated});
  }

  if (!["Administrador","BackOffice"].includes(user.role)) {
    return NextResponse.json({ ok:false,error:"Solo Administración o BackOffice pueden reasignar contratos" }, { status:403 });
  }

  const commercialUserId = String(body.commercialUserId || "").trim();
  const reason = String(body.reason || "").trim();
  const effectiveDate = String(body.effectiveDate || "").trim();

  if (!commercialUserId) return NextResponse.json({ ok:false,error:"Falta comercial" }, { status:400 });
  if (reason.length < 3) return NextResponse.json({ ok:false,error:"Indica el motivo de la reasignación" }, { status:400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
    return NextResponse.json({ ok:false,error:"Indica la fecha efectiva de la reasignación" }, { status:400 });
  }

  const { data: current, error: currentError } = await supabaseAdmin
    .from("one_contracts")
    .select(contractSelect)
    .eq("id",contractId)
    .maybeSingle();

  if (currentError || !current) {
    return NextResponse.json({ ok:false,error:currentError?.message || "Contrato no encontrado" }, { status:404 });
  }

  const reassignableStatuses = ["Tramitado en compañía","Pendiente de activación","Pendiente activación","Activo"];
  if (!reassignableStatuses.includes(String(current.status || ""))) {
    return NextResponse.json({
      ok:false,
      error:"El comercial responsable solo puede cambiarse cuando el contrato ya está tramitado en compañía o activo."
    }, { status:400 });
  }

  const { data: commercial, error: commercialError } = await supabaseAdmin
    .from("one_users")
    .select("id,name,role,active")
    .eq("id",commercialUserId)
    .eq("role","Comercial")
    .eq("active",true)
    .maybeSingle();

  if (commercialError || !commercial) {
    return NextResponse.json({ ok:false,error:"Comercial no válido" }, { status:400 });
  }

  if (current.commercial_user_id === commercial.id) {
    return NextResponse.json({ ok:false,error:"Ese comercial ya es el responsable actual del contrato" }, { status:400 });
  }

  // Preservamos siempre el origen real. Si nació como DIRECTO AN24, el origen sigue siendo DIRECTO AN24.
  const originalId = current.original_commercial_name != null
    ? (current.original_commercial_user_id || null)
    : (current.commercial_user_id || null);
  const originalName = current.original_commercial_name
    || current.commercial_name
    || "DIRECTO AN24";

  const now = new Date().toISOString();
  const previousHistory = Array.isArray(current.data?.commercial_reassignment_history)
    ? current.data.commercial_reassignment_history
    : [];

  const reassignment = {
    id:`reas-${Date.now()}`,
    from_commercial_user_id:current.commercial_user_id || null,
    from_commercial_name:current.commercial_name || "DIRECTO AN24",
    to_commercial_user_id:commercial.id,
    to_commercial_name:commercial.name,
    effective_date:effectiveDate,
    recorded_at:now,
    actor_user_id:user.id,
    actor_name:user.name,
    reason,
  };

  const { data: updated, error } = await supabaseAdmin.from("one_contracts").update({
    commercial_user_id:commercial.id,
    commercial_name:commercial.name,
    original_commercial_user_id:originalId,
    original_commercial_name:originalName,
    last_reassigned_at:now,
    last_reassigned_by:user.id,
    last_reassignment_reason:reason,
    data:{
      ...(current.data || {}),
      last_reassignment_effective_date:effectiveDate,
      commercial_reassignment_history:[...previousHistory,reassignment],
    },
    updated_at:now,
  }).eq("id",contractId).select(contractSelect).single();

  if (error) return NextResponse.json({ ok:false,error:error.message }, { status:500 });

  try {
    await supabaseAdmin.from("one_client_timeline").insert({
      client_id:current.client_id,
      type:"contract_reassigned",
      title:"Contrato reasignado",
      detail:`${current.external_reference || current.id}: ${current.commercial_name || "DIRECTO AN24"} → ${commercial.name}. Fecha efectiva: ${effectiveDate}. Motivo: ${reason}`,
      actor_user_id:user.id,
      actor_name:user.name,
      created_at:now
    });
  } catch {}

  return NextResponse.json({ ok:true,contract:updated });
}
