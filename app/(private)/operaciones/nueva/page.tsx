"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./NuevaOperacion.module.css";
import { getCurrentOneUser, type CurrentOneUser } from "@/lib/current-one-user-client";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { ENERGY_REQUIRED_DOCUMENTS, energyValidation, isValidIban, isValidSpanishCups, normalizeCups, normalizeIban , alarmValidation, getAlarmRequiredDocuments } from "@/lib/contract-validation";

type Provider = { id:string; service:string; name:string; active:boolean };
type Product = { id:string; service:string; providerId?:string; company?:string; name:string; features?:string; an24:number; premium:number; advanced:number; standard:number; collaborator:number; active:boolean };
type Commercial = { id:string; name:string; profile:"premium"|"advanced"|"standard"|"collaborator"; active:boolean };
type AdditionalDocument = { id:string; type:string; file:File|null };

type ClientView = {id:string;name:string;reference?:string;type?:string;taxId?:string;birthDate?:string;phone?:string;mobile?:string;email?:string;address?:string;postalCode?:string;city?:string;province?:string;iban?:string};

const services=["Energía","Telefonía","Alarmas","Seguros","Inmobiliaria","Asesoramiento"];
const fallbackProviders:Provider[]=[{id:"prov-gana",service:"Energía",name:"GANA",active:true}];
const fallbackProducts:Product[]=[{id:"gana-24h",service:"Energía",providerId:"prov-gana",company:"GANA",name:"Tarifa 24H",features:"Luz · precio fijo 24 horas",an24:120,premium:55,advanced:50,standard:40,collaborator:35,active:true}];
const fallbackCommercials:Commercial[]=[{id:"jesus",name:"Jesús Martínez",profile:"premium",active:true},{id:"sarai",name:"Sarai Prieto",profile:"advanced",active:true},{id:"maria",name:"María López",profile:"standard",active:true}];
const profileLabel={premium:"🏆 Premium",advanced:"⭐ Avanzado",standard:"🔵 Estándar",collaborator:"🤝 Colaborador"};

const ADDITIONAL_DOCUMENT_TYPES = [
  "DNI / NIE",
  "CIF",
  "DNI representante",
  "Escrituras",
  "SEPA firmado",
  "Titularidad bancaria",
  "Factura anterior",
  "Factura",
  "Contrato firmado",
  "Autorización de baja",
  "Presupuesto",
  "Certificado bancario",
  "Recibo",
  "Anexo",
  "Otro documento",
] as const;

export default function NuevaOperacionPage(){
  const searchParams=useSearchParams();
  const router=useRouter();
  const clientId=searchParams.get("cliente")||"";
  const [providers,setProviders]=useState<Provider[]>(fallbackProviders);
  const [products,setProducts]=useState<Product[]>(fallbackProducts);
  const [commercials,setCommercials]=useState<Commercial[]>(fallbackCommercials);
  const [client,setClient]=useState(clientId);
  const [clientData,setClientData]=useState<ClientView|null>(null);
  const [service,setService]=useState("Energía");
  const [providerId,setProviderId]=useState("");
  const [productId,setProductId]=useState("");
  const [commercialId,setCommercialId]=useState("");
  const [contractDate,setContractDate]=useState("");
  const [currentUser,setCurrentUser]=useState<CurrentOneUser | null>(null);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  const [taxId,setTaxId]=useState("");
  const [birthDate,setBirthDate]=useState("");
  const [phone,setPhone]=useState("");
  const [email,setEmail]=useState("");
  const [supplyAddress,setSupplyAddress]=useState("");
  const [cups,setCups]=useState("");
  const [iban,setIban]=useState("");
  const [energyDocs,setEnergyDocs]=useState<Record<string,File|null>>({"DNI / NIE":null,"Factura":null,"Titularidad bancaria":null});
  const [alarmDocs,setAlarmDocs]=useState<Record<string,File|null>>({});
  const [additionalDocs,setAdditionalDocs]=useState<AdditionalDocument[]>([]);
  const [propertyType,setPropertyType]=useState("");
  const [installationContact,setInstallationContact]=useState("");
  const [hasCurrentAlarm,setHasCurrentAlarm]=useState("");
  const [currentAlarmCompany,setCurrentAlarmCompany]=useState("");
  const [manageCancellation,setManageCancellation]=useState("");
  const [currentAlarmEndDate,setCurrentAlarmEndDate]=useState("");

  useEffect(()=>{
    getCurrentOneUser().then(user=>{setCurrentUser(user);setCommercialId(user.role==="Comercial"?user.id:"__direct_an24__");}).catch(()=>{});
    try{const raw=localStorage.getItem("one_provider_catalog");if(raw){const p=JSON.parse(raw);if(Array.isArray(p))setProviders(p)}}catch{}
    try{const raw=localStorage.getItem("one_product_catalog");if(raw){const p=JSON.parse(raw);if(Array.isArray(p))setProducts(p)}}catch{}
    try{const raw=localStorage.getItem("one_commercial_catalog");if(raw){const p=JSON.parse(raw);if(Array.isArray(p)&&p.length)setCommercials(p)}}catch{}
  },[]);

  useEffect(()=>{
    if(!clientId) return;
    let cancelled=false;
    (async()=>{
      try{
        const {data:{session}}=await supabaseBrowser.auth.getSession();
        const response=await fetch(`/api/one-clients?id=${encodeURIComponent(clientId)}`,{headers:{Authorization:`Bearer ${session?.access_token||""}`},cache:"no-store"});
        const result=await response.json();
        if(cancelled||!response.ok||!result?.client) return;
        const c=result.client as ClientView;
        setClient(c.id||clientId);setClientData(c);
        setTaxId(c.taxId||"");setBirthDate(c.birthDate||"");setPhone(c.mobile||c.phone||"");setEmail(c.email||"");
        setSupplyAddress([c.address,c.postalCode,c.city,c.province].filter(Boolean).join(", "));setIban(c.iban||"");
      }catch{}
    })();
    return()=>{cancelled=true};
  },[clientId]);

  const availableProviders=useMemo(()=>providers.filter(p=>p.service===service&&p.active),[providers,service]);
  const selectedProvider=availableProviders.find(p=>p.id===providerId);
  const availableProducts=useMemo(()=>products.filter(p=>p.service===service&&p.active&&(p.providerId===providerId||(!p.providerId&&selectedProvider&&(p.company||"").toLowerCase()===selectedProvider.name.toLowerCase()))),[products,service,providerId,selectedProvider]);
  const selectedProduct=availableProducts.find(p=>p.id===productId);
  const canChooseCommercial=currentUser?.role==="Administrador"||currentUser?.role==="BackOffice";
  const isDirect=commercialId==="__direct_an24__";
  const selectedCommercial=commercials.find(c=>c.active&&(c.id===commercialId || (!canChooseCommercial && currentUser && c.name.trim().toLocaleLowerCase("es")===currentUser.name.trim().toLocaleLowerCase("es")))) || (!canChooseCommercial&&currentUser&&commercialId===currentUser.id?{id:currentUser.id,name:currentUser.name,profile:"standard" as const,active:true}:undefined);
  const commercialCommission=useMemo(()=>!selectedProduct||isDirect||!selectedCommercial?0:Number(selectedProduct[selectedCommercial.profile]||0),[selectedProduct,selectedCommercial,isDirect]);
  const margin=Number(selectedProduct?.an24||0)-commercialCommission;
  const isEnergy=service==="Energía";
  const isAlarm=service==="Alarmas";
  const energyPreview=energyValidation({tax_id:taxId,birth_date:birthDate,phone,email,supply_address:supplyAddress,cups,iban},ENERGY_REQUIRED_DOCUMENTS.filter(t=>energyDocs[t]).map(type=>({type})),false);

  const alarmDataPreview={tax_id:taxId,phone,email,installation_address:supplyAddress,iban,property_type:propertyType,installation_contact:installationContact,has_current_alarm:hasCurrentAlarm,current_alarm_company:currentAlarmCompany,manage_previous_alarm_cancellation:manageCancellation,current_alarm_end_date:currentAlarmEndDate,customer_type:clientData?.type||""};
  const alarmRequiredDocuments=getAlarmRequiredDocuments(alarmDataPreview);
  const alarmPreview=alarmValidation(alarmDataPreview,alarmRequiredDocuments.filter(x=>alarmDocs[x]).map(type=>({type})),false);

  const changeService=(value:string)=>{setService(value);setProviderId("");setProductId("")};
  const changeProvider=(value:string)=>{setProviderId(value);setProductId("")};

  function addAdditionalDocument(){
    setAdditionalDocs(prev=>[
      ...prev,
      {id:`extra-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,type:"Otro documento",file:null}
    ]);
  }

  function updateAdditionalDocument(id:string, patch:Partial<AdditionalDocument>){
    setAdditionalDocs(prev=>prev.map(doc=>doc.id===id?{...doc,...patch}:doc));
  }

  function removeAdditionalDocument(id:string){
    setAdditionalDocs(prev=>prev.filter(doc=>doc.id!==id));
  }


  async function uploadDocuments(contractId:string, token:string){
    const required=isEnergy?ENERGY_REQUIRED_DOCUMENTS:isAlarm?alarmRequiredDocuments:[];
    const files=isEnergy?energyDocs:isAlarm?alarmDocs:{};

    for(const type of required){
      const file=files[type]; if(!file) continue;
      const form=new FormData();
      form.append("contractId",contractId);
      form.append("documentType",type);
      form.append("file",file);
      const r=await fetch("/api/contract-documents",{method:"POST",headers:{Authorization:`Bearer ${token}`},body:form});
      const j=await r.json();
      if(!r.ok||!j.ok) throw new Error(j.error||`No se pudo subir ${type}`);
    }

    for(const doc of additionalDocs){
      if(!doc.file) continue;
      const form=new FormData();
      form.append("contractId",contractId);
      form.append("documentType",doc.type||"Otro documento");
      form.append("file",doc.file);
      const r=await fetch("/api/contract-documents",{method:"POST",headers:{Authorization:`Bearer ${token}`},body:form});
      const j=await r.json();
      if(!r.ok||!j.ok) throw new Error(j.error||`No se pudo subir ${doc.type||"documento adicional"}`);
    }
  }

  async function save(asDraft=false){
    setError("");
    if(!client||!service||!providerId||!productId||!contractDate){setError("Completa cliente, servicio, proveedor, producto y fecha de contratación.");return}
    if(!isDirect&&!selectedCommercial){setError("Selecciona un comercial válido.");return}
    if(isEnergy&&!asDraft&&!energyPreview.ok){setError(`${energyPreview.missing.length?`Faltan datos: ${energyPreview.missing.join(", ")}. `:""}${energyPreview.invalid.length?`Datos no válidos: ${energyPreview.invalid.join(", ")}. `:""}${energyPreview.missingDocuments.length?`Faltan documentos: ${energyPreview.missingDocuments.join(", ")}.`:""}`);return}
    if(isAlarm&&!asDraft&&!alarmPreview.ok){setError(`${alarmPreview.missing.length?`Faltan datos: ${alarmPreview.missing.join(", ")}. `:""}${alarmPreview.invalid.length?`Datos no válidos: ${alarmPreview.invalid.join(", ")}. `:""}${alarmPreview.missingDocuments.length?`Faltan documentos: ${alarmPreview.missingDocuments.join(", ")}.`:""}`);return}
    setSaving(true);
    try{
      const {data:{session}}=await supabaseBrowser.auth.getSession();
      if(!session?.access_token) throw new Error("Sesión no encontrada.");
      const response=await fetch("/api/contracts",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({
        clientId:client,serviceName:service,provider:selectedProvider?.name||"",productName:selectedProduct?.name||"",commercialUserId:isDirect?null:(selectedCommercial?.id||null),commercialName:isDirect?"DIRECTO AN24":(selectedCommercial?.name||""),attribution:isDirect?"directo":"comercial",contractDate,status:"Borrador",commissionAN24:Number(selectedProduct?.an24||0),commissionCommercial:commercialCommission,marginAN24:margin,
        taxId,birthDate,phone,email,supplyAddress,cups:normalizeCups(cups),iban:normalizeIban(iban),propertyType,installationContact,hasCurrentAlarm,currentAlarmCompany,manageCancellation,currentAlarmEndDate,customerType:clientData?.type||""
      })});
      const result=await response.json(); if(!response.ok||!result?.ok) throw new Error(result?.error||"No se pudo guardar el contrato.");
      await uploadDocuments(result.contract.id,session.access_token);
      if(!asDraft){
        const submit=await fetch("/api/contracts",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({contractId:result.contract.id,action:"submit_for_processing"})});
        const sj=await submit.json(); if(!submit.ok||!sj.ok) throw new Error(sj.error||"El contrato quedó como borrador porque no pudo enviarse a Tramitaciones.");
      }
      router.push(`/clientes/${encodeURIComponent(client)}`);router.refresh();
    }catch(e:any){setError(e?.message||"No se pudo guardar el contrato.");}finally{setSaving(false)}
  }

  const clientLabel=clientData?`${clientData.name}${clientData.reference?` · ${clientData.reference}`:""}${clientData.type?` · ${clientData.type}`:""}`:"Cargando cliente...";

  return <main className={styles.page}>
    <header className={styles.hero}><div><Link href="/contratos" className={styles.back}>← Contratos</Link><span>ONE · NUEVO CONTRATO</span><h1>Nuevo contrato</h1><p>Datos reales, documentación obligatoria y envío a Tramitaciones.</p></div><div className={styles.badge}>BORRADOR</div></header>
    {error&&<div className={styles.errorBox}>{error}</div>}

    <section className={styles.formCard}><div className={styles.sectionTitle}><b>01</b><div><h2>Cliente y servicio</h2><p>El contrato nace vinculado al Cliente 360º.</p></div></div><div className={styles.grid3}>
      <label className={styles.field}>Cliente *<input value={clientId?clientLabel:client} onChange={e=>!clientId&&setClient(e.target.value)} readOnly={Boolean(clientId)}/></label>
      <label className={styles.field}>Servicio *<select value={service} onChange={e=>changeService(e.target.value)}>{services.map(s=><option key={s}>{s}</option>)}</select></label>
      <label className={styles.field}>Fecha contratación *<input type="date" value={contractDate} onChange={e=>setContractDate(e.target.value)}/></label>
    </div></section>

    <section className={styles.formCard}><div className={styles.sectionTitle}><b>02</b><div><h2>Proveedor y producto</h2><p>Catálogo activo de la empresa.</p></div></div><div className={styles.grid2}>
      <label className={styles.field}>Proveedor *<select value={providerId} onChange={e=>changeProvider(e.target.value)}><option value="">Seleccionar proveedor</option>{availableProviders.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className={styles.field}>Producto *<select value={productId} onChange={e=>setProductId(e.target.value)} disabled={!providerId}><option value="">{providerId?"Seleccionar producto":"Primero selecciona proveedor"}</option>{availableProducts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    </div>{selectedProduct&&<div className={styles.productBox}><div><span>PRODUCTO SELECCIONADO</span><strong>{selectedProvider?.name} · {selectedProduct.name}</strong><small>{selectedProduct.features||"Sin características adicionales"}</small></div><div><span>Comisión empresa</span><strong>{Number(selectedProduct.an24).toFixed(2)} €</strong></div></div>}</section>

    {isEnergy&&<section className={styles.formCard}><div className={styles.sectionTitle}><b>03</b><div><h2>Datos obligatorios de Energía</h2><p>ONE valida CUPS, IBAN y datos de contacto antes de enviar a BackOffice.</p></div></div>
      <div className={styles.grid3}>
        <Field label="DNI / NIE / CIF *" value={taxId} set={setTaxId}/><label className={styles.field}>Fecha nacimiento *<input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)}/></label><Field label="Teléfono *" value={phone} set={setPhone}/>
        <Field label="Email *" value={email} set={setEmail}/><Field label="Dirección suministro *" value={supplyAddress} set={setSupplyAddress}/>
        <label className={styles.field}>CUPS *<input value={cups} onChange={e=>setCups(normalizeCups(e.target.value))} placeholder="ES0021000005311232MT0F" maxLength={22}/><small className={cups&&!isValidSpanishCups(cups)?styles.invalid:styles.valid}>{cups?(isValidSpanishCups(cups)?"Formato válido":"Debe empezar por ES y tener 20–22 caracteres alfanuméricos"):"20–22 caracteres · único en ONE"}</small></label>
        <label className={styles.field}>IBAN *<input value={iban} onChange={e=>setIban(normalizeIban(e.target.value))} placeholder="ES9121000418450200051332" maxLength={34}/><small className={iban&&!isValidIban(iban)?styles.invalid:styles.valid}>{iban?(isValidIban(iban)?"IBAN válido":"IBAN no válido. España: ES + 22 dígitos (24 caracteres)"):"España: 24 caracteres"}</small></label>
      </div>
    </section>}

    {isAlarm&&<section className={styles.formCard}><div className={styles.sectionTitle}><b>03</b><div><h2>Datos obligatorios de Alarmas</h2><p>BackOffice recibirá estos datos para contrastarlos antes de tramitar con la compañía.</p></div></div>
      <div className={styles.grid3}>
        <Field label="DNI / NIE / CIF *" value={taxId} set={setTaxId}/><Field label="Teléfono *" value={phone} set={setPhone}/><Field label="Email *" value={email} set={setEmail}/>
        <Field label="Domicilio de instalación *" value={supplyAddress} set={setSupplyAddress}/><Field label="Tipo de inmueble *" value={propertyType} set={setPropertyType}/><Field label="Contacto de instalación *" value={installationContact} set={setInstallationContact}/>
        <label className={styles.field}>¿Tiene alarma actualmente? *<select value={hasCurrentAlarm} onChange={e=>{setHasCurrentAlarm(e.target.value);if(e.target.value==="No"){setCurrentAlarmCompany("");setManageCancellation("");setCurrentAlarmEndDate("")}}}><option value="">Seleccionar</option><option>Sí</option><option>No</option></select></label>
        {hasCurrentAlarm==="Sí"&&<><Field label="Compañía actual *" value={currentAlarmCompany} set={setCurrentAlarmCompany}/><label className={styles.field}>¿Gestionamos la baja? *<select value={manageCancellation} onChange={e=>setManageCancellation(e.target.value)}><option value="">Seleccionar</option><option>Sí</option><option>No</option></select></label><label className={styles.field}>Fin permanencia / contrato<input type="date" value={currentAlarmEndDate} onChange={e=>setCurrentAlarmEndDate(e.target.value)}/></label></>}
        <label className={styles.field}>IBAN *<input value={iban} onChange={e=>setIban(normalizeIban(e.target.value))} placeholder="ES9121000418450200051332" maxLength={34}/><small className={iban&&!isValidIban(iban)?styles.invalid:styles.valid}>{iban?(isValidIban(iban)?"IBAN válido":"IBAN no válido"):'Obligatorio'}</small></label>
      </div>
    </section>}

    <section className={styles.formCard}><div className={styles.sectionTitle}><b>04</b><div><h2>Documentación</h2><p>{isEnergy?"Para Energía son obligatorios DNI/NIE/CIF, Factura y Titularidad bancaria. Puedes añadir cualquier otra documentación del expediente.":isAlarm?(clientData?.type==="Empresa"?"Empresa: CIF, Escrituras, DNI representante, SEPA firmado y Titularidad bancaria. Si ya tiene alarma, también Factura anterior. Puedes añadir documentos extra.":"Particular: DNI/NIE, SEPA firmado y Titularidad bancaria. Si ya tiene alarma, también Factura anterior. Puedes añadir documentos extra."):"Adjunta toda la documentación disponible del contrato."}</p></div></div>

      {(isEnergy||isAlarm)&&<>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",marginBottom:10}}>
          <div><strong style={{fontSize:12}}>Documentos obligatorios</strong><small style={{display:"block",marginTop:3,color:"#8a7f77",fontSize:10}}>Deben estar completos antes de enviar a Tramitaciones.</small></div>
          <span style={{fontSize:10,fontWeight:900,color:"#e65735"}}>{(isEnergy?ENERGY_REQUIRED_DOCUMENTS:alarmRequiredDocuments).length} REQUERIDOS</span>
        </div>
        <div className={styles.docsGrid}>{(isEnergy?ENERGY_REQUIRED_DOCUMENTS:alarmRequiredDocuments).map(type=><label key={type} className={styles.docSlot}><span>{type.toUpperCase()}</span><strong>{(isEnergy?energyDocs[type]:alarmDocs[type])?.name||"Pendiente"}</strong><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>isEnergy?setEnergyDocs(prev=>({...prev,[type]:e.target.files?.[0]||null})):setAlarmDocs(prev=>({...prev,[type]:e.target.files?.[0]||null}))}/><em>{(isEnergy?energyDocs[type]:alarmDocs[type])?"✓ Adjuntado":"Seleccionar archivo"}</em></label>)}</div>
      </>}

      <div style={{marginTop:(isEnergy||isAlarm)?18:0,borderTop:(isEnergy||isAlarm)?"1px solid #eee4dc":"none",paddingTop:(isEnergy||isAlarm)?16:0}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",marginBottom:10}}>
          <div><strong style={{fontSize:12}}>Documentos adicionales</strong><small style={{display:"block",marginTop:3,color:"#8a7f77",fontSize:10}}>Añade tantos como necesites. Todos quedarán en el mismo expediente para BackOffice.</small></div>
          <button type="button" onClick={addAdditionalDocument} style={{border:"1px solid #e9d9cf",background:"#fff8f3",color:"#c84d2d",borderRadius:9,padding:"8px 11px",font:"inherit",fontSize:11,fontWeight:900,cursor:"pointer"}}>+ Añadir documento</button>
        </div>

        {additionalDocs.length===0?<div className={styles.dropzone}><strong>Sin documentos adicionales</strong><span>Puedes añadir factura anterior, autorización, anexos, recibos, presupuestos u otra documentación.</span></div>:
        <div style={{display:"grid",gap:8}}>
          {additionalDocs.map((doc,index)=><div key={doc.id} style={{display:"grid",gridTemplateColumns:"210px minmax(0,1fr) auto",gap:8,alignItems:"center",border:"1px solid #eee4dc",background:"#fcfbfa",borderRadius:11,padding:"9px 10px"}}>
            <select value={doc.type} onChange={e=>updateAdditionalDocument(doc.id,{type:e.target.value})} className={styles.input}>
              {ADDITIONAL_DOCUMENT_TYPES.map(type=><option value={type} key={type}>{type}</option>)}
            </select>
            <label style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,border:"1px solid #ddd7d1",background:"#fff",borderRadius:9,padding:"8px 10px",cursor:"pointer",minWidth:0}}>
              <span style={{fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.file?.name||`Documento adicional ${index+1}`}</span>
              <strong style={{fontSize:10,color:"#e65735",whiteSpace:"nowrap"}}>{doc.file?"Cambiar":"Seleccionar"}</strong>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:"none"}} onChange={e=>updateAdditionalDocument(doc.id,{file:e.target.files?.[0]||null})}/>
            </label>
            <button type="button" onClick={()=>removeAdditionalDocument(doc.id)} aria-label="Eliminar documento adicional" style={{border:"1px solid #eadfd8",background:"#fff",borderRadius:8,padding:"8px 10px",cursor:"pointer",font:"inherit",fontSize:11}}>Eliminar</button>
          </div>)}
        </div>}
      </div>

      {(isEnergy||isAlarm)&&(()=>{const preview=isEnergy?energyPreview:alarmPreview;const requiredCount=(isEnergy?ENERGY_REQUIRED_DOCUMENTS:alarmRequiredDocuments).length;return <div className={preview.ok?styles.readyBox:styles.pendingBox}><strong>{preview.ok?"✓ EXPEDIENTE MÍNIMO COMPLETO":"EXPEDIENTE INCOMPLETO"}</strong><span>{preview.ok?`Datos válidos y ${requiredCount}/${requiredCount} documentos obligatorios preparados. ${additionalDocs.filter(d=>d.file).length?`${additionalDocs.filter(d=>d.file).length} documento(s) adicional(es) también se enviarán.`:"Puedes añadir documentación adicional si la tienes."}`:`${preview.missing.length?`Faltan datos: ${preview.missing.join(", ")}. `:""}${preview.invalid.length?`No válidos: ${preview.invalid.join(", ")}. `:""}${preview.missingDocuments.length?`Documentos obligatorios: ${preview.missingDocuments.join(", ")}.`:""}`}</span></div>})()}
    </section>

    <section className={styles.formCard}><div className={styles.sectionTitle}><b>{(isEnergy||isAlarm)?"05":"03"}</b><div><h2>Responsable y comisiones</h2><p>{canChooseCommercial?"Puede ser DIRECTO AN24 o asignarse a un comercial.":"Queda asignado al comercial logado."}</p></div></div><div className={styles.grid4}>
      <label className={styles.field}>Responsable<select value={commercialId} onChange={e=>setCommercialId(e.target.value)} disabled={!canChooseCommercial}>{canChooseCommercial&&<option value="__direct_an24__">DIRECTO AN24 — Sin comercial</option>}{canChooseCommercial&&<option value="">Seleccionar comercial</option>}{commercials.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}{!canChooseCommercial&&currentUser&&!commercials.some(c=>c.id===currentUser.id)&&<option value={currentUser.id}>{currentUser.name}</option>}</select></label>
      <Metric label="Perfil" value={isDirect?"🏢 Directo AN24":selectedCommercial?profileLabel[selectedCommercial.profile]:"—"}/><Metric label="Comisión comercial" value={`${commercialCommission.toFixed(2)} €`}/><Metric label="Margen empresa" value={`${margin.toFixed(2)} €`} accent/>
    </div></section>


    <footer className={styles.footer}><Link href={client?`/clientes/${client}`:"/operaciones"}>Cancelar</Link><div><button className={styles.secondary} type="button" onClick={()=>save(true)} disabled={saving}>{saving?"Guardando…":"Guardar borrador"}</button><button className={styles.primary} type="button" onClick={()=>save(false)} disabled={saving}>{saving?"Guardando…":"Guardar y enviar a Tramitaciones"}</button></div></footer>
  </main>
}

function Field({label,value,set}:{label:string;value:string;set:(v:string)=>void}){return <label className={styles.field}>{label}<input value={value} onChange={e=>set(e.target.value)}/></label>}
function Metric({label,value,accent=false}:{label:string;value:string;accent?:boolean}){return <div className={accent?styles.metricAccent:styles.metric}><span>{label}</span><strong>{value}</strong></div>}
