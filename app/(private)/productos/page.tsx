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
  an24: number;
  premium: number;
  advanced: number;
  standard: number;
  collaborator: number;
  priceBase?: number;
  vat?: number;
  billingType?: "Único"|"Mensual"|"Ambos";
  monthlyPrice?: number;
  promoType?: "Ninguna"|"Porcentaje"|"Importe"|"Precio final";
  promoValue?: number;
  promoStart?: string;
  promoEnd?: string;
  active: boolean;
};

const services = ["Energía","Telefonía","Alarmas","Seguros","Asesoramiento","Inmobiliaria","IA"];

const defaultProviders: Provider[] = [
  {id:"prov-gana",service:"Energía",name:"GANA",active:true},
  {id:"prov-iberdrola",service:"Energía",name:"IBERDROLA",active:true},
  {id:"prov-movistar",service:"Telefonía",name:"MOVISTAR",active:true},
  {id:"prov-vodafone",service:"Telefonía",name:"VODAFONE",active:true},
  {id:"prov-segurma",service:"Alarmas",name:"SEGURMA",active:true},
];

const seed: Product[] = [{
  id:"gana-24h",
  service:"Energía",
  providerId:"prov-gana",
  company:"GANA",
  name:"Tarifa 24H",
  features:"Luz · precio fijo 24 horas",
  an24:120,
  premium:55,
  advanced:50,
  standard:40,
  collaborator:35,
  active:true
}];

const emptyForm = {
  service:"Energía",
  providerId:"",
  name:"",
  features:"",
  an24:"",
  premium:"",
  advanced:"",
  standard:"",
  collaborator:"",
  priceBase:"",
  vat:"21",
  billingType:"Único",
  monthlyPrice:"",
  promoType:"Ninguna",
  promoValue:"",
  promoStart:"",
  promoEnd:""
};

function normalizeProduct(p:any): Product {
  return {
    id:p.id || crypto.randomUUID(),
    service:p.service || "Energía",
    providerId:p.providerId || "",
    company:p.company || "",
    name:p.name || "",
    features:p.features || "",
    an24:Number(p.an24 ?? 0),
    premium:Number(p.premium ?? Math.max(Number(p.senior ?? 0),Number(p.junior ?? 0),Number(p.external ?? 0),0)),
    advanced:Number(p.advanced ?? p.senior ?? 0),
    standard:Number(p.standard ?? p.junior ?? 0),
    collaborator:Number(p.collaborator ?? p.external ?? 0),
    priceBase:Number(p.priceBase ?? 0),
    vat:Number(p.vat ?? 21),
    billingType:p.billingType || "Único",
    monthlyPrice:Number(p.monthlyPrice ?? 0),
    promoType:p.promoType || "Ninguna",
    promoValue:Number(p.promoValue ?? 0),
    promoStart:p.promoStart || "",
    promoEnd:p.promoEnd || "",
    active:p.active !== false
  };
}

export default function Productos(){
  const [items,setItems] = useState<Product[]>(seed);
  const [providers,setProviders] = useState<Provider[]>(defaultProviders);
  const [open,setOpen] = useState(false);
  const [editingId,setEditingId] = useState<string|null>(null);
  const [query,setQuery] = useState("");
  const [serviceFilter,setServiceFilter] = useState("Todos");
  const [statusFilter,setStatusFilter] = useState<"Todos"|"Activos"|"Inactivos">("Todos");
  const [form,setForm] = useState(emptyForm);
  const [providersOpen,setProvidersOpen] = useState(false);
  const [providerEditId,setProviderEditId] = useState<string|null>(null);
  const [providerForm,setProviderForm] = useState({service:"Energía",name:"",logo:"",referenceOnly:false});

  useEffect(()=>{
    const rawProducts = localStorage.getItem("one_product_catalog");
    let loadedProducts = seed;

    if(rawProducts){
      try{
        const parsed = JSON.parse(rawProducts);
        loadedProducts = Array.isArray(parsed) ? parsed.map(normalizeProduct) : seed;
      }catch{}
    }

    const rawProviders = localStorage.getItem("one_provider_catalog");
    let loadedProviders = defaultProviders;

    if(rawProviders){
      try{
        const parsed = JSON.parse(rawProviders);
        if(Array.isArray(parsed) && parsed.length) loadedProviders = parsed;
      }catch{}
    }

    // Migra automáticamente empresas ya usadas en productos para que aparezcan como proveedores.
    const migrated = [...loadedProviders];
    loadedProducts.forEach(p=>{
      if(!p.company) return;
      const found = migrated.find(x=>x.service===p.service && x.name.toLowerCase()===p.company.toLowerCase());
      if(!found){
        migrated.push({id:`prov-${crypto.randomUUID()}`,service:p.service,name:p.company,active:true});
      }
    });

    const linkedProducts = loadedProducts.map(p=>{
      if(p.providerId) return p;
      const provider = migrated.find(x=>x.service===p.service && x.name.toLowerCase()===p.company.toLowerCase());
      return {...p,providerId:provider?.id || ""};
    });

    setProviders(migrated);
    setItems(linkedProducts);
    localStorage.setItem("one_provider_catalog",JSON.stringify(migrated));
    localStorage.setItem("one_product_catalog",JSON.stringify(linkedProducts));
  },[]);

  const saveProducts = (next:Product[])=>{
    setItems(next);
    localStorage.setItem("one_product_catalog",JSON.stringify(next));
  };

  const saveProviders = (next:Provider[])=>{
    setProviders(next);
    localStorage.setItem("one_provider_catalog",JSON.stringify(next));
  };

  const openProviderCreate=()=>{
    setProviderEditId(null);
    setProviderForm({service:"Energía",name:"",logo:"",referenceOnly:false});
    setProvidersOpen(true);
  };

  const openProviderEdit=(p:Provider)=>{
    setProviderEditId(p.id);
    setProviderForm({service:p.service,name:p.name,logo:p.logo||"",referenceOnly:!!p.referenceOnly});
    setProvidersOpen(true);
  };

  const saveProvider=()=>{
    const name=providerForm.name.trim();
    if(!name) return;
    if(providerEditId){
      const old=providers.find(p=>p.id===providerEditId);
      saveProviders(providers.map(p=>p.id===providerEditId?{...p,...providerForm,name}:p));
      if(old && old.name!==name) saveProducts(items.map(x=>x.providerId===providerEditId?{...x,company:name,service:providerForm.service}:x));
    }else{
      saveProviders([...providers,{id:crypto.randomUUID(),...providerForm,name,active:true}]);
    }
    setProvidersOpen(false);
  };

  const toggleProvider=(id:string)=>saveProviders(providers.map(p=>p.id===id?{...p,active:!p.active}:p));

  const onProviderLogo=(file?:File)=>{
    if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>setProviderForm(v=>({...v,logo:String(reader.result||"")}));
    reader.readAsDataURL(file);
  };

  const activeProvidersForService = useMemo(
    ()=>providers.filter(p=>p.service===form.service && p.active && !p.referenceOnly),
    [providers,form.service]
  );

  const filtered = useMemo(()=>{
    const q=query.trim().toLowerCase();
    return items.filter(p=>{
      const textOk=!q || [p.service,p.company,p.name,p.features].some(v=>v.toLowerCase().includes(q));
      const serviceOk=serviceFilter==="Todos" || p.service===serviceFilter;
      const statusOk=statusFilter==="Todos" || (statusFilter==="Activos" ? p.active : !p.active);
      return textOk && serviceOk && statusOk;
    });
  },[items,query,serviceFilter,statusFilter]);

  const openCreate=()=>{
    setEditingId(null);
    const first = providers.find(p=>p.service==="Energía" && p.active);
    setForm({...emptyForm,providerId:first?.id || ""});
    setOpen(true);
  };

  const openEdit=(p:Product)=>{
    setEditingId(p.id);
    const provider = providers.find(x=>x.id===p.providerId) ||
      providers.find(x=>x.service===p.service && x.name.toLowerCase()===p.company.toLowerCase());
    setForm({
      service:p.service,
      providerId:provider?.id || "",
      name:p.name,
      features:p.features,
        an24:String(p.an24),
      premium:String(p.premium),
      advanced:String(p.advanced),
      standard:String(p.standard),
      collaborator:String(p.collaborator),
      priceBase:String(p.priceBase ?? ""),
      vat:String(p.vat ?? 21),
      billingType:p.billingType || "Único",
      monthlyPrice:String(p.monthlyPrice ?? ""),
      promoType:p.promoType || "Ninguna",
      promoValue:String(p.promoValue ?? ""),
      promoStart:p.promoStart || "",
      promoEnd:p.promoEnd || ""
    });
    setOpen(true);
  };

  const submit=()=>{
    const provider=providers.find(p=>p.id===form.providerId);
    if(!provider || !form.name.trim()) return;

    const payload = {
      service:form.service,
      providerId:provider.id,
      company:provider.name,
      name:form.name.trim(),
      features:form.features.trim(),
      an24:Number(form.an24)||0,
      premium:Number(form.premium)||0,
      advanced:Number(form.advanced)||0,
      standard:Number(form.standard)||0,
      collaborator:Number(form.collaborator)||0,
      priceBase:form.service==="Alarmas" ? Number(form.priceBase)||0 : 0,
      vat:form.service==="Alarmas" ? Number(form.vat)||21 : 21,
      billingType:(form.service==="Alarmas" ? form.billingType : "Único") as "Mensual" | "Único" | "Ambos",
      monthlyPrice:form.service==="Alarmas" ? Number(form.monthlyPrice)||0 : 0,
      promoType:(form.service==="Alarmas" ? form.promoType : "Ninguna") as "Ninguna" | "Porcentaje" | "Importe" | "Precio final",
      promoValue:form.service==="Alarmas" ? Number(form.promoValue)||0 : 0,
      promoStart:form.service==="Alarmas" ? form.promoStart : "",
      promoEnd:form.service==="Alarmas" ? form.promoEnd : ""
    };

    if(editingId){
      saveProducts(items.map(p=>p.id===editingId ? {...p,...payload} : p));
    }else{
      saveProducts([...items,{id:crypto.randomUUID(),...payload,active:true}]);
    }
    setOpen(false);
  };

  const toggleActive=(id:string)=>{
    saveProducts(items.map(p=>p.id===id ? {...p,active:!p.active} : p));
  };

  const onServiceChange=(service:string)=>{
    const first=providers.find(p=>p.service===service && p.active);
    setForm({...form,service,providerId:first?.id || ""});
  };

  return <main className={styles.page}>
    <header className={styles.hero}>
      <div>
        <span>ONE · CATÁLOGO COMERCIAL</span>
        <h1>Productos</h1>
        <p>Servicio → proveedor → producto → comisiones por perfil.</p>
      </div>
      <div className={styles.heroActions}><button className={styles.secondaryHero} onClick={openProviderCreate}>Proveedores</button><button onClick={openCreate}>+ Nuevo producto</button></div>
    </header>

    <div className={styles.kpis}>
      <K label="Servicios" value={services.length}/>
      <K label="Proveedores" value={new Set(providers.map(p=>p.name)).size}/>
      <K label="Productos activos" value={items.filter(p=>p.active).length}/>
      <K label="Perfiles de comisión" value={4}/>
    </div>

    <section className={styles.info}>
      <strong>Regla ONE</strong>
      <span>La empresa se gestiona como Proveedor. Un proveedor puede tener varios productos y cada producto sus propias comisiones.</span>
    </section>

    <section className={styles.tableCard}>
      <div className={styles.tableHead}>
        <div>
          <h2>Catálogo de productos</h2>
          <p>Edita, desactiva o reactiva productos sin perder el histórico.</p>
        </div>
        <div className={styles.tools}>
          <div className={styles.searchBox}><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar producto, proveedor, características..."/></div>
          <select className={styles.filter} value={serviceFilter} onChange={e=>setServiceFilter(e.target.value)}>
            <option>Todos</option>{services.map(s=><option key={s}>{s}</option>)}
          </select>
          <select className={styles.filter} value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)}>
            <option>Todos</option><option>Activos</option><option>Inactivos</option>
          </select>
        </div>
      </div>

      <div className={styles.resultBar}>
        <span>{filtered.length} {filtered.length===1?"producto":"productos"}</span>
        {(query||serviceFilter!=="Todos"||statusFilter!=="Todos") &&
          <button onClick={()=>{setQuery("");setServiceFilter("Todos");setStatusFilter("Todos")}}>Limpiar filtros</button>}
      </div>

      <div className={styles.productList}>
        {filtered.map(p=><article className={`${styles.productRow} ${!p.active?styles.rowInactive:""}`} key={p.id}>
          <div className={styles.identity}>
            <div className={styles.identityTop}>{providers.find(x=>x.id===p.providerId)?.logo && <img className={styles.providerLogo} src={providers.find(x=>x.id===p.providerId)?.logo} alt=""/>}<span className={styles.service}>{p.service}</span></div>
            <strong>{p.name}</strong>
            <small>{p.company}</small>
          </div>
          <div className={styles.features}><span>Características</span><p>{p.features||"Sin características añadidas"}</p></div>
          <div className={styles.commissions}>
            <div className={styles.commissionMain}><span>Comisión AN24</span><strong>{p.an24.toFixed(2)} €</strong></div>
            <div className={styles.commissionProfiles}>
              <span>🏆 Premium <b>{p.premium.toFixed(2)} €</b></span>
              <span>⭐ Avanzado <b>{p.advanced.toFixed(2)} €</b></span>
              <span>🔵 Estándar <b>{p.standard.toFixed(2)} €</b></span>
              <span>🤝 Colaborador <b>{p.collaborator.toFixed(2)} €</b></span>
            </div>
          </div>
          <div className={styles.right}>
            <span className={p.active?styles.active:styles.inactive}>{p.active?"ACTIVO":"INACTIVO"}</span>
            <div className={styles.actionsInline}>
              <button className={styles.editBtn} onClick={()=>openEdit(p)}>Editar</button>
              <button className={p.active?styles.deactivateBtn:styles.reactivateBtn} onClick={()=>toggleActive(p.id)}>
                {p.active?"Desactivar":"Reactivar"}
              </button>
            </div>
          </div>
        </article>)}

        {filtered.length===0 && <div className={styles.empty}><strong>No encontramos productos</strong><span>Prueba con otro filtro o búsqueda.</span></div>}
      </div>
    </section>

    <section className={styles.providerStrip}>
      <div><strong>Proveedores</strong><span>{providers.filter(p=>p.active).length} activos · {providers.length} totales</span></div>
      <div className={styles.providerChips}>{providers.slice(0,8).map(p=><button key={p.id} className={!p.active?styles.providerOff:""} onClick={()=>openProviderEdit(p)}>{p.logo?<img src={p.logo} alt=""/>:<b>{p.name.slice(0,2)}</b>}<span>{p.name}</span></button>)}</div>
      <button className={styles.manageProviders} onClick={openProviderCreate}>+ Gestionar</button>
    </section>

    {open && <div className={styles.overlay} onMouseDown={()=>setOpen(false)}>
      <div className={styles.modal} onMouseDown={e=>e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div><span>{editingId?"EDITAR PRODUCTO":"NUEVO PRODUCTO"}</span><h2>{editingId?"Editar producto":"Crear producto"}</h2></div>
          <button className={styles.close} onClick={()=>setOpen(false)}>×</button>
        </div>

        <div className={styles.formGrid}>
          <label>Servicio
            <select value={form.service} onChange={e=>onServiceChange(e.target.value)}>
              {services.map(s=><option key={s}>{s}</option>)}
            </select>
          </label>

          <label>Proveedor
            <select value={form.providerId} onChange={e=>setForm({...form,providerId:e.target.value})}>
              {activeProvidersForService.length===0 && <option value="">Sin proveedores activos</option>}
              {activeProvidersForService.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}
            </select>
          </label>

          <label className={styles.wide}>Producto
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ej. Tarifa 24H"/>
          </label>

          <label>Comisión AN24 (€)
            <input type="number" value={form.an24} onChange={e=>setForm({...form,an24:e.target.value})}/>
          </label>

          <label className={styles.wide}>Características
            <input value={form.features} onChange={e=>setForm({...form,features:e.target.value})} placeholder="Condiciones principales del producto"/>
          </label>

          {form.service==="Alarmas" && <>
            <label>Precio tarifa sin IVA (€)<input type="number" step="0.01" value={form.priceBase} onChange={e=>setForm({...form,priceBase:e.target.value})}/></label>
            <label>IVA (%)<input type="number" step="0.01" value={form.vat} onChange={e=>setForm({...form,vat:e.target.value})}/></label>
            <label>Tipo de cobro<select value={form.billingType} onChange={e=>setForm({...form,billingType:e.target.value})}><option>Único</option><option>Mensual</option><option>Ambos</option></select></label>
            {(form.billingType==="Mensual"||form.billingType==="Ambos") && <label>Cuota mensual sin IVA (€)<input type="number" step="0.01" value={form.monthlyPrice} onChange={e=>setForm({...form,monthlyPrice:e.target.value})}/></label>}
            <label>Promoción compañía<select value={form.promoType} onChange={e=>setForm({...form,promoType:e.target.value})}><option>Ninguna</option><option>Porcentaje</option><option>Importe</option><option>Precio final</option></select></label>
            {form.promoType!=="Ninguna" && <label>Valor promoción<input type="number" step="0.01" value={form.promoValue} onChange={e=>setForm({...form,promoValue:e.target.value})}/></label>}
            {form.promoType!=="Ninguna" && <label>Inicio promoción<input type="date" value={form.promoStart} onChange={e=>setForm({...form,promoStart:e.target.value})}/></label>}
            {form.promoType!=="Ninguna" && <label>Fin promoción<input type="date" value={form.promoEnd} onChange={e=>setForm({...form,promoEnd:e.target.value})}/></label>}
          </>}

          <label>🏆 Premium (€)<input type="number" value={form.premium} onChange={e=>setForm({...form,premium:e.target.value})}/></label>
          <label>⭐ Avanzado (€)<input type="number" value={form.advanced} onChange={e=>setForm({...form,advanced:e.target.value})}/></label>
          <label>🔵 Estándar (€)<input type="number" value={form.standard} onChange={e=>setForm({...form,standard:e.target.value})}/></label>
          <label>🤝 Colaborador (€)<input type="number" value={form.collaborator} onChange={e=>setForm({...form,collaborator:e.target.value})}/></label>
        </div>

        {activeProvidersForService.length===0 &&
          <div className={styles.warning}>No hay proveedores activos para este servicio. Primero habrá que darlos de alta en Proveedores.</div>}

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={()=>setOpen(false)}>Cancelar</button>
          <button className={styles.primary} onClick={submit} disabled={!form.providerId}>{editingId?"Guardar cambios":"Guardar producto"}</button>
        </div>
      </div>
    </div>}

    {providersOpen && <div className={styles.overlay} onMouseDown={()=>setProvidersOpen(false)}>
      <div className={`${styles.modal} ${styles.providerModal}`} onMouseDown={e=>e.stopPropagation()}>
        <div className={styles.modalHead}><div><span>PROVEEDORES</span><h2>{providerEditId?"Editar proveedor":"Nuevo proveedor"}</h2></div><button className={styles.close} onClick={()=>setProvidersOpen(false)}>×</button></div>
        <div className={styles.providerManager}>
          <div className={styles.providerForm}>
            <label>Servicio<select value={providerForm.service} onChange={e=>setProviderForm({...providerForm,service:e.target.value})}>{services.map(s=><option key={s}>{s}</option>)}</select></label>
            <label>Nombre del proveedor<input value={providerForm.name} onChange={e=>setProviderForm({...providerForm,name:e.target.value})} placeholder="Ej. GANA, SEGURMA, MOVISTAR..."/></label>
            <label>Logo<input type="file" accept="image/*" onChange={e=>onProviderLogo(e.target.files?.[0])}/></label>
            {providerForm.service==="Energía" && <label className={styles.referenceCheck}><input type="checkbox" checked={providerForm.referenceOnly} onChange={e=>setProviderForm({...providerForm,referenceOnly:e.target.checked})}/><span><strong>Solo comercializadora de referencia</strong><small>Aparece como compañía actual/anterior del cliente, pero no como proveedor para vender.</small></span></label>}
            {providerForm.logo && <img className={styles.logoPreview} src={providerForm.logo} alt="Vista previa"/>}
            <div className={styles.actions}><button className={styles.cancel} onClick={()=>setProvidersOpen(false)}>Cancelar</button><button className={styles.primary} onClick={saveProvider}>{providerEditId?"Guardar cambios":"Crear proveedor"}</button></div>
          </div>
          <div className={styles.providerList}><h3>Proveedores creados</h3>{providers.map(p=><div className={styles.providerItem} key={p.id}>{p.logo?<img src={p.logo} alt=""/>:<b>{p.name.slice(0,2)}</b>}<div><strong>{p.name}</strong><small>{p.service} · {p.referenceOnly?"Solo referencia":(p.active?"Activo":"Inactivo")}</small></div><button onClick={()=>openProviderEdit(p)}>Editar</button><button onClick={()=>toggleProvider(p.id)}>{p.active?"Desactivar":"Reactivar"}</button></div>)}</div>
        </div>
      </div>
    </div>}
  </main>
}

function K({label,value}:{label:string;value:number}) {
  return <div className={styles.kpi}><span>{label}</span><strong>{value}</strong></div>
}
