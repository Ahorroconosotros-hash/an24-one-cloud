"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ClientRecord, getClient, trashClient } from "@/lib/clientes";
import { getClientContracts, OneContract } from "@/lib/contratos";
import { loadOpportunities, OpportunityRecord } from "@/lib/oportunidades";
import { getEnergyContractsByClient } from "@/lib/energy-contracts";
import { addClientActivity, ClientActivity, loadClientActivities } from "@/lib/client-activity";
import styles from "./Cliente.module.css";

const serviceCatalog = [
  { key: "Energía", icon: "⚡", note: "Luz y gas" },
  { key: "Telefonía", icon: "📱", note: "Fibra, líneas y terminales" },
  { key: "Alarmas", icon: "🛡️", note: "Sistemas y accesorios" },
  { key: "Seguros", icon: "🏠", note: "Pólizas" },
];

const stageTone: Record<string, string> = {
  Borrador: "gray", Pendiente: "yellow", "En curso": "blue", Tramitado: "purple",
  Activado: "green", Rechazado: "orange", Cancelado: "red", Baja: "dark",
};

export default function ClientePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<ClientRecord | null | undefined>(undefined);
  const [contracts, setContracts] = useState<OneContract[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [energyTickets, setEnergyTickets] = useState<Array<{id:string; title:string; status:string; contractId:string}>>([]);

  function reload() {
    const next = getClient(params.id);
    setClient(next);
    setContracts(getClientContracts(params.id));
    setOpportunities(loadOpportunities().filter((item) => item.clientId === params.id));
    setActivities(loadClientActivities(params.id));
    setEnergyTickets(
      getEnergyContractsByClient(params.id).flatMap((contract) =>
        contract.tickets.filter((ticket) => ticket.status !== "Resuelto").map((ticket) => ({
          id: ticket.id, title: ticket.title, status: ticket.status, contractId: contract.id,
        }))
      )
    );
  }

  useEffect(() => { reload(); }, [params.id]);

  const activeContracts = useMemo(() => contracts.filter((item) => item.status === "Activo"), [contracts]);
  const openOpportunities = useMemo(() => opportunities.filter((item) => !["Activado", "Rechazado", "Cancelado", "Baja"].includes(item.stage)), [opportunities]);
  const activeServices = useMemo(() => new Set(activeContracts.map((item) => item.service)), [activeContracts]);
  const productRatio = `${activeServices.size}/${serviceCatalog.length}`;

  if (client === undefined) return <div className={styles.notFound}>Cargando Cliente 360º...</div>;
  if (!client) return <div className={styles.notFound}><h1>Cliente no encontrado</h1><Link href="/clientes">Volver</Link></div>;

  function register(type: "Llamada" | "Email" | "WhatsApp" | "Nota") {
    const detail = window.prompt(type === "Llamada" ? "Resultado de la llamada:" : type === "Nota" ? "Escribe la nota:" : `Detalle de ${type}:`, "");
    if (detail === null) return;
    addClientActivity({
      clientId: client!.id,
      type,
      title: type === "Llamada" ? "Llamada registrada" : type === "Nota" ? "Nota añadida" : `${type} registrado`,
      detail: detail || "Sin observaciones",
      user: client!.commercial || "Usuario actual",
    });
    reload();
  }

  function remove() {
    if (!window.confirm("¿Enviar este cliente a la papelera?")) return;
    trashClient(client!.id); router.push("/clientes");
  }

  const timeline = [
    ...activities.map((item) => ({ id:item.id, date:item.createdAt, kind:item.type, title:item.title, detail:item.detail })),
    ...opportunities.map((item) => ({ id:`opp-${item.id}`, date:item.createdAt, kind:"Oportunidad", title:`Oportunidad ${item.service} · ${item.stage}`, detail:item.title || item.product || item.reference })),
    ...contracts.map((item) => ({ id:`ctr-${item.id}`, date:item.createdAt, kind:"Contrato", title:`Contrato ${item.service} · ${item.status}`, detail:`${item.reference} · ${item.provider} · ${item.mainProduct}` })),
    { id:`client-${client.id}`, date:client.createdAt, kind:client.status === "Prospecto" ? "Prospecto" : "Cliente", title:client.status === "Prospecto" ? "Prospecto creado" : "Cliente creado", detail:`${client.reference} · ${client.commercial || "Sin comercial"}` },
  ].sort((a,b) => b.date.localeCompare(a.date));

  return (
    <main className={styles.page}>
      <div className={styles.crumb}><Link href="/clientes">Clientes</Link><span>/</span><strong>Cliente 360º</strong></div>

      <header className={styles.hero}>
        <div className={styles.avatar}>{initials(client.name)}</div>
        <div className={styles.identity}>
          <div className={styles.titleLine}><span className={styles.eyebrow}>CLIENTE 360º</span><span className={`${styles.status} ${client.status === "Prospecto" ? styles.prospect : styles.client}`}>{client.status}</span></div>
          <h1>{client.name}</h1>
          <p>{client.taxId || "DNI/CIF pendiente"} · {client.reference} · {client.type}</p>
          <div className={styles.ownerLine}><span>Comercial <strong>{client.commercial || "Usuario actual"}</strong></span><span>Alta <strong>{formatShort(client.createdAt)}</strong></span><span>Última gestión <strong>{timeline[0] ? formatRelative(timeline[0].date) : "Sin actividad"}</strong></span></div>
        </div>
        <div className={styles.actions}>
          {(client.mobile || client.phone) && <a href={`tel:${client.mobile || client.phone}`} onClick={() => register("Llamada")}>☎ Llamar</a>}
          {client.mobile && <a href={`https://wa.me/${phoneDigits(client.mobile)}`} target="_blank" rel="noreferrer" onClick={() => register("WhatsApp")}>WhatsApp</a>}
          {client.email && <a href={`mailto:${client.email}`} onClick={() => register("Email")}>Email</a>}
          <Link className={styles.primary} href={`/oportunidades/nuevo?cliente=${client.id}`}>+ Nueva oportunidad</Link>
          <button onClick={() => register("Nota")}>+ Nota</button>
          <Link href={`/clientes/${client.id}/editar`}>Editar</Link>
        </div>
      </header>

      <section className={styles.kpis}>
        <Kpi label="Servicios activos" value={productRatio} note="Ratio de productos por cliente" />
        <Kpi label="Contratos activos" value={activeContracts.length} note={`${contracts.length} contratos totales`} />
        <Kpi label="Oportunidades" value={openOpportunities.length} note="Presupuestos y ventas abiertas" />
        <Kpi label="Necesita atención" value={energyTickets.length} note={energyTickets.length ? "Tickets pendientes" : "Sin tickets abiertos"} tone={energyTickets.length ? "danger" : "ok"} />
      </section>
      {timeline[0] && (
        <section className={styles.latestActivity}>
          <div>
            <span>ÚLTIMA ACTIVIDAD</span>
            <strong>{timeline[0].title}</strong>
            <small>{timeline[0].detail} · {formatDate(timeline[0].date)}</small>
          </div>
          <a href="#timeline">Ver timeline →</a>
        </section>
      )}

      {energyTickets.length > 0 && (
        <section className={`${styles.section} ${styles.attention}`}>
          <div className={styles.sectionHead}><div><span>NECESITA ATENCIÓN</span><h2>Hay gestiones que pueden bloquear operaciones</h2><p>Los tickets siguen perteneciendo a cada contrato.</p></div><Link href="/operaciones">Ver operaciones →</Link></div>
          <div className={styles.ticketGrid}>{energyTickets.slice(0,3).map((ticket) => <Link href={`/contratos/energia/${ticket.contractId}`} key={ticket.id} className={styles.ticket}><b>🎫 {ticket.title}</b><small>{ticket.status} · Abrir contrato →</small></Link>)}</div>
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><span>¿QUÉ TIENE?</span><h2>Servicios del cliente</h2><p>Contratos reales y huecos de venta cruzada en una sola vista.</p></div><Link href={`/oportunidades/nuevo?cliente=${client.id}`}>+ Nueva oportunidad</Link></div>
        <div className={styles.serviceGrid}>
          {serviceCatalog.map((service) => {
            const items = contracts.filter((item) => item.service === service.key);
            const active = items.filter((item) => item.status === "Activo").length;
            const products = items.reduce((sum,item) => sum + item.products.reduce((acc,p) => acc + p.quantity,0),0);
            return <article className={`${styles.serviceCard} ${active ? styles.serviceActive : ""}`} key={service.key}>
              <div className={styles.serviceTop}><div className={styles.serviceIcon}>{service.icon}</div><span className={active ? styles.activeBadge : styles.inactiveBadge}>{active ? "Activo" : "Disponible"}</span></div>
              <span className={styles.serviceName}>{service.key}</span>
              <strong>{items.length} {items.length === 1 ? "contrato" : "contratos"}</strong>
              <small>{active ? `${products} productos · ${active} activos` : service.note}</small>
              <div className={styles.serviceFoot}>{active ? <Link href={`#service-${slug(service.key)}`}>Ver detalle →</Link> : <Link href={offerHref(service.key, client.id)}>+ Ofrecer {service.key}</Link>}</div>
            </article>;
          })}
        </div>
      </section>

      <div className={styles.twoCol}>
        <section className={styles.section}>
          <div className={styles.sectionHead}><div><span>OPORTUNIDADES</span><h2>Presupuestos y negocio abierto</h2><p>Todo lo que hemos ofrecido y todavía está vivo.</p></div><Link href={`/oportunidades/nuevo?cliente=${client.id}`}>Nueva →</Link></div>
          <div className={styles.list}>{openOpportunities.length ? openOpportunities.map((opp) => <Link href="/oportunidades" className={styles.row} key={opp.id}><div className={styles.rowIcon}>🎯</div><div><strong>{opp.service} · {opp.title || opp.product || "Oportunidad"}</strong><small>{opp.reference} · Próxima acción: {opp.nextAction || "Pendiente"}</small></div><span className={`${styles.stage} ${styles[stageTone[opp.stage] || "gray"]}`}>{opp.stage}</span><b>→</b></Link>) : <Empty text="No hay oportunidades abiertas" action="Crear oportunidad" href={`/oportunidades/nuevo?cliente=${client.id}`} />}</div>
        </section>

        <aside className={styles.advisor}>
          <span>ONE · VENTA CRUZADA</span><h2>Incrementar ratio de productos</h2>
          <div className={styles.ratio}><strong>{activeServices.size}</strong><span>de {serviceCatalog.length} servicios</span></div>
          <p>{activeServices.size === serviceCatalog.length ? "Este cliente ya tiene todos los servicios principales." : "ONE detecta qué servicios todavía no tiene contratados."}</p>
          <div className={styles.crossSell}>{serviceCatalog.filter((s) => !activeServices.has(s.key)).map((s) => <Link key={s.key} href={`/oportunidades/nuevo?cliente=${client.id}`}><span>{s.icon}</span><div><strong>Ofrecer {s.key}</strong><small>{s.note}</small></div><b>+</b></Link>)}</div>
        </aside>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><span>CONTRATOS</span><h2>Cartera del cliente</h2><p>Entra en cada contrato para productos, documentos, operaciones y tickets.</p></div></div>
        <div className={styles.contractGroups}>
          {serviceCatalog.map((service) => {
            const items = contracts.filter((c) => c.service === service.key);
            if (!items.length) return null;
            return <div id={`service-${slug(service.key)}`} className={styles.contractGroup} key={service.key}><div className={styles.groupTitle}><span>{service.icon}</span><strong>{service.key}</strong><small>{items.length} {items.length===1?"contrato":"contratos"}</small></div>{items.map((contract) => <ContractRow contract={contract} key={contract.id} />)}</div>;
          })}
          {!contracts.length && <Empty text="Todavía no hay contratos" action="Crear oportunidad" href={`/oportunidades/nuevo?cliente=${client.id}`} />}
        </div>
      </section>

      <div className={styles.twoCol}>
        <section id="timeline" className={styles.section}>
          <div className={styles.sectionHead}><div><span>ACTIVIDAD</span><h2>Timeline completo</h2><p>Desde el primer contacto hasta contratos, llamadas y oportunidades.</p></div><button onClick={() => register("Nota")}>+ Registrar gestión</button></div>
          <div className={styles.timelineList}>{timeline.length ? timeline.slice(0,14).map((event) => <div className={styles.timeline} key={event.id}><i/><time>{formatDate(event.date)}</time><div><span>{event.kind}</span><strong>{event.title}</strong><p>{event.detail}</p></div></div>) : <p className={styles.noActivity}>Sin actividad todavía.</p>}</div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}><div><span>CONTACTO</span><h2>Información útil</h2><p>Lo necesario para interactuar con el cliente.</p></div><Link href={`/clientes/${client.id}/editar`}>Completar ficha →</Link></div>
          <div className={styles.contactGrid}><Data label="Teléfono" value={client.mobile || client.phone} /><Data label="Email" value={client.email} /><Data label="Dirección" value={[client.address, client.postalCode, client.city].filter(Boolean).join(", ")} /><Data label="DNI / CIF" value={client.taxId} /><Data label="IBAN" value={maskIban(client.iban)} /><Data label="Notas" value={client.notes} /></div>
        </section>
      </div>

      <div className={styles.footerLine}><span>ONE v0.4.0 · Cliente 360º v2</span><span>Tu negocio, siempre contigo.</span><button onClick={remove}>Enviar a papelera</button></div>
    </main>
  );
}

function ContractRow({ contract }: { contract: OneContract }) {
  const href = contract.service === "Energía" ? `/contratos/energia/${contract.id}` : "#";
  const products = contract.products.reduce((sum,p) => sum + p.quantity,0);
  return <Link href={href} className={styles.contractRow}><div><strong>{contract.provider} · {contract.mainProduct}</strong><small>{contract.reference}{contract.cups ? ` · ${contract.cups}` : ""}</small></div><span>{products} productos</span><span className={`${styles.contractStatus} ${contract.status === "Activo" ? styles.ok : ""}`}>{contract.status}</span><b>→</b></Link>;
}
function Kpi({label,value,note,tone}:{label:string;value:string|number;note:string;tone?:string}) { return <article className={`${styles.kpi} ${tone === "danger" ? styles.kpiDanger : tone === "ok" ? styles.kpiOk : ""}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
function Data({label,value}:{label:string;value:string}) { return <div className={styles.data}><span>{label}</span><strong>{value || "Pendiente"}</strong></div>; }
function Empty({text,action,href}:{text:string;action:string;href:string}) { return <div className={styles.empty}><strong>{text}</strong><Link href={href}>{action} →</Link></div>; }

function offerHref(service:string, clientId:string){
  if(service === "Energía") return `/oportunidades/nuevo/energia?cliente=${clientId}`;
  if(service === "Seguros") return `/oportunidades/nuevo/seguros?cliente=${clientId}`;
  if(service === "Alarmas") return `/oportunidades/nuevo/alarmas?cliente=${clientId}`;
  return `/oportunidades/nuevo?cliente=${clientId}&servicio=${encodeURIComponent(service)}`;
}

function initials(name:string){return name.split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();}
function phoneDigits(v:string){return v.replace(/\D/g,"");}
function slug(v:string){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
function maskIban(v:string){return v ? `${v.slice(0,4)} •••• •••• ${v.slice(-4)}` : "";}
function formatShort(v:string){return new Date(v).toLocaleDateString("es-ES");}
function formatDate(v:string){return new Date(v).toLocaleString("es-ES",{dateStyle:"short",timeStyle:"short"});}
function formatRelative(v:string){const diff=Date.now()-new Date(v).getTime();const days=Math.floor(diff/86400000);if(days<=0)return "Hoy";if(days===1)return "Ayer";return `Hace ${days} días`;}
