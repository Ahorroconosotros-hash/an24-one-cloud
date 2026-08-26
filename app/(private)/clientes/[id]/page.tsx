"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "./Cliente.module.css";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Client = {
  id:string; reference:string; type:string; status:string; name:string; taxId:string;
  birthDate?:string; incorporationDate?:string; iban?:string; phone?:string; mobile?:string;
  email?:string; address?:string; postalCode?:string; city?:string; province?:string; sector?:string;
  commercial?:string; services?:string[]; notes?:string; createdAt:string; updatedAt:string;
};
type Offer = any;
type Contract = any;
type TimelineEvent = any;

type Payload = { client:Client; offers:Offer[]; contracts:Contract[]; timeline:TimelineEvent[]; viewer?:{name:string;role:string} };

export default function Cliente360Page(){
  const params = useParams<{id:string}>();
  const [data,setData]=useState<Payload|null|undefined>(undefined);
  const [error,setError]=useState("");

  async function authHeaders(){
    const {data:{session}}=await supabaseBrowser.auth.getSession();
    if(!session?.access_token) throw new Error("Sesión no encontrada");
    return {Authorization:`Bearer ${session.access_token}`};
  }

  async function load(){
    try{
      setError(""); setData(undefined);
      const headers=await authHeaders();
      const r=await fetch(`/api/client-360?clientId=${encodeURIComponent(params.id)}`,{headers,cache:"no-store"});
      const j=await r.json();
      if(!r.ok||!j?.ok||!j?.client) throw new Error(j?.error||"Cliente no encontrado");
      setData({client:j.client,offers:j.offers||[],contracts:j.contracts||[],timeline:j.timeline||[],viewer:j.viewer});
    }catch(e){setError(e instanceof Error?e.message:"No se pudo cargar el cliente");setData(null)}
  }

  useEffect(()=>{load()},[params.id]);

  async function addTimeline(eventType:string,title:string,detail?:string,channel?:string){
    const headers=await authHeaders();
    const r=await fetch('/api/client-timeline',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({clientId:params.id,eventType,title,detail,channel})});
    const j=await r.json();
    if(!r.ok) throw new Error(j?.error||'No se pudo registrar la actividad');
    await load();
  }

  if(data===undefined) return <div className={styles.notFound}>Cargando Cliente 360º…</div>;
  if(!data) return <div className={styles.notFound}><h1>Cliente no encontrado</h1><p>{error}</p><p><code>{params.id}</code></p><Link href="/clientes">Volver a clientes</Link></div>;

  const {client,offers,contracts,timeline,viewer}=data;
  const activeContracts=contracts.filter(c=>!["Borrador","Anulado","Baja"].includes(String(c.status||"")));
  const last=timeline[0];
  const phone=client.mobile||client.phone||"";

  const whatHas=activeContracts;

  async function note(){const v=window.prompt('Escribe la nota:',''); if(v===null||!v.trim()) return; await addTimeline('Nota','Nota añadida',v.trim(),'Interno')}
  async function call(){const v=window.prompt('Resultado / motivo de la llamada:',''); if(v===null) return; await addTimeline('Llamada','Llamada registrada',v||'Sin observaciones','Teléfono'); if(phone) window.location.href=`tel:${phone}`}
  async function whatsapp(){await addTimeline('WhatsApp','Contacto por WhatsApp iniciado','Apertura de WhatsApp Web','WhatsApp'); if(client.mobile) window.open(`https://wa.me/${String(client.mobile).replace(/\D/g,'')}`,'_blank','noopener,noreferrer')}

  return <main className={styles.page}>
    <div className={styles.crumb}><Link href="/clientes">Clientes</Link><span>/</span><strong>Cliente 360º</strong></div>

    <header className={styles.hero}>
      <div className={styles.avatar}>{initials(client.name)}</div>
      <div className={styles.identity}>
        <div className={styles.titleLine}><span className={styles.eyebrow}>CLIENTE 360º</span><span className={styles.status}>{client.status}</span></div>
        <h1>{client.name}</h1>
        <p>{client.taxId||'DNI/CIF pendiente'} · {client.reference} · {client.type}</p>
        <div className={styles.ownerLine}><span>Comercial <strong>{client.commercial||'Sin asignar'}</strong></span><span>Alta <strong>{fmt(client.createdAt)}</strong></span><span>Última interacción <strong>{last?fmt(last.created_at):'Sin actividad'}</strong></span></div>
      </div>
    </header>

    <div className={styles.quickBar}>
      <button onClick={call} disabled={!phone}>☎ Llamar</button>
      <button onClick={whatsapp} disabled={!client.mobile}>WhatsApp</button>
      {client.email ? <Link href={`/correo/redactar?clientId=${encodeURIComponent(client.id)}&to=${encodeURIComponent(client.email)}&name=${encodeURIComponent(client.name)}`}>Email</Link> : <button disabled>Email</button>}
      <button onClick={note}>+ Nota</button>
      <Link href={`/clientes/${client.id}/editar`}>Editar</Link>
      <Link href={`/oportunidades/nuevo?cliente=${encodeURIComponent(client.id)}`}>+ Nueva oferta</Link>
      <Link className={styles.contractAction} href={`/contratos/nuevo?cliente=${encodeURIComponent(client.id)}`}>+ Nuevo contrato</Link>
    </div>

    <section className={styles.usefulInfo}>
      <Info label="Teléfono" value={phone||'Pendiente'} />
      <Info label="Email" value={client.email||'Pendiente'} />
      <Info label="Dirección" value={[client.address,client.postalCode,client.city,client.province].filter(Boolean).join(', ')||'Pendiente'} />
      <Info label="Comercial" value={client.commercial||'Sin asignar'} />
      <Info label="Última interacción" value={last?`${last.title||last.event_type} · ${fmt(last.created_at)}`:'Sin actividad'} />
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHead}><div><span>¿QUÉ TIENE?</span><h2>Servicios contratados</h2><p>Solo contratos reales de este cliente.</p></div></div>
      {whatHas.length===0 ? <div className={styles.empty}><strong>Este cliente todavía no tiene servicios contratados.</strong><p>Las propuestas comerciales se muestran en Ofertas.</p></div> : <div className={styles.serviceGrid}>{whatHas.map(c=><article className={`${styles.serviceCard} ${c.status==="Activo"?styles.serviceActive:""}`} key={c.id}><div className={styles.serviceTop}><b className={styles.serviceIcon}>{c.status==="Activo"?"✓":"•"}</b><span>{c.status||"Contrato"}</span></div><strong>{c.service?.name||c.service?.category||c.service_name||'Contrato'}</strong><p>{c.provider||c.service?.provider||'Proveedor'} · {c.external_reference||c.id}</p>{fmtActivation(c)&&<small style={{display:"block",marginTop:6,color:"#7d716a",fontSize:11}}>Activación: <strong>{fmtActivation(c)}</strong></small>}<div className={styles.serviceLinks}><Link href={`/contratos/${c.id}?cliente=${client.id}`}>Ver contrato →</Link></div></article>)}</div>}
    </section>

    <div className={styles.twoCol}>
      <section className={styles.section}>
        <div className={styles.sectionHead}><div><span>OFERTAS</span><h2>Propuestas realizadas</h2><p>Presupuestos y ofertas ligadas al cliente.</p></div><Link href={`/oportunidades/nuevo?cliente=${encodeURIComponent(client.id)}`}>Nueva oferta →</Link></div>
        {offers.length===0?<div className={styles.empty}><strong>Todavía no hay ofertas.</strong><p>Crea una oferta y quedará vinculada al cliente.</p></div>:<div className={styles.list}>{offers.map(o=><div className={styles.record} key={o.id}><span className={styles.recordIcon}>O</span><div className={styles.recordBody}><strong>{o.title||o.service||'Oferta'}</strong><small>{o.stage||o.review_status||'Borrador'} · {fmt(o.updated_at||o.created_at)}</small></div><span className={styles.recordStatus}>{o.stage||'Oferta'}</span><Link href={`/oportunidades/${o.id}`}>Abrir →</Link></div>)}</div>}
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHead}><div><span>CONTRATOS</span><h2>Histórico contractual</h2><p>Tramitados, pendientes de activación, activos, anulados o baja.</p></div><Link href={`/contratos/nuevo?cliente=${encodeURIComponent(client.id)}`}>Nuevo contrato →</Link></div>
        {contracts.length===0?<div className={styles.empty}><strong>Todavía no hay contratos.</strong><p>Los contratos directos y los contratos nacidos de una oferta aparecerán aquí.</p></div>:<div className={styles.list}>{contracts.map(c=><div className={styles.record} key={c.id}><span className={styles.recordIcon}>C</span><div className={styles.recordBody}><strong>{c.service?.name||c.service?.category||'Contrato'}</strong><small>{c.external_reference||c.id} · {c.provider||c.service?.provider||'Proveedor'} · Comercial: {c.commercial_name||'Sin asignar'}{fmtActivation(c)?` · Activación: ${fmtActivation(c)}`:""}</small></div><span className={styles.recordStatus}>{c.status||'Contrato'}</span><Link href={`/contratos/${c.id}?cliente=${client.id}`}>Abrir →</Link></div>)}</div>}
      </section>
    </div>

    <section id="timeline" className={styles.section}>
      <div className={styles.sectionHead}><div><span>TIMELINE DEL CLIENTE</span><h2>Todo lo que sabemos de {client.name}</h2><p>Interacciones y movimientos registrados sobre el mismo cliente.</p></div><button onClick={note}>+ Añadir nota</button></div>
      {timeline.length===0?<div className={styles.emptyTimeline}>Todavía no hay actividad registrada.</div>:<div className={styles.timelineList}>{timeline.map(e=><div className={styles.timeline} key={e.id}><i/><time>{fmt(e.created_at)}</time><div><span>{e.event_type||e.channel||'Actividad'}</span><strong>{e.title||'Actividad'}</strong>{e.detail&&<p>{e.detail}</p>}<small>{e.actor_name||'ONE'}</small></div></div>)}</div>}
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHead}><div><span>INFORMACIÓN DEL CLIENTE</span><h2>Datos completos</h2></div></div>
      <div className={styles.dataGrid}>
        <Info label="DNI / CIF" value={client.taxId||'Pendiente'} /><Info label="ID ONE" value={client.reference} /><Info label="Tipo" value={client.type} /><Info label="IBAN" value={maskIban(client.iban||'')} />
        <Info label="Teléfono" value={phone||'Pendiente'} /><Info label="Email" value={client.email||'Pendiente'} /><Info label="Dirección" value={[client.address,client.postalCode,client.city,client.province].filter(Boolean).join(', ')||'Pendiente'} /><Info label="Notas generales" value={client.notes||'Sin notas'} />
      </div>
    </section>
    <div className={styles.footer}>Cliente central · {viewer?.role||''} · {viewer?.name||''}</div>
  </main>
}

function Info({label,value}:{label:string;value:string}){return <div className={styles.info}><span>{label}</span><strong>{value}</strong></div>}
function initials(v:string){return v.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'CL'}
function fmt(v?:string){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d)}

function fmtActivation(c:any){
  const value=c?.data?.activation_date||c?.activation_date||c?.start_date||"";
  return value ? fmt(value) : "";
}

function maskIban(v:string){if(!v)return 'Pendiente';return v.length>8?`${v.slice(0,4)} •••• •••• ${v.slice(-4)}`:v}
