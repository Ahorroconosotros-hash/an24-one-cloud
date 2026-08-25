"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./Productos.module.css";

type Provider = {
  id: string;
  service: string;
  name: string;
  active: boolean;
  logo?: string;
  referenceOnly?: boolean;
};

type Product = {
  id: string;
  service: string;
  providerId?: string;
  company: string;
  name: string;
  features: string;
  active: boolean;
  productType?: string;
  operationType?: string;
  pvp?: number;
};

type Mode = "fixed" | "percentage" | "mixed";
type ProfileKey = "Premium" | "Avanzado" | "Estándar" | "Colaborador";

type ProfileForm = {
  mode: Mode;
  fixed: string;
  percentage: string;
  base: string;
  points: string;
};

type CommissionRule = {
  id: string;
  product_id?: string | null;
  provider_id?: string | null;
  operation_type?: string | null;
  fixed_amount?: number | null;
  percentage?: number | null;
  recurring_amount?: number | null;
  points?: number | null;
  commission_mode?: string | null;
  percentage_base?: string | null;
  side?: string | null;
  role_context?: string | null;
  recurring_percentage?: number | null;
  recurring_base?: string | null;
  active?: boolean | null;
  config?: Record<string, any> | null;
};

type CommercialCommissionRule = CommissionRule & {
  profile_type?: string | null;
};

const services = ["Energía","Telefonía","Alarmas","Seguros","Asesoramiento","Inmobiliaria","IA"];

const profiles: { key: ProfileKey; icon: string }[] = [
  { key: "Premium", icon: "🏆" },
  { key: "Avanzado", icon: "⭐" },
  { key: "Estándar", icon: "🔵" },
  { key: "Colaborador", icon: "🤝" },
];

const emptyProfile = (): ProfileForm => ({
  mode: "fixed",
  fixed: "",
  percentage: "",
  base: "provider_commission",
  points: "",
});

const emptyForm = {
  service: "Energía",
  providerId: "",
  productType: "Luz",
  operationType: "Nueva",
  side: "none",
  roleContext: "",
  name: "",
  features: "",
  pvp: "",
  an24Mode: "fixed" as Mode,
  an24Fixed: "",
  an24Percentage: "",
  an24Base: "provider_commission",
  an24Recurring: "",
  an24RecurringPercentage: "",
  an24RecurringBase: "provider_commission",
  an24Points: "",
  targetEnabled: false,
  targetMin: "",
  targetMax: "",
  targetBonus: "",
  acceleratorEnabled: false,
  acceleratorFrom: "",
  acceleratorTo: "",
  acceleratorBonus: "",
  clawbackEnabled: false,
  clawbackMonths: "",
  clawbackPercentage: "100",
};

const box: React.CSSProperties = {
  gridColumn: "1 / -1",
  border: "1px solid #ececec",
  borderRadius: 14,
  padding: 16,
  background: "#fafafa",
};

const grid3: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3,minmax(0,1fr))",
  gap: 12,
};

function productTypes(service: string) {
  switch (service) {
    case "Telefonía": return ["Móvil","Fibra","Convergente","Línea adicional","OTT"];
    case "Energía": return ["Luz","Gas","Dual"];
    case "Inmobiliaria": return ["Piso","Casa / Chalet","Local","Nave","Terreno","Oficina","Garaje","Otro"];
    case "Seguros": return ["Auto","Hogar","Comercio","Vida","Salud","Mascotas","Otro"];
    case "Alarmas": return ["Hogar","Negocio","Otro"];
    default: return ["Servicio"];
  }
}

function operationTypes(service: string) {
  switch (service) {
    case "Telefonía": return ["Alta nueva","Portabilidad","Línea adicional","Renovación"];
    case "Energía": return ["Nueva","Cartera","Renovación"];
    case "Inmobiliaria": return ["Venta","Alquiler"];
    case "Seguros": return ["Nueva producción","Renovación","Cartera"];
    case "Alarmas": return ["Alta","Instalación","Recurrente"];
    default: return ["Nueva"];
  }
}

function bases(service: string): [string,string][] {
  if (service === "Inmobiliaria") return [
    ["sale_price","Precio de venta"],
    ["monthly_fee","Renta / cuota"],
    ["provider_commission","Comisión AN24"],
    ["custom","Otra base"],
  ];
  if (service === "Seguros") return [
    ["premium","Prima"],
    ["net_premium","Prima neta"],
    ["provider_commission","Comisión AN24"],
    ["custom","Otra base"],
  ];
  if (service === "Energía") return [
    ["provider_commission","Comisión proveedor"],
    ["invoiced_amount","Facturación / liquidación"],
    ["monthly_fee","Cuota"],
    ["custom","Otra base"],
  ];
  return [
    ["provider_commission","Comisión proveedor / AN24"],
    ["monthly_fee","Cuota mensual"],
    ["annual_fee","Cuota anual"],
    ["custom","Otra base"],
  ];
}

function profileName(value?: string | null): ProfileKey | null {
  const v=(value||"").toLowerCase();
  if(v.includes("premium")) return "Premium";
  if(v.includes("avanz")) return "Avanzado";
  if(v.includes("est")) return "Estándar";
  if(v.includes("colab")) return "Colaborador";
  return null;
}

function money(v?: number | null){ return `${Number(v||0).toFixed(2)} €`; }

export default function Productos(){
  const [items,setItems]=useState<Product[]>([]);
  const [providers,setProviders]=useState<Provider[]>([]);
  const [commissionRules,setCommissionRules]=useState<CommissionRule[]>([]);
  const [commercialRules,setCommercialRules]=useState<CommercialCommissionRule[]>([]);
  const [targetRules,setTargetRules]=useState<any[]>([]);
  const [acceleratorRules,setAcceleratorRules]=useState<any[]>([]);
  const [clawbackRules,setClawbackRules]=useState<any[]>([]);
  const [saving,setSaving]=useState(false);
  const [migratingLegacy,setMigratingLegacy]=useState(false);

  const [open,setOpen]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [query,setQuery]=useState("");
  const [serviceFilter,setServiceFilter]=useState("Todos");
  const [statusFilter,setStatusFilter]=useState<"Todos"|"Activos"|"Inactivos">("Todos");
  const [form,setForm]=useState(emptyForm);
  const [profileForms,setProfileForms]=useState<Record<ProfileKey,ProfileForm>>({
    Premium:emptyProfile(),Avanzado:emptyProfile(),Estándar:emptyProfile(),Colaborador:emptyProfile()
  });

  const [providersOpen,setProvidersOpen]=useState(false);
  const [providerEditId,setProviderEditId]=useState<string|null>(null);
  const [providerForm,setProviderForm]=useState({service:"Energía",name:"",logo:"",referenceOnly:false});

  const loadCatalog=async()=>{
    const r=await fetch("/api/catalog",{cache:"no-store"});
    const data=await r.json();

    if(!r.ok||!data.ok){
      throw new Error(data.error||"No se pudo cargar catálogo");
    }

    const ps:Provider[]=(data.providers||[]).map((p:any)=>({
      id:p.id,
      service:p.service||"",
      name:p.name||"",
      active:p.active!==false,
      logo:p.logo||"",
      referenceOnly:Boolean(p.reference_only)
    }));

    const products:Product[]=(data.products||[]).map((p:any)=>({
      id:p.id,
      service:p.service||p.category||"",
      providerId:p.provider_id||"",
      company:ps.find(x=>x.id===p.provider_id)?.name||"",
      name:p.name||"",
      features:p.description||p.config?.features||p.config?.phone_type||"",
      active:p.active!==false,
      productType:p.product_type||p.config?.phone_type||"",
      operationType:p.operation_type||"",
      pvp:Number(p.pvp||0),
    }));

    setProviders(ps);
    setItems(products);
    setCommissionRules(data.commissionRules||[]);
    setCommercialRules(data.commercialCommissionRules||[]);
    setTargetRules(data.targetRules||[]);
    setAcceleratorRules(data.acceleratorRules||[]);
    setClawbackRules(data.clawbackRules||[]);
  };

  useEffect(()=>{
    let cancelled=false;

    (async()=>{
      try{
        await loadCatalog();
      }catch(e){
        console.error("ONE Cloud · catálogo",e);
        if(!cancelled){
          setProviders([]);
          setItems([]);
        }
      }
    })();

    return()=>{cancelled=true};
  },[]);

  const activeProvidersForService=useMemo(()=>providers.filter(p=>p.service===form.service&&p.active&&!p.referenceOnly),[providers,form.service]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return items.filter(p=>{
      const textOk=!q||[p.service,p.company,p.name,p.features].some(v=>String(v||"").toLowerCase().includes(q));
      const serviceOk=serviceFilter==="Todos"||p.service===serviceFilter;
      const statusOk=statusFilter==="Todos"||(statusFilter==="Activos"?p.active:!p.active);
      return textOk&&serviceOk&&statusOk;
    });
  },[items,query,serviceFilter,statusFilter]);

  const resetProfiles=()=>setProfileForms({Premium:emptyProfile(),Avanzado:emptyProfile(),Estándar:emptyProfile(),Colaborador:emptyProfile()});

  const openCreate=()=>{
    const service="Energía";
    const first=providers.find(p=>p.service===service&&p.active&&!p.referenceOnly);
    setEditingId(null);
    setForm({...emptyForm,service,providerId:first?.id||"",productType:productTypes(service)[0],operationType:operationTypes(service)[0]});
    resetProfiles(); setOpen(true);
  };

  const openEdit=(p:Product)=>{
    const main=commissionRules.find(r=>r.product_id===p.id&&r.active!==false);
    const nextProfiles:Record<ProfileKey,ProfileForm>={Premium:emptyProfile(),Avanzado:emptyProfile(),Estándar:emptyProfile(),Colaborador:emptyProfile()};
    commercialRules.filter(r=>r.product_id===p.id&&r.active!==false).forEach(r=>{
      const k=profileName(r.profile_type); if(!k) return;
      nextProfiles[k]={mode:(r.commission_mode as Mode)||"fixed",fixed:String(r.fixed_amount??""),percentage:String(r.percentage??""),base:r.percentage_base||"provider_commission",points:String(r.points??"")};
    });
    const target=targetRules.find(r=>r.product_id===p.id||r.provider_id===p.providerId);
    const accelerator=acceleratorRules.find(r=>r.product_id===p.id||r.provider_id===p.providerId);
    const clawback=clawbackRules.find(r=>r.product_id===p.id||r.provider_id===p.providerId);
    setEditingId(p.id);
    setForm({...emptyForm,
      service:p.service,providerId:p.providerId||"",productType:p.productType||productTypes(p.service)[0],operationType:main?.operation_type||p.operationType||operationTypes(p.service)[0],
      side:main?.side||"none",roleContext:main?.role_context||"",name:p.name,features:p.features,pvp:String(p.pvp??""),
      an24Mode:(main?.commission_mode as Mode)||"fixed",an24Fixed:String(main?.fixed_amount??""),an24Percentage:String(main?.percentage??""),an24Base:main?.percentage_base||"provider_commission",
      an24Recurring:String(main?.recurring_amount??""),an24RecurringPercentage:String(main?.recurring_percentage??""),an24RecurringBase:main?.recurring_base||"provider_commission",an24Points:String(main?.points??""),
      targetEnabled:Boolean(target),targetMin:String(target?.min_value??target?.config?.min??""),targetMax:String(target?.max_value??target?.config?.max??""),targetBonus:String(target?.bonus_fixed??target?.config?.bonus??""),
      acceleratorEnabled:Boolean(accelerator),acceleratorFrom:String(accelerator?.threshold??accelerator?.config?.from??""),acceleratorTo:String(accelerator?.config?.to??""),acceleratorBonus:String(accelerator?.bonus_fixed??accelerator?.config?.bonus??""),
      clawbackEnabled:Boolean(clawback),clawbackMonths:String(clawback?.months??""),clawbackPercentage:String(clawback?.config?.percentage??"100")
    });
    setProfileForms(nextProfiles); setOpen(true);
  };

  const onServiceChange=(service:string)=>{
    const first=providers.find(p=>p.service===service&&p.active&&!p.referenceOnly);
    setForm({...form,service,providerId:first?.id||"",productType:productTypes(service)[0],operationType:operationTypes(service)[0],side:service==="Inmobiliaria"?"seller":"none",roleContext:"",an24Base:bases(service)[0][0]});
  };

  const mainRule=(id:string)=>commissionRules.find(r=>r.product_id===id&&r.active!==false);
  const commercialRule=(id:string,k:ProfileKey)=>commercialRules.find(r=>r.product_id===id&&r.active!==false&&profileName(r.profile_type)===k);

  const submit=async()=>{
    const provider=providers.find(p=>p.id===form.providerId);

    if(!provider){
      alert("Selecciona un proveedor.");
      return;
    }

    if(!form.name.trim()){
      alert("Indica el nombre del producto.");
      return;
    }

    setSaving(true);

    try{
      const existing=editingId?items.find(p=>p.id===editingId):null;

      const r=await fetch("/api/catalog-admin",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          action:"save-product",
          product:{
            id:editingId||null,
            providerId:provider.id,
            service:form.service,
            name:form.name.trim(),
            description:form.features.trim(),
            productType:form.productType,
            operationType:form.operationType,
            pvp:Number(form.pvp)||0,
            active:existing?.active!==false,
            config:{
              features:form.features.trim(),
              phone_type:form.productType
            }
          },
          an24Rule:{
            operationType:form.operationType,
            commissionMode:form.an24Mode,
            fixedAmount:form.an24Fixed,
            percentage:form.an24Percentage,
            percentageBase:form.an24Base,
            recurringAmount:form.an24Recurring,
            recurringPercentage:form.an24RecurringPercentage,
            recurringBase:form.an24RecurringBase,
            points:form.an24Points,
            side:form.side,
            roleContext:form.roleContext
          },
          commercialProfiles:profiles.map(({key})=>({
            profileType:key,
            fixedAmount:profileForms[key].fixed
          })),
          target:{
            enabled:form.targetEnabled,
            min:form.targetMin,
            max:form.targetMax,
            bonus:form.targetBonus
          },
          accelerator:{
            enabled:form.acceleratorEnabled,
            from:form.acceleratorFrom,
            to:form.acceleratorTo,
            bonus:form.acceleratorBonus
          },
          clawback:{
            enabled:form.clawbackEnabled,
            months:form.clawbackMonths,
            percentage:form.clawbackPercentage
          }
        })
      });

      const raw=await r.text();
      let d:any;

      try{
        d=JSON.parse(raw);
      }catch{
        throw new Error(`ONE Cloud devolvió una respuesta no válida (${r.status}).`);
      }

      if(!r.ok||!d.ok){
        throw new Error(d.error||"No se pudo guardar el producto.");
      }

      await loadCatalog();
      setOpen(false);

      alert(
        editingId
          ?"Producto y comisiones guardados correctamente en ONE Cloud."
          :"Producto creado con sus comisiones en ONE Cloud."
      );
    }catch(e:any){
      alert(e?.message||"No se pudo guardar el producto.");
    }finally{
      setSaving(false);
    }
  };

  const toggleActive=async(id:string)=>{
    const product=items.find(p=>p.id===id);
    if(!product) return;

    try{
      const r=await fetch("/api/catalog-admin",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          action:"toggle-product",
          id,
          active:!product.active
        })
      });

      const d=await r.json();
      if(!r.ok||!d.ok) throw new Error(d.error||"No se pudo cambiar el estado.");
      await loadCatalog();
    }catch(e:any){
      alert(e?.message||"No se pudo cambiar el estado del producto.");
    }
  };

  const openProviderCreate=()=>{setProviderEditId(null);setProviderForm({service:"Energía",name:"",logo:"",referenceOnly:false});setProvidersOpen(true)};
  const openProviderEdit=(p:Provider)=>{setProviderEditId(p.id);setProviderForm({service:p.service,name:p.name,logo:p.logo||"",referenceOnly:!!p.referenceOnly});setProvidersOpen(true)};

  const saveProvider=async()=>{
    const name=providerForm.name.trim();

    if(!name){
      alert("Indica el nombre del proveedor.");
      return;
    }

    try{
      const r=await fetch("/api/catalog-admin",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          action:"save-provider",
          provider:{
            id:providerEditId||null,
            service:providerForm.service,
            name,
            logo:providerForm.logo||null,
            referenceOnly:providerForm.referenceOnly,
            active:providerEditId
              ? providers.find(p=>p.id===providerEditId)?.active!==false
              : true
          }
        })
      });

      const d=await r.json();
      if(!r.ok||!d.ok) throw new Error(d.error||"No se pudo guardar el proveedor.");

      await loadCatalog();
      setProvidersOpen(false);

      alert(providerEditId?"Proveedor actualizado en ONE Cloud.":"Proveedor creado en ONE Cloud.");
    }catch(e:any){
      alert(e?.message||"No se pudo guardar el proveedor.");
    }
  };

  const toggleProvider=async(id:string)=>{
    const provider=providers.find(p=>p.id===id);
    if(!provider) return;

    try{
      const r=await fetch("/api/catalog-admin",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          action:"toggle-provider",
          id,
          active:!provider.active
        })
      });

      const d=await r.json();
      if(!r.ok||!d.ok) throw new Error(d.error||"No se pudo cambiar el estado del proveedor.");
      await loadCatalog();
    }catch(e:any){
      alert(e?.message||"No se pudo cambiar el estado del proveedor.");
    }
  };
  const onProviderLogo=(file?:File)=>{if(!file)return;const reader=new FileReader();reader.onload=()=>setProviderForm(v=>({...v,logo:String(reader.result||"")}));reader.readAsDataURL(file)};

  const currentBases=bases(form.service);

  return <main className={styles.page}>
    <header className={styles.hero}>
      <div><span>ONE · CATÁLOGO COMERCIAL</span><h1>Productos</h1><p>Servicio → proveedor → producto → motor de comisiones ONE.</p></div>
      <div className={styles.heroActions}><button className={styles.secondaryHero} onClick={openProviderCreate}>Proveedores</button><button onClick={openCreate}>+ Nuevo producto</button></div>
    </header>

    <div className={styles.kpis}>
      <K label="Servicios" value={services.length}/><K label="Proveedores" value={new Set(providers.map(p=>p.name)).size}/><K label="Productos activos" value={items.filter(p=>p.active).length}/><K label="Reglas de comisión" value={commissionRules.length+commercialRules.length}/>
    </div>

    <section className={styles.info}><strong>Motor ONE</strong><span>Comisión AN24 + comisión comercial + objetivos + aceleradores + clawback.</span></section>

    <section className={styles.tableCard}>
      <div className={styles.tableHead}><div><h2>Catálogo de productos</h2><p>Datos reales desde ONE Cloud.</p></div><div className={styles.tools}><div className={styles.searchBox}><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar producto, proveedor, características..."/></div><select className={styles.filter} value={serviceFilter} onChange={e=>setServiceFilter(e.target.value)}><option>Todos</option>{services.map(s=><option key={s}>{s}</option>)}</select><select className={styles.filter} value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)}><option>Todos</option><option>Activos</option><option>Inactivos</option></select></div></div>
      <div className={styles.resultBar}><span>{filtered.length} {filtered.length===1?"producto":"productos"}</span></div>
      <div className={styles.productList}>{filtered.map(p=>{const rule=mainRule(p.id);return <article className={`${styles.productRow} ${!p.active?styles.rowInactive:""}`} key={p.id}>
        <div className={styles.identity}><div className={styles.identityTop}><span className={styles.service}>{p.service}</span></div><strong>{p.name}</strong><small>{p.company}</small></div>
        <div className={styles.features}><span>Características</span><p>{p.features||"Sin características añadidas"}</p>{rule?.operation_type&&<small>{rule.operation_type}</small>}</div>
        <div className={styles.commissions}><div className={styles.commissionMain}><span>Comisión AN24</span><strong>{rule?.commission_mode==="percentage"?`${Number(rule.percentage||0).toFixed(2)} %`:rule?.commission_mode==="mixed"?`${money(rule.fixed_amount)} + ${Number(rule.percentage||0).toFixed(2)} %`:money(rule?.fixed_amount)}</strong></div><div className={styles.commissionProfiles}>{profiles.map(({key,icon})=>{const cr=commercialRule(p.id,key);const value=cr?.commission_mode==="percentage"?`${Number(cr.percentage||0).toFixed(2)} %`:cr?.commission_mode==="mixed"?`${money(cr.fixed_amount)} + ${Number(cr.percentage||0).toFixed(2)} %`:money(cr?.fixed_amount);return <span key={key}>{icon} {key} <b>{value}</b></span>})}</div></div>
        <div className={styles.right}><span className={p.active?styles.active:styles.inactive}>{p.active?"ACTIVO":"INACTIVO"}</span><div className={styles.actionsInline}><button className={styles.editBtn} onClick={()=>openEdit(p)}>Editar</button><button className={p.active?styles.deactivateBtn:styles.reactivateBtn} onClick={()=>toggleActive(p.id)}>{p.active?"Desactivar":"Reactivar"}</button></div></div>
      </article>})}</div>
    </section>

    <section className={styles.providerStrip}><div><strong>Proveedores</strong><span>{providers.filter(p=>p.active).length} activos · {providers.length} totales</span></div><div className={styles.providerChips}>{providers.slice(0,8).map(p=><button key={p.id} className={!p.active?styles.providerOff:""} onClick={()=>openProviderEdit(p)}>{p.logo?<img src={p.logo} alt=""/>:<b>{p.name.slice(0,2)}</b>}<span>{p.name}</span></button>)}</div><button className={styles.manageProviders} onClick={openProviderCreate}>+ Gestionar</button></section>

    {open&&<div className={styles.overlay} onMouseDown={()=>setOpen(false)}><div className={styles.modal} style={{width:"min(980px,94vw)",maxHeight:"90vh",overflowY:"auto"}} onMouseDown={e=>e.stopPropagation()}>
      <div className={styles.modalHead}><div><span>{editingId?"EDITAR PRODUCTO":"NUEVO PRODUCTO"}</span><h2>{editingId?"Editar producto":"Crear producto"}</h2></div><button className={styles.close} onClick={()=>setOpen(false)}>×</button></div>
      <div className={styles.formGrid}>
        <label>Servicio<select value={form.service} onChange={e=>onServiceChange(e.target.value)}>{services.map(s=><option key={s}>{s}</option>)}</select></label>
        <label>Proveedor<select value={form.providerId} onChange={e=>setForm({...form,providerId:e.target.value})}>{activeProvidersForService.length===0&&<option value="">Sin proveedores activos</option>}{activeProvidersForService.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
        <label>Tipo de producto<select value={form.productType} onChange={e=>setForm({...form,productType:e.target.value})}>{productTypes(form.service).map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Tipo de operación<select value={form.operationType} onChange={e=>setForm({...form,operationType:e.target.value})}>{operationTypes(form.service).map(x=><option key={x}>{x}</option>)}</select></label>
        <label className={styles.wide}>Producto<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nombre comercial del producto"/></label>
        <label className={styles.wide}>Características<input value={form.features} onChange={e=>setForm({...form,features:e.target.value})} placeholder="Condiciones principales"/></label>

        {form.service==="Inmobiliaria"&&<><label>Quién paga<select value={form.side} onChange={e=>setForm({...form,side:e.target.value})}><option value="seller">Vendedor</option><option value="buyer">Comprador</option><option value="both">Ambas partes</option></select></label><label>Papel comercial<select value={form.roleContext} onChange={e=>setForm({...form,roleContext:e.target.value})}><option value="">General</option><option value="acquisition">Captador</option><option value="closing">Cerrador</option></select></label></>}

        <div style={box}><h3>💰 Comisión AN24</h3><div style={grid3}>
          <label>Tipo<select value={form.an24Mode} onChange={e=>setForm({...form,an24Mode:e.target.value as Mode})}><option value="fixed">Importe fijo</option><option value="percentage">Porcentaje</option><option value="mixed">Fijo + porcentaje</option></select></label>
          {(form.an24Mode==="fixed"||form.an24Mode==="mixed")&&<label>Importe fijo (€)<input type="number" step="0.01" value={form.an24Fixed} onChange={e=>setForm({...form,an24Fixed:e.target.value})}/></label>}
          {(form.an24Mode==="percentage"||form.an24Mode==="mixed")&&<label>Porcentaje (%)<input type="number" step="0.01" value={form.an24Percentage} onChange={e=>setForm({...form,an24Percentage:e.target.value})}/></label>}
          {(form.an24Mode==="percentage"||form.an24Mode==="mixed")&&<label>Base<select value={form.an24Base} onChange={e=>setForm({...form,an24Base:e.target.value})}>{currentBases.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>}
          {form.service==="Telefonía"&&<label>Puntos<input type="number" step="0.01" value={form.an24Points} onChange={e=>setForm({...form,an24Points:e.target.value})}/></label>}
          {(form.service==="Energía"||form.service==="Seguros"||form.service==="Alarmas")&&<><label>Recurrente fijo (€)<input type="number" step="0.01" value={form.an24Recurring} onChange={e=>setForm({...form,an24Recurring:e.target.value})}/></label><label>Recurrente (%)<input type="number" step="0.01" value={form.an24RecurringPercentage} onChange={e=>setForm({...form,an24RecurringPercentage:e.target.value})}/></label></>}
        </div></div>

        {form.service==="Telefonía"&&<div style={box}><h3>📱 Alta / Portabilidad / Objetivos</h3><p style={{marginTop:0}}>El campo <b>Tipo de operación</b> distingue Alta nueva, Portabilidad, Línea adicional o Renovación.</p>
          <label style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={form.targetEnabled} onChange={e=>setForm({...form,targetEnabled:e.target.checked})}/> Activar objetivo mensual</label>
          {form.targetEnabled&&<div style={{...grid3,marginTop:12}}><label>Desde altas<input type="number" value={form.targetMin} onChange={e=>setForm({...form,targetMin:e.target.value})}/></label><label>Hasta altas<input type="number" value={form.targetMax} onChange={e=>setForm({...form,targetMax:e.target.value})}/></label><label>Bonus (€)<input type="number" step="0.01" value={form.targetBonus} onChange={e=>setForm({...form,targetBonus:e.target.value})}/></label></div>}
          <label style={{display:"flex",gap:8,alignItems:"center",marginTop:14}}><input type="checkbox" checked={form.acceleratorEnabled} onChange={e=>setForm({...form,acceleratorEnabled:e.target.checked})}/> Añadir acelerador / sobrecomisión</label>
          {form.acceleratorEnabled&&<div style={{...grid3,marginTop:12}}><label>Desde<input type="number" value={form.acceleratorFrom} onChange={e=>setForm({...form,acceleratorFrom:e.target.value})}/></label><label>Hasta<input type="number" value={form.acceleratorTo} onChange={e=>setForm({...form,acceleratorTo:e.target.value})}/></label><label>Sobrecomisión (€)<input type="number" step="0.01" value={form.acceleratorBonus} onChange={e=>setForm({...form,acceleratorBonus:e.target.value})}/></label></div>}
          <p><b>Ejemplo Finetwork:</b> 6–11 altas → +150 € · 12+ → +300 €.</p>
        </div>}

        {(form.service==="Telefonía"||form.service==="Energía"||form.service==="Alarmas")&&<div style={box}><h3>↩️ Clawback / retrocomisión</h3><label style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={form.clawbackEnabled} onChange={e=>setForm({...form,clawbackEnabled:e.target.checked})}/> Este producto tiene clawback</label>{form.clawbackEnabled&&<div style={{...grid3,marginTop:12}}><label>Meses<input type="number" value={form.clawbackMonths} onChange={e=>setForm({...form,clawbackMonths:e.target.value})}/></label><label>Retrocomisión (%)<input type="number" step="0.01" value={form.clawbackPercentage} onChange={e=>setForm({...form,clawbackPercentage:e.target.value})}/></label></div>}</div>}

        <div style={box}>
          <h3>👥 Comisión fija por tipo de comercial</h3>
          <p style={{margin:"4px 0 14px",fontSize:12,color:"#666"}}>
            Estas son las únicas cantidades que se trasladarán al Anexo de condiciones económicas.
            Las comisiones porcentuales no se muestran ni se liquidan al comercial desde este bloque.
          </p>

          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14}}>
            {profiles.map(({key,icon})=>{
              const pf=profileForms[key];
              return <div key={key} style={{background:"#fff",border:"1px solid #e6e6e6",borderRadius:12,padding:14}}>
                <strong>{icon} {key}</strong>
                <label style={{display:"block",marginTop:10}}>
                  Comisión fija (€)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pf.fixed}
                    onChange={e=>setProfileForms({
                      ...profileForms,
                      [key]:{...pf,mode:"fixed",fixed:e.target.value,percentage:"",points:""}
                    })}
                    placeholder="0,00"
                  />
                </label>
              </div>
            })}
          </div>

          <div style={{marginTop:14,fontSize:11,color:"#777"}}>
            Las comisiones comerciales de este producto se guardan directamente en ONE Cloud.
          </div>
        </div>
      </div>
      <div style={{margin:"14px 0",padding:12,borderRadius:10,border:"1px solid #ffd7cc",background:"#fff7f4",fontSize:13}}>Proveedor, producto y todas sus reglas se guardan directamente en ONE Cloud.</div>
      <div className={styles.actions}><button className={styles.cancel} onClick={()=>setOpen(false)}>Cancelar</button><button className={styles.primary} onClick={submit} disabled={!form.providerId||saving}>{saving?"Guardando en ONE Cloud...":editingId?"Guardar cambios":"Guardar producto"}</button></div>
    </div></div>}

    {providersOpen&&<div className={styles.overlay} onMouseDown={()=>setProvidersOpen(false)}><div className={`${styles.modal} ${styles.providerModal}`} onMouseDown={e=>e.stopPropagation()}><div className={styles.modalHead}><div><span>PROVEEDORES</span><h2>{providerEditId?"Editar proveedor":"Nuevo proveedor"}</h2></div><button className={styles.close} onClick={()=>setProvidersOpen(false)}>×</button></div><div className={styles.providerManager}><div className={styles.providerForm}><label>Servicio<select value={providerForm.service} onChange={e=>setProviderForm({...providerForm,service:e.target.value})}>{services.map(s=><option key={s}>{s}</option>)}</select></label><label>Nombre del proveedor<input value={providerForm.name} onChange={e=>setProviderForm({...providerForm,name:e.target.value})} placeholder="Ej. Finetwork, GANA, SEGURMA..."/></label><label>Logo<input type="file" accept="image/*" onChange={e=>onProviderLogo(e.target.files?.[0])}/></label>{providerForm.service==="Energía"&&<label className={styles.referenceCheck}><input type="checkbox" checked={providerForm.referenceOnly} onChange={e=>setProviderForm({...providerForm,referenceOnly:e.target.checked})}/><span><strong>Solo comercializadora de referencia</strong><small>Aparece como compañía actual/anterior, pero no como proveedor para vender.</small></span></label>}{providerForm.logo&&<img className={styles.logoPreview} src={providerForm.logo} alt=""/>}<div className={styles.actions}><button className={styles.cancel} onClick={()=>setProvidersOpen(false)}>Cancelar</button><button className={styles.primary} onClick={saveProvider}>{providerEditId?"Guardar cambios":"Crear proveedor"}</button></div></div><div className={styles.providerList}><h3>Proveedores creados</h3>{providers.map(p=><div className={styles.providerItem} key={p.id}>{p.logo?<img src={p.logo} alt=""/>:<b>{p.name.slice(0,2)}</b>}<div><strong>{p.name}</strong><small>{p.service} · {p.referenceOnly?"Solo referencia":p.active?"Activo":"Inactivo"}</small></div><button onClick={()=>openProviderEdit(p)}>Editar</button><button onClick={()=>toggleProvider(p.id)}>{p.active?"Desactivar":"Reactivar"}</button></div>)}</div></div></div></div>}
  </main>
}

function K({label,value}:{label:string;value:number}){return <div className={styles.kpi}><span>{label}</span><strong>{value}</strong></div>}
