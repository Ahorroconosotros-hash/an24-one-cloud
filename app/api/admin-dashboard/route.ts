import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function currentAdmin(request: NextRequest) {
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

  return data?.role === "Administrador" ? data : null;
}

const normalize = (v:any) => String(v || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLocaleLowerCase("es");

const number = (v:any) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
};

function isoDay(value:any) {
  const s = String(value || "");
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0,10) : "";
}

function sameDay(value:any, date:Date) {
  return isoDay(value) === `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function sameMonth(value:any, date:Date) {
  return isoDay(value).slice(0,7) === `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
}

function parseDate(value:any) {
  const d=isoDay(value);
  if(!d) return null;
  const date=new Date(`${d}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date:Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
}

function addMonths(date:Date, months:number) {
  return new Date(date.getFullYear(),date.getMonth()+months,1,12);
}

export async function GET(request:NextRequest) {
  const admin=await currentAdmin(request);
  if(!admin) return NextResponse.json({ok:false,error:"Acceso reservado a Administración."},{status:403});

  const now=new Date();
  const startToday=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
  const h48=48*60*60*1000;

  const [contractsR,clientsR,usersR,agendaR,oppsR]=await Promise.all([
    supabaseAdmin.from("one_contracts").select("*").order("created_at",{ascending:false}),
    supabaseAdmin.from("one_clients").select("*").order("created_at",{ascending:false}),
    supabaseAdmin.from("one_users").select("id,name,email,role,active,auth_user_id").order("name"),
    supabaseAdmin.from("agenda_events").select("*").eq("assigned_user_id",admin.id).neq("status","Completada").order("starts_at",{ascending:true}),
    supabaseAdmin.from("opportunities").select("*").eq("source","ONE").order("created_at",{ascending:false}),
  ]);

  if(contractsR.error) return NextResponse.json({ok:false,error:contractsR.error.message},{status:500});
  if(clientsR.error) return NextResponse.json({ok:false,error:clientsR.error.message},{status:500});
  if(usersR.error) return NextResponse.json({ok:false,error:usersR.error.message},{status:500});
  if(agendaR.error) return NextResponse.json({ok:false,error:agendaR.error.message},{status:500});

  const contracts=contractsR.data||[];
  const clients=clientsR.data||[];
  const users=usersR.data||[];
  const agenda=agendaR.data||[];
  const opportunities=oppsR.error ? [] : (oppsR.data||[]);

  const processingStatuses=new Set([
    "Pendiente de tramitación","En tramitación","Tramitado en compañía",
    "Pendiente de activación","Pendiente activación"
  ]);

  const active=contracts.filter((c:any)=>String(c.status||"")==="Activo");
  const processing=contracts.filter((c:any)=>processingStatuses.has(String(c.status||"")));
  const corrections=processing.filter((c:any)=>Boolean(c.data?.correction_requested));

  const blocked48=processing.filter((c:any)=>{
    const stamp=new Date(c.updated_at||c.created_at||0).getTime();
    return Number.isFinite(stamp) && now.getTime()-stamp>=h48;
  });

  const withoutDocuments=processing.filter((c:any)=>{
    const docs=Array.isArray(c.data?.contract_documents)?c.data.contract_documents:[];
    return docs.length===0;
  });

  const renewals=active.map((c:any)=>{
    const expiry=parseDate(c.end_date||c.data?.renewal_date||c.data?.expiry_date||c.data?.contract_end_date);
    if(!expiry) return null;
    const days=Math.ceil((expiry.getTime()-startToday)/86400000);
    if(days<0||days>30) return null;
    return {
      id:c.id,
      clientId:c.client_id,
      service:c.service_name||"Contrato",
      provider:c.provider||"",
      commercialName:c.commercial_name||"Sin comercial",
      expiry:isoDay(c.end_date||c.data?.renewal_date||c.data?.expiry_date||c.data?.contract_end_date),
      days,
    };
  }).filter(Boolean).sort((a:any,b:any)=>a.days-b.days);

  const currentPaymentMonth=monthKey(now);

  const forecast=(field:string)=>active.reduce((sum:number,c:any)=>{
    const activation=parseDate(c.activation_date||c.data?.activation_date);
    if(!activation) return sum;
    if(monthKey(addMonths(activation,1))!==currentPaymentMonth) return sum;
    return sum+number(c.data?.[field]);
  },0);

  const servicesMap=new Map<string,{service:string;contracts:number;active:number;margin:number;commissionCommercial:number}>();
  for(const c of contracts.filter((x:any)=>sameMonth(x.created_at,now))){
    const label=String(c.service_name||"Otros").trim()||"Otros";
    const key=normalize(label);
    const row=servicesMap.get(key)||{service:label,contracts:0,active:0,margin:0,commissionCommercial:0};
    row.contracts++;
    if(String(c.status||"")==="Activo") row.active++;
    row.margin+=number(c.data?.margin_an24);
    row.commissionCommercial+=number(c.data?.commission_commercial);
    servicesMap.set(key,row);
  }

  const services=[...servicesMap.values()].sort((a,b)=>b.contracts-a.contracts);

  const commercials=users.filter((u:any)=>u.role==="Comercial"&&u.active).map((u:any)=>{
    const ownContracts=contracts.filter((c:any)=>String(c.commercial_user_id||"")===String(u.id)&&sameMonth(c.created_at,now));
    const ownActive=ownContracts.filter((c:any)=>String(c.status||"")==="Activo");
    const ownClients=clients.filter((c:any)=>String(c.commercial_user_id||"")===String(u.id)&&sameMonth(c.created_at,now));
    return {
      id:u.id,name:u.name,
      clients:ownClients.length,
      contracts:ownContracts.length,
      active:ownActive.length,
      commission:ownActive.reduce((s:number,c:any)=>s+number(c.data?.commission_commercial),0),
    };
  }).sort((a:any,b:any)=>b.contracts-a.contracts||b.active-a.active);

  const core=["energia","telefonia","alarmas","seguros"];
  const servicesByClient=new Map<string,Set<string>>();
  for(const c of active){
    const clientId=String(c.client_id||"");
    if(!clientId) continue;
    const set=servicesByClient.get(clientId)||new Set<string>();
    set.add(normalize(c.service_name));
    servicesByClient.set(clientId,set);
  }
  const crossSellClients=[...servicesByClient.values()].filter(set=>core.some(s=>!set.has(s))).length;

  const budgetsMonth=opportunities.filter((o:any)=>sameMonth(o.created_at,now)).length;
  const acceptedFromBudgetMonth=contracts.filter((c:any)=>Boolean(c.data?.source_offer_id)&&sameMonth(c.created_at,now)).length;

  const agendaToday=agenda.filter((e:any)=>sameDay(e.starts_at,now));
  const agendaOverdue=agenda.filter((e:any)=>{
    const stamp=new Date(e.starts_at||0).getTime();
    return Number.isFinite(stamp)&&stamp<now.getTime()&&!sameDay(e.starts_at,now);
  });

  return NextResponse.json({
    ok:true,
    warning:oppsR.error ? "Presupuestos centrales todavía en migración." : null,
    kpis:{
      processing:processing.length,
      activatedToday:active.filter((c:any)=>sameDay(c.activation_date||c.data?.activation_date,now)).length,
      activeContracts:active.length,
      corrections:corrections.length,
      commissionAN24Month:forecast("commission_an24"),
      activeUsers:users.filter((u:any)=>u.active).length,
    },
    activity:{
      prospectsToday:clients.filter((c:any)=>normalize(c.status||c.data?.status)==="prospecto"&&sameDay(c.created_at,now)).length,
      budgetsToday:opportunities.filter((o:any)=>sameDay(o.created_at,now)).length,
      acceptedFromBudgetMonth,
      contractsToday:contracts.filter((c:any)=>sameDay(c.created_at,now)).length,
      ratioBudgetToContract:budgetsMonth?Math.round(acceptedFromBudgetMonth/budgetsMonth*100):0,
      crossSellClients,
    },
    attention:{
      blocked48h:blocked48.length,
      renewals30:renewals.length,
      withoutDocuments:withoutDocuments.length,
      corrections:corrections.length,
    },
    economy:{
      marginMonth:forecast("margin_an24"),
      commissionCommercialMonth:forecast("commission_commercial"),
      commissionAN24Month:forecast("commission_an24"),
      services,
    },
    commercials,
    agenda:{today:agendaToday,overdue:agendaOverdue},
    alerts:{
      blocked48h:blocked48.length,
      contractsWithoutOwner:contracts.filter((c:any)=>!c.commercial_user_id&&normalize(c.data?.attribution)!=="directo").length,
      usersWithoutAccess:users.filter((u:any)=>u.active&&!u.auth_user_id).length,
    },
    renewals:renewals.slice(0,8),
  });
}
