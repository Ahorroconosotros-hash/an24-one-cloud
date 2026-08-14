"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ClientRecord, loadClients } from "@/lib/clientes";
import { OpportunityDraft, createOpportunity } from "@/lib/oportunidades";
import styles from "./NuevoNegocio.module.css";

const services = ["Energía", "Telefonía", "Alarmas", "Seguros", "Asesoramiento", "Inmobiliaria", "IA"];
const catalog: Record<string, string[]> = {
  Energía: ["Tarifa 24 horas", "Tarifa indexada", "Luz + Gas"],
  Telefonía: ["Fibra", "Línea móvil", "Fibra + líneas móviles", "Centralita", "Telefonía empresa"],
  Alarmas: ["Alarma hogar", "Alarma negocio", "Alarma Grado 2", "Videovigilancia", "Control de accesos"],
  Seguros: ["Salud", "Vida", "Hogar", "Comercio", "Responsabilidad civil", "Decesos"],
  Asesoramiento: ["Consultoría", "Iguala", "Servicio puntual"],
  Inmobiliaria: ["Venta", "Alquiler", "Captación", "Valoración"],
  IA: ["Chatbot web", "Automatización", "Asistente interno", "Integración IA", "Proyecto a medida"],
};

type ServiceDetails = Record<string, string | string[]>;

const phoneProducts = ["Fibra", "Línea móvil", "Línea fija", "Centralita", "Televisión", "Terminal", "Servicios adicionales"];
const paymentFrequencies = ["Anual", "Semestral", "Trimestral", "Mensual"];
const energyTariffTypes = ["2.0TD", "3.0TD", "6.1TD", "6.2TD", "6.3TD", "6.4TD"];
const documentTypes = ["DNI / NIE", "CIF", "Factura", "Titularidad bancaria", "Escrituras", "Poderes", "Autorización", "Otro"];

type ProviderOption = {
  id: string;
  service: string;
  name: string;
  active: boolean;
};

const fallbackProviders: ProviderOption[] = [
  { id: "gana", service: "Energía", name: "GANA Energía", active: true },
  { id: "totalenergies", service: "Energía", name: "TotalEnergies", active: true },
  { id: "naturgy", service: "Energía", name: "Naturgy", active: true },
  { id: "vodafone", service: "Telefonía", name: "Vodafone", active: true },
  { id: "orange", service: "Telefonía", name: "Orange", active: true },
  { id: "digi", service: "Telefonía", name: "DIGI", active: true },
  { id: "securitas", service: "Alarmas", name: "Securitas Direct", active: true },
  { id: "segurma", service: "Alarmas", name: "Segurma", active: true },
  { id: "dkv", service: "Seguros", name: "DKV", active: true },
  { id: "adeslas", service: "Seguros", name: "Adeslas", active: true },
  { id: "sanitas", service: "Seguros", name: "Sanitas", active: true },
];

function NuevoNegocioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState(searchParams.get("cliente") ?? "");
  const presetService = searchParams.get("servicio") ?? "";
  const [service, setService] = useState(presetService);
  const [product, setProduct] = useState("");
  const [provider, setProvider] = useState("");
  const [value, setValue] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<ServiceDetails>({});
  const [providers, setProviders] = useState<ProviderOption[]>(fallbackProviders);
  const [documentType, setDocumentType] = useState("Factura");
  const [documents, setDocuments] = useState<Array<{ type: string; name: string }>>([]);

  useEffect(() => {
    setClients(loadClients().filter((client) => !client.deletedAt));
  }, []);

  useEffect(() => {
    if (presetService && services.includes(presetService)) {
      setService(presetService);
      if (!nextAction) setNextAction(`Preparar propuesta de ${presetService}`);
    }
  }, [presetService]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("one_provider_catalog");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        setProviders(parsed);
      }
    } catch {
      setProviders(fallbackProviders);
    }
  }, []);

  const selectedClient = clients.find((client) => client.id === clientId) ?? null;
  const availableProviders = useMemo(
    () => providers.filter((item) => item.active && item.service === service),
    [providers, service]
  );
  const visibleClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients.slice(0, 6);
    return clients.filter((client) => [client.name, client.taxId, client.phone, client.mobile, client.email].join(" ").toLowerCase().includes(q)).slice(0, 8);
  }, [clients, query]);
  const missingServices = selectedClient ? services.filter((item) => !selectedClient.services.includes(item)) : [];

  function selectService(item: string) {
    if (!selectedClient) return;
    if (item === "Energía") {
      router.push(`/oportunidades/nuevo/energia?cliente=${selectedClient.id}`);
      return;
    }
    if (item === "Telefonía") {
      router.push(`/oportunidades/nuevo/telefonia?cliente=${selectedClient.id}`);
      return;
    }
    if (item === "Seguros") {
      router.push(`/oportunidades/nuevo/seguros?cliente=${selectedClient.id}`);
      return;
    }
    if (item === "Alarmas") {
      router.push(`/oportunidades/nuevo/alarmas?cliente=${selectedClient.id}`);
      return;
    }
    if (item === "Inmobiliaria") {
      router.push(`/oportunidades/nuevo/inmobiliaria?cliente=${selectedClient.id}`);
      return;
    }
    if (item === "Asesoramiento") {
      router.push(`/oportunidades/nuevo/asesoramiento?cliente=${selectedClient.id}`);
      return;
    }
    if (item === "IA") {
      router.push(`/oportunidades/nuevo/ia?cliente=${selectedClient.id}`);
      return;
    }
    setService(item);
    setProduct("");
    setProvider("");
    setValue("");
    setDetails({});
    if (!nextAction) setNextAction(`Preparar propuesta de ${item}`);
  }

  function setDetail(key: string, value: string | string[]) {
    setDetails((current) => ({ ...current, [key]: value }));
  }

  function togglePhoneProduct(item: string) {
    const current = Array.isArray(details.phoneProducts) ? details.phoneProducts : [];
    const next = current.includes(item)
      ? current.filter((value) => value !== item)
      : [...current, item];
    setDetail("phoneProducts", next);
    setProduct(next.join(" + "));
  }

  function addDocument(file: File | null) {
    if (!file) return;
    const next = [...documents, { type: documentType, name: file.name }];
    setDocuments(next);
    setDetail("documents", next.map((item) => `${item.type}: ${item.name}`));
  }

  function removeDocument(index: number) {
    const next = documents.filter((_, itemIndex) => itemIndex !== index);
    setDocuments(next);
    setDetail("documents", next.map((item) => `${item.type}: ${item.name}`));
  }

  function submit(asProposal: boolean) {
    if (!selectedClient || !service || !product) {
      setMessage("Selecciona cliente, línea de negocio y producto.");
      return;
    }
    if (service === "Seguros" && (!value || !details.paymentFrequency)) {
      setMessage("En Seguros indica el precio y la forma de pago.");
      return;
    }
    if (service === "Energía" && !String(details.cups ?? "").trim()) {
      setMessage("El CUPS es obligatorio en Energía.");
      return;
    }
    if (service === "Energía" && !String(details.tariffType ?? "").trim()) {
      setMessage("Selecciona el tipo de tarifa.");
      return;
    }
    if (service === "Energía" && !details.bankOwnershipDocument) {
      setMessage("En Energía indica si se aporta el documento de titularidad bancaria.");
      return;
    }
    if (service === "Alarmas" && !details.alarmProductType) {
      setMessage("En Alarmas selecciona el tipo de producto o instalación.");
      return;
    }
    const draft: OpportunityDraft = {
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      service,
      provider,
      product,
      title: `${product} · ${service}`,
      value: Number(value || 0),
      probability: 0,
      stage: asProposal ? "Propuesta" : "Borrador",
      commercial: selectedClient.commercial || "Jesús Martínez",
      nextAction: asProposal ? "Realizar seguimiento de la propuesta" : nextAction,
      nextActionDate,
      notes,
      details,
    };
    createOpportunity(draft);
    router.push("/oportunidades");
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <Link href="/oportunidades">← Oportunidades</Link>
          <span>ONE · NUEVO NEGOCIO</span>
          <h1>{presetService ? `Nueva oportunidad · ${presetService}` : "Construir oportunidad"}</h1>
          <p>{presetService ? `Trabajando directamente una oportunidad de ${presetService}.` : "Selecciona al cliente y ONE mantendrá visible qué tiene y qué puedes venderle."}</p>
        </div>
        <div className={styles.steps}><b className={clientId ? styles.done : styles.active}>1 Cliente</b><b className={service ? styles.done : clientId ? styles.active : ""}>2 Servicio</b><b className={product ? styles.done : service ? styles.active : ""}>3 Propuesta</b></div>
      </header>

      {message && <div className={styles.alert}>{message}</div>}

      <div className={styles.workspace}>
        <section className={styles.workArea}>
          <article className={styles.block}>
            <div className={styles.blockHead}><span>01</span><div><h2>¿Con quién vamos a hacer negocio?</h2><p>Busca un cliente existente para reutilizar sus datos.</p></div></div>
            {!selectedClient ? (
              <>
                <label className={styles.search}><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, DNI/CIF, teléfono o email..." /></label>
                <div className={styles.clientResults}>
                  {visibleClients.map((client) => <button key={client.id} onClick={() => setClientId(client.id)}><i>{initials(client.name)}</i><span><strong>{client.name}</strong><small>{client.taxId} · {client.mobile || client.phone}</small></span><b>Seleccionar</b></button>)}
                </div>
                <Link className={styles.newClient} href="/clientes/nuevo">+ Crear cliente nuevo</Link>
              </>
            ) : (
              <div className={styles.selectedClient}><i>{initials(selectedClient.name)}</i><div><strong>{selectedClient.name}</strong><span>{selectedClient.reference} · {selectedClient.taxId}</span></div><button onClick={() => setClientId("")}>Cambiar</button></div>
            )}
          </article>

          {!presetService && (
            <article className={`${styles.block} ${!selectedClient ? styles.locked : ""}`}>
              <div className={styles.blockHead}><span>02</span><div><h2>¿Qué quieres venderle?</h2><p>Elige una línea de negocio; después aparecerán solo sus productos.</p></div></div>
              <div className={styles.serviceGrid}>{services.map((item) => <button disabled={!selectedClient} className={service === item ? styles.serviceActive : ""} key={item} onClick={() => selectService(item)}><span>{serviceIcon(item)}</span><strong>{item}</strong><small>{selectedClient?.services.includes(item) ? "Ya tiene interés/servicio" : "Potencial comercial"}</small></button>)}</div>
            </article>
          )}

          <article className={`${styles.block} ${!service ? styles.locked : ""}`}>
            <div className={styles.blockHead}><span>03</span><div><h2>Preparar oportunidad</h2><p>Solo los datos necesarios para empezar. La ficha completa se reutilizará más adelante.</p></div></div>
            <div className={styles.formGrid}>
              <label>Proveedor *<select disabled={!service} value={provider} onChange={(event) => setProvider(event.target.value)}><option value="">{service ? "Seleccionar proveedor" : "Primero selecciona servicio"}</option>{availableProviders.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>

              {service !== "Telefonía" && (
                <label>Producto *<select disabled={!service} value={product} onChange={(event) => setProduct(event.target.value)}><option value="">Seleccionar producto</option>{(catalog[service] ?? []).map((item) => <option key={item}>{item}</option>)}</select></label>
              )}

              {service === "Telefonía" && (
                <div className={`${styles.span2} ${styles.servicePanel}`}>
                  <div className={styles.servicePanelHead}>
                    <div><strong>Productos de telefonía *</strong><span>Puedes incluir varios productos dentro de la misma oportunidad.</span></div>
                  </div>
                  <div className={styles.checkGrid}>
                    {phoneProducts.map((item) => {
                      const checked = Array.isArray(details.phoneProducts) && details.phoneProducts.includes(item);
                      return <label className={checked ? styles.checkActive : ""} key={item}><input type="checkbox" checked={checked} onChange={() => togglePhoneProduct(item)} /><span>{item}</span></label>;
                    })}
                  </div>
                  <div className={styles.miniGrid}>
                    <label>N.º de líneas móviles<input type="number" min="0" value={(details.mobileLines as string) ?? ""} onChange={(event) => setDetail("mobileLines", event.target.value)} /></label>
                    <label>Operador actual<input value={(details.currentOperator as string) ?? ""} onChange={(event) => setDetail("currentOperator", event.target.value)} /></label>
                    <label>Permanencia hasta<input type="date" value={(details.commitmentEnd as string) ?? ""} onChange={(event) => setDetail("commitmentEnd", event.target.value)} /></label>
                    <label>Velocidad de fibra<input value={(details.fiberSpeed as string) ?? ""} onChange={(event) => setDetail("fiberSpeed", event.target.value)} placeholder="Ej. 1 Gb" /></label>
                  </div>
                </div>
              )}
              {service === "Energía" && (
                <div className={`${styles.span2} ${styles.servicePanel}`}>
                  <div className={styles.servicePanelHead}>
                    <div>
                      <strong>Ficha de Energía</strong>
                      <span>Solo los datos necesarios para iniciar la oportunidad.</span>
                    </div>
                  </div>

                  <div className={`${styles.miniGrid} ${styles.energyGrid}`}>
                    <label className={styles.energyCups}>
                      CUPS *
                      <input
                        value={(details.cups as string) ?? ""}
                        onChange={(event) => setDetail("cups", event.target.value.toUpperCase())}
                        placeholder="ES00..."
                      />
                    </label>

                    <label>
                      Tipo de tarifa *
                      <select
                        value={(details.tariffType as string) ?? ""}
                        onChange={(event) => setDetail("tariffType", event.target.value)}
                      >
                        <option value="">Seleccionar</option>
                        {energyTariffTypes.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </label>

                    <label>
                      Comercializadora actual
                      <input
                        value={(details.currentRetailer as string) ?? ""}
                        onChange={(event) => setDetail("currentRetailer", event.target.value)}
                      />
                    </label>

                    <label>
                      Potencia contratada
                      <input
                        value={(details.contractedPower as string) ?? ""}
                        onChange={(event) => setDetail("contractedPower", event.target.value)}
                        placeholder="Ej. 4,6 kW"
                      />
                    </label>

                    <label>
                      Consumo anual
                      <input
                        value={(details.annualConsumption as string) ?? ""}
                        onChange={(event) => setDetail("annualConsumption", event.target.value)}
                        placeholder="kWh/año"
                      />
                    </label>

                    <label>
                      Factura reciente
                      <select
                        value={(details.recentInvoice as string) ?? ""}
                        onChange={(event) => setDetail("recentInvoice", event.target.value)}
                      >
                        <option value="">Seleccionar</option>
                        <option>Aportada</option>
                        <option>Pendiente</option>
                      </select>
                    </label>

                    <label>
                      Titularidad bancaria *
                      <select
                        value={(details.bankOwnershipDocument as string) ?? ""}
                        onChange={(event) => setDetail("bankOwnershipDocument", event.target.value)}
                      >
                        <option value="">Seleccionar</option>
                        <option>Aportada</option>
                        <option>Pendiente</option>
                      </select>
                    </label>

                    <label className={styles.energyAddress}>
                      Dirección del suministro
                      <input
                        value={(details.supplyAddress as string) ?? ""}
                        onChange={(event) => setDetail("supplyAddress", event.target.value)}
                      />
                    </label>
                  </div>

                </div>
              )}

              {service === "Energía" && (
                <div className={`${styles.span2} ${styles.documentStrip}`}>
                  <span className={styles.paperclip}>📎</span>
                  <strong>Documentos</strong>
                  <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
                    {documentTypes.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <label className={styles.uploadButton}>
                    + Subir
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(event) => {
                        addDocument(event.target.files?.[0] ?? null);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <div className={styles.documentTags}>
                    {documents.map((item, index) => (
                      <button
                        type="button"
                        key={`${item.type}-${item.name}-${index}`}
                        onClick={() => removeDocument(index)}
                        title="Quitar documento"
                      >
                        {item.type}: {item.name} ×
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {service === "Alarmas" && (
                <div className={`${styles.span2} ${styles.servicePanel}`}>
                  <div className={styles.servicePanelHead}><div><strong>Ficha de Alarmas</strong><span>Define qué producto o instalación quiere contratar el cliente.</span></div></div>
                  <div className={styles.miniGrid}>
                    <label>Tipo de producto / instalación *<select value={(details.alarmProductType as string) ?? ""} onChange={(event) => setDetail("alarmProductType", event.target.value)}><option value="">Seleccionar</option><option>Alarma hogar</option><option>Alarma negocio</option><option>Alarma Grado 2</option><option>Videovigilancia</option><option>Control de accesos</option><option>Cámaras adicionales</option><option>Mantenimiento</option></select></label>
                    <label>Tipo de inmueble<select value={(details.propertyType as string) ?? ""} onChange={(event) => setDetail("propertyType", event.target.value)}><option value="">Seleccionar</option><option>Vivienda</option><option>Comercio</option><option>Oficina</option><option>Nave</option><option>Estanco</option><option>Otro</option></select></label>
                    <label>Metros aproximados<input value={(details.squareMeters as string) ?? ""} onChange={(event) => setDetail("squareMeters", event.target.value)} /></label>
                    <label>N.º de accesos<input type="number" min="0" value={(details.accessPoints as string) ?? ""} onChange={(event) => setDetail("accessPoints", event.target.value)} /></label>
                    <label>Cámaras<input type="number" min="0" value={(details.cameras as string) ?? ""} onChange={(event) => setDetail("cameras", event.target.value)} /></label>
                    <label>Mascotas<select value={(details.pets as string) ?? ""} onChange={(event) => setDetail("pets", event.target.value)}><option value="">Seleccionar</option><option>Sí</option><option>No</option></select></label>
                  </div>
                </div>
              )}

              {service === "Seguros" && (
                <div className={`${styles.span2} ${styles.servicePanel}`}>
                  <div className={styles.servicePanelHead}><div><strong>Ficha de Seguros</strong><span>El precio y la forma de pago forman parte de la oferta. No se incluye comparativa en esta pantalla.</span></div></div>
                  <div className={styles.miniGrid}>
                    <label>Tipo de seguro<select value={(details.insuranceType as string) ?? product} onChange={(event) => { setDetail("insuranceType", event.target.value); setProduct(event.target.value); }}><option value="">Seleccionar</option>{catalog.Seguros.map((item) => <option key={item}>{item}</option>)}</select></label>
                    <label>Compañía actual<input value={(details.currentInsurer as string) ?? ""} onChange={(event) => setDetail("currentInsurer", event.target.value)} /></label>
                    <label>Vencimiento actual<input type="date" value={(details.currentExpiry as string) ?? ""} onChange={(event) => setDetail("currentExpiry", event.target.value)} /></label>
                    <label>Precio / prima (€) *<input type="number" min="0" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} /></label>
                    <label>Forma de pago *<select value={(details.paymentFrequency as string) ?? ""} onChange={(event) => setDetail("paymentFrequency", event.target.value)}><option value="">Seleccionar</option>{paymentFrequencies.map((item) => <option key={item}>{item}</option>)}</select></label>
                    <label>Coberturas principales<input value={(details.coverages as string) ?? ""} onChange={(event) => setDetail("coverages", event.target.value)} placeholder="Resumen de coberturas" /></label>
                  </div>
                </div>
              )}
              <label>Siguiente acción<input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="Llamar, solicitar factura..." /></label>
              <label>Fecha seguimiento<input type="date" value={nextActionDate} onChange={(event) => setNextActionDate(event.target.value)} /></label>
              <label className={styles.span2}>Notas<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Necesidad, contexto, observaciones..." /></label>
            </div>
          </article>

          <footer className={styles.actions}><button className={styles.secondary} onClick={() => submit(false)}>Guardar oportunidad</button><button className={styles.primary} onClick={() => submit(true)}>Crear propuesta</button></footer>
        </section>

        <aside className={styles.context}>
          <article className={styles.contextCard}>
            <span>CLIENTE 360º</span>
            <h3>{selectedClient?.name ?? "Selecciona un cliente"}</h3>
            {selectedClient ? <><p>{selectedClient.mobile || selectedClient.phone}<br />{selectedClient.email}</p><Link href={`/clientes/${selectedClient.id}`}>Abrir Cliente 360º →</Link></> : <p>ONE mostrará aquí toda la información útil mientras trabajas.</p>}
          </article>
          {selectedClient && <>
            <article className={styles.contextCard}><div className={styles.contextTitle}><h4>¿Qué tiene?</h4><small>{selectedClient.services.length}</small></div><div className={styles.tags}>{selectedClient.services.length ? selectedClient.services.map((item) => <span key={item}>{serviceIcon(item)} {item}</span>) : <em>Sin servicios registrados</em>}</div></article>
            <article className={styles.contextCard}><div className={styles.contextTitle}><h4>¿Qué le puedo vender?</h4><small>{missingServices.length}</small></div><div className={styles.potential}>{missingServices.slice(0,5).map((item,index) => <button key={item} onClick={() => selectService(item)}><span>{serviceIcon(item)}</span><div><strong>{item}</strong><small>{index === 0 ? "Prioridad alta" : "Crear oportunidad"}</small></div><b>＋</b></button>)}</div></article>
            <article className={styles.advisor}><span>ONE ADVISOR</span><h4>Siguiente mejor acción</h4><p>{service ? `Preparar la propuesta de ${service} sin volver a pedir datos que ya existen.` : missingServices[0] ? `Valorar una propuesta de ${missingServices[0]}. El cliente todavía no tiene esta línea.` : "Revisar renovaciones y satisfacción del cliente."}</p></article>
          </>}
        </aside>
      </div>
    </main>
  );
}

function initials(name: string) { return name.split(" ").slice(0,2).map((item) => item[0]).join("").toUpperCase(); }
function serviceIcon(service: string) { const icons: Record<string,string> = { Energía:"⚡", Telefonía:"📱", Alarmas:"🚨", Seguros:"🛡️", Asesoramiento:"🤝", Inmobiliaria:"🏠", IA:"✨" }; return icons[service] ?? "◉"; }


export default function NuevoNegocioPage() {
  return (
    <Suspense fallback={<main style={{padding:"24px"}}>Cargando oportunidad...</main>}>
      <NuevoNegocioContent />
    </Suspense>
  );
}
