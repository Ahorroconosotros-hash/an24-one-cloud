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
  const { data } = await supabaseAdmin
    .from("one_users")
    .select("id,name,email,role,active")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  return data;
}

const fields = "id,reference,external_reference,client_id,service_name,provider,status,start_date,commercial_user_id,commercial_name,original_commercial_name,data,created_at,updated_at";

export async function GET(request: NextRequest) {
  const user = await currentOneUser(request);
  if (!user) return NextResponse.json({ ok:false, error:"Sesión no válida" }, { status:401 });
  if (user.role !== "BackOffice" && user.role !== "Administrador") {
    return NextResponse.json({ ok:false, error:"Sin permisos de Tramitaciones" }, { status:403 });
  }

  const { data: contracts, error } = await supabaseAdmin
    .from("one_contracts")
    .select(fields)
    .in("status", ["Pendiente de tramitación", "En tramitación", "Tramitado en compañía", "Pendiente de activación"])
    .order("created_at", { ascending:false });
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });

  const clientIds = [...new Set((contracts || []).map((c:any) => c.client_id).filter(Boolean))];
  const { data: clients, error: clientsError } = clientIds.length
    ? await supabaseAdmin.from("one_clients").select("id,name,reference").in("id", clientIds)
    : ({ data:[], error:null } as any);
  if (clientsError) return NextResponse.json({ ok:false, error:clientsError.message }, { status:500 });
  const byClient = new Map((clients || []).map((c:any) => [String(c.id), c]));

  return NextResponse.json({
    ok:true,
    contracts:(contracts || []).filter((c:any) => c.status !== "Pendiente de activación" || (c.data?.source === "direct_contract" && !c.data?.processing_completed_at)).map((c:any) => ({
      ...c,
      status:(c.status === "Pendiente de activación" && c.data?.source === "direct_contract" && !c.data?.processing_completed_at) ? "Pendiente de tramitación" : c.status,
      legacy_status:c.status,
      client:byClient.get(String(c.client_id)) || null,
      product_name:c.data?.product_name || c.data?.product || c.data?.offer_title || "Producto pendiente",
    }))
  });
}

export async function PATCH(request: NextRequest) {
  const user = await currentOneUser(request);
  if (!user) return NextResponse.json({ ok:false, error:"Sesión no válida" }, { status:401 });
  if (user.role !== "BackOffice" && user.role !== "Administrador") {
    return NextResponse.json({ ok:false, error:"Solo BackOffice o Administración pueden tramitar" }, { status:403 });
  }

  const body = await request.json();
  const contractId = String(body.contractId || "").trim();
  const action = String(body.action || "").trim();
  if (!contractId) return NextResponse.json({ ok:false, error:"Falta contractId" }, { status:400 });

  const { data: current, error: currentError } = await supabaseAdmin
    .from("one_contracts").select(fields).eq("id", contractId).maybeSingle();
  if (currentError || !current) return NextResponse.json({ ok:false, error:currentError?.message || "Contrato no encontrado" }, { status:404 });

  const now = new Date().toISOString();
  const previousData = current.data || {};
  let nextStatus = current.status;
  let nextData:any = { ...previousData };
  let timelineType = "contract_updated";
  let timelineTitle = "Contrato actualizado";
  let timelineDetail = `${current.service_name || "Contrato"} · ${current.external_reference || current.reference || current.id}`;
  const workflowActions = new Set(["start_processing","complete_processing","submit_company","mark_active","request_correction","rollback_to_company"]);
  const effectiveDate = String(body.effectiveDate || "").trim();
  if (workflowActions.has(action) && !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) return NextResponse.json({ok:false,error:"La fecha efectiva del movimiento es obligatoria."},{status:400});
  const addMovement = (data:any, fromStatus:string, toStatus:string, movementReason?:string) => ({...data,status_history:[...(Array.isArray(data.status_history)?data.status_history:[]),{id:crypto.randomUUID(),from_status:fromStatus,to_status:toStatus,effective_date:effectiveDate,recorded_at:now,actor_user_id:user.id,actor_name:user.name,reason:movementReason||null}]});


  if (action === "update_alarm_data") {
    if (!String(current.service_name||"").toLocaleLowerCase("es").includes("alarm")) return NextResponse.json({ok:false,error:"Esta acción solo corresponde a contratos de Alarmas"},{status:400});
    const candidate={...previousData,tax_id:String(body.taxId||"").trim(),phone:String(body.phone||"").trim(),email:String(body.email||"").trim(),installation_address:String(body.installationAddress||"").trim(),iban:normalizeIban(body.iban),property_type:String(body.propertyType||"").trim(),installation_contact:String(body.installationContact||"").trim(),has_current_alarm:String(body.hasCurrentAlarm||previousData.has_current_alarm||"").trim(),current_alarm_company:String(body.currentAlarmCompany||previousData.current_alarm_company||"").trim(),manage_previous_alarm_cancellation:String(body.manageCancellation||previousData.manage_previous_alarm_cancellation||"").trim(),current_alarm_end_date:String(body.currentAlarmEndDate||previousData.current_alarm_end_date||"").trim(),customer_type:String(body.customerType||previousData.customer_type||"").trim()};
    const docs=Array.isArray(previousData.contract_documents)?previousData.contract_documents:[]; const check=alarmValidation(candidate,docs,false);
    if(check.missing.length||check.invalid.length) return NextResponse.json({ok:false,error:`No se pueden guardar los datos. ${check.missing.length?`Faltan: ${check.missing.join(", ")}. `:""}${check.invalid.length?`No válidos: ${check.invalid.join(", ")}.`:""}`},{status:400});
    nextData={...candidate,alarm_data_checked_at:now,alarm_data_checked_by:user.id,alarm_data_checked_by_name:user.name,backoffice_last_action_at:now,backoffice_last_action_by:user.id,backoffice_last_action_by_name:user.name};
    timelineType="contract_alarm_data_updated";timelineTitle="Datos de Alarmas actualizados";timelineDetail=`${current.external_reference||current.reference||current.id} · Datos obligatorios revisados por BackOffice`;
  } else if (action === "update_energy_data") {
    if (!String(current.service_name || "").toLocaleLowerCase("es").includes("energ")) {
      return NextResponse.json({ok:false,error:"Esta acción solo corresponde a contratos de Energía"},{status:400});
    }
    const candidate = {
      ...previousData,
      tax_id:String(body.taxId || "").trim(),
      birth_date:String(body.birthDate || "").trim(),
      phone:String(body.phone || "").trim(),
      email:String(body.email || "").trim(),
      supply_address:String(body.supplyAddress || "").trim(),
      cups:normalizeCups(body.cups),
      iban:normalizeIban(body.iban),
    };
    const docs = Array.isArray(previousData.contract_documents) ? previousData.contract_documents : [];
    const check = energyValidation(candidate, docs, false);
    if (check.missing.length || check.invalid.length) {
      return NextResponse.json({ok:false,error:`No se pueden guardar los datos. ${check.missing.length?`Faltan: ${check.missing.join(", ")}. `:""}${check.invalid.length?`No válidos: ${check.invalid.join(", ")}.`:""}`},{status:400});
    }
    const {data:duplicate}=await supabaseAdmin.from("one_contracts")
      .select("id,reference,external_reference")
      .neq("id",contractId)
      .in("status",["Borrador","Pendiente de tramitación","En tramitación","Tramitado en compañía","Pendiente de activación","Activo"])
      .filter("data->>cups","eq",check.cups)
      .maybeSingle();
    if (duplicate) return NextResponse.json({ok:false,error:`Ese CUPS ya está asociado a ${duplicate.external_reference || duplicate.reference || duplicate.id}.`},{status:409});
    nextData={...candidate,energy_data_checked_at:now,energy_data_checked_by:user.id,energy_data_checked_by_name:user.name,backoffice_last_action_at:now,backoffice_last_action_by:user.id,backoffice_last_action_by_name:user.name};
    timelineType="contract_energy_data_updated";
    timelineTitle="Datos de Energía actualizados";
    timelineDetail=`${current.external_reference || current.reference || current.id} · Datos obligatorios revisados por BackOffice`;
  } else if (action === "start_processing") {
    const legacyDirect = current.status === "Pendiente de activación" && current.data?.source === "direct_contract" && !current.data?.processing_completed_at;
    if (current.status !== "Pendiente de tramitación" && !legacyDirect) return NextResponse.json({ ok:false, error:"El contrato ya no está pendiente de tramitación" }, { status:409 });
    nextStatus = "En tramitación";
    nextData = {
      ...previousData,
      correction_requested:false,
      correction_reason:null,
      correction_resolved_at: previousData.correction_requested ? now : previousData.correction_resolved_at,
      backoffice_status:"En tramitación",
      backoffice_last_action_at:now,
      backoffice_last_action_by:user.id,
      backoffice_last_action_by_name:user.name,
      processing_started_at:now,
      processing_started_date:effectiveDate,
    };
    timelineType = "contract_processing_started";
    timelineTitle = "Tramitación iniciada";
    timelineDetail += " · En tramitación";
  } else if (action === "complete_processing" || action === "submit_company") {
    const legacyDirect = current.status === "Pendiente de activación" && current.data?.source === "direct_contract" && !current.data?.processing_completed_at;
    if (current.status !== "En tramitación" && current.status !== "Pendiente de tramitación" && !legacyDirect) return NextResponse.json({ ok:false, error:"El contrato no está en una fase tramitable" }, { status:409 });
    if (previousData.correction_requested) return NextResponse.json({ ok:false, error:"Hay una corrección pendiente. Resuélvela antes de tramitar en compañía." }, { status:409 });
    if (String(current.service_name || "").toLocaleLowerCase("es").includes("energ")) {
      const docs = Array.isArray(previousData.contract_documents) ? previousData.contract_documents : [];
      const check = energyValidation(previousData, docs, true);
      if (!check.ok) return NextResponse.json({ok:false,error:`Expediente de Energía no listo. ${check.missing.length?`Faltan datos: ${check.missing.join(", ")}. `:""}${check.invalid.length?`Datos no válidos: ${check.invalid.join(", ")}. `:""}${check.missingDocuments.length?`Faltan documentos: ${check.missingDocuments.join(", ")}. `:""}${check.unverifiedDocuments.length?`Sin verificar: ${check.unverifiedDocuments.join(", ")}.`:""}`},{status:409});
    }
    if (String(current.service_name || "").toLocaleLowerCase("es").includes("alarm")) {
      const docs=Array.isArray(previousData.contract_documents)?previousData.contract_documents:[]; const check=alarmValidation(previousData,docs,true);
      if(!check.ok) return NextResponse.json({ok:false,error:`Expediente de Alarmas no listo. ${check.missing.length?`Faltan datos: ${check.missing.join(", ")}. `:""}${check.invalid.length?`Datos no válidos: ${check.invalid.join(", ")}. `:""}${check.missingDocuments.length?`Faltan documentos: ${check.missingDocuments.join(", ")}. `:""}${check.unverifiedDocuments.length?`Sin verificar: ${check.unverifiedDocuments.join(", ")}.`:""}`},{status:409});
    }
    nextStatus = "Tramitado en compañía";
    const followUp = new Date(Date.now() + 2*24*60*60*1000).toISOString();
    nextData = {
      ...previousData,
      backoffice_status:"Tramitado en compañía",
      backoffice_last_action_at:now,
      backoffice_last_action_by:user.id,
      backoffice_last_action_by_name:user.name,
      processing_completed_at:now,
      submitted_company_at:now,
      submitted_company_date:effectiveDate,
      activation_check_due_at:followUp,
    };
    timelineType = "contract_submitted_company";
    timelineTitle = "Contrato tramitado en compañía";
    timelineDetail += " · Seguimiento de activación en 2 días";
  } else if (action === "mark_active") {
    if (current.status !== "Tramitado en compañía" && current.status !== "Pendiente de activación") return NextResponse.json({ok:false,error:"El contrato todavía no está tramitado en compañía"},{status:409});
    nextStatus = "Activo";
    nextData = {...previousData,activation_date:effectiveDate,activated_at:now,activated_by:user.id,activated_by_name:user.name,backoffice_status:"Activo",backoffice_last_action_at:now,backoffice_last_action_by:user.id,backoffice_last_action_by_name:user.name};
    timelineType = "contract_activated";
    timelineTitle = "Contrato activo";
    timelineDetail += " · Activado";
  } else if (action === "rollback_to_company") {
    if (current.status !== "Activo") return NextResponse.json({ok:false,error:"Solo un contrato Activo puede volver a Tramitado en compañía"},{status:409});
    const rollbackReason=String(body.reason||"").trim();
    if(rollbackReason.length<3) return NextResponse.json({ok:false,error:"El motivo del retroceso es obligatorio"},{status:400});
    nextStatus="Tramitado en compañía";
    nextData={...previousData,activation_date:null,backoffice_status:"Tramitado en compañía",backoffice_last_action_at:now,backoffice_last_action_by:user.id,backoffice_last_action_by_name:user.name,last_status_rollback_at:now,last_status_rollback_date:effectiveDate,last_status_rollback_reason:rollbackReason};
    timelineType="contract_status_rollback"; timelineTitle="Contrato devuelto a Tramitado en compañía"; timelineDetail=`${current.external_reference || current.reference || current.id} · ${rollbackReason}`;
  } else if (action === "add_note") {
    const text = String(body.text || "").trim();
    if (text.length < 2) return NextResponse.json({ ok:false, error:"Escribe una nota" }, { status:400 });
    const notes = Array.isArray(previousData.backoffice_notes) ? previousData.backoffice_notes : [];
    nextData = {
      ...previousData,
      backoffice_notes:[...notes,{id:crypto.randomUUID(),text,created_at:now,actor_user_id:user.id,actor_name:user.name}],
      backoffice_last_action_at:now,
      backoffice_last_action_by:user.id,
      backoffice_last_action_by_name:user.name,
    };
    timelineType = "contract_backoffice_note";
    timelineTitle = "Nota BackOffice";
    timelineDetail = text;
  } else if (action === "request_correction") {
    const reason = String(body.reason || "").trim();
    if (reason.length < 3) return NextResponse.json({ ok:false, error:"Indica el motivo de la corrección" }, { status:400 });
    if (["Tramitado en compañía","Pendiente de activación","Activo","Anulado","Baja"].includes(String(current.status))) {
      return NextResponse.json({ ok:false, error:"Este contrato ya no está en una fase de corrección de tramitación" }, { status:409 });
    }
    nextStatus = "Pendiente de tramitación";
    nextData = {
      ...previousData,
      correction_requested:true,
      correction_reason:reason,
      correction_requested_at:now,
      correction_requested_date:effectiveDate,
      correction_requested_by:user.id,
      correction_requested_by_name:user.name,
      backoffice_status:"correction_requested",
      backoffice_last_action_at:now,
      backoffice_last_action_by:user.id,
      backoffice_last_action_by_name:user.name,
    };
    timelineType = "contract_correction_requested";
    timelineTitle = "Corrección solicitada";
    timelineDetail = reason;
  } else {
    return NextResponse.json({ ok:false, error:"Acción no válida" }, { status:400 });
  }

  if (nextStatus !== current.status) nextData = addMovement(nextData, String(current.status||""), String(nextStatus||""), String(body.reason||"").trim());
  else if (action === "request_correction") nextData = addMovement(nextData, String(current.status||""), "Corrección solicitada", String(body.reason||"").trim());

  const { data: updated, error } = await supabaseAdmin.from("one_contracts").update({
    status:nextStatus,
    data:nextData,
    updated_at:now,
  }).eq("id", contractId).select(fields).single();
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });

  try {
    await supabaseAdmin.from("one_client_timeline").insert({
      client_id:current.client_id,
      type:timelineType,
      title:timelineTitle,
      detail:timelineDetail,
      actor_user_id:user.id,
      actor_name:user.name,
      created_at:now,
    });
  } catch {}

  return NextResponse.json({ ok:true, contract:updated });
}
