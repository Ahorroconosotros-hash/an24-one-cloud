"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./NuevaOperacion.module.css";

type Provider = { id:string; service:string; name:string; active:boolean };
type Product = {
  id:string; service:string; providerId?:string; company?:string; name:string;
  features?:string; an24:number; premium:number; advanced:number;
  standard:number; collaborator:number; active:boolean;
};
type Commercial = {
  id:string; name:string; profile:"premium"|"advanced"|"standard"|"collaborator"; active:boolean;
};

const services=["Energía","Telefonía","Alarmas","Seguros","Inmobiliaria","Asesoramiento"];
const fallbackProviders:Provider[]=[{id:"prov-gana",service:"Energía",name:"GANA",active:true}];
const fallbackProducts:Product[]=[{id:"gana-24h",service:"Energía",providerId:"prov-gana",company:"GANA",name:"Tarifa 24H",features:"Luz · precio fijo 24 horas",an24:120,premium:55,advanced:50,standard:40,collaborator:35,active:true}];
const fallbackCommercials:Commercial[]=[
  {id:"jesus",name:"Jesús Martínez",profile:"premium",active:true},
  {id:"sarai",name:"Sarai Prieto",profile:"advanced",active:true},
  {id:"maria",name:"María López",profile:"standard",active:true},
];

const profileLabel={premium:"🏆 Premium",advanced:"⭐ Avanzado",standard:"🔵 Estándar",collaborator:"🤝 Colaborador"};

export default function NuevaOperacionPage(){
  const [providers,setProviders]=useState<Provider[]>(fallbackProviders);
  const [products,setProducts]=useState<Product[]>(fallbackProducts);
  const [commercials,setCommercials]=useState<Commercial[]>(fallbackCommercials);
  const [client,setClient]=useState("");
  const [service,setService]=useState("Energía");
  const [providerId,setProviderId]=useState("");
  const [productId,setProductId]=useState("");
  const [commercialId,setCommercialId]=useState("");
  const [contractDate,setContractDate]=useState("");
  const [activationDate,setActivationDate]=useState("");
  const [status,setStatus]=useState("Borrador");
  const [saved,setSaved]=useState(false);

  useEffect(()=>{
    try{const raw=localStorage.getItem("one_provider_catalog");if(raw){const p=JSON.parse(raw);if(Array.isArray(p))setProviders(p)}}catch{}
    try{const raw=localStorage.getItem("one_product_catalog");if(raw){const p=JSON.parse(raw);if(Array.isArray(p))setProducts(p)}}catch{}
    try{const raw=localStorage.getItem("one_commercial_catalog");if(raw){const p=JSON.parse(raw);if(Array.isArray(p)&&p.length)setCommercials(p)}}catch{}
  },[]);

  const availableProviders=useMemo(()=>providers.filter(p=>p.service===service&&p.active),[providers,service]);
  const selectedProvider=availableProviders.find(p=>p.id===providerId);
  const availableProducts=useMemo(()=>products.filter(p=>p.service===service&&p.active&&(p.providerId===providerId||(!p.providerId&&selectedProvider&&(p.company||"").toLowerCase()===selectedProvider.name.toLowerCase()))),[products,service,providerId,selectedProvider]);
  const selectedProduct=availableProducts.find(p=>p.id===productId);
  const selectedCommercial=commercials.find(c=>c.id===commercialId&&c.active);

  const commercialCommission=useMemo(()=>{
    if(!selectedProduct||!selectedCommercial)return 0;
    return Number(selectedProduct[selectedCommercial.profile]||0);
  },[selectedProduct,selectedCommercial]);

  const margin=Number(selectedProduct?.an24||0)-commercialCommission;

  const changeService=(value:string)=>{
    setService(value);setProviderId("");setProductId("");
  };
  const changeProvider=(value:string)=>{setProviderId(value);setProductId("")};

  const save=()=>{
    if(!client||!service||!providerId||!productId||!commercialId||!contractDate){alert("Completa los campos obligatorios.");return}
    const raw=localStorage.getItem("one_operations");
    let list:any[]=[];
    try{const parsed=raw?JSON.parse(raw):[];if(Array.isArray(parsed))list=parsed}catch{}
    const operation={
      id:`OP-${String(list.length+1).padStart(4,"0")}`,
      client,service,
      provider:selectedProvider?.name||"",
      product:selectedProduct?.name||"",
      commercial:selectedCommercial?.name||"",
      commercialProfile:selectedCommercial?.profile||"",
      contractDate,activationDate,status,
      commissionAN24:Number(selectedProduct?.an24||0),
      commissionCommercial:commercialCommission,
      marginAN24:margin,
      reviewTask:"REVISAR CONTRATO, POSIBLE CAMBIO CC",
      createdAt:new Date().toISOString()
    };
    localStorage.setItem("one_operations",JSON.stringify([...list,operation]));
    setSaved(true);
  };

  return <main className={styles.page}>
    <header className={styles.hero}>
      <div>
        <Link href="/operaciones" className={styles.back}>← Operaciones</Link>
        <span>ONE · NUEVA OPERACIÓN</span>
        <h1>Nueva operación</h1>
        <p>Cliente → servicio → proveedor → producto → comercial → fechas → guardar.</p>
      </div>
      <div className={styles.badge}>{status.toUpperCase()}</div>
    </header>

    {saved && <div className={styles.success}>✅ Operación guardada. Ya aparece en el listado de Operaciones.</div>}

    <section className={styles.formCard}>
      <div className={styles.sectionTitle}><b>01</b><div><h2>Cliente y servicio</h2><p>Selecciona el cliente y la línea de negocio.</p></div></div>
      <div className={styles.grid3}>
        <label className={styles.field}>Cliente *<input value={client} onChange={e=>setClient(e.target.value)} placeholder="Buscar o escribir cliente"/></label>
        <label className={styles.field}>Servicio *<select value={service} onChange={e=>changeService(e.target.value)}>{services.map(s=><option key={s}>{s}</option>)}</select></label>
        <label className={styles.field}>Estado<select value={status} onChange={e=>setStatus(e.target.value)}><option>Borrador</option><option>En tramitación</option><option>Activo</option><option>Incidencia</option><option>Finalizado</option></select></label>
      </div>
    </section>

    <section className={styles.formCard}>
      <div className={styles.sectionTitle}><b>02</b><div><h2>Proveedor y producto</h2><p>Solo aparecen proveedores y productos activos del servicio elegido.</p></div></div>
      <div className={styles.grid2}>
        <label className={styles.field}>Proveedor *<select value={providerId} onChange={e=>changeProvider(e.target.value)}><option value="">Seleccionar proveedor</option>{availableProviders.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className={styles.field}>Producto *<select value={productId} onChange={e=>setProductId(e.target.value)} disabled={!providerId}><option value="">{providerId?"Seleccionar producto":"Primero selecciona proveedor"}</option>{availableProducts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      </div>
      {selectedProduct&&<div className={styles.productBox}><div><span>PRODUCTO SELECCIONADO</span><strong>{selectedProvider?.name} · {selectedProduct.name}</strong><small>{selectedProduct.features||"Sin características adicionales"}</small></div><div><span>Comisión AN24</span><strong>{Number(selectedProduct.an24).toFixed(2)} €</strong></div></div>}
    </section>

    <section className={styles.formCard}>
      <div className={styles.sectionTitle}><b>03</b><div><h2>Comercial y comisiones</h2><p>ONE aplica la comisión del perfil del comercial automáticamente.</p></div></div>
      <div className={styles.grid4}>
        <label className={styles.field}>Comercial *<select value={commercialId} onChange={e=>setCommercialId(e.target.value)}><option value="">Seleccionar comercial</option>{commercials.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <Metric label="Perfil" value={selectedCommercial?profileLabel[selectedCommercial.profile]:"—"}/>
        <Metric label="Comisión comercial" value={`${commercialCommission.toFixed(2)} €`}/>
        <Metric label="Margen AN24" value={`${margin.toFixed(2)} €`} accent/>
      </div>
    </section>

    <section className={styles.formCard}>
      <div className={styles.sectionTitle}><b>04</b><div><h2>Fechas y seguimiento</h2><p>Contratación y activación quedan separadas para liquidaciones y revisiones.</p></div></div>
      <div className={styles.grid3}>
        <label className={styles.field}>Fecha contratación *<input type="date" value={contractDate} onChange={e=>setContractDate(e.target.value)}/></label>
        <label className={styles.field}>Fecha activación<input type="date" value={activationDate} onChange={e=>setActivationDate(e.target.value)}/></label>
        <label className={styles.field}>Próxima acción<input placeholder="Llamar, solicitar documento..."/></label>
      </div>
      <div className={styles.reviewBox}><span>SEGUIMIENTO AUTOMÁTICO</span><strong>REVISAR CONTRATO, POSIBLE CAMBIO CC</strong><small>Se programará a los 6 meses desde la activación cuando conectemos Agenda y Google Calendar.</small></div>
    </section>

    <section className={styles.formCard}>
      <div className={styles.sectionTitle}><b>05</b><div><h2>Documentación</h2><p>DNI, factura anterior, titularidad bancaria, contrato y otros archivos.</p></div></div>
      <div className={styles.dropzone}><strong>Arrastra o selecciona documentos</strong><span>La subida real se conectará después con Documentos y Google Drive.</span><button type="button">Seleccionar archivos</button></div>
    </section>

    <footer className={styles.footer}>
      <Link href="/operaciones">Cancelar</Link>
      <div><button className={styles.secondary} type="button">Guardar borrador</button><button className={styles.primary} type="button" onClick={save}>Guardar operación</button></div>
    </footer>
  </main>
}

function Metric({label,value,accent=false}:{label:string;value:string;accent?:boolean}){
  return <div className={accent?styles.metricAccent:styles.metric}><span>{label}</span><strong>{value}</strong></div>
}
