"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./Cliente.module.css";

type Tab = "ficha" | "servicios" | "oportunidades" | "documentos" | "agenda" | "notas" | "historico" | "tickets";
type Role = "Administración" | "Backoffice" | "Comercial";
type ServiceStatus = "Activo" | "Pendiente" | "Sin contratar";
type ServiceTab = "resumen" | "contrato" | "documentos" | "seguimiento" | "renovaciones" | "comisiones" | "incidencias" | "historico";

type Service = {
  id: string;
  name: string;
  icon: string;
  company: string;
  detail: string;
  status: ServiceStatus;
  renewal?: string;
  annualValue?: string;
  documents: number;
  notes: number;
  owner?: string;
};

const tabs: { id: Tab; label: string; count?: number }[] = [
  { id: "ficha", label: "Ficha" },
  { id: "servicios", label: "Servicios", count: 3 },
  { id: "oportunidades", label: "Oportunidades", count: 2 },
  { id: "documentos", label: "Documentos", count: 3 },
  { id: "agenda", label: "Agenda", count: 1 },
  { id: "notas", label: "Notas", count: 4 },
  { id: "historico", label: "Histórico" },
  { id: "tickets", label: "Tickets", count: 1 },
];

const initialServices: Service[] = [
  { id: "energia", name: "Energía", icon: "⚡", company: "Endesa", detail: "Tarifa 3.0TD · CUPS ES0021000000000001AA", status: "Activo", renewal: "03/09/2026", annualValue: "4.800 €", documents: 18, notes: 4, owner: "Jesús Martínez" },
  { id: "telefonia", name: "Telefonía", icon: "📱", company: "Orange", detail: "8 líneas móviles + fibra 1 Gb", status: "Activo", renewal: "15/09/2026", annualValue: "2.640 €", documents: 9, notes: 2, owner: "Jesús Martínez" },
  { id: "alarmas", name: "Alarmas", icon: "🛡️", company: "Segurma", detail: "Alarma Grado 2 · revisión anual", status: "Activo", renewal: "21/03/2027", annualValue: "1.500 €", documents: 6, notes: 1, owner: "María López" },
  { id: "tpv", name: "TPV", icon: "💳", company: "Sin proveedor", detail: "Servicio recomendado para recepción", status: "Sin contratar", documents: 0, notes: 0 },
  { id: "certificados", name: "Certificados digitales", icon: "🔐", company: "TramiteDigital", detail: "Persona jurídica y sello electrónico", status: "Sin contratar", documents: 0, notes: 0 },
  { id: "seguros", name: "Seguros", icon: "☂️", company: "Sin compañía", detail: "Pendiente de análisis de necesidades", status: "Sin contratar", documents: 0, notes: 0 },
  { id: "otros", name: "Otros servicios", icon: "➕", company: "Personalizable", detail: "Crea un servicio adaptado al cliente", status: "Sin contratar", documents: 0, notes: 0 },
];

const serviceTabs: { id: ServiceTab; label: string }[] = [
  { id: "resumen", label: "Resumen" }, { id: "contrato", label: "Contrato" }, { id: "documentos", label: "Documentos" },
  { id: "seguimiento", label: "Seguimiento" }, { id: "renovaciones", label: "Renovaciones" }, { id: "comisiones", label: "Comisiones" },
  { id: "incidencias", label: "Incidencias" }, { id: "historico", label: "Histórico" },
];

export default function Client360({ id }: { id: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("ficha");
  const [role, setRole] = useState<Role>("Administración");
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState(false);
  const [services, setServices] = useState(initialServices);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [serviceTab, setServiceTab] = useState<ServiceTab>("resumen");
  const [showAddService, setShowAddService] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [toast, setToast] = useState("");
  const privileged = role === "Administración" || role === "Backoffice";

  const panelTitle = useMemo(() => tabs.find((tab) => tab.id === activeTab)?.label ?? "Ficha", [activeTab]);
  const selectedService = services.find((service) => service.id === selectedServiceId) ?? null;

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  function saveNote() {
    if (!note.trim()) return;
    setSavedNote(true); setNote("");
    window.setTimeout(() => setSavedNote(false), 2200);
  }

  function openService(service: Service) {
    if (service.status === "Sin contratar") {
      setNewServiceName(service.name === "Otros servicios" ? "" : service.name);
      setShowAddService(true);
      return;
    }
    setSelectedServiceId(service.id); setServiceTab("resumen");
  }

  function createService() {
    const name = newServiceName.trim();
    if (!name) return;
    const idValue = `${name.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, "-")}-${Date.now()}`;
    const created: Service = { id: idValue, name, icon: "🧩", company: "Pendiente de asignar", detail: "Expediente creado · completa los datos del contrato", status: "Pendiente", documents: 0, notes: 0, owner: "Jesús Martínez" };
    setServices((current) => [...current.filter((service) => service.name !== name || service.status !== "Sin contratar"), created]);
    setShowAddService(false); setNewServiceName(""); setSelectedServiceId(created.id); setServiceTab("contrato");
    notify("Servicio creado correctamente");
  }

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}
      <div className={styles.topline}><div className={styles.crumb}><Link href="/clientes">Clientes</Link><span>/</span><strong>Clínica Dental Sur</strong></div><label className={styles.rolePicker}>Vista de perfil<select value={role} onChange={(event) => setRole(event.target.value as Role)}><option>Administración</option><option>Backoffice</option><option>Comercial</option></select></label></div>

      <section className={styles.hero}><div className={styles.avatar}>CD</div><div className={styles.identity}><div className={styles.titleRow}><h1>Clínica Dental Sur</h1><span className={styles.status}>Cliente activo</span></div><p className={styles.meta}>CIF B-11876543 · ONE-1042 · Alta 18/03/2023 · ID {id}</p><div className={styles.quickFacts}><span><b>Responsable</b> María Gómez Ortega</span><span><b>Comercial</b> Equipo Empresas</span><span><b>Última actividad</b> Hoy, 08:42</span></div></div><div className={styles.actions}><button type="button">Llamar</button><button type="button">WhatsApp</button><button type="button">Email</button>{privileged && <Link href={`/clientes/${id}/contratacion`} className={styles.primary}>Ir a contratación</Link>}{privileged && <button type="button" className={styles.secondary}>Ficha PDF</button>}</div></section>

      <nav className={styles.tabs}>{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); setSelectedServiceId(null); }} className={activeTab === tab.id ? styles.active : ""}>{tab.label}{typeof tab.count === "number" && <small>{tab.count}</small>}</button>)}</nav>

      <section className={styles.kpis}><article className={styles.kpi}><span>Valor anual</span><strong>8.940 €</strong><small>Facturación estimada</small></article><article className={styles.kpi}><span>Servicios activos</span><strong>3</strong><small>Sin incidencias</small></article><article className={styles.kpi}><span>Próxima renovación</span><strong>03 sep</strong><small>Energía · 2026</small></article><article className={styles.kpi}><span>Potencial</span><strong>Alto</strong><small>TPV recomendado</small></article></section>

      <div className={styles.contentHeader}><div><span>VISTA 360º</span><h2>{selectedService ? `${selectedService.icon} ${selectedService.name}` : panelTitle}</h2></div>{activeTab === "servicios" && privileged && !selectedService && <button className={styles.primaryButton} onClick={() => setShowAddService(true)}>+ Añadir servicio</button>}{activeTab === "documentos" && <button className={styles.primaryButton}>+ Subir documento general</button>}{activeTab === "agenda" && <button className={styles.primaryButton}>+ Nueva cita</button>}</div>

      {activeTab === "ficha" && <div className={styles.grid}><div className={styles.stack}><article className={styles.panel}><div className={styles.panelHead}><div><h3>Datos principales</h3><p>Información compacta y editable del cliente</p></div><button>Editar</button></div><div className={styles.dataGrid}><div><span>Razón social</span><strong>Clínica Dental Sur, S.L.</strong></div><div><span>DNI / CIF</span><strong>B-11876543</strong></div><div><span>Teléfono</span><strong>956 123 456</strong></div><div><span>Móvil</span><strong>600 123 456</strong></div><div className={styles.wide}><span>Correo</span><strong>maria@clinicadentalsur.es</strong></div><div className={styles.wide}><span>Dirección</span><strong>Av. Europa 24, Local 2 · 11405 Jerez de la Frontera</strong></div></div></article><article className={styles.panel}><div className={styles.panelHead}><div><h3>Actividad reciente</h3><p>Últimos movimientos de la cuenta</p></div><button>+ Actividad</button></div><div className={styles.timeline}><div><time>Hoy · 08:42</time><strong>Llamada completada</strong><p>Interés en revisar la telefonía móvil.</p></div><div><time>18 jul · 12:20</time><strong>Recordatorio automático</strong><p>El contrato energético vence en 45 días.</p></div><div><time>10 jul · 10:05</time><strong>Documento añadido</strong><p>Factura eléctrica junio 2026.pdf</p></div></div></article></div><aside className={styles.stack}><article className={styles.panel}><div className={styles.panelHead}><div><h3>Responsable</h3><p>Contacto principal de la empresa</p></div></div><div className={styles.contactCard}><div className={styles.miniAvatar}>MG</div><div><strong>María Gómez Ortega</strong><span>Gerente</span><a href="tel:600123456">600 123 456</a><a href="mailto:maria@clinicadentalsur.es">maria@clinicadentalsur.es</a></div></div></article><article className={styles.panel}><div className={styles.panelHead}><div><h3>Próxima acción</h3><p>Seguimiento prioritario</p></div></div><div className={styles.nextAction}><span>Mañana · 09:30</span><strong>Revisar renovación energética</strong><p>Preparar propuesta comparativa antes de llamar.</p></div></article><article className={styles.ai}><span>ONE IA</span><h3>Oportunidad detectada</h3><p>TPV es el siguiente servicio con mayor afinidad para este cliente.</p><button onClick={() => setActiveTab("oportunidades")}>Ver oportunidad</button></article></aside></div>}

      {activeTab === "servicios" && !selectedService && <><div className={styles.serviceSummary}><div><strong>3</strong><span>Activos</span></div><div><strong>0</strong><span>Con incidencia</span></div><div><strong>1</strong><span>Renovación próxima</span></div><div><strong>4</strong><span>Oportunidades</span></div></div><div className={styles.cardsGrid}>{services.map((service) => <article className={`${styles.serviceCard} ${service.status === "Sin contratar" ? styles.inactiveService : ""}`} key={service.id}><div className={styles.serviceTop}><div className={styles.serviceIcon}>{service.icon}</div><span className={service.status === "Activo" ? styles.activeBadge : service.status === "Pendiente" ? styles.pendingBadge : styles.emptyBadge}>{service.status}</span></div><span>{service.company}</span><h3>{service.name}</h3><p>{service.detail}</p>{service.status !== "Sin contratar" && <div className={styles.serviceMetrics}><span><b>{service.documents}</b> documentos</span><span><b>{service.notes}</b> notas</span>{service.renewal && <span><b>{service.renewal}</b> renovación</span>}</div>}<button onClick={() => openService(service)}>{service.status === "Sin contratar" ? "+ Añadir servicio" : "Abrir expediente"}</button></article>)}</div></>}

      {activeTab === "servicios" && selectedService && <ServiceWorkspace service={selectedService} tab={serviceTab} setTab={setServiceTab} onBack={() => setSelectedServiceId(null)} privileged={privileged} notify={notify} />}

      {activeTab === "oportunidades" && <div className={styles.cardsGrid}><article className={styles.opportunity}><span>NEGOCIACIÓN</span><h3>Renovación de energía</h3><p>Valor estimado 4.800 € · cierre previsto 15/08/2026</p><strong>70%</strong></article><article className={styles.opportunity}><span>DETECTADA</span><h3>TPV para recepción</h3><p>Potencial anual estimado 1.260 €</p><strong>35%</strong></article></div>}

      {activeTab === "documentos" && <article className={styles.panel}><div className={styles.panelHead}><div><h3>Documentos generales del cliente</h3><p>Solo documentación que no pertenece a un contrato concreto</p></div></div><div className={styles.documentRow}><strong>CIF Clínica Dental Sur.pdf</strong><span>Identificación · 18/03/2023</span><button>Ver</button></div><div className={styles.documentRow}><strong>Escritura de constitución.pdf</strong><span>Empresa · 18/03/2023</span><button>Ver</button></div><div className={styles.documentRow}><strong>Autorización RGPD.pdf</strong><span>Legal · 18/03/2023</span><button>Ver</button></div><div className={styles.documentNotice}>Las facturas, contratos y documentos vinculados a un servicio se guardan dentro de su propio expediente.</div></article>}

      {activeTab === "agenda" && <article className={styles.panel}><div className={styles.agendaItem}><time>29 JUL · 09:30</time><div><strong>Revisión renovación energética</strong><p>Llamada con María Gómez · Prioridad alta</p></div><button>Completar</button></div></article>}
      {activeTab === "notas" && <div className={styles.grid}><article className={styles.panel}><div className={styles.panelHead}><div><h3>Nueva nota</h3><p>Se asociará a esta ficha</p></div></div><textarea className={styles.noteArea} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Escribe una nota comercial..."/><div className={styles.noteActions}>{savedNote && <span>Nota guardada</span>}<button onClick={saveNote}>Guardar nota</button></div></article><article className={styles.panel}><div className={styles.savedNote}><time>18 jul · Jesús Martínez</time><p>Cliente interesado en revisar las líneas móviles antes de septiembre.</p></div><div className={styles.savedNote}><time>10 jul · Backoffice</time><p>Documentación general revisada y completa.</p></div></article></div>}
      {activeTab === "historico" && <article className={styles.panel}><div className={styles.historyRow}><time>18/03/2023</time><strong>Cliente creado</strong><span>Alta en ONE</span></div><div className={styles.historyRow}><time>21/03/2023</time><strong>Servicio Energía contratado</strong><span>Contrato activado</span></div><div className={styles.historyRow}><time>10/07/2026</time><strong>Documento añadido</strong><span>Factura eléctrica junio</span></div></article>}
      {activeTab === "tickets" && <article className={styles.panel}><div className={styles.ticket}><div><span>INC-1048 · ABIERTA</span><strong>Revisión de factura de telefonía</strong><p>Asignado a Backoffice · prioridad media</p></div><button>Resolver</button></div></article>}

      {showAddService && <div className={styles.modalBackdrop} onMouseDown={() => setShowAddService(false)}><div className={styles.modal} onMouseDown={(event) => event.stopPropagation()}><div className={styles.modalHead}><div><span>NUEVO EXPEDIENTE</span><h3>Añadir servicio al cliente</h3></div><button onClick={() => setShowAddService(false)}>×</button></div><label>Tipo de servicio<input autoFocus value={newServiceName} onChange={(event) => setNewServiceName(event.target.value)} placeholder="Ej. Energía, Telefonía, Seguro..." /></label><p>Se creará un expediente independiente con contrato, documentos, seguimiento, renovaciones, comisiones, incidencias e histórico.</p><div className={styles.modalActions}><button onClick={() => setShowAddService(false)}>Cancelar</button><button className={styles.primaryButton} onClick={createService}>Crear expediente</button></div></div></div>}
    </div>
  );
}

function ServiceWorkspace({ service, tab, setTab, onBack, privileged, notify }: { service: Service; tab: ServiceTab; setTab: (tab: ServiceTab) => void; onBack: () => void; privileged: boolean; notify: (message: string) => void }) {
  return <div className={styles.serviceWorkspace}><div className={styles.serviceToolbar}><button onClick={onBack}>← Todos los servicios</button><div><span className={service.status === "Activo" ? styles.activeBadge : styles.pendingBadge}>{service.status}</span>{privileged && <button className={styles.darkButton} onClick={() => notify("Modo edición preparado")}>Editar servicio</button>}</div></div><nav className={styles.serviceTabs}>{serviceTabs.map((item) => <button key={item.id} className={tab === item.id ? styles.serviceTabActive : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
  {tab === "resumen" && <div className={styles.grid}><div className={styles.stack}><article className={styles.panel}><div className={styles.panelHead}><div><h3>Resumen del servicio</h3><p>Situación actual del expediente</p></div></div><div className={styles.dataGrid}><div><span>Proveedor</span><strong>{service.company}</strong></div><div><span>Estado</span><strong>{service.status}</strong></div><div><span>Valor anual</span><strong>{service.annualValue ?? "Pendiente"}</strong></div><div><span>Renovación</span><strong>{service.renewal ?? "Sin fecha"}</strong></div><div className={styles.wide}><span>Descripción</span><strong>{service.detail}</strong></div><div className={styles.wide}><span>Comercial responsable</span><strong>{service.owner ?? "Sin asignar"}</strong></div></div></article><article className={styles.panel}><div className={styles.panelHead}><div><h3>Actividad del servicio</h3><p>Solo movimientos de este expediente</p></div><button onClick={() => notify("Actividad añadida")}>+ Actividad</button></div><div className={styles.timeline}><div><time>Hoy · 08:42</time><strong>Seguimiento actualizado</strong><p>Se confirma la próxima fecha de revisión.</p></div><div><time>10 jul · 10:05</time><strong>Documento añadido</strong><p>Factura junio 2026.pdf</p></div></div></article></div><aside className={styles.stack}><article className={styles.panel}><div className={styles.panelHead}><div><h3>Estado rápido</h3><p>Indicadores del expediente</p></div></div><div className={styles.quickStatus}><div><span>Documentos</span><strong>{service.documents}</strong></div><div><span>Notas</span><strong>{service.notes}</strong></div><div><span>Incidencias</span><strong>0</strong></div></div></article><article className={styles.nextServiceAction}><span>PRÓXIMA ACCIÓN</span><strong>Revisión comercial</strong><p>Contactar 45 días antes de la renovación.</p><button onClick={() => setTab("seguimiento")}>Abrir seguimiento</button></article></aside></div>}
  {tab === "contrato" && <article className={styles.panel}><div className={styles.panelHead}><div><h3>Datos del contrato</h3><p>Información contractual específica de {service.name}</p></div>{privileged && <button onClick={() => notify("Contrato listo para editar")}>Editar</button>}</div><div className={styles.dataGrid}><div><span>Número de contrato</span><strong>ONE-{service.id.toUpperCase()}-001</strong></div><div><span>Fecha de alta</span><strong>21/03/2026</strong></div><div><span>Proveedor</span><strong>{service.company}</strong></div><div><span>Estado</span><strong>{service.status}</strong></div><div><span>Fecha de renovación</span><strong>{service.renewal ?? "Pendiente"}</strong></div><div><span>Permanencia</span><strong>12 meses</strong></div><div className={styles.wide}><span>Observaciones</span><strong>{service.detail}</strong></div></div></article>}
  {tab === "documentos" && <article className={styles.panel}><div className={styles.panelHead}><div><h3>Documentos de {service.name}</h3><p>Solo archivos vinculados a este contrato</p></div><button onClick={() => notify("Selector de archivos preparado")}>+ Subir documento</button></div>{service.documents > 0 ? <><div className={styles.documentRow}><strong>Contrato firmado.pdf</strong><span>Contrato · 21/03/2026</span><button>Ver</button></div><div className={styles.documentRow}><strong>Factura junio 2026.pdf</strong><span>Factura · 10/07/2026</span><button>Ver</button></div><div className={styles.documentRow}><strong>Autorización de gestión.pdf</strong><span>Autorización · 21/03/2026</span><button>Ver</button></div></> : <EmptyState title="Todavía no hay documentos" text="Sube el contrato, facturas y demás documentación de este servicio." />}</article>}
  {tab === "seguimiento" && <article className={styles.panel}><div className={styles.panelHead}><div><h3>Seguimiento</h3><p>Llamadas, tareas y próximas acciones</p></div><button onClick={() => notify("Seguimiento creado")}>+ Nuevo seguimiento</button></div><div className={styles.agendaItem}><time>19 AGO · 10:00</time><div><strong>Revisión previa a renovación</strong><p>Preparar comparativa y contactar con la responsable.</p></div><button>Completar</button></div></article>}
  {tab === "renovaciones" && <article className={styles.panel}><div className={styles.panelHead}><div><h3>Renovaciones</h3><p>Control de vencimientos del contrato</p></div></div><div className={styles.renewalCard}><div><span>PRÓXIMA RENOVACIÓN</span><strong>{service.renewal ?? "Sin fecha definida"}</strong><p>Aviso automático previsto 45 días antes.</p></div><button onClick={() => notify("Aviso de renovación activado")}>Activar aviso</button></div></article>}
  {tab === "comisiones" && <article className={styles.panel}><div className={styles.panelHead}><div><h3>Comisiones</h3><p>Visible para Administración y Backoffice</p></div></div>{privileged ? <div className={styles.dataGrid}><div><span>Comisión prevista</span><strong>320,00 €</strong></div><div><span>Estado</span><strong>Pendiente de cobro</strong></div><div><span>Comercial</span><strong>{service.owner ?? "Sin asignar"}</strong></div><div><span>Liquidación</span><strong>Septiembre 2026</strong></div></div> : <EmptyState title="Acceso restringido" text="Tu perfil no tiene permisos para consultar comisiones." />}</article>}
  {tab === "incidencias" && <article className={styles.panel}><div className={styles.panelHead}><div><h3>Incidencias</h3><p>Problemas vinculados exclusivamente a este servicio</p></div><button onClick={() => notify("Nueva incidencia preparada")}>+ Nueva incidencia</button></div><EmptyState title="Sin incidencias abiertas" text="El servicio funciona con normalidad." /></article>}
  {tab === "historico" && <article className={styles.panel}><div className={styles.historyRow}><time>21/03/2026</time><strong>Expediente creado</strong><span>{service.name}</span></div><div className={styles.historyRow}><time>21/03/2026</time><strong>Contrato activado</strong><span>{service.company}</span></div><div className={styles.historyRow}><time>10/07/2026</time><strong>Documento añadido</strong><span>Factura junio 2026</span></div></article>}
  </div>;
}

function EmptyState({ title, text }: { title: string; text: string }) { return <div className={styles.emptyState}><strong>{title}</strong><p>{text}</p></div>; }
