"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SpainAddressFields from "@/components/SpainAddressFields";
import { loadClients } from "@/lib/clientes";
import { addClientActivity } from "@/lib/client-activity";
import styles from "./InsuranceOpportunity.module.css";

type Risk = "Autos"|"Hogar"|"Comercio"|"Mascotas"|"Vida"|"Salud"|"RC"|"Decesos";
type Payment = "Mensual"|"Trimestral"|"Semestral"|"Anual";
const RISKS:Risk[]=["Autos","Hogar","Comercio","Mascotas","Vida","Salud","RC","Decesos"];

type Provider = { id:string; service:string; name:string; active:boolean };
type Product = { id:string; service:string; providerId?:string; company?:string; name:string; active:boolean };
type AttachedDocument = { id:string; type:string; name:string; date:string };

const DEFAULT_INSURANCE_PROVIDERS:Provider[] = [
  {id:"dkv",service:"Seguros",name:"DKV",active:true},
  {id:"adeslas",service:"Seguros",name:"Adeslas",active:true},
  {id:"sanitas",service:"Seguros",name:"Sanitas",active:true},
];
const DOCUMENT_TYPES=["Póliza","Proyecto","Recibo anterior","DNI/NIE","Ficha técnica","Permiso de circulación","Otro"];

export default function InsuranceOpportunityPage(){
  const router=useRouter();
  const search=useSearchParams();
  const clients=useMemo(()=>loadClients(),[]);
  const [clientId,setClientId]=useState(search.get("cliente")||search.get("clientId")||"");
  const client:any=clients.find((c:any)=>c.id===clientId);
  const [risk,setRisk]=useState<Risk>("Autos");
  const [status,setStatus]=useState("En curso");
  const [company,setCompany]=useState("");
  const [product,setProduct]=useState("");
  const [providers,setProviders]=useState<Provider[]>(DEFAULT_INSURANCE_PROVIDERS);
  const [products,setProducts]=useState<Product[]>([]);
  const [riskAddressMode,setRiskAddressMode]=useState<"client"|"other">("client");
  const [documentType,setDocumentType]=useState("Póliza");
  const [documents,setDocuments]=useState<AttachedDocument[]>([]);
  const [currentCompany,setCurrentCompany]=useState("");
  const [currentMode,setCurrentMode]=useState("");
  const [payment,setPayment]=useState<Payment>("Anual");
  const [premium,setPremium]=useState("");
  const [effectiveDate,setEffectiveDate]=useState("");
  const [expiryDate,setExpiryDate]=useState("");
  const [notes,setNotes]=useState("");
  const [occasional,setOccasional]=useState(false);
  const [car,setCar]=useState({plate:"",brandModel:"",registrationDate:"",use:"Particular",driver:"",birthDate:"",licenseSince:"",claims:""});
  const [occasionalDriver,setOccasionalDriver]=useState({name:"",birthDate:"",licenseSince:"",claims:""});
  const [address,setAddress]=useState({address:"",postalCode:"",province:"",city:""});
  const [home,setHome]=useState({use:"Vivienda habitual",sqm:"",buildYear:"",role:"Propietario",building:"",contents:""});
  const [commerce,setCommerce]=useState({activity:"",sqm:"",building:"",contents:"",security:""});
  const [pet,setPet]=useState({animal:"Perro",breed:"",birthDate:"",chip:""});
  const [generic,setGeneric]=useState("");

  useEffect(()=>{
    try{
      const rawProviders=localStorage.getItem("one_provider_catalog");
      if(rawProviders){
        const parsed=JSON.parse(rawProviders);
        if(Array.isArray(parsed)){
          const insurance=parsed.filter((item:any)=>item.active!==false && item.service==="Seguros");
          if(insurance.length) setProviders(insurance);
        }
      }
      const rawProducts=localStorage.getItem("one_product_catalog");
      if(rawProducts){
        const parsed=JSON.parse(rawProducts);
        if(Array.isArray(parsed)) setProducts(parsed.filter((item:any)=>item.active!==false && item.service==="Seguros"));
      }
    }catch{}
  },[]);

  const insuranceProviders=providers.filter(item=>item.active!==false && item.service==="Seguros");
  const selectedProvider=insuranceProviders.find(item=>item.id===company);
  const availableProducts=products.filter(item =>
    item.active!==false &&
    item.service==="Seguros" &&
    (!company || item.providerId===company || item.company===selectedProvider?.name)
  );

  function addDocument(file:File|null){
    if(!file) return;
    setDocuments(current=>[...current,{
      id:`doc-${Date.now()}-${current.length}`,
      type:documentType,
      name:file.name,
      date:new Date().toLocaleDateString("es-ES")
    }]);
  }

  function save(){
    if(!clientId){alert("Selecciona un cliente.");return;}
    const opportunity={
      id:`seg-${Date.now()}`,clientId,clientName:client?.name||"",service:"Seguros",risk,status,
      company,product,currentCompany,currentMode,payment,premium,effectiveDate,expiryDate,notes,
      car,occasional,occasionalDriver,address,riskAddressMode,home,commerce,pet,generic,documents,createdAt:new Date().toISOString()
    };
    try{
      const key="one_insurance_opportunities_v1";
      const prev=JSON.parse(localStorage.getItem(key)||"[]");
      localStorage.setItem(key,JSON.stringify([opportunity,...(Array.isArray(prev)?prev:[])]));
      addClientActivity({
        clientId,type:"Oportunidad",title:`Seguro ${risk} · oportunidad creada`,
        detail:`${selectedProvider?.name||"Compañía pendiente"} · ${availableProducts.find(item=>item.id===product)?.name||"Producto pendiente"} · ${premium?premium+" €":"Prima pendiente"}`,
        user:client?.commercial||"Usuario actual"
      });
      router.push(`/clientes/${clientId}`);
    }catch{alert("No se ha podido guardar la oportunidad.");}
  }

  return <div className={styles.page}>
    <div className={styles.crumb}>
      <Link href={client ? `/clientes/${client.id}` : "/clientes"}>Cliente 360º</Link>
      <span>/</span>
      <Link href={`/oportunidades/nuevo?cliente=${clientId}`}>Nueva oportunidad</Link>
      <span>/</span>
      <strong>Seguros</strong>
    </div>

    <header className={styles.hero}>
      <div>
        <span>NUEVO NEGOCIO · SEGUROS</span>
        <h1>Crear oportunidad</h1>
        <p>El comercial crea y sigue la oportunidad. La póliza nacerá únicamente después de la aceptación y activación confirmada.</p>
      </div>
      <div className={styles.flow}>
        <b>1 Cliente</b>
        <b>2 Seguro</b>
        <b>3 Propuesta</b>
        <b>4 Aceptación</b>
        <b>5 Póliza</b>
      </div>
    </header>

    <form className={styles.form} onSubmit={e=>{e.preventDefault();save();}}>
      <section className={styles.operationStateSection}>
        <div className={styles.operationStateRow}>
          <div><strong>Estado de la operación</strong><small>Control comercial de la oportunidad.</small></div>
          <div className={styles.statusControl}><span/><select value={status} onChange={e=>setStatus(e.target.value)}><option>En curso</option><option>Borrador</option><option>Pendiente</option><option>Activa</option><option>Perdida</option></select></div>
        </div>
      </section>

      <section>
        <div className={styles.sectionHead}><h2>Cliente y seguro</h2><small>Los datos que ONE ya conoce no se vuelven a pedir.</small></div>
        <div className={styles.compactSupply}>
          <label>Cliente *<select value={clientId} onChange={e=>setClientId(e.target.value)}><option value="">Seleccionar cliente</option>{clients.map((c:any)=><option key={c.id} value={c.id}>{c.name} · {c.taxId}</option>)}</select></label>
          <label>Riesgo *<select value={risk} onChange={e=>setRisk(e.target.value as Risk)}>{RISKS.map(r=><option key={r}>{r}</option>)}</select></label>
          <label>Compañía actual<input value={currentCompany} onChange={e=>setCurrentCompany(e.target.value)} placeholder="Informativo"/></label>
          <label>Modalidad actual<input value={currentMode} onChange={e=>setCurrentMode(e.target.value)} placeholder="Opcional"/></label>
        </div>
      </section>

      <section>
        <div className={styles.sectionHead}><h2>Datos del riesgo · {risk}</h2><small>Solo aparece la información necesaria para cotizar.</small></div>

        {risk==="Autos" && <>
          <div className={styles.insuranceGrid}>
            <label>Matrícula<input value={car.plate} onChange={e=>setCar({...car,plate:e.target.value.toUpperCase()})}/></label>
            <label>Marca / modelo<input value={car.brandModel} onChange={e=>setCar({...car,brandModel:e.target.value})}/></label>
            <label>Fecha matriculación<input type="date" value={car.registrationDate} onChange={e=>setCar({...car,registrationDate:e.target.value})}/></label>
            <label>Uso<select value={car.use} onChange={e=>setCar({...car,use:e.target.value})}><option>Particular</option><option>Profesional</option><option>Mixto</option></select></label>
            <label>Conductor principal<input value={car.driver} onChange={e=>setCar({...car,driver:e.target.value})} placeholder={client?.name||"Nombre"}/></label>
            <label>Fecha nacimiento<input type="date" value={car.birthDate} onChange={e=>setCar({...car,birthDate:e.target.value})}/></label>
            <label>Carnet desde<input type="date" value={car.licenseSince} onChange={e=>setCar({...car,licenseSince:e.target.value})}/></label>
            <label>Siniestralidad<input value={car.claims} onChange={e=>setCar({...car,claims:e.target.value})} placeholder="Ej. Sin partes últimos 5 años"/></label>
          </div>
          <label className={styles.optionalToggle}><input type="checkbox" checked={occasional} onChange={e=>setOccasional(e.target.checked)}/><span><strong>Conductor ocasional</strong><small>ONE solo pide sus datos si existe.</small></span></label>
          {occasional && <div className={styles.insuranceGrid}>
            <label>Nombre<input value={occasionalDriver.name} onChange={e=>setOccasionalDriver({...occasionalDriver,name:e.target.value})}/></label>
            <label>Fecha nacimiento<input type="date" value={occasionalDriver.birthDate} onChange={e=>setOccasionalDriver({...occasionalDriver,birthDate:e.target.value})}/></label>
            <label>Carnet desde<input type="date" value={occasionalDriver.licenseSince} onChange={e=>setOccasionalDriver({...occasionalDriver,licenseSince:e.target.value})}/></label>
            <label>Siniestralidad<input value={occasionalDriver.claims} onChange={e=>setOccasionalDriver({...occasionalDriver,claims:e.target.value})}/></label>
          </div>}
        </>}

        {risk==="Hogar" && <>
          <div className={styles.riskAddressChoice}>
            <div><strong>Domicilio del riesgo</strong><small>ONE reutiliza el domicilio del tomador salvo que sea distinto.</small></div>
            <label><input type="radio" name="riskAddressHome" checked={riskAddressMode==="client"} onChange={()=>setRiskAddressMode("client")}/> Mismo domicilio del tomador</label>
            <label><input type="radio" name="riskAddressHome" checked={riskAddressMode==="other"} onChange={()=>setRiskAddressMode("other")}/> Otro domicilio</label>
          </div>
          {riskAddressMode==="other" && <div className={styles.insuranceAddress}><SpainAddressFields {...address} onChange={setAddress}/></div>}
          <div className={styles.insuranceGrid}>
            <label>Uso<select value={home.use} onChange={e=>setHome({...home,use:e.target.value})}><option>Vivienda habitual</option><option>Segunda residencia</option><option>Alquiler</option></select></label>
            <label>m²<input value={home.sqm} onChange={e=>setHome({...home,sqm:e.target.value})}/></label>
            <label>Año construcción<input value={home.buildYear} onChange={e=>setHome({...home,buildYear:e.target.value})}/></label>
            <label>Condición<select value={home.role} onChange={e=>setHome({...home,role:e.target.value})}><option>Propietario</option><option>Inquilino</option></select></label>
            <label>Continente €<input value={home.building} onChange={e=>setHome({...home,building:e.target.value})}/></label>
            <label>Contenido €<input value={home.contents} onChange={e=>setHome({...home,contents:e.target.value})}/></label>
          </div>
        </>}

        {risk==="Comercio" && <>
          <div className={styles.riskAddressChoice}>
            <div><strong>Domicilio del riesgo</strong><small>ONE reutiliza el domicilio del tomador salvo que sea distinto.</small></div>
            <label><input type="radio" name="riskAddressCommerce" checked={riskAddressMode==="client"} onChange={()=>setRiskAddressMode("client")}/> Mismo domicilio del tomador</label>
            <label><input type="radio" name="riskAddressCommerce" checked={riskAddressMode==="other"} onChange={()=>setRiskAddressMode("other")}/> Otro domicilio</label>
          </div>
          {riskAddressMode==="other" && <div className={styles.insuranceAddress}><SpainAddressFields {...address} onChange={setAddress}/></div>}
          <div className={styles.insuranceGrid}>
            <label>Actividad<input value={commerce.activity} onChange={e=>setCommerce({...commerce,activity:e.target.value})}/></label>
            <label>m²<input value={commerce.sqm} onChange={e=>setCommerce({...commerce,sqm:e.target.value})}/></label>
            <label>Continente €<input value={commerce.building} onChange={e=>setCommerce({...commerce,building:e.target.value})}/></label>
            <label>Contenido €<input value={commerce.contents} onChange={e=>setCommerce({...commerce,contents:e.target.value})}/></label>
            <label className={styles.span2}>Medidas de seguridad<input value={commerce.security} onChange={e=>setCommerce({...commerce,security:e.target.value})} placeholder="Alarma, rejas, caja fuerte..."/></label>
          </div>
        </>}

        {risk==="Mascotas" && <div className={styles.insuranceGrid}>
          <label>Animal<select value={pet.animal} onChange={e=>setPet({...pet,animal:e.target.value})}><option>Perro</option><option>Gato</option><option>Otro</option></select></label>
          <label>Raza<input value={pet.breed} onChange={e=>setPet({...pet,breed:e.target.value})}/></label>
          <label>Fecha nacimiento<input type="date" value={pet.birthDate} onChange={e=>setPet({...pet,birthDate:e.target.value})}/></label>
          <label>Chip<input value={pet.chip} onChange={e=>setPet({...pet,chip:e.target.value})}/></label>
        </div>}

        {!["Autos","Hogar","Comercio","Mascotas"].includes(risk) && <div className={styles.insuranceGrid}><label className={styles.span2}>Información necesaria<input value={generic} onChange={e=>setGeneric(e.target.value)} placeholder={`Datos relevantes para ${risk}`}/></label></div>}
      </section>

      <section>
        <div className={styles.sectionHead}><h2>Oferta de Seguros</h2><small>Compañía y producto. Después vendrán directamente desde Gestión.</small></div>
        <div className={styles.compactOffer}>
          <label>Compañía *
            <select value={company} onChange={e=>{setCompany(e.target.value);setProduct("");}}>
              <option value="">Seleccionar compañía</option>
              {insuranceProviders.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Producto *
            <select value={product} onChange={e=>setProduct(e.target.value)} disabled={!company}>
              <option value="">{company ? "Seleccionar producto" : "Primero selecciona compañía"}</option>
              {availableProducts.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Forma de pago *<select value={payment} onChange={e=>setPayment(e.target.value as Payment)}><option>Mensual</option><option>Trimestral</option><option>Semestral</option><option>Anual</option></select></label>
          <label>Importe prima €<input inputMode="decimal" value={premium} onChange={e=>setPremium(e.target.value)} placeholder="0,00"/></label>
        </div>
        <div className={styles.moneyHint}>La comisión no la introduce el comercial: ONE la calculará desde Gestión para Mi Día e Informes.</div>
      </section>

      <section>
        <div className={styles.sectionHead}><h2>Fechas</h2><small>Solo fechas necesarias para la operación.</small></div>
        <div className={styles.compactDates}>
          <label>Fecha de alta<input type="date" defaultValue={new Date().toISOString().slice(0,10)} readOnly/></label>
          <label>Fecha de efecto<input type="date" value={effectiveDate} onChange={e=>setEffectiveDate(e.target.value)}/></label>
          <label>Vencimiento<input type="date" value={expiryDate} onChange={e=>setExpiryDate(e.target.value)}/></label>
        </div>
      </section>

      <section>
        <div className={styles.sectionHead}><h2>Documentos</h2><small>Selecciona el tipo y sube. ONE registra el resto.</small></div>
        <div className={styles.documentToolbar}>
          <div><strong>📎 Adjuntar documento</strong><small>Pólizas, recibos, DNI, ficha técnica y documentación del riesgo.</small></div>
          <select value={documentType} onChange={e=>setDocumentType(e.target.value)}>{DOCUMENT_TYPES.map(type=><option key={type}>{type}</option>)}</select>
          <label className={styles.uploadButton}>+ Subir archivo<input type="file" hidden onChange={e=>{addDocument(e.target.files?.[0]||null);e.currentTarget.value="";}}/></label>
        </div>
        {documents.length>0 && <div className={styles.documentList}>{documents.map(doc=><div key={doc.id} className={styles.documentItem}><span>📄</span><div><strong>{doc.name}</strong><small>{doc.type} · {doc.date}</small></div><button type="button" onClick={()=>setDocuments(current=>current.filter(item=>item.id!==doc.id))}>Eliminar</button></div>)}</div>}
      </section>

      <section>
        <div className={styles.sectionHead}><h2>Notas</h2><small>Observaciones internas de esta oportunidad/contrato.</small></div>
        <textarea className={styles.insuranceNotes} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Escribe solo lo que ONE no pueda saber automáticamente..."/>
      </section>

      <div className={styles.actions}><button type="button" className={styles.secondaryButton} onClick={()=>router.back()}>Cancelar</button><button type="submit" className={styles.primaryButton}>Guardar oportunidad</button></div>
    </form>
  </div>;
}
