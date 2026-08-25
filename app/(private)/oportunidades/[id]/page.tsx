"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { getCurrentOneUser } from "@/lib/current-one-user-client";
import styles from "./Oferta.module.css";

type ClientView = {
  id:string;
  reference?:string;
  type?:string;
  name?:string;
  taxId?:string;
  phone?:string;
  mobile?:string;
  email?:string;
  address?:string;
  postalCode?:string;
  city?:string;
  province?:string;
  commercial?:string;
};

type BudgetView = {
  id:string;
  source:string;
  reference:string;
  clientId:string;
  clientName:string;
  service:string;
  provider:string;
  providerLogo?:string;
  product:string;
  description:string;
  stage:string;
  commercial:string;
  createdAt:string;
  notes:string;
  detailRows:Array<{label:string;value:string}>;
  mainLabel:string;
  subtotal:number|null;
  discount:number|null;
  vat:number|null;
  total:number|null;
  initialCharges:Array<{label:string;value:number|null}>;
  raw:any;
};

const STORES = [
  {key:"one_opportunities_v1", source:"generic"},
  {key:"one_phone_opportunities_v1", source:"telefonia"},
  {key:"one_alarm_opportunities_v2", source:"alarmas"},
  {key:"one_insurance_opportunities_v1", source:"seguros"},
  {key:"one_real_estate_opportunities_v1", source:"inmobiliaria"},
];

function readArray(key:string){
  try{
    const raw=window.localStorage.getItem(key);
    if(!raw) return [];
    const parsed=JSON.parse(raw);
    return Array.isArray(parsed)?parsed:[];
  }catch{return []}
}

function money(value:number|null|undefined){
  if(value===null||value===undefined||!Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(Number(value));
}

function text(value:any, fallback=""){
  const v=String(value??"").trim();
  return v||fallback;
}

function num(value:any):number|null{
  if(value===""||value===null||value===undefined) return null;
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}

function fmtDate(value?:string){
  if(!value) return new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date());
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}).format(d);
}

function stableReference(raw:any){
  if(raw?.reference) return String(raw.reference);
  const id=String(raw?.id||"");
  const match=id.match(/(\d{6,})/);
  const digits=(match?.[1]||String(Math.abs(hashCode(id)))).slice(-7).padStart(7,"0");
  return `O/${digits}`;
}

function hashCode(value:string){
  let hash=0;
  for(let i=0;i<value.length;i++) hash=((hash<<5)-hash)+value.charCodeAt(i)|0;
  return hash;
}

function catalogProvider(raw:any){
  try{
    const providers=readArray("one_provider_catalog");
    const candidate=providers.find((p:any)=>
      String(p.id||"")===String(raw?.providerId||raw?.company||"") ||
      String(p.name||"").toLocaleLowerCase("es")===String(raw?.providerName||raw?.operator||raw?.provider||"").toLocaleLowerCase("es")
    );
    return {
      name:text(candidate?.name, text(raw?.providerName, text(raw?.operator, text(raw?.provider, text(raw?.company,"Proveedor"))))),
      logo:text(candidate?.logo_url||candidate?.logo||candidate?.config?.provider_logo||candidate?.provider_logo,""),
    };
  }catch{
    return {name:text(raw?.providerName, text(raw?.operator, text(raw?.provider, text(raw?.company,"Proveedor")))),logo:""};
  }
}

function catalogProduct(raw:any){
  try{
    const products=readArray("one_product_catalog");
    const candidate=products.find((p:any)=>
      String(p.id||"")===String(raw?.productId||raw?.product||"")
    );
    return text(candidate?.name, text(raw?.productName, text(raw?.product, raw?.packSnapshot?.name||"Producto")));
  }catch{
    return text(raw?.productName, text(raw?.product, raw?.packSnapshot?.name||"Producto"));
  }
}

function normalizeGeneric(raw:any):BudgetView{
  const provider=catalogProvider(raw);
  const d=raw?.details||{};
  const rows:Array<{label:string;value:string}>=[];
  const push=(label:string,value:any)=>{const v=text(value);if(v)rows.push({label,value:v})};

  if(String(raw.service).toLocaleLowerCase("es").includes("energ")){
    push("Tarifa", d.tariffType||raw.product);
    push("CUPS", d.cups);
    push("Consumo anual", d.annualConsumption?`${d.annualConsumption} kWh`:"");
    push("Potencia contratada", d.contractedPower?`${d.contractedPower} kW`:"");
    push("Precio energía P1", d.energyPriceP1?`${d.energyPriceP1} €/kWh`:"");
    push("Precio energía P2", d.energyPriceP2?`${d.energyPriceP2} €/kWh`:"");
    push("Precio energía P3", d.energyPriceP3?`${d.energyPriceP3} €/kWh`:"");
    push("Precio potencia P1", d.powerPriceP1?`${d.powerPriceP1} €/kW día`:"");
    push("Precio potencia P2", d.powerPriceP2?`${d.powerPriceP2} €/kW día`:"");
    push("Compañía anterior", d.previousProvider);
  }else{
    Object.entries(d).slice(0,12).forEach(([key,value])=>{
      if(typeof value==="string" && value.trim()) push(key.replace(/([A-Z])/g," $1"),value);
    });
  }

  return {
    id:raw.id,
    source:"generic",
    reference:stableReference(raw),
    clientId:text(raw.clientId),
    clientName:text(raw.clientName,"Cliente"),
    service:text(raw.service,"Servicio"),
    provider:provider.name,
    providerLogo:provider.logo,
    product:text(raw.product, raw.title||"Propuesta"),
    description:text(raw.title),
    stage:text(raw.stage,"Borrador"),
    commercial:text(raw.commercial,"Comercial"),
    createdAt:text(raw.createdAt||raw.updatedAt),
    notes:text(raw.notes),
    detailRows:rows,
    mainLabel:"IMPORTE PROPUESTO",
    subtotal:num(raw.value),
    discount:0,
    vat:null,
    total:num(raw.value),
    initialCharges:[],
    raw,
  };
}

function normalizePhone(raw:any):BudgetView{
  const provider=catalogProvider(raw);
  const rows:Array<{label:string;value:string}>=[];
  const product=catalogProduct(raw);
  if(raw.productDescription) rows.push({label:"Descripción",value:String(raw.productDescription)});
  if(Array.isArray(raw.lines) && raw.lines.length){
    rows.push({label:"Líneas móviles",value:String(raw.lines.length)});
    const port=raw.lines.filter((l:any)=>l.action==="Portabilidad").length;
    const altas=raw.lines.filter((l:any)=>l.action==="Alta nueva").length;
    if(port) rows.push({label:"Portabilidades",value:String(port)});
    if(altas) rows.push({label:"Altas nuevas",value:String(altas)});
  }
  if(raw.address) rows.push({label:"Dirección instalación",value:String(raw.address)});

  const monthly=num(raw.monthly);
  const monthlyTotal=num(raw.monthlyTotal);
  const vatAmount=monthly!==null&&monthlyTotal!==null?monthlyTotal-monthly:null;
  const single=num(raw.single);
  const singleTotal=num(raw.singleTotal);

  return {
    id:raw.id,
    source:"telefonia",
    reference:stableReference(raw),
    clientId:text(raw.clientId),
    clientName:text(raw.clientName,"Cliente"),
    service:"Telefonía",
    provider:provider.name,
    providerLogo:provider.logo,
    product,
    description:text(raw.productDescription),
    stage:text(raw.status,"Borrador"),
    commercial:"",
    createdAt:text(raw.createdAt||raw.updatedAt),
    notes:text(raw.notes),
    detailRows:rows,
    mainLabel:"CUOTA / MES",
    subtotal:monthly,
    discount:0,
    vat:vatAmount,
    total:monthlyTotal??monthly,
    initialCharges:[
      {label:"PAGOS INICIALES",value:single},
      {label:"TOTAL INICIAL (IVA INC.)",value:singleTotal??single},
    ],
    raw,
  };
}

function normalizeAlarm(raw:any):BudgetView{
  const provider=catalogProvider(raw);
  const econ=raw.economics||{};
  const pack=raw.packSnapshot||{};
  const rows:Array<{label:string;value:string}>=[];
  if(raw.propertyType) rows.push({label:"Tipo de inmueble",value:String(raw.propertyType)});
  if(raw.installMode) rows.push({label:"Instalación",value:String(raw.installMode)});
  if(raw.address) rows.push({label:"Dirección instalación",value:String(raw.address)});
  if(Array.isArray(raw.linesSnapshot) && raw.linesSnapshot.length){
    rows.push({label:"Elementos / líneas",value:String(raw.linesSnapshot.length)});
  }

  return {
    id:raw.id,
    source:"alarmas",
    reference:stableReference(raw),
    clientId:text(raw.clientId),
    clientName:text(raw.clientName,"Cliente"),
    service:"Alarmas",
    provider:provider.name,
    providerLogo:provider.logo,
    product:text(pack.name,"Pack de alarma"),
    description:text(pack.description),
    stage:text(raw.status,"Borrador"),
    commercial:"",
    createdAt:text(raw.createdAt),
    notes:text(raw.notes),
    detailRows:rows,
    mainLabel:"CUOTA / MES",
    subtotal:num(econ.totalMonthlyBase),
    discount:0,
    vat:num(econ.totalMonthlyVat),
    total:num(econ.totalMonthly),
    initialCharges:[
      {label:"INSTALACIÓN / PAGO INICIAL",value:num(econ.totalInitialBase)},
      {label:"IVA INICIAL",value:num(econ.totalInitialVat)},
      {label:"TOTAL INICIAL",value:num(econ.totalInitial)},
    ],
    raw,
  };
}

function normalizeInsurance(raw:any):BudgetView{
  const provider=catalogProvider(raw);
  const product=catalogProduct(raw);
  const rows:Array<{label:string;value:string}>=[];
  const push=(label:string,value:any)=>{const v=text(value);if(v)rows.push({label,value:v})};
  push("Riesgo",raw.risk);
  push("Forma de pago",raw.payment);
  push("Compañía actual",raw.currentCompany);
  push("Modalidad actual",raw.currentMode);
  push("Fecha efecto",raw.effectiveDate);
  push("Vencimiento",raw.expiryDate);

  if(raw.risk==="Autos"){push("Vehículo",raw.car?.brandModel);push("Matrícula",raw.car?.plate)}
  if(raw.risk==="Hogar"){push("Uso",raw.home?.use);push("Superficie",raw.home?.sqm?`${raw.home.sqm} m²`:"")}
  if(raw.risk==="Comercio"){push("Actividad",raw.commerce?.activity);push("Superficie",raw.commerce?.sqm?`${raw.commerce.sqm} m²`:"")}
  if(raw.risk==="Mascotas"){push("Animal",raw.pet?.animal);push("Raza",raw.pet?.breed)}

  const premium=num(raw.premium);

  return {
    id:raw.id,
    source:"seguros",
    reference:stableReference(raw),
    clientId:text(raw.clientId),
    clientName:text(raw.clientName,"Cliente"),
    service:"Seguros",
    provider:provider.name,
    providerLogo:provider.logo,
    product:text(product, raw.risk||"Seguro"),
    description:raw.risk?`Seguro de ${raw.risk}`:"Propuesta de seguro",
    stage:text(raw.status,"Borrador"),
    commercial:"",
    createdAt:text(raw.createdAt),
    notes:text(raw.notes),
    detailRows:rows,
    mainLabel:`PRIMA ${text(raw.payment,"").toUpperCase()}`,
    subtotal:premium,
    discount:0,
    vat:null,
    total:premium,
    initialCharges:[],
    raw,
  };
}

function normalizeRealEstate(raw:any):BudgetView{
  const e=raw.economics||{};
  const p=raw.property||{};
  const rows:Array<{label:string;value:string}>=[];
  const push=(label:string,value:any)=>{const v=text(value);if(v)rows.push({label,value:v})};
  push("Operación",raw.operation);
  push("Tipo de inmueble",raw.propertyType);
  push("Dirección",[p.address,p.postalCode,p.city,p.province].filter(Boolean).join(", "));
  push("Referencia catastral",p.cadastralReference);
  push("Superficie",p.built?`${p.built} m²`:"");
  push("Mandato",raw.mandate);

  return {
    id:raw.id,
    source:"inmobiliaria",
    reference:stableReference(raw),
    clientId:text(raw.clientId),
    clientName:text(raw.clientName,"Cliente"),
    service:"Inmobiliaria",
    provider:"AN24",
    product:`${text(raw.operation,"Operación")} · ${text(raw.propertyType,"Inmueble")}`,
    description:"",
    stage:"Propuesta",
    commercial:"",
    createdAt:text(raw.createdAt),
    notes:text(raw.notes),
    detailRows:rows,
    mainLabel:"HONORARIOS",
    subtotal:num(e.fees),
    discount:0,
    vat:num(e.vat),
    total:num(e.forecast),
    initialCharges:[{label:raw.operation==="Alquiler"?"RENTA MENSUAL":"PRECIO DE COMERCIALIZACIÓN",value:num(e.price)}],
    raw,
  };
}

function normalize(raw:any, source:string):BudgetView{
  if(source==="telefonia") return normalizePhone(raw);
  if(source==="alarmas") return normalizeAlarm(raw);
  if(source==="seguros") return normalizeInsurance(raw);
  if(source==="inmobiliaria") return normalizeRealEstate(raw);
  return normalizeGeneric(raw);
}

function loadBudget(id:string):BudgetView|null{
  for(const store of STORES){
    const raw=readArray(store.key).find((item:any)=>String(item?.id)===id);
    if(raw) return normalize(raw,store.source);
  }
  return null;
}

function clientAddress(client:ClientView|null){
  if(!client) return "";
  return [client.address,client.postalCode,client.city,client.province].filter(Boolean).join(", ");
}

export default function OfertaPage(){
  const params=useParams<{id:string}>();
  const id=String(params.id||"");
  const [budget,setBudget]=useState<BudgetView|null|undefined>(undefined);
  const [client,setClient]=useState<ClientView|null>(null);
  const [message,setMessage]=useState("");
  const [accessReady,setAccessReady]=useState(false);
  const [accessDenied,setAccessDenied]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const user=await getCurrentOneUser();
        if(user.role!=="Comercial"){
          if(!cancelled)setAccessReady(true);
          return;
        }
        const {data:{session}}=await supabaseBrowser.auth.getSession();
        const r=await fetch("/api/commercial-workflow",{
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            Authorization:`Bearer ${session?.access_token||""}`
          },
          body:JSON.stringify({opportunityIds:[id]})
        });
        const j=await r.json();
        const allowed=r.ok&&j?.ok&&Array.isArray(j.allowedOpportunityIds)&&j.allowedOpportunityIds.includes(id);
        if(!cancelled){
          setAccessDenied(!allowed);
          setAccessReady(true);
        }
      }catch{
        if(!cancelled){setAccessDenied(true);setAccessReady(true);}
      }
    })();
    return()=>{cancelled=true};
  },[id]);

  useEffect(()=>{
    const found=loadBudget(id);
    setBudget(found);
    if(!found?.clientId) return;

    let cancelled=false;
    (async()=>{
      try{
        const {data:{session}}=await supabaseBrowser.auth.getSession();
        const r=await fetch(`/api/one-clients?id=${encodeURIComponent(found.clientId)}`,{
          headers:{Authorization:`Bearer ${session?.access_token||""}`},
          cache:"no-store"
        });
        const j=await r.json();
        if(!cancelled&&r.ok&&j?.client) setClient(j.client);
      }catch{}
    })();
    return()=>{cancelled=true};
  },[id]);

  const contactPhone=client?.mobile||client?.phone||"";
  const contactEmail=client?.email||"";
  const commercial=budget?.commercial||client?.commercial||"Comercial ONE";

  const shareText=useMemo(()=>{
    if(!budget) return "";
    return `Hola ${budget.clientName}, te envío la propuesta ${budget.reference} de ${budget.service}: ${budget.product}${budget.total!==null?` · ${money(budget.total)}`:""}.`;
  },[budget]);

  function email(){
    if(!budget) return;
    if(!contactEmail){setMessage("Este prospecto/cliente no tiene email guardado.");return}
    const subject=encodeURIComponent(`Presupuesto ${budget.reference} · ${budget.service}`);
    const body=encodeURIComponent(`${shareText}\n\nPuedes guardar este presupuesto en PDF desde ONE y adjuntarlo al correo.`);
    window.location.href=`mailto:${contactEmail}?subject=${subject}&body=${body}`;
  }

  function whatsapp(){
    if(!budget) return;
    const digits=contactPhone.replace(/\D/g,"");
    if(!digits){setMessage("Este prospecto/cliente no tiene teléfono guardado.");return}
    const phone=digits.length===9?`34${digits}`:digits;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(shareText)}`,"_blank","noopener,noreferrer");
  }

  if(!accessReady) return <main className={styles.page}>Comprobando acceso al presupuesto…</main>;
  if(accessDenied) return <main className={styles.page}><div className={styles.notFound}><h1>Presupuesto no disponible</h1><p>Este presupuesto pertenece a otro comercial.</p><Link href="/comercial/oportunidades">Volver a mis ofertas</Link></div></main>;
  if(budget===undefined) return <main className={styles.page}>Cargando presupuesto…</main>;
  if(!budget) return <main className={styles.page}><div className={styles.notFound}><h1>Presupuesto no encontrado</h1><p>No hemos localizado la oferta en las fuentes actuales de ONE.</p><Link href="/oportunidades">Volver a ofertas</Link></div></main>;

  return <main className={styles.page}>
    <div className={styles.toolbar}>
      <div>
        <Link href={budget.clientId?`/clientes/${budget.clientId}`:"/oportunidades"}>← Volver</Link>
        <span>ONE · PRESUPUESTO</span>
      </div>
      <div className={styles.toolbarActions}>
        <button onClick={()=>window.print()}>Imprimir / Guardar PDF</button>
        <button onClick={email}>Enviar por email</button>
        <button onClick={whatsapp}>WhatsApp</button>
      </div>
    </div>

    {message&&<div className={styles.alert}>{message}</div>}

    <section className={styles.screenSummary}>
      <div><span>PRESUPUESTO</span><h1>{budget.service} · {budget.product}</h1><p>{budget.clientName} · {budget.reference}</p></div>
      <b>{budget.stage}</b>
    </section>

    <article className={styles.printSheet}>
      <header className={styles.documentHeader}>
        <div className={styles.companyBrand}>
          <img src="/an24-logo.png" alt="AN24"/>
        </div>
        <div className={styles.providerBrand}>
          {budget.providerLogo?<img src={budget.providerLogo} alt={budget.provider}/>:<strong>{budget.provider}</strong>}
        </div>
      </header>

      <div className={styles.referenceLine}>
        <strong>REF.: {budget.reference}</strong>
      </div>

      <section className={styles.documentMeta}>
        <div><span>COMERCIAL</span><strong>{commercial}</strong></div>
        <div className={styles.metaDate}><span>FECHA</span><strong>{fmtDate(budget.createdAt)}</strong></div>
      </section>

      <section className={styles.clientBlock}>
        <h2>Datos del Cliente</h2>
        <div className={styles.clientGrid}>
          <Field label="OFERTA A" value={client?.name||budget.clientName}/>
          <Field label="DIRECCIÓN" value={clientAddress(client)}/>
          <Field label="DNI / CIF" value={client?.taxId||""}/>
          <Field label="CONTACTO" value={client?.name||budget.clientName}/>
          <Field label="TELÉFONO" value={contactPhone}/>
          <Field label="EMAIL" value={contactEmail}/>
        </div>
      </section>

      <section className={styles.offerBlock}>
        <h2>Detalles de la Oferta</h2>
        <div className={styles.serviceBand}>{budget.service.toUpperCase()}</div>

        <div className={styles.productBlock}>
          <span>Tarifa / Paquete / Producto</span>
          <strong>{budget.product}</strong>
          {budget.description&&<p>{budget.description}</p>}
        </div>

        {budget.detailRows.length>0&&<div className={styles.detailGrid}>
          {budget.detailRows.map((row,index)=><div key={`${row.label}-${index}`}><span>{row.label}</span><strong>{row.value}</strong></div>)}
        </div>}

        <div className={styles.economics}>
          <section className={styles.economicBox}>
            <h3>CARGOS / CONDICIONES</h3>
            {budget.initialCharges.length?budget.initialCharges.map((row,index)=><MoneyRow key={index} label={row.label} value={row.value}/>):<div className={styles.noCharges}>Sin cargos iniciales informados</div>}
          </section>

          <section className={styles.economicBox}>
            <h3>{budget.mainLabel}</h3>
            <MoneyRow label="SUBTOTAL" value={budget.subtotal}/>
            {budget.discount!==null&&<MoneyRow label="DESCUENTOS" value={budget.discount}/>}
            {budget.vat!==null&&<MoneyRow label="IVA" value={budget.vat}/>}
            <MoneyRow label="TOTAL" value={budget.total} total/>
          </section>
        </div>

        {budget.notes&&<div className={styles.notes}><strong>Observaciones</strong><p>{budget.notes}</p></div>}
      </section>

      <footer className={styles.legal}>
        <p>Presupuesto comercial emitido por AN24. La contratación definitiva queda sujeta a las condiciones del proveedor y a la validación de los datos necesarios para formalizar el servicio. Los datos facilitados se utilizarán para gestionar la propuesta solicitada y, en su caso, la contratación posterior.</p>
      </footer>
    </article>

    <section className={styles.afterPrint}>
      <h2>Qué hacemos con este presupuesto</h2>
      <p>Este presupuesto queda abierto hasta que decidas qué hacer. Puedes imprimirlo, guardarlo en PDF, enviarlo al cliente o, si lo acepta, continuar a Contrato. ONE no lo enviará a BackOffice desde aquí.</p>
      <div>
        <Link href={budget.clientId?`/operaciones/nueva?cliente=${encodeURIComponent(budget.clientId)}&oferta=${encodeURIComponent(budget.id)}`:"/clientes"}>Cliente acepta · Crear contrato</Link>
        <Link href={budget.clientId?`/clientes/${budget.clientId}`:"/oportunidades"}>Volver al cliente</Link>
      </div>
    </section>
  </main>
}

function Field({label,value}:{label:string;value:string}){
  return <div className={styles.clientField}><span>{label}:</span><strong>{value||"—"}</strong></div>
}

function MoneyRow({label,value,total=false}:{label:string;value:number|null;total?:boolean}){
  return <div className={`${styles.moneyRow} ${total?styles.moneyTotal:""}`}><span>{label}:</span><strong>{money(value)}</strong></div>
}
