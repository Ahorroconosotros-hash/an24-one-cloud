"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadClients } from "@/lib/clientes";
import { addClientActivity } from "@/lib/client-activity";
import styles from "../NuevoNegocio.module.css";

const propertyTypes=["Piso","Casa / Chalet","Local","Nave","Oficina","Terreno","Garaje","Otro"];
const operations=["Venta","Alquiler"];
function InmobiliariaContent(){
 const router=useRouter(); const search=useSearchParams(); const clients=useMemo(()=>loadClients().filter(c=>!c.deletedAt),[]);
 const [clientId,setClientId]=useState(search.get("cliente")||""); const [operation,setOperation]=useState("Venta"); const [propertyType,setPropertyType]=useState("Piso");
 const [cadastralReference,setCadastralReference]=useState("");
 const [province,setProvince]=useState(""); const [city,setCity]=useState(""); const [postalCode,setPostalCode]=useState(""); const [address,setAddress]=useState("");
 const [built,setBuilt]=useState(""); const [rooms,setRooms]=useState(""); const [baths,setBaths]=useState(""); const [price,setPrice]=useState(""); const [fees,setFees]=useState("");
 const [mandate,setMandate]=useState("Sin exclusiva"); const [expiry,setExpiry]=useState(""); const [notes,setNotes]=useState("");
 const vat=Number(fees||0)*0.21; const totalFees=Number(fees||0)+vat;

 function saveOpportunity(){
  if(!clientId){
   alert("Selecciona un cliente.");
   return;
  }
  try{
   const client=clients.find(c=>c.id===clientId);
   const opportunity={
    id:`inmo-${Date.now()}`,
    service:"Inmobiliaria",
    clientId,
    clientName:client?.name||"",
    operation,
    propertyType,
    property:{
     province,
     city,
     postalCode,
     address,
     cadastralReference,
     built,
     rooms,
     baths
    },
    economics:{
     price:Number(price||0),
     fees:Number(fees||0),
     vat,
     forecast:totalFees
    },
    mandate,
    expiry,
    notes,
    createdAt:new Date().toISOString()
   };
   const key="one_real_estate_opportunities_v1";
   const previous=JSON.parse(localStorage.getItem(key)||"[]");
   localStorage.setItem(key,JSON.stringify([opportunity,...(Array.isArray(previous)?previous:[])]));
   addClientActivity({
    clientId,
    type:"Oportunidad",
    title:`Inmobiliaria · ${operation}`,
    detail:`${propertyType}${cadastralReference ? ` · Ref. catastral ${cadastralReference}` : ""}${price ? ` · ${Number(price).toLocaleString("es-ES")} €` : ""}`,
    user:client?.commercial||"Usuario actual"
   });
   router.push(`/oportunidades/${opportunity.id}`);
  }catch{
   alert("No se ha podido guardar la oportunidad.");
  }
 }
 return <main className={styles.page}>
  <header className={styles.hero}><div><button type="button" onClick={()=>router.back()} >← Oportunidades</button><span>ONE · INMOBILIARIA</span><h1>Nuevo presupuesto · Inmobiliaria</h1><p>Misma forma de trabajar: ONE solo pide lo necesario para esta operación.</p></div></header>
  <div className={styles.workspace}><section className={styles.workArea}>
   <article className={styles.block}><div className={styles.blockHead}><span>01</span><div><h2>Cliente y operación</h2><p>Selecciona lo esencial; ONE reutiliza el resto.</p></div></div><div className={styles.formGrid}>
    <label>Cliente *<select value={clientId} onChange={e=>setClientId(e.target.value)}><option value="">Seleccionar cliente</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name} · {c.taxId}</option>)}</select></label>
    <label>Operación *<select value={operation} onChange={e=>setOperation(e.target.value)}>{operations.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Tipo de inmueble *<select value={propertyType} onChange={e=>setPropertyType(e.target.value)}>{propertyTypes.map(x=><option key={x}>{x}</option>)}</select></label>
   </div></article>
   <article className={styles.block}><div className={styles.blockHead}><span>02</span><div><h2>Inmueble</h2><p>Provincia primero; después población, dirección y referencia catastral.</p></div></div><div className={styles.formGrid}>
    <label>Provincia *<input value={province} onChange={e=>setProvince(e.target.value)} placeholder="Provincia"/></label><label>Población *<input value={city} onChange={e=>setCity(e.target.value)} placeholder="Población"/></label><label>Código postal<input value={postalCode} onChange={e=>setPostalCode(e.target.value)} placeholder="CP"/></label><label>Dirección<input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Dirección del inmueble"/></label>
    
            <label>
              Referencia catastral
              <input
                value={cadastralReference}
                onChange={(event) => setCadastralReference(event.target.value.toUpperCase())}
                placeholder="Ej. 9872023VH5797S0001WX"
                maxLength={20}
              />
            </label>
<label>m² construidos<input type="number" value={built} onChange={e=>setBuilt(e.target.value)}/></label>{!["Local","Nave","Oficina","Terreno","Garaje"].includes(propertyType)&&<><label>Habitaciones<input type="number" value={rooms} onChange={e=>setRooms(e.target.value)}/></label><label>Baños<input type="number" value={baths} onChange={e=>setBaths(e.target.value)}/></label></>}
   </div></article>
   <article className={styles.block}><div className={styles.blockHead}><span>03</span><div><h2>Condiciones económicas</h2><p>ONE calcula IVA y previsión sin pedir cuentas al comercial.</p></div></div><div className={styles.formGrid}>
    <label>{operation==="Venta"?"Precio de comercialización":"Renta mensual"} €<input type="number" value={price} onChange={e=>setPrice(e.target.value)}/></label><label>Honorarios AN24 €<input type="number" value={fees} onChange={e=>setFees(e.target.value)}/></label><label>IVA honorarios 21%<input readOnly value={`${vat.toFixed(2)} €`}/></label><label>Facturación prevista<input readOnly value={`${totalFees.toFixed(2)} €`}/></label>
   </div></article>
   <article className={styles.block}><div className={styles.blockHead}><span>04</span><div><h2>Captación y fechas</h2><p>Solo las fechas que ONE necesita para hacer seguimiento.</p></div></div><div className={styles.formGrid}><label>Mandato<select value={mandate} onChange={e=>setMandate(e.target.value)}><option>Sin exclusiva</option><option>Con exclusiva</option></select></label><label>Vencimiento mandato<input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)}/></label></div></article>
   <article className={styles.block}><div className={styles.blockHead}><span>05</span><div><h2>Documentos y fotografías</h2><p>La ficha definitiva reutilizará estos archivos para la oferta/PDF.</p></div></div><div className={styles.formGrid}><label>Documentación<input type="file" multiple/></label><label>Fotografías<input type="file" accept="image/*" multiple/></label></div></article>
   <article className={styles.block}><div className={styles.blockHead}><span>06</span><div><h2>Notas</h2><p>Solo lo que ONE no pueda saber automáticamente.</p></div></div><div className={styles.formGrid}><label className={styles.span2}>Observaciones<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Observaciones de esta oportunidad..."/></label></div></article>
   <div className={styles.actions}><button type="button" onClick={()=>router.back()}>Cancelar</button><button type="button" className={styles.primary} onClick={saveOpportunity}>Guardar oportunidad</button></div>
  </section></div>
 </main>
}
export default function InmobiliariaPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Cargando inmobiliaria...</div>}>
      <InmobiliariaContent />
    </Suspense>
  );
}