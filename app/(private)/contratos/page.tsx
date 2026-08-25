"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import styles from "./Contratos.module.css";

type Contract = {
  id:string;
  client_id?:string;
  service_name?:string;
  provider?:string;
  status?:string;
  start_date?:string;
  external_reference?:string;
  commercial_name?:string;
  data?:{
    product_name?:string;
    activation_date?:string;
    submitted_company_date?:string;
    commission_an24?:number;
    commission_commercial?:number;
    margin_an24?:number;
  };
  client?:{id:string;name?:string;reference?:string}|null;
};

const FILTERS=["Todos","Borrador","Pendiente de tramitación","En tramitación","Tramitado en compañía","Pendiente de activación","Activo","Corrección solicitada","Anulado","Baja"];

export default function ContratosPage(){
  const [contracts,setContracts]=useState<Contract[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("Todos");

  useEffect(()=>{let cancelled=false;(async()=>{
    try{
      const {data:{session}}=await supabaseBrowser.auth.getSession();
      const r=await fetch("/api/contracts",{headers:{Authorization:`Bearer ${session?.access_token||""}`},cache:"no-store"});
      const j=await r.json();
      if(!r.ok||!j.ok) throw new Error(j.error||"No se pudieron cargar los contratos");
      if(!cancelled) setContracts(j.contracts||[]);
    }catch(e:any){if(!cancelled)setError(e?.message||"No se pudieron cargar los contratos");}
    finally{if(!cancelled)setLoading(false);}
  })();return()=>{cancelled=true}},[]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase("es");
    return contracts.filter(c=>{
      const matchesStatus=filter==="Todos"||String(c.status||"")===filter;
      const matchesText=!q||[
        c.client?.name,c.client?.reference,c.external_reference,c.service_name,c.provider,c.data?.product_name,c.commercial_name,c.status
      ].some(v=>String(v||"").toLocaleLowerCase("es").includes(q));
      return matchesStatus&&matchesText;
    });
  },[contracts,query,filter]);

  const active=contracts.filter(c=>c.status==="Activo").length;
  const inFlight=contracts.filter(c=>["Pendiente de tramitación","En tramitación","Tramitado en compañía","Pendiente de activación","Corrección solicitada"].includes(String(c.status||""))).length;
  const pendingActivation=contracts.filter(c=>["Tramitado en compañía","Pendiente de activación"].includes(String(c.status||""))).length;

  return <main className={styles.page}>
    <header className={styles.header}>
      <div>
        <span className={styles.kicker}>ONE · CONTRATOS</span>
        <h1>Contratos</h1>
        <p>Una sola cartera contractual, conectada con Cliente 360º y Tramitaciones.</p>
      </div>
      <Link href="/contratos/nuevo" className={styles.primary}>+ Nuevo contrato</Link>
    </header>

    <section className={styles.metrics}>
      <Metric label="TOTAL" value={contracts.length} note="Contratos reales" />
      <Metric label="EN CURSO" value={inFlight} note="Pendientes de cierre" />
      <Metric label="PENDIENTES DE ACTIVAR" value={pendingActivation} note="Seguimiento de compañía" />
      <Metric label="ACTIVOS" value={active} note="Servicios activos" />
    </section>

    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div><span className={styles.kicker}>CARTERA CONTRACTUAL</span><h2>Todos los contratos</h2><p>Sin operaciones duplicadas ni datos locales de demostración.</p></div>
        <div className={styles.search}><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar cliente, proveedor, producto…" /></div>
      </div>

      <div className={styles.filters}>{FILTERS.map(item=><button key={item} onClick={()=>setFilter(item)} className={filter===item?styles.filterActive:""}>{item}</button>)}</div>

      {loading?<div className={styles.empty}>Cargando contratos…</div>:
      error?<div className={styles.error}>{error}</div>:
      filtered.length===0?<div className={styles.empty}><strong>No hay contratos con estos filtros.</strong><span>Prueba con otro estado o búsqueda.</span></div>:
      <div className={styles.list}>{filtered.map(c=>{
        const activation=c.data?.activation_date;
        const commission=Number(c.data?.commission_an24||0);
        const commercialCommission=Number(c.data?.commission_commercial||0);
        return <article className={styles.row} key={c.id}>
          <div className={styles.identity}><span>{c.external_reference||"CONTRATO ONE"}</span><strong>{c.client?.name||"Cliente"}</strong><small>{c.service_name||"Contrato"} · {c.provider||"Proveedor pendiente"} · {c.data?.product_name||"Producto pendiente"}</small></div>
          <div className={styles.detail}><span>RESPONSABLE</span><strong>{c.commercial_name||"DIRECTO AN24"}</strong><small>Contratación: {fmt(c.start_date)}</small></div>
          <div className={styles.detail}><span>ACTIVACIÓN</span><strong>{activation?fmt(activation):"Pendiente"}</strong><small>{c.status||"Contrato"}</small></div>
          <div className={styles.money}><div><span>AN24</span><strong>{money(commission)}</strong></div><div><span>COMERCIAL</span><strong>{money(commercialCommission)}</strong></div></div>
          <div className={styles.actions}><Status value={c.status||"Contrato"}/><Link href={`/contratos/${encodeURIComponent(c.id)}`}>Abrir →</Link></div>
        </article>
      })}</div>}
    </section>
  </main>
}

function Metric({label,value,note}:{label:string;value:number;note:string}){return <article className={styles.metric}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>}
function Status({value}:{value:string}){const key=value.toLocaleLowerCase("es");const cls=key.includes("activo")&&!key.includes("pendiente")?styles.active:key.includes("corrección")||key.includes("incorrect")?styles.issue:key.includes("tramit")||key.includes("pendiente")?styles.process:styles.neutral;return <span className={`${styles.status} ${cls}`}>{value}</span>}
function fmt(v?:string){if(!v)return "—";const d=new Date(v.length===10?`${v}T12:00:00`:v);return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}).format(d)}
function money(v:number){return `${Number(v||0).toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})} €`}
