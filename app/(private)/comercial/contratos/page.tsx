"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Contract={
  id:string; service_name?:string; provider?:string; status?:string;
  external_reference?:string; reference?:string; start_date?:string;
  data?:any; client?:{id:string;name?:string;reference?:string}|null;
};

export default function MisContratosPage(){
  const [contracts,setContracts]=useState<Contract[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [q,setQ]=useState("");

  useEffect(()=>{(async()=>{
    try{
      const {data:{session}}=await supabaseBrowser.auth.getSession();
      const r=await fetch("/api/contracts",{headers:{Authorization:`Bearer ${session?.access_token||""}`},cache:"no-store"});
      const j=await r.json();
      if(!r.ok||!j.ok) throw new Error(j.error||"No se pudieron cargar los contratos");
      setContracts(j.contracts||[]);
    }catch(e:any){setError(e?.message||"No se pudieron cargar los contratos");}
    finally{setLoading(false);}
  })()},[]);

  const filtered=useMemo(()=>{
    const s=q.trim().toLocaleLowerCase("es");
    if(!s)return contracts;
    return contracts.filter(c=>[
      c.client?.name,c.client?.reference,c.service_name,c.provider,c.status,
      c.external_reference,c.reference,c.data?.product_name
    ].some(v=>String(v||"").toLocaleLowerCase("es").includes(s)));
  },[contracts,q]);

  const active=contracts.filter(c=>c.status==="Activo").length;
  const processing=contracts.filter(c=>["Pendiente de tramitación","En tramitación","Tramitado en compañía","Pendiente de activación"].includes(String(c.status||""))).length;

  return <main style={{maxWidth:1500,margin:"0 auto",padding:"24px 28px 70px",color:"#211c19"}}>
    <header style={{display:"flex",justifyContent:"space-between",gap:18,alignItems:"flex-end",marginBottom:18}}>
      <div><span style={{fontSize:10,letterSpacing:".1em",fontWeight:950,color:"#e65735"}}>COMERCIAL · ONE</span><h1 style={{margin:"5px 0 4px",fontSize:28}}>Mis contratos</h1><p style={{margin:0,color:"#81766f",fontSize:13}}>Seguimiento de todos los contratos vinculados a tu cartera.</p></div>
      <Link href="/clientes" style={{background:"#ef5a34",color:"#fff",padding:"10px 13px",borderRadius:10,textDecoration:"none",fontSize:12,fontWeight:900}}>Ir a clientes</Link>
    </header>

    <section style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10,marginBottom:14}}>
      <Metric label="TOTAL" value={contracts.length}/>
      <Metric label="EN CURSO" value={processing}/>
      <Metric label="ACTIVOS" value={active}/>
    </section>

    <section style={{border:"1px solid #eee4dc",borderRadius:16,background:"#fff",padding:16}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",marginBottom:14}}>
        <div><span style={{fontSize:10,letterSpacing:".08em",fontWeight:900,color:"#e65735"}}>CONTRATOS</span><strong style={{display:"block",marginTop:4,fontSize:16}}>Cartera contractual</strong></div>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar cliente, contrato, producto..." style={{width:320,maxWidth:"45vw",border:"1px solid #ddd7d1",borderRadius:9,padding:"9px 11px",font:"inherit",fontSize:12}}/>
      </div>

      {loading?<div style={{padding:20,color:"#8d837c"}}>Cargando contratos…</div>:
      error?<div style={{padding:14,border:"1px solid #efbea9",background:"#fff4ef",borderRadius:10,color:"#a83f20",fontSize:12,fontWeight:800}}>{error}</div>:
      filtered.length===0?<div style={{padding:24,textAlign:"center",color:"#8d837c"}}>No tienes contratos que coincidan con la búsqueda.</div>:
      <div style={{display:"grid",gap:9}}>
        {filtered.map(c=><article key={c.id} style={{display:"grid",gridTemplateColumns:"1.3fr .8fr .8fr auto",gap:12,alignItems:"center",border:"1px solid #eee4dc",borderRadius:12,padding:"12px 13px",background:"#fcfbfa"}}>
          <div><strong style={{display:"block",fontSize:13}}>{c.client?.name||"Cliente"}</strong><small style={{display:"block",marginTop:3,color:"#8c817a"}}>{c.external_reference||c.reference||c.id} · {c.data?.product_name||c.service_name||"Contrato"}</small></div>
          <div><span style={{display:"block",fontSize:9,color:"#9a8e86",fontWeight:900}}>SERVICIO</span><strong style={{fontSize:12}}>{c.service_name||"Contrato"}</strong></div>
          <div><span style={{display:"block",fontSize:9,color:"#9a8e86",fontWeight:900}}>ESTADO</span><strong style={{fontSize:12,color:c.status==="Activo"?"#246342":"#8a5a1f"}}>{c.status||"Contrato"}</strong></div>
          <Link href={`/contratos/${c.id}`} style={{color:"#e65735",fontSize:11,fontWeight:900,textDecoration:"none"}}>Abrir →</Link>
        </article>)}
      </div>}
    </section>
  </main>
}

function Metric({label,value}:{label:string;value:number}){return <div style={{border:"1px solid #eee4dc",borderRadius:13,background:"#fff",padding:14}}><span style={{display:"block",fontSize:9,letterSpacing:".08em",color:"#9a8e86",fontWeight:900}}>{label}</span><strong style={{display:"block",marginTop:5,fontSize:22}}>{value}</strong></div>}
