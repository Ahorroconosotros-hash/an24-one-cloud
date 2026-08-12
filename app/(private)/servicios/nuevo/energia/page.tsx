"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./Energia.module.css";

type CatalogProduct={id:string;service:string;company:string;name:string;features:string;an24:number;junior:number;senior:number;external:number;active:boolean};
const seedProducts:CatalogProduct[]=[{id:"gana-24h",service:"Energía",company:"GANA",name:"Tarifa 24H",features:"Luz · precio fijo 24 horas",an24:120,junior:35,senior:50,external:40,active:true}];

export default function NuevoServicioEnergiaPage() {
  const [catalog,setCatalog]=useState<CatalogProduct[]>(seedProducts);
  const [company,setCompany]=useState(""); const [productId,setProductId]=useState(""); const [profile,setProfile]=useState("senior");
  useEffect(()=>{const raw=localStorage.getItem("one_product_catalog");if(raw)try{setCatalog(JSON.parse(raw))}catch{}},[]);
  const energy=catalog.filter(x=>x.service==="Energía"&&x.active); const companies=[...new Set(energy.map(x=>x.company))];
  const products=energy.filter(x=>x.company===company); const selected=energy.find(x=>x.id===productId);
  const comisionAN24=selected?.an24||0;
  const comisionComercial=selected ? (profile==="junior"?selected.junior:profile==="external"?selected.external:selected.senior) : 0;
  const [fechaAlta, setFechaAlta] = useState("");

  const margen = useMemo(() => comisionAN24 - comisionComercial, [comisionAN24, comisionComercial]);
  const revision = useMemo(() => {
    if (!fechaAlta) return "Pendiente de fecha de activación";
    const d = new Date(`${fechaAlta}T12:00:00`);
    d.setMonth(d.getMonth() + 6);
    return d.toLocaleDateString("es-ES");
  }, [fechaAlta]);
  const liquidacion = useMemo(() => {
    if (!fechaAlta) return "Pendiente";
    const d = new Date(`${fechaAlta}T12:00:00`);
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  }, [fechaAlta]);

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <Link href="/servicios/nuevo" className={styles.back}>← Nuevo servicio</Link>
          <div className={styles.kicker}>ONE ENERGÍA · ALTA DE SERVICIO</div>
          <h1>Nuevo servicio de Energía</h1>
          <p>Alta comercial, activación, comisiones y seguimiento del suministro en una única ficha.</p>
        </div>
        <div className={styles.status}>BORRADOR</div>
      </div>

      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        <Section n="01" title="Cliente" subtitle="El cliente existe una sola vez en ONE.">
          <div className={styles.grid2}>
            <Field label="Buscar cliente *"><input required placeholder="Nombre, razón social, NIF/CIF..." /></Field>
            <div className={styles.actionBox}><span>¿No existe todavía?</span><Link href="/clientes/nuevo">+ Crear cliente</Link></div>
          </div>
          <div className={styles.grid4}>
            <Field label="Cliente"><input placeholder="Se completa al seleccionar" disabled /></Field>
            <Field label="NIF / CIF"><input placeholder="Automático" disabled /></Field>
            <Field label="Teléfono"><input placeholder="Automático" disabled /></Field>
            <Field label="Email"><input placeholder="Automático" disabled /></Field>
          </div>
        </Section>

        <Section n="02" title="Suministro" subtitle="Identificación del punto de luz o gas.">
          <div className={styles.grid3}>
            <Field label="Tipo de suministro *"><select required defaultValue="luz"><option value="luz">Luz</option><option value="gas">Gas</option></select></Field>
            <Field label="CUPS *"><input required placeholder="ES00..." /></Field>
            <Field label="Titular del suministro"><input placeholder="Si es distinto del cliente" /></Field>
          </div>
          <div className={styles.grid4}>
            <Field label="Dirección"><input placeholder="Calle y número" /></Field>
            <Field label="Código postal"><input /></Field>
            <Field label="Población"><input /></Field>
            <Field label="Provincia"><input /></Field>
          </div>
        </Section>

        <Section n="03" title="Situación actual" subtitle="Datos que nos permiten comparar y detectar oportunidades.">
          <div className={styles.grid4}>
            <Field label="Comercializadora actual"><input /></Field>
            <Field label="Tarifa actual"><input placeholder="2.0TD, 3.0TD..." /></Field>
            <Field label="Potencia P1 (kW)"><input type="number" step="0.001" /></Field>
            <Field label="Potencia P2 (kW)"><input type="number" step="0.001" /></Field>
          </div>
          <div className={styles.grid3}>
            <Field label="Consumo anual (kWh)"><input type="number" /></Field>
            <Field label="Factura aproximada (€)"><input type="number" step="0.01" /></Field>
            <Field label="Fin contrato / permanencia"><input type="date" /></Field>
          </div>
        </Section>

        <Section n="04" title="Nueva contratación" subtitle="La fecha de contratación y la fecha real de alta se controlan por separado.">
          <div className={styles.grid3}>
            <Field label="Tipo de operación *"><select required defaultValue="cambio"><option value="cambio">Cambio comercializadora</option><option>Renovación</option><option>Alta nueva</option><option>Cambio tarifa</option><option>Cambio titular</option></select></Field>
            <Field label="Nueva comercializadora *"><select required value={company} onChange={(e)=>{setCompany(e.target.value);setProductId("")}}><option value="">Seleccionar comercializadora</option>{companies.map(c=><option key={c}>{c}</option>)}</select></Field>
            <Field label="Producto *"><select required value={productId} disabled={!company} onChange={(e)=>setProductId(e.target.value)}><option value="">{company?"Seleccionar producto":"Primero selecciona comercializadora"}</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          </div>
          <div className={styles.grid4}>
            <Field label="Precio energía €/kWh"><input type="number" step="0.00001" /></Field>
            <Field label="Potencia P1 (kW)"><input type="number" step="0.001" /></Field>
            <Field label="Potencia P2 (kW)"><input type="number" step="0.001" /></Field>
            <Field label="Permanencia"><select defaultValue="no"><option value="no">No</option><option value="si">Sí</option></select></Field>
          </div>
          <div className={styles.grid3}>
            <Field label="Fecha de contratación *"><input required type="date" /></Field>
            <Field label="Fecha de alta / activación"><input type="date" value={fechaAlta} onChange={(e)=>setFechaAlta(e.target.value)} /></Field>
            <Field label="Fecha vencimiento"><input type="date" /></Field>
          </div>
          <Field label="Servicios adicionales"><input placeholder="Mantenimiento, servicios, promociones..." /></Field>
        </Section>

        <Section n="05" title="Comisiones" subtitle="Se cargan automáticamente desde el producto y el perfil del comercial.">
          <div className={styles.grid3}>
            <Field label="Perfil comercial"><select value={profile} onChange={(e)=>setProfile(e.target.value)}><option value="junior">Comercial Junior</option><option value="senior">Comercial Senior</option><option value="external">Colaborador</option></select></Field>
            <div className={styles.infoCard}><span>Comisión AN24</span><strong>{comisionAN24.toLocaleString("es-ES",{style:"currency",currency:"EUR"})}</strong><small>Definida en Productos.</small></div>
            <div className={styles.infoCard}><span>Comisión comercial</span><strong>{comisionComercial.toLocaleString("es-ES",{style:"currency",currency:"EUR"})}</strong><small>Según perfil del comercial.</small></div>
          </div>
          <div className={styles.grid3}>
            <Field label="Comercial responsable *"><select required defaultValue=""><option value="" disabled>Seleccionar comercial</option><option>Jesús Martínez</option><option>Sarai Prieto</option><option>María López</option></select></Field>
            <div className={styles.moneyCard}><span>Margen AN24</span><strong>{margen.toLocaleString("es-ES", {style:"currency", currency:"EUR"})}</strong><small>AN24 − comisión comercial</small></div>
            <div className={styles.infoCard}><span>Previsión de liquidación</span><strong>{liquidacion}</strong><small>Desde la activación real.</small></div>
          </div>
          {selected&&<div className={styles.automation}><div><span className={styles.autoIcon}>✓</span><div><strong>{selected.company} · {selected.name}</strong><p>{selected.features||"Producto seleccionado del catálogo ONE"}</p></div></div><div className={styles.autoDate}><span>Condiciones copiadas al contrato</span><strong>{comisionAN24.toFixed(2)} € / {comisionComercial.toFixed(2)} €</strong><small>El histórico no cambiará aunque el producto se edite después.</small></div></div>}
        </Section>

        <Section n="06" title="Estado y seguimiento" subtitle="Seguimiento comercial y automatizaciones de ONE.">
          <div className={styles.grid3}>
            <Field label="Estado del contrato *"><select required defaultValue="borrador"><option>Borrador</option><option>Pendiente documentación</option><option>Enviado</option><option>En tramitación</option><option>Activo</option><option>Incidencia</option><option>Cancelado</option></select></Field>
            <Field label="Próxima acción"><input placeholder="Llamar, solicitar factura..." /></Field>
            <Field label="Fecha próxima acción"><input type="date" /></Field>
          </div>
          <div className={styles.automation}>
            <div><span className={styles.autoIcon}>↻</span><div><strong>Seguimiento automático</strong><p>Al activarse el contrato, ONE programará la revisión comercial a los 6 meses.</p></div></div>
            <div className={styles.autoDate}><span>Próxima revisión</span><strong>{revision}</strong><small>REVISAR CONTRATO, POSIBLE CAMBIO CC</small></div>
          </div>
          <Field label="Notas internas"><textarea rows={4} placeholder="Observaciones comerciales, incidencias, información relevante..." /></Field>
        </Section>

        <Section n="07" title="Documentación" subtitle="Documentos asociados al servicio y al cliente.">
          <div className={styles.dropzone}><strong>Arrastra aquí los documentos</strong><span>Factura · DNI/NIF/CIF · Contrato · SEPA · Otros</span><button type="button">Seleccionar archivos</button></div>
        </Section>

        <div className={styles.footer}>
          <Link href="/servicios/nuevo">Cancelar</Link>
          <div><button type="button" className={styles.secondary}>Guardar borrador</button><button type="submit" className={styles.primary}>Guardar servicio de Energía</button></div>
        </div>
      </form>
    </main>
  );
}

function Section({n,title,subtitle,children}:{n:string;title:string;subtitle:string;children:React.ReactNode}) {
  return <section className={styles.section}><div className={styles.sectionHead}><span>{n}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div><div className={styles.sectionBody}>{children}</div></section>;
}
function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className={styles.field}><span>{label}</span>{children}</label>; }
