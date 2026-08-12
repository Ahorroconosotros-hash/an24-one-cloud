"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import { getClient, loadClients } from "@/lib/clientes";
import { createOpportunity, loadOpportunities, OpportunityDraft, OpportunityStage } from "@/lib/oportunidades";
import { findEnergyContractByCups } from "@/lib/energy-contracts";
import { createEnergyLifecycleAlerts } from "@/lib/energy-reminders";
import SpainAddressFields from "@/components/SpainAddressFields";
import styles from "./EnergyOpportunity.module.css";

type ProviderOption = { id: string; service: string; name: string; active: boolean };

const fallbackProviders: ProviderOption[] = [
  { id: "gana", service: "Energía", name: "GANA Energía", active: true },
  { id: "totalenergies", service: "Energía", name: "TotalEnergies", active: true },
  { id: "naturgy", service: "Energía", name: "Naturgy", active: true },
  { id: "iberdrola", service: "Energía", name: "Iberdrola", active: true },
  { id: "endesa", service: "Energía", name: "Endesa", active: true },
];

const productsBySupply: Record<"Luz" | "Gas", string[]> = {
  Luz: ["Tarifa 24 horas", "Tarifa indexada", "Tarifa estable"],
  Gas: ["Tarifa gas", "Tarifa gas estable", "Tarifa gas indexada"],
};

const tariffTypes = ["2.0TD", "3.0TD", "6.1TD", "6.2TD", "6.3TD", "6.4TD", "RL.1", "RL.2", "RL.3", "RL.4"];
const documentTypes = ["DNI / NIE", "CIF", "Factura", "Titularidad bancaria", "Escrituras", "Poderes", "Autorización", "Otro"];
const businessStatuses: Array<{ id: OpportunityStage; label: string; color: string; hint: string }> = [
  { id: "Borrador", label: "Borrador", color: "#6b7280", hint: "Todavía se está preparando" },
  { id: "Pendiente", label: "Pendiente", color: "#d9a400", hint: "Falta respuesta, documentación o gestión" },
  { id: "En curso", label: "En curso", color: "#2563eb", hint: "El comercial está trabajando la oportunidad" },
  { id: "Tramitado", label: "Tramitado", color: "#7c3aed", hint: "BackOffice lo ha enviado a la compañía" },
  { id: "Activado", label: "Activado", color: "#169b62", hint: "La compañía ha confirmado el alta" },
  { id: "Rechazado", label: "Rechazado", color: "#ea7a18", hint: "El cliente o la compañía lo ha rechazado" },
  { id: "Cancelado", label: "Cancelado", color: "#dc2626", hint: "La gestión se ha detenido antes de activarse" },
  { id: "Baja", label: "Baja", color: "#27272a", hint: "El contrato estuvo activo y ha finalizado" },
];


function addMonths(dateValue: string, months: number) {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function addDays(dateValue: string, days: number) {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateValue: string) {
  if (!dateValue) return "—";
  return new Intl.DateTimeFormat("es-ES").format(new Date(`${dateValue}T12:00:00`));
}

function normalizeCups(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").trim();
}

export default function NewEnergyOpportunityPage() {
  const router = useRouter();
  const search = useSearchParams();
  const initialClientId = search.get("cliente") || "";
  const [clientId, setClientId] = useState(initialClientId);
  const [providers, setProviders] = useState<ProviderOption[]>(fallbackProviders);
  const [message, setMessage] = useState("");
  const [documents, setDocuments] = useState<Array<{ type: string; name: string }>>([]);
  const [documentType, setDocumentType] = useState("Factura");
  const [createdAtOne, setCreatedAtOne] = useState("");
  const [activationDate, setActivationDate] = useState("");
  const [cancellationDate, setCancellationDate] = useState("");
  const [churnAlert, setChurnAlert] = useState(false);
  const [churnReason, setChurnReason] = useState("");
  const [draft, setDraft] = useState({
    status: "Borrador" as OpportunityStage,
    supplyType: "Luz" as "Luz" | "Gas",
    cups: "",
    provider: "",
    product: "",
    tariffType: "2.0TD",
    supplyAddress: "",
    contractedPower: "",
    annualConsumption: "",
    previousProvider: "",
    installationAddressMode: "client",
    installationAddress: "",
    installationPostalCode: "",
    installationCity: "",
    installationProvince: "",
    energyPriceP1: "",
    energyPriceP2: "",
    energyPriceP3: "",
    powerPriceP1: "",
    powerPriceP2: "",
    nextAction: "Preparar y enviar propuesta de Energía",
    nextActionDate: "",
    notes: "",
  });

  const clients = useMemo(() => loadClients().filter((item) => !item.deletedAt), []);
  const client = clientId ? getClient(clientId) : null;
  const energyProviders = providers.filter((item) => item.active && item.service === "Energía");
  const reviewDate = addMonths(activationDate, 6);
  const expiryDate = addMonths(activationDate, 12);
  const expiryNoticeDate = addDays(expiryDate, -30);
  const commissionMonth = activationDate ? activationDate.slice(0, 7) : "";

  useEffect(() => {
    setCreatedAtOne((current) => current || new Date().toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("one_provider_catalog");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) setProviders(parsed);
    } catch {
      setProviders(fallbackProviders);
    }
  }, []);

  useEffect(() => {
    if (!client) return;
    setDraft((current) => ({
      ...current,
      supplyAddress: current.supplyAddress || `${client.address}, ${client.postalCode} ${client.city}`,
    }));
  }, [clientId]);

  function cupsAlreadyUsed(value: string) {
    const normalized = normalizeCups(value);
    if (!normalized) return null;
    const contract = findEnergyContractByCups(normalized);
    if (contract) return `Este CUPS ya pertenece al contrato ${contract.oneReference}.`;
    const opportunity = loadOpportunities().find((item) =>
      item.service === "Energía" &&
      normalizeCups(String(item.details?.cups || "")) === normalized &&
      item.stage !== "Perdida"
    );
    if (opportunity) return `Este CUPS ya está en la oportunidad ${opportunity.reference}.`;
    return null;
  }

  function submit(event: FormEvent, asProposal: boolean) {
    event.preventDefault();
    setMessage("");
    if (!client) return setMessage("Selecciona un cliente.");
    if (!draft.cups.trim()) return setMessage("El CUPS es obligatorio.");
    if (!draft.provider) return setMessage("Selecciona un proveedor.");
    if (!draft.product) return setMessage("Selecciona un producto.");
    if (draft.status === "Activado" && !activationDate) {
      return setMessage("Para marcar como Activado indica la fecha de activación en compañía.");
    }
    if (draft.status === "Baja" && !cancellationDate) {
      return setMessage("Para marcar como Baja indica la fecha de baja.");
    }
    const duplicate = cupsAlreadyUsed(draft.cups);
    if (duplicate) return setMessage(duplicate);

    const opportunity: OpportunityDraft = {
      clientId: client.id,
      clientName: client.name,
      service: "Energía",
      provider: draft.provider,
      product: draft.product,
      title: `${draft.supplyType} · ${draft.product}`,
      value: 0,
      stage: asProposal && draft.status === "Borrador" ? "Pendiente" : draft.status,
      commercial: client.commercial || "Usuario actual",
      nextAction: asProposal ? "Realizar seguimiento de la propuesta" : draft.nextAction,
      nextActionDate: draft.nextActionDate,
      notes: draft.notes,
      details: {
        supplyType: draft.supplyType,
        cups: normalizeCups(draft.cups),
        tariffType: draft.tariffType,
        supplyAddress: draft.supplyAddress,
        contractedPower: draft.contractedPower,
        annualConsumption: draft.annualConsumption,
        previousProvider: draft.previousProvider,
        installationAddressMode: draft.installationAddressMode,
        installationAddress: draft.installationAddressMode === "client" ? (client.address || draft.supplyAddress) : draft.installationAddress,
        installationPostalCode: draft.installationPostalCode,
        installationCity: draft.installationCity,
        installationProvince: draft.installationProvince,
        energyPriceP1: draft.energyPriceP1,
        energyPriceP2: draft.energyPriceP2,
        energyPriceP3: draft.energyPriceP3,
        powerPriceP1: draft.powerPriceP1,
        powerPriceP2: draft.powerPriceP2,
        documents: documents.map((item) => `${item.type}: ${item.name}`),
        contractCreated: "false",
        businessLabel: "Nuevo negocio",
        statusHistory: [`${new Date().toISOString()} · Creada como ${asProposal && draft.status === "Borrador" ? "Pendiente" : draft.status}`],
        createdAtOne,
        activationDate,
        cancellationDate,
        permanenceMonths: "12",
        reviewDate,
        expiryDate,
        expiryNoticeDate,
        commissionMonth,
        churnAlert: churnAlert ? "true" : "false",
        churnReason,
      },
    };

    createOpportunity(opportunity);

    createEnergyLifecycleAlerts({
      clientId: client.id,
      clientName: client.name,
      commercial: client.commercial || "Usuario actual",
      cups: normalizeCups(draft.cups),
      activationDate,
      cancellationDate,
      reviewDate,
      expiryDate,
      expiryNoticeDate,
      churnAlert,
      churnReason,
    });
    router.push(`/clientes/${client.id}`);
  }

  function addDocument(file: File | null) {
    if (!file) return;
    setDocuments((current) => [...current, { type: documentType, name: file.name }]);
  }

  return (
    <main className={styles.page}>
      <div className={styles.crumb}>
        <Link href={client ? `/clientes/${client.id}` : "/clientes"}>Cliente 360º</Link>
        <span>/</span><Link href={`/oportunidades/nuevo?cliente=${clientId}`}>Nueva oportunidad</Link>
        <span>/</span><strong>Energía</strong>
      </div>

      <header className={styles.hero}>
        <div><span>NUEVO NEGOCIO · ENERGÍA</span><h1>Crear oportunidad</h1><p>El comercial crea y sigue la oportunidad. El contrato nacerá únicamente después de la activación confirmada.</p></div>
        <div className={styles.flow}><b>1 Cliente</b><b>2 Energía</b><b>3 Propuesta</b><b>4 Aceptación</b><b>5 Contrato</b></div>
      </header>

      <form className={styles.form} onSubmit={(event) => submit(event, false)}>
        <section className={styles.operationStateSection}>
          <div className={styles.operationStateRow}>
            <div>
              <strong>Estado de la operación</strong>
              <small>{businessStatuses.find((item) => item.id === draft.status)?.hint}</small>
            </div>
            <div className={styles.statusControl} style={{ "--status-color": businessStatuses.find((item) => item.id === draft.status)?.color } as CSSProperties}>
              <span />
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as OpportunityStage })}>
                {businessStatuses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section>
          <div className={styles.sectionHead}><h2>Cliente y suministro</h2><small>Un CUPS solo puede estar una vez en ONE.</small></div>
          <div className={styles.compactSupply}>
            <label>Cliente *
              <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
                <option value="">Seleccionar cliente</option>
                {clients.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.taxId}</option>)}
              </select>
            </label>

            <label>Tipo *
              <select value={draft.supplyType} onChange={(event) => setDraft({ ...draft, supplyType: event.target.value as "Luz" | "Gas", product: "", tariffType: event.target.value === "Gas" ? "RL.1" : "2.0TD" })}>
                <option>Luz</option><option>Gas</option>
              </select>
            </label>

            <label>CUPS *
              <input value={draft.cups} onChange={(event) => setDraft({ ...draft, cups: event.target.value.toUpperCase() })} placeholder="ES00..." />
            </label>

            <div className={styles.installBlock}>
              <span>Dirección de suministro</span>
              <div className={styles.addressChoice}>
                <label>
                  <input
                    type="radio"
                    name="installationAddressMode"
                    checked={draft.installationAddressMode === "client"}
                    onChange={() =>
                      setDraft({
                        ...draft,
                        installationAddressMode: "client",
                        installationAddress: "",
                        installationPostalCode: "",
                        installationCity: "",
                        installationProvince: "",
                      })
                    }
                  />
                  Mismo domicilio
                </label>

                <label>
                  <input
                    type="radio"
                    name="installationAddressMode"
                    checked={draft.installationAddressMode === "other"}
                    onChange={() =>
                      setDraft({
                        ...draft,
                        installationAddressMode: "other",
                      })
                    }
                  />
                  Otra dirección
                </label>
              </div>
            </div>

            {draft.installationAddressMode === "client" && (
              <div className={styles.clientAddressPreview}>
                <span>Dirección</span>
                <strong>
                  {client?.address || "ONE usará la dirección de la ficha del cliente"}
                </strong>
              </div>
            )}
          </div>

          {draft.installationAddressMode === "other" && (
            <div className={styles.alternateAddress}>
              <SpainAddressFields
                compact
                address={draft.installationAddress}
                postalCode={draft.installationPostalCode}
                province={draft.installationProvince}
                city={draft.installationCity}
                onChange={(value) => setDraft({
                  ...draft,
                  installationAddress: value.address,
                  installationPostalCode: value.postalCode,
                  installationProvince: value.province,
                  installationCity: value.city,
                })}
              />
            </div>
          )}
        </section>

        <section>
          <div className={styles.sectionHead}><h2>Oferta de Energía</h2><small>Solo los datos necesarios para preparar la propuesta.</small></div>
          <div className={styles.compactOffer}>
            <label>Comercializadora anterior
              <select value={draft.previousProvider} onChange={(event)=>setDraft({...draft,previousProvider:event.target.value})}>
                <option value="">Seleccionar</option>
                {providers.filter((item)=>item.service==="Energía").map((item)=><option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
            </label>
            <label>Proveedor *
              <select value={draft.provider} onChange={(event) => setDraft({ ...draft, provider: event.target.value, product:"" })}>
                <option value="">Seleccionar proveedor</option>
                {energyProviders.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
            </label>
            <label>Producto *
              <select value={draft.product} onChange={(event) => setDraft({ ...draft, product: event.target.value })}>
                <option value="">Seleccionar producto</option>
                {productsBySupply[draft.supplyType].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>Tipo tarifa *
              <select value={draft.tariffType} onChange={(event) => setDraft({ ...draft, tariffType: event.target.value })}>
                {tariffTypes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>Potencia
              <input value={draft.contractedPower} onChange={(event) => setDraft({ ...draft, contractedPower: event.target.value })} placeholder="Ej. 4,6 kW" />
            </label>
            <label>Consumo anual
              <input value={draft.annualConsumption} onChange={(event) => setDraft({ ...draft, annualConsumption: event.target.value })} placeholder="kWh/año" />
            </label>
          </div>
        </section>

        <section>
          <div className={styles.sectionHead}><h2>Fechas</h2><small>Las automatizaciones trabajan en segundo plano.</small></div>
          <div className={styles.compactDates}>
            <label>Fecha de alta
              <input type="date" value={createdAtOne} onChange={(event)=>setCreatedAtOne(event.target.value)} />
            </label>
            <label>Activación en compañía
              <input type="date" value={activationDate} onChange={(event) => setActivationDate(event.target.value)} />
            </label>
            <label>Fecha de baja
              <input type="date" value={cancellationDate} onChange={(event) => {
                const value = event.target.value;
                setCancellationDate(value);
                if (value) setChurnAlert(true);
              }} />
            </label>
          </div>

          <div className={churnAlert ? styles.churnActive : styles.churnBox}>
            <label className={styles.churnToggle}>
              <input type="checkbox" checked={churnAlert} onChange={(event) => setChurnAlert(event.target.checked)} />
              <span>
                <strong>⚠ Avisar posible baja o fuga</strong>
                <small>BackOffice/Administración avisa al comercial responsable.</small>
              </span>
            </label>
            {churnAlert && (
              <input value={churnReason} onChange={(event) => setChurnReason(event.target.value)} placeholder="Nota para el comercial..." />
            )}
          </div>
        </section><section>
          <div className={styles.documentRow}>
            <strong>📎 Documentos</strong>
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>{documentTypes.map((item) => <option key={item}>{item}</option>)}</select>
            <label className={styles.upload}>+ Subir archivo<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => { addDocument(event.target.files?.[0] || null); event.currentTarget.value = ""; }} /></label>
            <div className={styles.tags}>{documents.map((item, index) => <button type="button" key={`${item.name}-${index}`} onClick={() => setDocuments((current) => current.filter((_, i) => i !== index))}>{item.type}: {item.name} ×</button>)}</div>
          </div>
          <label className={styles.notes}>Notas<textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Necesidad, contexto u observaciones..." /></label>
        </section>

        {message && <p className={styles.message}>{message}</p>}
        <div className={styles.actions}>
          <Link href={client ? `/clientes/${client.id}` : "/clientes"}>Cancelar</Link>
          <button type="submit">Guardar oportunidad</button>
          <button type="button" className={styles.primary} onClick={(event) => submit(event as unknown as FormEvent, true)}>Crear propuesta</button>
        </div>
      </form>
    </main>
  );
}
