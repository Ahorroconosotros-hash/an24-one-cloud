"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { isValidEmail, isValidIban, isValidSpanishCups, isValidSpanishPhone, isRealPastDate, normalizeCups, normalizeIban , getAlarmRequiredDocuments} from "@/lib/contract-validation";
import styles from "./Contrato360.module.css";

type Data = {
  contract:any;
  client:any;
  commercials:any[];
  viewer:{id:string;name:string;role:string};
};

type ContractDocument = {
  id:string; type:string; name:string; size?:number; uploaded_at?:string; uploaded_by_name?:string; url?:string; verification_status?:"Pendiente"|"Verificado"|"Incorrecto"; verified_by_name?:string; verified_at?:string;
};

type BackofficeNote = {
  id:string;
  text:string;
  created_at:string;
  actor_user_id?:string;
  actor_name?:string;
};

export default function ContratoPage(){
  const {id}=useParams<{id:string}>();
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState("");
  const [selected,setSelected]=useState("");
  const [reason,setReason]=useState("");
  const [reassignmentDate,setReassignmentDate]=useState("");
  const [showReassign,setShowReassign]=useState(false);
  const [saving,setSaving]=useState(false);
  const [movementDate,setMovementDate]=useState(()=>new Date().toISOString().slice(0,10));
  const [movementReason,setMovementReason]=useState("");
  const [note,setNote]=useState("");
  const [correction,setCorrection]=useState("");
  const [opsSaving,setOpsSaving]=useState(false);
  const [documents,setDocuments]=useState<ContractDocument[]>([]);
  const [documentType,setDocumentType]=useState("DNI / NIE");
  const [uploading,setUploading]=useState(false);
  const [editTaxId,setEditTaxId]=useState("");
  const [editBirthDate,setEditBirthDate]=useState("");
  const [editPhone,setEditPhone]=useState("");
  const [editEmail,setEditEmail]=useState("");
  const [editAddress,setEditAddress]=useState("");
  const [editCups,setEditCups]=useState("");
  const [editIban,setEditIban]=useState("");
  const [editPropertyType,setEditPropertyType]=useState("");
  const [editInstallationContact,setEditInstallationContact]=useState("");
  const [editHasCurrentAlarm,setEditHasCurrentAlarm]=useState("");
  const [editCurrentAlarmCompany,setEditCurrentAlarmCompany]=useState("");
  const [editManageCancellation,setEditManageCancellation]=useState("");
  const [editCurrentAlarmEndDate,setEditCurrentAlarmEndDate]=useState("");
  const [dataSaving,setDataSaving]=useState(false);

  async function load(){
    setError("");
    const {data:{session}}=await supabaseBrowser.auth.getSession();
    const r=await fetch(`/api/contracts?contractId=${encodeURIComponent(id)}`,{
      headers:{Authorization:`Bearer ${session?.access_token||""}`},
      cache:"no-store"
    });
    const j=await r.json();
    if(!r.ok){setError(j.error||"No se pudo abrir el contrato");return;}
    setData(j);
    setSelected(j.contract.commercial_user_id||"");
    const c=j.client||{};
    const cd=j.contract?.data||{};
    setEditTaxId(String(cd.tax_id||c.taxId||""));
    setEditBirthDate(String(cd.birth_date||c.birthDate||""));
    setEditPhone(String(cd.phone||c.mobile||c.phone||""));
    setEditEmail(String(cd.email||c.email||""));
    setEditAddress(String(cd.supply_address||[c.address,c.postalCode,c.city,c.province].filter(Boolean).join(", ")||""));
    setEditCups(String(cd.cups||""));
    setEditIban(String(cd.iban||c.iban||""));
    setEditPropertyType(String(cd.property_type||""));
    setEditInstallationContact(String(cd.installation_contact||""));
    setEditHasCurrentAlarm(String(cd.has_current_alarm||""));
    setEditCurrentAlarmCompany(String(cd.current_alarm_company||""));
    setEditManageCancellation(String(cd.manage_previous_alarm_cancellation||""));
    setEditCurrentAlarmEndDate(String(cd.current_alarm_end_date||""));
    try{
      const dr=await fetch(`/api/contract-documents?contractId=${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${session?.access_token||""}`},cache:"no-store"});
      const dj=await dr.json();
      if(dr.ok&&dj.ok) setDocuments(dj.documents||[]);
    }catch{}
  }

  useEffect(()=>{load()},[id]);

  async function reassign(){
    if(!selected||!reason.trim()||!reassignmentDate) return;
    setSaving(true); setError("");
    const {data:{session}}=await supabaseBrowser.auth.getSession();
    const r=await fetch('/api/contracts',{
      method:'PATCH',
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${session?.access_token||""}`},
      body:JSON.stringify({contractId:id,commercialUserId:selected,reason,effectiveDate:reassignmentDate})
    });
    const j=await r.json();
    setSaving(false);
    if(!r.ok){setError(j.error||'No se pudo reasignar');return;}
    setReason(''); setReassignmentDate(''); setShowReassign(false);
    await load();
  }

  async function backofficeAction(action:string, extra:Record<string,any>={}){
    setOpsSaving(true);
    setError("");
    try{
      const {data:{session}}=await supabaseBrowser.auth.getSession();
      const r=await fetch('/api/backoffice-contracts',{
        method:'PATCH',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${session?.access_token||""}`},
        body:JSON.stringify({contractId:id,action,...extra})
      });
      const j=await r.json();
      if(!r.ok||!j.ok){setError(j.error||'No se pudo completar la acción');return false;}
      await load();
      return true;
    }finally{
      setOpsSaving(false);
    }
  }

  async function workflowAction(action:string, requireReason=false){
    if(!movementDate){setError("La fecha efectiva del movimiento es obligatoria.");return;}
    if(requireReason&&!movementReason.trim()){setError("Indica el motivo del cambio de estado.");return;}
    const ok=await backofficeAction(action,{effectiveDate:movementDate,reason:movementReason.trim()});
    if(ok) setMovementReason("");
  }

  async function saveNote(){
    const text=note.trim();
    if(!text) return;
    const ok=await backofficeAction('add_note',{text});
    if(ok) setNote('');
  }

  async function requestCorrection(){
    const text=correction.trim();
    if(text.length<3){setError('Indica qué debe corregirse.');return;}
    if(!movementDate){setError('La fecha efectiva de la corrección es obligatoria.');return;}
    const ok=await backofficeAction('request_correction',{reason:text,effectiveDate:movementDate});
    if(ok) setCorrection('');
  }


  async function verifyDocument(documentId:string, verificationStatus:"Verificado"|"Incorrecto"|"Pendiente") {
    setOpsSaving(true); setError("");
    try {
      const {data:{session}}=await supabaseBrowser.auth.getSession();
      const r=await fetch("/api/contract-documents",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session?.access_token||""}`},body:JSON.stringify({contractId:id,documentId,verificationStatus})});
      const j=await r.json(); if(!r.ok||!j.ok){setError(j.error||"No se pudo verificar el documento");return;}
      await load();
    } finally { setOpsSaving(false); }
  }

  async function saveEnergyMandatoryData(){
    setError("");
    const missing=[] as string[];
    const invalid=[] as string[];
    if(!editTaxId.trim()) missing.push("DNI/NIE/CIF");
    if(!editBirthDate.trim()) missing.push("Fecha de nacimiento"); else if(!isRealPastDate(editBirthDate)) invalid.push("Fecha de nacimiento");
    if(!editPhone.trim()) missing.push("Teléfono"); else if(!isValidSpanishPhone(editPhone)) invalid.push("Teléfono");
    if(!editEmail.trim()) missing.push("Email"); else if(!isValidEmail(editEmail)) invalid.push("Email");
    if(!editAddress.trim()) missing.push("Domicilio de suministro");
    if(!editCups.trim()) missing.push("CUPS"); else if(!isValidSpanishCups(editCups)) invalid.push("CUPS");
    if(!editIban.trim()) missing.push("IBAN"); else if(!isValidIban(editIban)) invalid.push("IBAN");
    if(missing.length||invalid.length){setError(`${missing.length?`Faltan: ${missing.join(", ")}. `:""}${invalid.length?`No válidos: ${invalid.join(", ")}.`:""}`);return;}
    setDataSaving(true);
    try{
      const ok=await backofficeAction('update_energy_data',{taxId:editTaxId.trim(),birthDate:editBirthDate,phone:editPhone.trim(),email:editEmail.trim(),supplyAddress:editAddress.trim(),cups:normalizeCups(editCups),iban:normalizeIban(editIban)});
      if(ok) setError("");
    }finally{setDataSaving(false);}
  }

  async function saveAlarmMandatoryData(){
    setError(""); setDataSaving(true);
    try{await backofficeAction('update_alarm_data',{taxId:editTaxId.trim(),phone:editPhone.trim(),email:editEmail.trim(),installationAddress:editAddress.trim(),iban:normalizeIban(editIban),propertyType:editPropertyType.trim(),installationContact:editInstallationContact.trim(),hasCurrentAlarm:editHasCurrentAlarm,currentAlarmCompany:editCurrentAlarmCompany.trim(),manageCancellation:editManageCancellation,currentAlarmEndDate:editCurrentAlarmEndDate,customerType:client?.type||contract.data?.customer_type||''});}finally{setDataSaving(false);}
  }

  async function uploadDocument(file:File|null){
    if(!file) return;
    setUploading(true); setError("");
    try{
      const {data:{session}}=await supabaseBrowser.auth.getSession();
      const form=new FormData(); form.append("contractId",id); form.append("documentType",documentType); form.append("file",file);
      const r=await fetch("/api/contract-documents",{method:"POST",headers:{Authorization:`Bearer ${session?.access_token||""}`},body:form});
      const j=await r.json();
      if(!r.ok||!j.ok){setError(j.error||"No se pudo subir el documento");return;}
      await load();
    }finally{setUploading(false);}
  }

  if(error&&!data) return <main className={styles.page}><h2>{error}</h2><Link href="/clientes">Volver a clientes</Link></main>;
  if(!data) return <main className={styles.page}>Cargando contrato…</main>;

  const {contract,client,viewer}=data;
  const serviceName=contract.service?.name||contract.service?.category||contract.service_name||'Contrato';
  const provider=contract.provider||contract.service?.provider||'Pendiente';
  const product=contract.data?.product_name||contract.product_name||contract.service?.product||contract.product||'Pendiente';
  const responsible=contract.commercial_name||'DIRECTO AN24';
  const origin=contract.original_commercial_name||responsible;
  const canReassign=["Tramitado en compañía","Pendiente de activación","Pendiente activación","Activo"].includes(String(contract.status||""));
  const reassignmentHistory=Array.isArray(contract.data?.commercial_reassignment_history)?contract.data.commercial_reassignment_history:[];



  const start=fmtDate(contract.start_date||contract.created_at);
  const ref=contract.external_reference||contract.reference||contract.id;
  const clientHref=`/clientes/${client?.id||contract.client_id}`;
  const isOps=viewer.role==='BackOffice'||viewer.role==='Administrador';
  const status=String(contract.status||'Contrato');
  const isPending=status==='Pendiente de tramitación';
  const isProcessing=status==='En tramitación';
  const isActivation=status==='Pendiente de activación';
  const isCompanySubmitted=status==='Tramitado en compañía';
  const isClosed=['Activo','Anulado','Baja'].includes(status);
  const correctionOpen=Boolean(contract.data?.correction_requested);
  const correctionReason=String(contract.data?.correction_reason||'');
  const notes:BackofficeNote[]=Array.isArray(contract.data?.backoffice_notes) ? contract.data.backoffice_notes : [];
  const movementHistory:any[]=Array.isArray(contract.data?.status_history) ? contract.data.status_history : [];

  const contractTraceability=[
    ...movementHistory.map((m:any)=>({...m,trace_type:"status"})),
    ...reassignmentHistory.map((r:any)=>({...r,trace_type:"commercial"})),
  ].sort((a:any,b:any)=>{
    const da=new Date(a.effective_date||a.recorded_at||0).getTime();
    const db=new Date(b.effective_date||b.recorded_at||0).getTime();
    return db-da;
  });
  const energy=serviceName.toLocaleLowerCase("es").includes("energ");
  const alarm=serviceName.toLocaleLowerCase("es").includes("alarm");
  const contactPhone=contract.data?.phone||client?.mobile||client?.phone||"";
  const fullAddress=(alarm?contract.data?.installation_address:contract.data?.supply_address)||[client?.address,client?.postalCode,client?.city,client?.province].filter(Boolean).join(", ");
  const identityDate=contract.data?.birth_date||(client?.type==="Empresa" ? client?.incorporationDate : client?.birthDate);
  const taxId=contract.data?.tax_id||client?.taxId||"";
  const email=contract.data?.email||client?.email||"";
  const iban=contract.data?.iban||client?.iban||"";
  const cups=contract.data?.cups||"";
  const alarmHasCurrent=String(contract.data?.has_current_alarm||"");
  const alarmDataForDocs={...contract.data,customer_type:contract.data?.customer_type||client?.type||""};
  const dataChecks=energy ? [["DNI / CIF",taxId],["Fecha nacimiento",identityDate],["Teléfono",contactPhone],["Email",email],["Dirección suministro",fullAddress],["CUPS",cups],["IBAN",iban]] : alarm ? [["DNI / CIF",taxId],["Teléfono",contactPhone],["Email",email],["Domicilio instalación",fullAddress],["IBAN",iban],["Tipo inmueble",contract.data?.property_type],["Contacto instalación",contract.data?.installation_contact],["¿Tiene alarma actualmente?",alarmHasCurrent],...(alarmHasCurrent==="Sí"?[["Compañía actual",contract.data?.current_alarm_company],["¿Gestionamos baja?",contract.data?.manage_previous_alarm_cancellation]]:[])] : [["DNI / CIF",taxId],["Teléfono",contactPhone],["Email",email],["Dirección",fullAddress],["IBAN",iban]];
  const completeData=dataChecks.filter(([,v])=>String(v||"").trim()).length;
  const requiredDocs=energy ? ["DNI / NIE","Factura","Titularidad bancaria"] : alarm ? getAlarmRequiredDocuments(alarmDataForDocs) : ["DNI / NIE","Titularidad bancaria"];
  const docMatch=(d:ContractDocument,t:string)=>{const a=String(d.type||"").toLowerCase();const r=t.toLowerCase();return r==="dni / nie"?(a==="dni / nie"||a==="cif"||a==="dni / cif"):a===r};
  const completeDocs=requiredDocs.filter(t=>documents.some(d=>docMatch(d,t))).length;
  const verifiedDocs=requiredDocs.filter(t=>documents.some(d=>docMatch(d,t)&&d.verification_status==="Verificado")).length;
  const expedienteReady=completeData===dataChecks.length&&completeDocs===requiredDocs.length&&verifiedDocs===requiredDocs.length;

  return <main className={styles.page}>
    <div className={styles.crumb}><Link href={clientHref}>Cliente 360º</Link><span>/</span><strong>Contrato 360º</strong></div>

    <header className={styles.hero}>
      <div className={styles.avatar}>{serviceInitial(serviceName)}</div>
      <div className={styles.identity}>
        <div className={styles.titleLine}><span className={styles.eyebrow}>CONTRATO 360º</span><span className={styles.status}>{status}</span></div>
        <h1>{serviceName}</h1>
        <p>{client?.name||'Cliente'} · {ref}</p>
        <div className={styles.ownerLine}>
          <span>Responsable <strong>{responsible}</strong></span>
          <span>Proveedor <strong>{provider}</strong></span>
          <span>Inicio <strong>{start}</strong></span>
        </div>
      </div>
    </header>

    <div className={styles.quickBar}>
      <Link href={clientHref}>← Volver al cliente</Link>
      <Link href={`${clientHref}#timeline`}>Ver timeline</Link>
      {isOps&&<Link href="/backoffice">Ir a Tramitaciones</Link>}
      {(viewer.role==='Administrador'||viewer.role==='BackOffice')&&canReassign&&<button onClick={()=>setShowReassign(v=>!v)} style={{border:'1px solid #e6ddd6',background:'#fff',borderRadius:9,padding:'9px 12px',font:'inherit',fontSize:11,fontWeight:900,cursor:'pointer'}}>{showReassign?'Cerrar cambio':'Cambiar comercial'}</button>}
      <Link className={styles.primary} href={clientHref}>Abrir Cliente 360º</Link>
    </div>

    {showReassign&&(viewer.role==='Administrador'||viewer.role==='BackOffice')&&canReassign&&<div style={{display:'grid',gridTemplateColumns:'1.1fr .7fr 1.5fr auto',gap:8,alignItems:'center',border:'1px solid #eee4dc',background:'#fff',borderRadius:12,padding:'10px 12px',marginBottom:12}}>
      <select value={selected} onChange={e=>setSelected(e.target.value)} className={styles.input}>
        <option value="">Nuevo comercial</option>
        {data.commercials.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input type="date" value={reassignmentDate} onChange={e=>setReassignmentDate(e.target.value)} className={styles.input}/>
      <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo del cambio" className={styles.input}/>
      <button onClick={reassign} disabled={saving||!selected||!reason.trim()||!reassignmentDate} className={styles.button}>{saving?'Guardando…':'Cambiar'}</button>
      {error&&<p className={styles.error} style={{gridColumn:'1 / -1',margin:0}}>{error}</p>}
    </div>}

    <section className={styles.usefulInfo}>
      <Info label="Cliente" value={client?.name||'Pendiente'} />
      <Info label="Proveedor" value={provider} />
      <Info label="Producto" value={product} />
      <Info label="Responsable" value={responsible} />
      <Info label="Estado" value={status} />
    </section>

    {isOps&&<section className={styles.section} style={{borderColor:'#f0d8ca',background:'linear-gradient(180deg,#fff 0%,#fffaf7 100%)'}}>
      <div className={styles.sectionHead}>
        <div>
          <span>GESTIÓN BACKOFFICE</span>
          <h2>Mesa de trabajo del contrato</h2>
          <p>Revisa el expediente, deja trazabilidad y mueve el contrato por la tramitación sin salir de Contrato 360º.</p>
        </div>
        <span style={{display:'inline-flex',alignItems:'center',border:'1px solid #ffd1bd',background:'#fff2ea',color:'#b44825',borderRadius:999,padding:'7px 10px',fontSize:11,fontWeight:900,whiteSpace:'nowrap'}}>{workLabel(status,correctionOpen)}</span>
      </div>

      {correctionOpen&&<div style={{display:'flex',justifyContent:'space-between',gap:14,alignItems:'center',border:'1px solid #f1bdab',background:'#fff3ed',borderRadius:12,padding:'12px 14px',marginBottom:14}}>
        <div><span style={{display:'block',fontSize:10,letterSpacing:'.08em',color:'#bf4725',fontWeight:900}}>CORRECCIÓN SOLICITADA</span><strong style={{display:'block',marginTop:4,fontSize:13}}>{correctionReason||'Pendiente de corrección'}</strong></div>
        <small style={{color:'#8c7166',fontSize:11}}>{contract.data?.correction_requested_by_name?`Solicitada por ${contract.data.correction_requested_by_name}`:''}</small>
      </div>}

      {alarm&&isOps&&<article style={{border:'1px solid #f0d8ca',background:'#fffaf7',borderRadius:14,padding:16,marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',marginBottom:12}}><div><span style={{fontSize:10,letterSpacing:'.09em',color:'#e65735',fontWeight:950}}>CONTROL BACKOFFICE · ALARMAS</span><strong style={{display:'block',marginTop:5,fontSize:16}}>Datos obligatorios para tramitar</strong></div><button className={styles.button} disabled={dataSaving} onClick={saveAlarmMandatoryData}>{dataSaving?'Guardando…':'Guardar datos revisados'}</button></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:9}}>
          <EditField label="DNI / NIE / CIF *" value={editTaxId} onChange={setEditTaxId}/><EditField label="Teléfono *" value={editPhone} onChange={setEditPhone}/><EditField label="Email *" value={editEmail} onChange={setEditEmail}/>
          <div style={{gridColumn:'span 2'}}><EditField label="Domicilio de instalación *" value={editAddress} onChange={setEditAddress}/></div><EditField label="Tipo de inmueble *" value={editPropertyType} onChange={setEditPropertyType}/>
          <EditField label="Contacto de instalación *" value={editInstallationContact} onChange={setEditInstallationContact}/><div style={{gridColumn:'span 2'}}><EditField label="IBAN *" value={editIban} onChange={v=>setEditIban(normalizeIban(v))} mono maxLength={34}/></div>
          <label style={{fontSize:10,fontWeight:900,color:'#8c817a'}}>¿TIENE ALARMA ACTUALMENTE? *<select value={editHasCurrentAlarm} onChange={e=>setEditHasCurrentAlarm(e.target.value)} className={styles.input}><option value="">Seleccionar</option><option>Sí</option><option>No</option></select></label>
          {editHasCurrentAlarm==="Sí"&&<><EditField label="Compañía actual *" value={editCurrentAlarmCompany} onChange={setEditCurrentAlarmCompany}/><label style={{fontSize:10,fontWeight:900,color:'#8c817a'}}>¿GESTIONAMOS LA BAJA? *<select value={editManageCancellation} onChange={e=>setEditManageCancellation(e.target.value)} className={styles.input}><option value="">Seleccionar</option><option>Sí</option><option>No</option></select></label><EditField label="Fin permanencia / contrato" value={editCurrentAlarmEndDate} onChange={setEditCurrentAlarmEndDate} type="date"/></>}
        </div>
      </article>}

      {energy&&<article style={{border:'1px solid #f0d8ca',background:'#fff',borderRadius:14,padding:16,marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start',flexWrap:'wrap',marginBottom:14}}>
          <div><span style={{display:'block',fontSize:10,letterSpacing:'.09em',color:'#e65735',fontWeight:950}}>DATOS OBLIGATORIOS · ENERGÍA</span><strong style={{display:'block',marginTop:5,fontSize:16}}>Completar o corregir antes de tramitar</strong><small style={{display:'block',marginTop:4,color:'#8a7f77',fontSize:11}}>Todos estos datos son obligatorios. BackOffice puede corregirlos antes de emitir a compañía.</small></div>
          <button disabled={dataSaving||opsSaving} onClick={saveEnergyMandatoryData} className={styles.button}>{dataSaving?'Guardando…':'Guardar datos del expediente'}</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10}}>
          <EditField label="DNI / NIE / CIF *" value={editTaxId} onChange={setEditTaxId} />
          <EditField label="Fecha nacimiento *" value={editBirthDate} onChange={setEditBirthDate} type="date" invalid={Boolean(editBirthDate&&!isRealPastDate(editBirthDate))} hint={editBirthDate&&!isRealPastDate(editBirthDate)?'Fecha no válida':''}/>
          <EditField label="Teléfono *" value={editPhone} onChange={setEditPhone} invalid={Boolean(editPhone&&!isValidSpanishPhone(editPhone))} hint={editPhone&&!isValidSpanishPhone(editPhone)?'Teléfono español no válido':''}/>
          <EditField label="Email *" value={editEmail} onChange={setEditEmail} invalid={Boolean(editEmail&&!isValidEmail(editEmail))} hint={editEmail&&!isValidEmail(editEmail)?'Email no válido':''}/>
          <div style={{gridColumn:'span 2'}}><EditField label="Domicilio de suministro *" value={editAddress} onChange={setEditAddress}/></div>
          <EditField label="CUPS *" value={editCups} onChange={v=>setEditCups(normalizeCups(v))} mono maxLength={22} invalid={Boolean(editCups&&!isValidSpanishCups(editCups))} hint={editCups?(isValidSpanishCups(editCups)?'Formato válido':'Debe empezar por ES y tener 20–22 caracteres'):'Obligatorio · único en ONE'}/>
          <div style={{gridColumn:'span 2'}}><EditField label="IBAN *" value={editIban} onChange={v=>setEditIban(normalizeIban(v))} mono maxLength={34} invalid={Boolean(editIban&&!isValidIban(editIban))} hint={editIban?(isValidIban(editIban)?'IBAN válido':'IBAN no válido · España: ES + 22 dígitos'):'Obligatorio'}/></div>
        </div>
      </article>}



      {energy&&<article style={{border:'1px solid #f0d8ca',background:'linear-gradient(135deg,#fff8f3 0%,#fff 100%)',borderRadius:14,padding:16,marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:12}}>
          <div><span style={{display:'block',fontSize:10,letterSpacing:'.09em',color:'#e65735',fontWeight:950}}>CONTROL RÁPIDO · ENERGÍA</span><strong style={{display:'block',marginTop:5,fontSize:16}}>Datos críticos para tramitar</strong><small style={{display:'block',marginTop:4,color:'#8a7f77',fontSize:11}}>BackOffice debe contrastar estos datos con DNI, factura y titularidad bancaria antes de emitir a compañía.</small></div>
          <span style={{display:'inline-flex',padding:'8px 11px',borderRadius:999,border:`1px solid ${expedienteReady?'#cfe5d8':'#efbea9'}`,background:expedienteReady?'#f0f8f3':'#fff4ef',color:expedienteReady?'#246342':'#a83f20',fontSize:11,fontWeight:950}}>{expedienteReady?'✓ LISTO PARA COMPAÑÍA':'REVISIÓN PENDIENTE'}</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1.6fr 1.45fr',gap:10}}>
          <div style={{border:'1px solid #eee4dc',background:'#fff',borderRadius:11,padding:'12px 13px'}}><span style={{display:'block',fontSize:9,letterSpacing:'.08em',color:'#9a8e86',fontWeight:900}}>DNI / NIE / CIF</span><strong style={{display:'block',marginTop:6,fontSize:14,overflowWrap:'anywhere'}}>{taxId||'FALTA'}</strong></div>
          <div style={{border:'1px solid #eee4dc',background:'#fff',borderRadius:11,padding:'12px 13px'}}><span style={{display:'block',fontSize:9,letterSpacing:'.08em',color:'#9a8e86',fontWeight:900}}>DOMICILIO DE SUMINISTRO</span><strong style={{display:'block',marginTop:6,fontSize:13,lineHeight:1.35,overflowWrap:'anywhere'}}>{fullAddress||'FALTA'}</strong></div>
          <div style={{border:'1px solid #eee4dc',background:'#fff',borderRadius:11,padding:'12px 13px'}}><span style={{display:'block',fontSize:9,letterSpacing:'.08em',color:'#9a8e86',fontWeight:900}}>CUPS</span><strong style={{display:'block',marginTop:6,fontSize:14,fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',overflowWrap:'anywhere'}}>{cups||'FALTA'}</strong></div>
        </div>
      </article>}

      {alarm&&<article style={{border:'1px solid #f0d8ca',background:'linear-gradient(135deg,#fff8f3 0%,#fff 100%)',borderRadius:14,padding:16,marginBottom:14}}>
        <span style={{display:'block',fontSize:10,letterSpacing:'.09em',color:'#e65735',fontWeight:950}}>SITUACIÓN ALARMA ANTERIOR</span>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:9,marginTop:10}}>
          <Verify label="Tiene alarma actual" value={contract.data?.has_current_alarm||'FALTA'} />
          <Verify label="Compañía actual" value={contract.data?.has_current_alarm==="Sí"?(contract.data?.current_alarm_company||'FALTA'):'No aplica'} />
          <Verify label="Gestionamos baja" value={contract.data?.has_current_alarm==="Sí"?(contract.data?.manage_previous_alarm_cancellation||'FALTA'):'No aplica'} />
          <Verify label="Fin permanencia / contrato" value={contract.data?.current_alarm_end_date?fmtDate(contract.data.current_alarm_end_date):'No informado'} />
        </div>
      </article>}

      <div style={{display:'grid',gridTemplateColumns:'1.35fr .9fr',gap:14,marginBottom:14}}>
        <article style={{border:'1px solid #eee4dc',background:'#fff',borderRadius:14,padding:16}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start',marginBottom:12}}>
            <div><span style={{display:'block',fontSize:10,letterSpacing:'.08em',color:'#e65735',fontWeight:900}}>DATOS DEL TITULAR</span><strong style={{display:'block',marginTop:5,fontSize:15}}>Información para verificar</strong></div>
            <span style={{fontSize:11,fontWeight:900,color:completeData===dataChecks.length?'#246342':'#a83f20'}}>{completeData}/{dataChecks.length} completos</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:9}}>
            <Verify label="DNI / CIF" value={taxId} />
            <Verify label={client?.type==='Empresa'?'Constitución':'Nacimiento'} value={fmtDate(identityDate)} />
            <Verify label="Teléfono" value={contactPhone} />
            <Verify label="Email" value={email} />
            <Verify label="Dirección suministro" value={fullAddress} />
            {energy&&<Verify label="CUPS" value={cups} mono />}
            <Verify label="IBAN" value={iban} mono />
          </div>
          <div style={{marginTop:10,fontSize:11,color:'#8a7f77'}}>Referencia ONE: <strong style={{color:'#2f2925'}}>{client?.reference||'—'}</strong> · Tipo: <strong style={{color:'#2f2925'}}>{client?.type||'—'}</strong></div>
        </article>

        <article style={{border:'1px solid #eee4dc',background:'#fff',borderRadius:14,padding:16}}>
          <span style={{display:'block',fontSize:10,letterSpacing:'.08em',color:'#e65735',fontWeight:900}}>CHECKLIST DE EXPEDIENTE</span>
          <strong style={{display:'block',margin:'5px 0 10px',fontSize:15}}>Preparación para proveedor</strong>
          <div style={{display:'grid',gap:7}}>
            {requiredDocs.map(t=>{const doc=documents.find(d=>docMatch(d,t));const ok=Boolean(doc);const verified=doc?.verification_status==='Verificado'; return <div key={t} style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:12,padding:'7px 9px',border:'1px solid #eee4dc',borderRadius:9,background:'#fcfbfa'}}><span>{t}</span><strong style={{color:verified?'#246342':ok?'#9b6a1f':'#a83f20'}}>{verified?'Verificado':ok?'Pendiente verificar':'Falta'}</strong></div>})}
          </div>
          <div style={{marginTop:10,padding:'9px 10px',borderRadius:9,background:(completeData===dataChecks.length&&completeDocs===requiredDocs.length)?'#f0f8f3':'#fff4ef',color:(completeData===dataChecks.length&&completeDocs===requiredDocs.length)?'#246342':'#8d4027',fontSize:11,fontWeight:800}}>
            {expedienteReady?'Expediente completo y verificado. Listo para tramitar en compañía.':`Datos ${completeData}/${dataChecks.length} · Documentos ${completeDocs}/${requiredDocs.length} · Verificados ${verifiedDocs}/${requiredDocs.length}`}
          </div>
        </article>
      </div>

      <article style={{border:'1px solid #eee4dc',background:'#fff',borderRadius:14,padding:16,marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}>
          <div><span style={{display:'block',fontSize:10,letterSpacing:'.08em',color:'#e65735',fontWeight:900}}>DOCUMENTACIÓN</span><strong style={{display:'block',marginTop:5,fontSize:15}}>Documentos del contrato</strong></div>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <select value={documentType} onChange={e=>setDocumentType(e.target.value)} className={styles.input}>
              {['DNI / NIE','CIF','DNI representante','Escrituras','SEPA firmado','Titularidad bancaria','Factura anterior','Factura','Contrato firmado','Autorización','Otro'].map(x=><option key={x}>{x}</option>)}
            </select>
            <label style={{display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'10px 13px',borderRadius:9,background:'linear-gradient(135deg,#ffb42c,#ef432f)',color:'#fff',fontSize:12,fontWeight:900,cursor:uploading?'wait':'pointer',opacity:uploading?.55:1}}>
              {uploading?'Subiendo…':'+ Subir documento'}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" disabled={uploading} onChange={e=>{uploadDocument(e.target.files?.[0]||null); e.currentTarget.value='';}} style={{display:'none'}}/>
            </label>
          </div>
        </div>
        {documents.length===0?<div style={{marginTop:12,padding:18,border:'1px dashed #e3d8d1',borderRadius:11,color:'#8c817a',fontSize:12,textAlign:'center'}}>No hay documentación adjunta a este contrato.</div>:
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:9,marginTop:12}}>{[...documents].reverse().map(d=><div key={d.id} style={{border:'1px solid #eee4dc',borderRadius:11,padding:'10px 12px',background:'#fcfbfa'}}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><div style={{minWidth:0}}><strong style={{display:'block',fontSize:12}}>{d.type}</strong><span style={{display:'block',marginTop:3,fontSize:11,color:'#8c817a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name}</span></div>{d.url?<a href={d.url} target="_blank" rel="noreferrer" style={{fontSize:11,fontWeight:900,color:'#e65735',textDecoration:'none'}}>Abrir</a>:<span style={{fontSize:11,color:'#999'}}>Sin vista</span>}</div><div style={{display:'flex',gap:6,alignItems:'center',marginTop:9,flexWrap:'wrap'}}><span style={{fontSize:10,fontWeight:900,color:d.verification_status==='Verificado'?'#246342':d.verification_status==='Incorrecto'?'#a83f20':'#8c817a'}}>{d.verification_status||'Pendiente'}</span>{isOps&&<><button disabled={opsSaving} onClick={()=>verifyDocument(d.id,'Verificado')} style={{border:'1px solid #cfe5d8',background:'#f0f8f3',color:'#246342',borderRadius:8,padding:'6px 8px',fontSize:10,fontWeight:900,cursor:'pointer'}}>✓ Verificar</button><button disabled={opsSaving} onClick={()=>verifyDocument(d.id,'Incorrecto')} style={{border:'1px solid #efbea9',background:'#fff4ef',color:'#a83f20',borderRadius:8,padding:'6px 8px',fontSize:10,fontWeight:900,cursor:'pointer'}}>✕ Incorrecto</button></>}</div></div>)}</div>}
      </article>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:14,alignItems:'stretch'}}>
        <article style={{border:'1px solid #eee4dc',background:'#fff',borderRadius:14,padding:16,minWidth:0,display:'flex',flexDirection:'column'}}>
          <span style={{display:'block',fontSize:10,letterSpacing:'.08em',textTransform:'uppercase',color:'#e65735',fontWeight:900}}>FASE OPERATIVA</span>
          <strong style={{display:'block',margin:'7px 0 8px',fontSize:15}}>{status}</strong>
          <p style={{margin:'0 0 14px',color:'#82776f',fontSize:12,lineHeight:1.55}}>{workHelp(status,correctionOpen)}</p>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginTop:'auto'}}>
            <div style={{width:'100%',display:'grid',gap:8,marginBottom:8}}>
              <label style={{fontSize:10,fontWeight:900,color:'#8c817a'}}>FECHA EFECTIVA DEL MOVIMIENTO *<input type="date" value={movementDate} onChange={e=>setMovementDate(e.target.value)} style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:5,border:'1px solid #ddd7d1',borderRadius:9,padding:'8px 9px',font:'inherit'}}/></label>
              {status==='Activo'&&<label style={{fontSize:10,fontWeight:900,color:'#8c817a'}}>MOTIVO DEL RETROCESO *<input value={movementReason} onChange={e=>setMovementReason(e.target.value)} placeholder="Ej.: Activación marcada por error" style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:5,border:'1px solid #ddd7d1',borderRadius:9,padding:'8px 9px',font:'inherit'}}/></label>}
            </div>
            {isPending&&<button disabled={opsSaving||!movementDate} className={styles.button} onClick={()=>workflowAction('start_processing')}>{opsSaving?'Guardando…':'Iniciar tramitación'}</button>}
            {isProcessing&&<button disabled={opsSaving||!expedienteReady||!movementDate} className={styles.button} onClick={()=>workflowAction('submit_company')}>{opsSaving?'Guardando…':'Marcar tramitado en compañía'}</button>}
            {isCompanySubmitted&&<><span style={{display:'inline-flex',border:'1px solid #cfe5d8',background:'#f0f8f3',color:'#246342',borderRadius:999,padding:'8px 10px',fontSize:11,fontWeight:900}}>Tramitado en compañía</span><button disabled={opsSaving||!movementDate} className={styles.button} onClick={()=>workflowAction('mark_active')}>{opsSaving?'Guardando…':'Marcar activo'}</button></>}
            {isActivation&&<button disabled={opsSaving||!movementDate} className={styles.button} onClick={()=>workflowAction('mark_active')}>{opsSaving?'Guardando…':'Marcar activo'}</button>}
            {status==='Activo'&&<button disabled={opsSaving||!movementDate||!movementReason.trim()} style={{border:'1px solid #efbea9',background:'#fff4ef',color:'#a83f20',borderRadius:9,padding:'9px 11px',fontSize:11,fontWeight:900,cursor:'pointer'}} onClick={()=>workflowAction('rollback_to_company',true)}>{opsSaving?'Guardando…':'Volver a Tramitado en compañía'}</button>}
            {['Anulado','Baja'].includes(status)&&<span style={{display:'inline-flex',border:'1px solid #cfe5d8',background:'#f0f8f3',color:'#246342',borderRadius:999,padding:'8px 10px',fontSize:11,fontWeight:900}}>Expediente fuera de tramitación</span>}
          </div>
        </article>

        <article style={{border:'1px solid #eee4dc',background:'#fff',borderRadius:14,padding:16,minWidth:0,display:'flex',flexDirection:'column'}}>
          <span style={{display:'block',fontSize:10,letterSpacing:'.08em',textTransform:'uppercase',color:'#e65735',fontWeight:900}}>NOTA INTERNA</span>
          <strong style={{display:'block',margin:'7px 0 10px',fontSize:15}}>Añadir seguimiento</strong>
          <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Ej.: Revisada documentación. Pendiente confirmación del proveedor." rows={5} style={{width:'100%',boxSizing:'border-box',border:'1px solid #ddd7d1',borderRadius:10,background:'#fff',padding:'11px 12px',font:'inherit',fontSize:12,lineHeight:1.5,resize:'vertical',outline:'none',minHeight:118}}/>
          <button disabled={opsSaving||!note.trim()} onClick={saveNote} style={{width:'100%',marginTop:10,padding:'10px 12px',borderRadius:10,border:'1px solid #e4d9d1',background:'#fff',color:'#39312d',fontSize:12,fontWeight:900,cursor:'pointer',opacity:(opsSaving||!note.trim())?.45:1}}>{opsSaving?'Guardando…':'Guardar nota'}</button>
        </article>

        <article style={{border:'1px solid #eee4dc',background:'#fff',borderRadius:14,padding:16,minWidth:0,display:'flex',flexDirection:'column'}}>
          <span style={{display:'block',fontSize:10,letterSpacing:'.08em',textTransform:'uppercase',color:'#e65735',fontWeight:900}}>CORRECCIÓN</span>
          <strong style={{display:'block',margin:'7px 0 10px',fontSize:15}}>Solicitar información o cambio</strong>
          <textarea value={correction} onChange={e=>setCorrection(e.target.value)} placeholder="Ej.: Falta DNI por ambas caras / IBAN incorrecto / revisar dirección." rows={5} style={{width:'100%',boxSizing:'border-box',border:'1px solid #ddd7d1',borderRadius:10,background:'#fff',padding:'11px 12px',font:'inherit',fontSize:12,lineHeight:1.5,resize:'vertical',outline:'none',minHeight:118}}/>
          <button disabled={opsSaving||correction.trim().length<3||isActivation||isCompanySubmitted||isClosed} onClick={requestCorrection} style={{width:'100%',marginTop:10,padding:'10px 12px',borderRadius:10,border:'1px solid #efbea9',background:'#fff4ef',color:'#a83f20',fontSize:12,fontWeight:900,cursor:'pointer',opacity:(opsSaving||correction.trim().length<3||isActivation||isCompanySubmitted||isClosed)?.45:1}}>Solicitar corrección</button>
        </article>
      </div>

      <div style={{marginTop:14,border:'1px solid #eee4dc',background:'#fff',borderRadius:14,padding:15}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center'}}><span style={{fontSize:10,letterSpacing:'.08em',color:'#9a8e86',fontWeight:900}}>HISTÓRICO INTERNO</span><strong style={{fontSize:12}}>{notes.length} notas</strong></div>
        {notes.length===0?<p style={{margin:'12px 0 0',color:'#928780',fontSize:12}}>Todavía no hay notas internas de BackOffice.</p>:
          <div style={{display:'grid',gap:10,marginTop:12}}>{[...notes].reverse().map(n=><article key={n.id} style={{borderTop:'1px solid #f0e8e2',paddingTop:10}}><div style={{display:'flex',justifyContent:'space-between',gap:10}}><strong style={{fontSize:12}}>{n.actor_name||'ONE'}</strong><span style={{fontSize:11,color:'#9a8e86'}}>{fmtDateTime(n.created_at)}</span></div><p style={{margin:'5px 0 0',fontSize:12,lineHeight:1.5,color:'#5f5650'}}>{n.text}</p></article>)}</div>}
      </div>
    </section>}

    <section className={styles.section}>
      <div className={styles.sectionHead}><div><span>ESTADO DEL CONTRATO</span><h2>Situación actual</h2><p>La contratación, la activación y la gestión comercial se mantienen separadas.</p></div></div>
      <div className={styles.statusGrid}>
        <div className={styles.statusCard}><span>Estado</span><strong>{status}</strong><p>Estado operativo actual del contrato.</p></div>
        <div className={styles.statusCard}><span>Fecha contratación</span><strong>{start}</strong><p>Fecha efectiva de contratación.</p></div>
        <div className={styles.statusCard}><span>Tramitado en compañía</span><strong>{fmtDate(contract.data?.submitted_company_date)||'Pendiente'}</strong><p>Fecha efectiva de emisión al proveedor.</p></div>
        <div className={styles.statusCard}><span>Activación</span><strong>{fmtDate(contract.activation_date||contract.data?.activation_date)||'Pendiente'}</strong><p>{contract.activation_date||contract.data?.activation_date?'Fecha efectiva de activación.':'Aún pendiente de activación.'}</p></div>
      </div>
      {contractTraceability.length>0&&<div style={{marginTop:14,borderTop:'1px solid #f0e8e2',paddingTop:12}}><strong style={{fontSize:11}}>TRAZABILIDAD DEL CONTRATO</strong><div style={{display:'grid',gap:7,marginTop:9}}>{contractTraceability.map((m:any,i:number)=><div key={m.id||i} style={{display:'grid',gridTemplateColumns:'110px 1fr auto',gap:10,alignItems:'center',fontSize:11,padding:'8px 9px',border:'1px solid #eee4dc',borderRadius:9,background:'#fcfbfa'}}><strong>{fmtDate(m.effective_date)}</strong><span>{m.trace_type==="commercial"?<>Comercial: {m.from_commercial_name||'DIRECTO AN24'} → <b>{m.to_commercial_name}</b>{m.reason?` · ${m.reason}`:''}</>:<>{m.from_status||'—'} → <b>{m.to_status}</b>{m.reason?` · ${m.reason}`:''}</>}</span><small style={{color:'#928780'}}>{m.actor_name||'ONE'} · registrado {fmtDateTime(m.recorded_at)}</small></div>)}</div></div>}
    </section>

    <div className={styles.footer}>Contrato central · {viewer?.role||''} · {viewer?.name||''}</div>
  </main>
}

function EditField({label,value,onChange,type="text",mono=false,maxLength,invalid=false,hint=""}:{label:string;value:string;onChange:(v:string)=>void;type?:string;mono?:boolean;maxLength?:number;invalid?:boolean;hint?:string}){return <label style={{display:'grid',gap:6,fontSize:10,fontWeight:900,color:'#6f665f'}}>{label}<input type={type} value={value} maxLength={maxLength} onChange={e=>onChange(e.target.value)} style={{width:'100%',boxSizing:'border-box',border:`1px solid ${invalid?'#e98a6f':'#ddd7d1'}`,borderRadius:10,background:invalid?'#fff8f4':'#fff',padding:'10px 11px',font:'inherit',fontSize:12,color:'#2e2825',fontFamily:mono?'ui-monospace,SFMono-Regular,Menlo,monospace':undefined,outline:'none'}}/>{hint&&<small style={{fontSize:10,color:invalid?'#b44825':'#4b7a5d',fontWeight:800}}>{hint}</small>}</label>}
function Verify({label,value,mono=false}:{label:string;value?:string;mono?:boolean}){const ok=Boolean(String(value||'').trim());return <div style={{border:'1px solid #eee4dc',borderRadius:10,padding:'10px 11px',background:ok?'#fff':'#fff8f4',minWidth:0}}><span style={{display:'block',fontSize:9,letterSpacing:'.06em',textTransform:'uppercase',color:'#9a8e86',fontWeight:900}}>{label}</span><strong style={{display:'block',marginTop:5,fontSize:12,color:ok?'#2e2825':'#a83f20',overflowWrap:'anywhere',fontFamily:mono?'ui-monospace,SFMono-Regular,Menlo,monospace':undefined}}>{ok?value:'PENDIENTE'}</strong></div>}
function Info({label,value}:{label:string;value:string}){return <div className={styles.info}><span>{label}</span><strong>{value}</strong></div>}
function fmtDate(v?:string){if(!v)return 'Pendiente'; const d=new Date(v); return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}
function fmtDateTime(v?:string){if(!v)return ''; const d=new Date(v); return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d)}
function serviceInitial(v:string){return (v||'C').trim().charAt(0).toUpperCase()||'C'}
function workLabel(status:string,correction:boolean){if(correction)return 'CORRECCIÓN'; if(status==='Pendiente de tramitación')return 'RECIBIDA'; if(status==='En tramitación')return 'EN TRAMITACIÓN'; if(status==='Tramitado en compañía')return 'TRAMITADO EN COMPAÑÍA'; if(status==='Pendiente de activación')return 'PENDIENTE ACTIVACIÓN'; return status.toUpperCase()}
function workHelp(status:string,correction:boolean){if(correction)return 'El expediente necesita una corrección antes de continuar.'; if(status==='Pendiente de tramitación')return 'BackOffice debe revisar datos y documentación antes de tramitarlo.'; if(status==='En tramitación')return 'Verifica los documentos y, cuando todo sea correcto, tramítalo en la compañía.'; if(status==='Tramitado en compañía')return 'Contrato emitido al proveedor. Comprueba su activación en la fecha de seguimiento.'; if(status==='Pendiente de activación')return 'Contrato pendiente de confirmación de alta.'; return 'Consulta y trazabilidad del contrato.'}
