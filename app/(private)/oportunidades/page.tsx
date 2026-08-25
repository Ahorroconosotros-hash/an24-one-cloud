"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  OpportunityRecord,
  OpportunityStage,
  deleteOpportunity,
  loadOpportunities,
  updateOpportunityStage,
} from "@/lib/oportunidades";
import styles from "./Oportunidades.module.css";

const columns: { stage: OpportunityStage; label: string; hint: string }[] = [
  { stage: "Borrador", label: "Detectadas", hint: "Negocios por preparar" },
  { stage: "Propuesta", label: "Propuestas", hint: "Esperando respuesta" },
  { stage: "Aceptada", label: "Aceptadas", hint: "Listas para completar datos" },
  { stage: "Perdida", label: "No cerradas", hint: "Para revisar o recuperar" },
];

export default function OportunidadesPage() {
  const [records, setRecords] = useState<OpportunityRecord[]>([]);
  const [query, setQuery] = useState("");

  function reload() {
    setRecords(loadOpportunities());
  }

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((item) =>
      [item.clientName, item.service, item.title, item.reference, item.commercial]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [records, query]);

  const totalValue = records
    .filter((item) => item.stage !== "Perdida")
    .reduce((sum, item) => sum + item.value, 0);
  const weightedValue = records
    .filter((item) => item.stage !== "Perdida")
    .reduce((sum, item) => sum + item.value * (item.probability / 100), 0);
  const accepted = records.filter((item) => item.stage === "Aceptada").length;

  function move(id: string, stage: OpportunityStage) {
    updateOpportunityStage(id, stage);
    reload();
  }

  function remove(id: string) {
    if (!window.confirm("¿Eliminar esta oferta?")) return;
    deleteOpportunity(id);
    reload();
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span>ONE · OFERTAS</span>
          <h1>Ofertas</h1>
          <p>Todas las propuestas comerciales de ONE: en preparación, enviadas, aceptadas o no cerradas.</p>
        </div>
        <Link className={styles.primary} href="/oportunidades/nuevo">
          + Nueva oferta
        </Link>
      </header>

      <section className={styles.kpis}>
        <Kpi label="Pipeline abierto" value={formatMoney(totalValue)} note="Sin ofertas no cerradas" />
        <Kpi label="Valor ponderado" value={formatMoney(weightedValue)} note="Según probabilidad" />
        <Kpi label="Aceptadas" value={accepted} note="Pendientes de completar datos" />
        <Kpi label="Ofertas activas" value={records.filter((item) => item.stage !== "Perdida").length} note="En todo el pipeline" />
      </section>

      <section className={styles.toolbar}>
        <div>
          <h2>Tablero comercial</h2>
          <p>La oferta avanza cambiando de estado, sin duplicar la información del cliente.</p>
        </div>
        <label className={styles.search}>
          <span>⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, servicio o comercial..." />
        </label>
      </section>

      <section className={styles.board}>
        {columns.map((column) => {
          const cards = filtered.filter((item) => item.stage === column.stage);
          const value = cards.reduce((sum, item) => sum + item.value, 0);
          return (
            <article className={styles.column} key={column.stage}>
              <header className={styles.columnHead}>
                <div>
                  <strong>{column.label}</strong>
                  <span>{column.hint}</span>
                </div>
                <div className={styles.columnMeta}>
                  <b>{cards.length}</b>
                  <small>{formatMoney(value)}</small>
                </div>
              </header>

              <div className={styles.cards}>
                {cards.map((item) => (
                  <div className={styles.card} key={item.id}>
                    <div className={styles.cardTop}>
                      <span className={styles.service}>{serviceIcon(item.service)} {item.service}</span>
                      <small>{item.reference}</small>
                    </div>
                    <h3>{item.clientName}</h3>
                    <p>{item.title}</p>
                    <div className={styles.valueRow}>
                      <strong>{formatMoney(item.value)}</strong>
                      <span>{item.probability}%</span>
                    </div>
                    <div className={styles.progress}><i style={{ width: `${item.probability}%` }} /></div>
                    <div className={styles.nextAction}>
                      <span>Siguiente acción</span>
                      <strong>{item.nextAction || "Definir seguimiento"}</strong>
                      <small>{formatDate(item.nextActionDate)}</small>
                    </div>
                    <footer>
                      <span>{item.commercial || "Sin comercial"}</span>
                      <div className={styles.actions}>
                        {item.stage === "Borrador" && <Link className={styles.actionLink} href={`/oportunidades/${item.id}`}>Preparar oferta</Link>}
                        {item.stage === "Propuesta" && <Link className={styles.actionLink} href={`/oportunidades/${item.id}`}>Abrir oferta</Link>}
                        {item.stage === "Aceptada" && <Link className={styles.actionLink} href={`/oportunidades/${item.id}`}>Continuar contratación</Link>}
                        {item.stage === "Perdida" && <button onClick={() => move(item.id, "Borrador")}>Recuperar</button>}
                        {item.stage !== "Perdida" && <button className={styles.secondary} onClick={() => move(item.id, "Perdida")}>No cerrada</button>}
                        <button className={styles.danger} onClick={() => remove(item.id)}>×</button>
                      </div>
                    </footer>
                  </div>
                ))}
                {!cards.length && <div className={styles.empty}>No hay negocios en esta fase.</div>}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function Kpi({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <article className={styles.kpi}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
function formatMoney(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}
function formatDate(value: string) {
  if (!value) return "Sin fecha";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-ES");
}
function serviceIcon(service: string) {
  const icons: Record<string, string> = { Energía: "⚡", Telefonía: "📱", Alarmas: "🚨", Seguros: "🛡️", Asesoramiento: "🤝", Inmobiliaria: "🏠", IA: "✨" };
  return icons[service] ?? "◉";
}
