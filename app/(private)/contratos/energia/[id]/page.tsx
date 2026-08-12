"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  calculateEndDate,
  calculateNoticeDate,
  daysUntil,
  deriveEnergyContractStatus,
  EnergyContract,
  getEnergyContract,
} from "@/lib/energy-contracts";
import styles from "./EnergyContract.module.css";

export default function EnergyContractPage() {
  const params = useParams<{ id: string }>();
  const [contract, setContract] = useState<EnergyContract | null | undefined>(undefined);

  useEffect(() => {
    setContract(getEnergyContract(params.id));
  }, [params.id]);

  const lifecycle = useMemo(() => {
    if (!contract) return null;
    const endDate = calculateEndDate(contract.activatedAt, contract.permanenceMonths);
    const noticeDate = calculateNoticeDate(
      contract.activatedAt,
      contract.permanenceMonths,
      contract.renewalNoticeDays
    );
    return {
      endDate,
      noticeDate,
      days: daysUntil(endDate),
      status: deriveEnergyContractStatus(contract),
    };
  }, [contract]);

  if (contract === undefined) return <div className={styles.loading}>Cargando contrato...</div>;
  if (!contract || !lifecycle) {
    return <div className={styles.empty}><h1>Contrato no encontrado</h1><Link href="/clientes">Volver a clientes</Link></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.crumb}>
        <Link href="/clientes">Clientes</Link><span>/</span>
        <Link href={`/clientes/${contract.clientId}`}>{contract.clientName}</Link><span>/</span>
        <strong>{contract.oneReference}</strong>
      </div>

      <header className={styles.hero}>
        <div className={styles.icon}>⚡</div>
        <div className={styles.heroMain}>
          <div className={styles.titleLine}>
            <h1>Contrato de {contract.supplyType}</h1>
            <span className={styles.status}>{lifecycle.status}</span>
          </div>
          <p>{contract.oneReference} · {contract.cups}</p>
          <div className={styles.heroFacts}>
            <Fact label="Cliente" value={contract.clientName} />
            <Fact label="Proveedor" value={contract.provider} />
            <Fact label="Producto" value={contract.product} />
            <Fact label="Comercial" value={contract.commercial} />
            <Fact label="BackOffice" value={contract.backoffice || "Pendiente"} />
          </div>
        </div>
        <div className={styles.heroActions}>
          <Link href={`/clientes/${contract.clientId}`}>← Cliente 360º</Link>
          <button type="button">Editar contrato</button>
        </div>
      </header>

      <nav className={styles.tabs}>
        <a href="#resumen">Resumen</a>
        <a href="#ciclo">Ciclo de vida</a>
        <a href="#documentos">Documentos</a>
        <a href="#operaciones">Operaciones</a>
        <a href="#tickets">Tickets</a>
        <a href="#timeline">Timeline</a>
      </nav>

      <main className={styles.grid} id="resumen">
        <section className={styles.card} id="ciclo">
          <CardTitle icon="◷" title="Ciclo de vida" />
          <Rows rows={[
            ["Alta en ONE", formatDate(contract.oneCreatedAt)],
            ["Activación en compañía", formatDate(contract.activatedAt)],
            ["Permanencia", `${contract.permanenceMonths} meses`],
            ["Fin de permanencia", formatDate(lifecycle.endDate)],
            ["Aviso comercial", `${contract.renewalNoticeDays} días antes · ${formatDate(lifecycle.noticeDate)}`],
            ["Fecha de baja", contract.cancelledAt ? formatDate(contract.cancelledAt) : "—"],
          ]} />
          <div className={styles.renewalBox}>
            <strong>{renewalMessage(lifecycle.days)}</strong>
            <span>ONE generará una acción comercial al llegar a la fecha de aviso.</span>
          </div>
        </section>

        <section className={styles.card}>
          <CardTitle icon="⚡" title="Información del suministro" />
          <Rows rows={[
            ["CUPS", contract.cups],
            ["Tipo", contract.supplyType],
            ["Tipo de tarifa", contract.tariffType],
            ["Potencia", contract.contractedPower || "Pendiente"],
            ["Consumo anual", contract.annualConsumption || "Pendiente"],
            ["Dirección", contract.supplyAddress || "Pendiente"],
            ["IBAN", maskIban(contract.iban)],
          ]} />
        </section>

        <section className={styles.card} id="documentos">
          <CardTitle icon="📎" title={`Documentos (${contract.documents.length})`} action="+ Subir" />
          <div className={styles.list}>
            {contract.documents.length ? contract.documents.map((document) => (
              <div className={styles.listRow} key={document.id}>
                <span className={styles.rowIcon}>PDF</span>
                <div><strong>{document.type}</strong><small>{document.name}</small></div>
                <span className={styles.badge}>{document.status}</span>
              </div>
            )) : <Empty text="Todavía no hay documentos." />}
          </div>
        </section>

        <section className={styles.card} id="operaciones">
          <CardTitle icon="↻" title={`Operaciones (${contract.operations.length})`} action="+ Nueva" />
          <div className={styles.list}>
            {contract.operations.map((operation) => (
              <div className={styles.listRow} key={operation.id}>
                <span className={styles.rowIcon}>OP</span>
                <div><strong>{operation.type}</strong><small>{operation.id} · {formatDate(operation.createdAt)}</small></div>
                <span className={styles.badge}>{operation.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.card} id="tickets">
          <CardTitle icon="🎫" title={`Tickets (${contract.tickets.length})`} action="+ Nuevo" />
          <div className={styles.list}>
            {contract.tickets.length ? contract.tickets.map((ticket) => (
              <div className={styles.listRow} key={ticket.id}>
                <span className={styles.rowIcon}>TK</span>
                <div><strong>{ticket.title}</strong><small>{ticket.id} · {ticket.priority}</small></div>
                <span className={styles.badge}>{ticket.status}</span>
              </div>
            )) : <Empty text="No hay tickets abiertos para este contrato." />}
          </div>
        </section>

        <section className={`${styles.card} ${styles.timelineCard}`} id="timeline">
          <CardTitle icon="◴" title="Timeline del contrato" />
          <div className={styles.timeline}>
            {contract.timeline.map((event) => (
              <div key={event.id}>
                <i />
                <time>{formatDateTime(event.createdAt)}</time>
                <strong>{event.title}</strong>
                <p>{event.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value || "Pendiente"}</strong></div>;
}
function CardTitle({ icon, title, action }: { icon: string; title: string; action?: string }) {
  return <div className={styles.cardTitle}><div><span>{icon}</span><h2>{title}</h2></div>{action && <button type="button">{action}</button>}</div>;
}
function Rows({ rows }: { rows: [string, string][] }) {
  return <div className={styles.rows}>{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}
function Empty({ text }: { text: string }) { return <p className={styles.emptyText}>{text}</p>; }
function formatDate(value: string) {
  if (!value) return "Pendiente";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("es-ES");
}
function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}
function maskIban(value: string) {
  if (!value) return "Pendiente";
  return `${value.slice(0, 4)} •••• •••• •••• ${value.slice(-4)}`;
}
function renewalMessage(days: number | null) {
  if (days === null) return "Pendiente de activación";
  if (days < 0) return `Permanencia vencida hace ${Math.abs(days)} días`;
  if (days === 0) return "La permanencia vence hoy";
  return `Faltan ${days} días para finalizar la permanencia`;
}
