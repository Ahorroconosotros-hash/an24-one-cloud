"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Data = {
  ok:boolean; warning?:string|null;
  kpis:{processing:number;activatedToday:number;activeContracts:number;corrections:number;commissionAN24Month:number;activeUsers:number};
  activity:{prospectsToday:number;budgetsToday:number;acceptedFromBudgetMonth:number;contractsToday:number;ratioBudgetToContract:number;crossSellClients:number};
  attention:{blocked48h:number;renewals30:number;withoutDocuments:number;corrections:number};
  economy:{marginMonth:number;commissionCommercialMonth:number;commissionAN24Month:number;services:Array<{service:string;contracts:number;active:number;margin:number;commissionCommercial:number}>};
  commercials:Array<{id:string;name:string;clients:number;contracts:number;active:number;commission:number}>;
  agenda:{today:Array<any>;overdue:Array<any>};
  alerts:{blocked48h:number;contractsWithoutOwner:number;usersWithoutAccess:number};
};

const euro=(v:number)=>Number(v||0).toLocaleString("es-ES",{style:"currency",currency:"EUR",minimumFractionDigits:0,maximumFractionDigits:2});
const hour=(v:string)=>{const d=new Date(v);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("es-ES",{hour:"2-digit",minute:"2-digit"}).format(d)};

function Kpi({icon,label,value,note,tone=""}:{icon:string;label:string;value:string|number;note:string;tone?:string}){
  return <article className={`adKpi ${tone}`}><i>{icon}</i><div><span>{label}</span><b>{value}</b><small>{note}</small></div></article>;
}

export default function AdminDashboard({userName}:{userName:string}){
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState("");

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const {data:{session}}=await supabaseBrowser.auth.getSession();
        if(!session) throw new Error("Sesión no encontrada");
        const r=await fetch("/api/admin-dashboard",{cache:"no-store",headers:{Authorization:`Bearer ${session.access_token}`}});
        const j=await r.json();
        if(!r.ok||!j?.ok) throw new Error(j?.error||"No se pudo cargar Mi Día");
        if(!cancelled)setData(j);
      }catch(e:any){if(!cancelled)setError(e?.message||"No se pudo cargar Mi Día");}
    })();
    return()=>{cancelled=true};
  },[]);

  const totalServices=useMemo(()=>data?.economy.services.reduce((s,x)=>s+x.contracts,0)||0,[data]);

  if(error) return <main className="ad"><div className="adState"><b>No se pudo cargar Mi Día de Administración</b><span>{error}</span></div></main>;
  if(!data) return <main className="ad"><div className="adState">Preparando visión general de ONE…</div></main>;

  const agenda=[...data.agenda.overdue,...data.agenda.today].slice(0,5);

  return <>
    <style>{`
      .ad{--o:#ff7417;--r:#ef4934;--ink:#252220;--muted:#8c8580;--line:#ebe6e1;max-width:1450px;margin:0 auto;padding:28px 0 48px;color:var(--ink)}
      .ad *{box-sizing:border-box}.ad a{text-decoration:none;color:inherit}.adState{background:#fff;border:1px solid var(--line);border-radius:15px;padding:22px;display:grid;gap:4px;font-size:11px}
      .adHero{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:16px}.adKick{font-size:10px;font-weight:950;letter-spacing:.17em;color:var(--r)}.adHero h1{font-size:31px;margin:7px 0 5px;letter-spacing:-.04em}.adHero p{font-size:11px;color:var(--muted);margin:0}.adActions{display:flex;gap:8px}.adBtn{padding:10px 13px;border:1px solid var(--line);border-radius:10px;background:#fff;font-size:10px;font-weight:900}.adBtn.primary{color:#fff;background:linear-gradient(110deg,#ffad1f,var(--r));border:0}
      .adKpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:13px}.adKpi{display:grid;grid-template-columns:46px 1fr;gap:11px;align-items:center;border:1px solid var(--line);border-radius:15px;background:#fff;padding:14px}.adKpi i{font-style:normal;width:43px;height:43px;border-radius:50%;display:grid;place-items:center;background:#fff2e7;font-size:20px}.adKpi.green i{background:#ebf8ef}.adKpi.red i{background:#fff0ee}.adKpi.blue i{background:#edf5ff}.adKpi span{font-size:9px;font-weight:900;color:#766f69}.adKpi b{display:block;font-size:24px;margin:5px 0 4px;letter-spacing:-.04em}.adKpi small{font-size:9px;color:var(--muted)}
      .adSection,.adCard{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:13px}.adHead{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:12px}.adHead h2{font-size:17px;margin:4px 0 0}.adLink{font-size:9px;font-weight:900;color:var(--r)!important}
      .adActivity{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}.adMini{border:1px solid var(--line);border-radius:12px;background:#fcfbfa;padding:12px}.adMini span{display:block;font-size:8px;font-weight:900;color:#847c76;text-transform:uppercase}.adMini b{display:block;font-size:23px;margin:6px 0 3px}.adMini small{font-size:9px;color:var(--muted)}
      .adGrid{display:grid;grid-template-columns:1.05fr .85fr 1.15fr;gap:13px;margin-bottom:13px}.adGrid .adCard{margin-bottom:0}.adAttention{display:grid;gap:8px}.adAtt{display:grid;grid-template-columns:34px 1fr auto;gap:9px;align-items:center;border:1px solid var(--line);border-radius:11px;padding:10px;background:#fcfbfa}.adAtt i{font-style:normal;width:33px;height:33px;border-radius:9px;display:grid;place-items:center;background:#fff2e8}.adAtt b{display:block;font-size:10px}.adAtt small{font-size:8px;color:var(--muted)}.adAtt strong{font-size:18px;color:var(--r)}
      .adDonutWrap{display:grid;grid-template-columns:120px 1fr;gap:14px;align-items:center}.adDonut{width:112px;height:112px;border-radius:50%;background:conic-gradient(#ff7417 0 46%,#4f8fec 46% 70%,#55b873 70% 87%,#9b62db 87%);position:relative}.adDonut:after{content:"";position:absolute;inset:28px;border-radius:50%;background:#fff}.adLegend{display:grid;gap:6px}.adLegend div{display:flex;justify-content:space-between;font-size:9px}.adLegend span{color:#746d67}
      .adMoneyGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:9px}.adMoney{border:1px solid var(--line);border-radius:11px;padding:10px}.adMoney span{font-size:8px;font-weight:900;color:#847c76;text-transform:uppercase}.adMoney b{display:block;font-size:20px;margin-top:5px}.adTable{width:100%;border-collapse:collapse}.adTable th,.adTable td{font-size:8px;padding:7px 5px;border-top:1px solid #f1ede9;text-align:left}.adTable th{color:#918985;text-transform:uppercase}.adTable th:last-child,.adTable td:last-child{text-align:right}
      .adTwo{display:grid;grid-template-columns:1fr 1fr;gap:13px}.adRow{display:grid;grid-template-columns:minmax(0,1.4fr) repeat(4,.65fr);gap:8px;align-items:center;padding:9px 0;border-top:1px solid #f1ede9;font-size:8px}.adRow:first-of-type{border-top:0}.adRow b{font-size:10px}.adRow small{display:block;font-size:8px;color:var(--muted)}.adRow span{text-align:right}
      .adAgendaRow{display:grid;grid-template-columns:55px 1fr auto;gap:9px;align-items:center;padding:9px 0;border-top:1px solid #f1ede9}.adAgendaRow:first-of-type{border-top:0}.adAgendaRow time{font-size:9px;font-weight:900}.adAgendaRow b{display:block;font-size:10px}.adAgendaRow small{font-size:8px;color:var(--muted)}.adBadge{font-size:8px;font-weight:900;background:#fff2e8;color:#b25128;border-radius:99px;padding:5px 7px}
      .adAlerts{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.adAlert{display:grid;grid-template-columns:40px 1fr auto;gap:10px;align-items:center;padding:11px;border:1px solid #f0ddd6;border-radius:12px;background:linear-gradient(110deg,#fff 60%,#fff6f1)}.adAlert i{font-style:normal;width:39px;height:39px;border-radius:50%;display:grid;place-items:center;background:#fff0ec}.adAlert b{display:block;font-size:10px}.adAlert small{font-size:8px;color:var(--muted)}.adAlert strong{font-size:18px;color:var(--r)}.adWarn{background:#fff8f3;border:1px solid #f0dfd4;border-radius:10px;padding:9px 11px;font-size:9px;color:#7c6658;margin-bottom:13px}
      @media(max-width:1150px){.adKpis{grid-template-columns:repeat(3,1fr)}.adActivity{grid-template-columns:repeat(3,1fr)}.adGrid{grid-template-columns:1fr 1fr}.adGrid .adCard:last-child{grid-column:1/-1}}
      @media(max-width:760px){.ad{padding:18px 0}.adHero{flex-direction:column}.adKpis,.adActivity,.adGrid,.adTwo,.adAlerts{grid-template-columns:1fr}.adGrid .adCard:last-child{grid-column:auto}.adRow{grid-template-columns:1fr auto}.adRow span:not(:last-child){display:none}}
    `}</style>

    <main className="ad">
      <section className="adHero">
        <div><div className="adKick">MI DÍA · ADMINISTRACIÓN</div><h1>Visión general del negocio</h1><p>Buenos días, {userName}. Control global de actividad, operativa, equipo y economía de ONE.</p></div>
        <div className="adActions"><Link className="adBtn" href="/informes">Ver informes</Link><Link className="adBtn primary" href="/usuarios">Gestionar equipo</Link></div>
      </section>

      {data.warning&&<div className="adWarn">{data.warning} Los demás indicadores sí proceden de datos reales de Supabase.</div>}

      <section className="adKpis">
        <Kpi icon="⏱" label="Tramitaciones pendientes" value={data.kpis.processing} note="Circuito BackOffice"/>
        <Kpi icon="✓" label="Activados hoy" value={data.kpis.activatedToday} note={`${data.kpis.activeContracts} activos en total`} tone="green"/>
        <Kpi icon="!" label="Correcciones abiertas" value={data.kpis.corrections} note="Requieren intervención" tone="red"/>
        <Kpi icon="€" label="Comisión prevista AN24" value={euro(data.kpis.commissionAN24Month)} note="Cobro previsto del mes"/>
        <Kpi icon="◎" label="Usuarios activos" value={data.kpis.activeUsers} note="Perfiles habilitados" tone="blue"/>
      </section>

      <section className="adSection">
        <div className="adHead"><div><div className="adKick">ACTIVIDAD COMERCIAL</div><h2>Qué está ocurriendo hoy</h2></div><Link href="/informes" className="adLink">Ver actividad completa →</Link></div>
        <div className="adActivity">
          <div className="adMini"><span>Prospectos creados</span><b>{data.activity.prospectsToday}</b><small>Hoy</small></div>
          <div className="adMini"><span>Presupuestos</span><b>{data.activity.budgetsToday}</b><small>Hoy · centralizados</small></div>
          <div className="adMini"><span>Presupuesto → contrato</span><b>{data.activity.acceptedFromBudgetMonth}</b><small>Este mes</small></div>
          <div className="adMini"><span>Contratos creados</span><b>{data.activity.contractsToday}</b><small>Hoy</small></div>
          <div className="adMini"><span>Ratio presupuesto → contrato</span><b>{data.activity.ratioBudgetToContract}%</b><small>Este mes</small></div>
          <div className="adMini"><span>Venta cruzada</span><b>{data.activity.crossSellClients}</b><small>Clientes con potencial</small></div>
        </div>
      </section>

      <section className="adGrid">
        <article className="adCard">
          <div className="adHead"><div><div className="adKick">LO QUE REQUIERE ATENCIÓN</div><h2>Alertas operativas</h2></div></div>
          <div className="adAttention">
            <Link href="/backoffice" className="adAtt"><i>⌛</i><div><b>Tramitaciones +48 h</b><small>Sin movimiento reciente.</small></div><strong>{data.attention.blocked48h}</strong></Link>
            <Link href="/contratos" className="adAtt"><i>↻</i><div><b>Renovaciones en 30 días</b><small>Conviene anticiparlas.</small></div><strong>{data.attention.renewals30}</strong></Link>
            <Link href="/backoffice" className="adAtt"><i>▤</i><div><b>Sin documentación adjunta</b><small>Expedientes en circuito.</small></div><strong>{data.attention.withoutDocuments}</strong></Link>
            <Link href="/backoffice" className="adAtt"><i>!</i><div><b>Correcciones abiertas</b><small>Pendientes de resolver.</small></div><strong>{data.attention.corrections}</strong></Link>
          </div>
        </article>

        <article className="adCard">
          <div className="adHead"><div><div className="adKick">VISIÓN DEL NEGOCIO</div><h2>Producción por servicio</h2></div></div>
          {data.economy.services.length===0?<div style={{fontSize:9,color:"var(--muted)"}}>No hay contratos creados este mes.</div>:<div className="adDonutWrap"><div className="adDonut"/><div className="adLegend">{data.economy.services.slice(0,5).map(x=><div key={x.service}><span>{x.service}</span><b>{x.contracts}</b></div>)}<div><span>Total mes</span><b>{totalServices}</b></div></div></div>}
        </article>

        <article className="adCard">
          <div className="adHead"><div><div className="adKick">ECONOMÍA ONE</div><h2>Margen y comisiones</h2></div><Link href="/informes" className="adLink">Ver análisis →</Link></div>
          <div className="adMoneyGrid"><div className="adMoney"><span>Margen previsto</span><b>{euro(data.economy.marginMonth)}</b></div><div className="adMoney"><span>Comisión comercial</span><b>{euro(data.economy.commissionCommercialMonth)}</b></div></div>
          <table className="adTable"><thead><tr><th>Servicio</th><th>Contratos</th><th>Margen</th><th>Comercial</th></tr></thead><tbody>{data.economy.services.slice(0,5).map(x=><tr key={x.service}><td>{x.service}</td><td>{x.contracts}</td><td>{euro(x.margin)}</td><td>{euro(x.commissionCommercial)}</td></tr>)}</tbody></table>
        </article>
      </section>

      <section className="adTwo">
        <article className="adSection">
          <div className="adHead"><div><div className="adKick">EQUIPO COMERCIAL</div><h2>Producción del mes</h2></div><Link href="/usuarios" className="adLink">Ver equipo →</Link></div>
          {data.commercials.length===0?<div style={{fontSize:9,color:"var(--muted)"}}>No hay comerciales activos.</div>:data.commercials.slice(0,7).map(x=><div className="adRow" key={x.id}><div><b>{x.name}</b><small>Comercial</small></div><span>{x.clients} clientes</span><span>{x.contracts} contratos</span><span>{x.active} activos</span><span>{euro(x.commission)}</span></div>)}
        </article>

        <article className="adSection">
          <div className="adHead"><div><div className="adKick">AGENDA DEL ADMINISTRADOR</div><h2>Reuniones y tareas</h2></div><Link href="/agenda" className="adLink">Agenda completa →</Link></div>
          {agenda.length===0?<div style={{fontSize:9,color:"var(--muted)"}}>No tienes tareas pendientes.</div>:agenda.map(ev=><Link href="/agenda" className="adAgendaRow" key={ev.id}><time>{data.agenda.overdue.some((x:any)=>x.id===ev.id)?"VENCIDA":hour(ev.starts_at)}</time><div><b>{ev.title}</b><small>{ev.event_type}{ev.description?` · ${ev.description}`:""}</small></div><span className="adBadge">{ev.priority||"Normal"}</span></Link>)}
        </article>
      </section>

      <section className="adSection">
        <div className="adHead"><div><div className="adKick">ALERTAS ADMINISTRATIVAS</div><h2>Control de estructura</h2></div></div>
        <div className="adAlerts">
          <Link href="/backoffice" className="adAlert"><i>⌛</i><div><b>Expedientes +48 h</b><small>Sin movimiento reciente.</small></div><strong>{data.alerts.blocked48h}</strong></Link>
          <Link href="/contratos" className="adAlert"><i>◎</i><div><b>Contratos sin responsable</b><small>No incluye DIRECTO AN24.</small></div><strong>{data.alerts.contractsWithoutOwner}</strong></Link>
          <Link href="/usuarios" className="adAlert"><i>♙</i><div><b>Usuarios sin acceso válido</b><small>Activos sin autenticación vinculada.</small></div><strong>{data.alerts.usersWithoutAccess}</strong></Link>
        </div>
      </section>
    </main>
  </>;
}
