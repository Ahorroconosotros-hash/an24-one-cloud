"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./Operaciones.module.css";

type Operation = {
  id: string;
  client: string;
  service: string;
  provider: string;
  product: string;
  commercial: string;
  contractDate: string;
  activationDate: string;
  status: "Borrador" | "En tramitación" | "Activo" | "Incidencia" | "Finalizado";
  commissionAN24: number;
  commissionCommercial: number;
};

const sample: Operation[] = [
  {
    id: "OP-0001",
    client: "Jesús Martínez",
    service: "Energía",
    provider: "GANA",
    product: "Tarifa 24H",
    commercial: "Sarai Prieto",
    contractDate: "2026-08-03",
    activationDate: "2026-08-05",
    status: "Activo",
    commissionAN24: 120,
    commissionCommercial: 50,
  },
  {
    id: "OP-0002",
    client: "Farmacia Centro",
    service: "Telefonía",
    provider: "Vodafone",
    product: "Fibra + 3 líneas",
    commercial: "Jesús Martínez",
    contractDate: "2026-08-01",
    activationDate: "",
    status: "En tramitación",
    commissionAN24: 180,
    commissionCommercial: 65,
  },
];

const statuses = ["Todas", "Borrador", "En tramitación", "Activo", "Incidencia", "Finalizado"];

export default function OperacionesPage() {
  const [operations, setOperations] = useState<Operation[]>(sample);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todas");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("one_operations");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setOperations(parsed);
      } else {
        localStorage.setItem("one_operations", JSON.stringify(sample));
      }
    } catch {}
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return operations.filter((op) => {
      const matchesText =
        !q ||
        [
          op.id,
          op.client,
          op.service,
          op.provider,
          op.product,
          op.commercial,
        ].some((value) => value.toLowerCase().includes(q));

      const matchesStatus = status === "Todas" || op.status === status;
      return matchesText && matchesStatus;
    });
  }, [operations, query, status]);

  const active = operations.filter((op) => op.status === "Activo");
  const forecast = active.reduce((sum, op) => sum + op.commissionAN24, 0);
  const commercialForecast = active.reduce(
    (sum, op) => sum + op.commissionCommercial,
    0
  );

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span>ONE · OPERACIONES COMERCIALES</span>
          <h1>Operaciones</h1>
          <p>Todas las contrataciones de AN24 en un único lugar.</p>
        </div>
        <Link href="/operaciones/nueva" className={styles.primaryButton}>
          + Nueva operación
        </Link>
      </header>

      <section className={styles.kpis}>
        <Kpi label="Operaciones" value={operations.length} note="Total registradas" />
        <Kpi label="Activas" value={active.length} note="Ya activadas" />
        <Kpi
          label="Comisión AN24"
          value={`${forecast.toLocaleString("es-ES")} €`}
          note="Previsión activa"
        />
        <Kpi
          label="Comisiones comerciales"
          value={`${commercialForecast.toLocaleString("es-ES")} €`}
          note="Previsión del equipo"
        />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelTop}>
          <div>
            <h2>Listado de operaciones</h2>
            <p>Cliente, producto, comercial, estado y previsión económica.</p>
          </div>

          <div className={styles.tools}>
            <div className={styles.search}>
              <span>⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente, producto, comercial..."
              />
            </div>
          </div>
        </div>

        <div className={styles.tabs}>
          {statuses.map((item) => (
            <button
              key={item}
              className={status === item ? styles.activeTab : ""}
              onClick={() => setStatus(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className={styles.list}>
          {filtered.map((op) => {
            const margin = op.commissionAN24 - op.commissionCommercial;
            return (
              <article className={styles.row} key={op.id}>
                <div className={styles.identity}>
                  <span>{op.id}</span>
                  <strong>{op.client}</strong>
                  <small>
                    {op.service} · {op.provider} · {op.product}
                  </small>
                </div>

                <div className={styles.detail}>
                  <span>Comercial</span>
                  <strong>{op.commercial}</strong>
                  <small>
                    Contratación: {formatDate(op.contractDate)}
                  </small>
                </div>

                <div className={styles.detail}>
                  <span>Activación</span>
                  <strong>{formatDate(op.activationDate) || "Pendiente"}</strong>
                  <small>Estado operativo</small>
                </div>

                <div className={styles.money}>
                  <div>
                    <span>AN24</span>
                    <strong>{op.commissionAN24.toFixed(2)} €</strong>
                  </div>
                  <div>
                    <span>Comercial</span>
                    <strong>{op.commissionCommercial.toFixed(2)} €</strong>
                  </div>
                  <div>
                    <span>Margen</span>
                    <strong>{margin.toFixed(2)} €</strong>
                  </div>
                </div>

                <div className={styles.actions}>
                  <span className={statusClass(op.status, styles)}>{op.status}</span>
                  <button type="button">Abrir</button>
                </div>
              </article>
            );
          })}

          {filtered.length === 0 && (
            <div className={styles.empty}>
              <strong>No hay operaciones con estos filtros</strong>
              <span>Prueba con otro estado o búsqueda.</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Kpi({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <article className={styles.kpi}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function formatDate(value: string) {
  if (!value) return "";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-ES");
}

function statusClass(status: Operation["status"], styles: Record<string, string>) {
  if (status === "Activo") return styles.statusActive;
  if (status === "En tramitación") return styles.statusProcess;
  if (status === "Incidencia") return styles.statusIssue;
  if (status === "Finalizado") return styles.statusDone;
  return styles.statusDraft;
}
