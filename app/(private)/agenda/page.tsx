"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHead, Badge } from "@/components/UI";
import {
  completeEnergyLifecycleAlert,
  EnergyLifecycleAlert,
  loadEnergyLifecycleAlerts,
} from "@/lib/energy-reminders";

const days = ["Lunes 20", "Martes 21", "Miércoles 22", "Jueves 23", "Viernes 24"];

export default function Agenda() {
  const [alerts, setAlerts] = useState<EnergyLifecycleAlert[]>([]);

  useEffect(() => {
    setAlerts(loadEnergyLifecycleAlerts().filter((item) => !item.completed));
  }, []);

  const orderedAlerts = useMemo(
    () => [...alerts].sort((a, b) => a.date.localeCompare(b.date)),
    [alerts]
  );

  function completeAlert(id: string) {
    completeEnergyLifecycleAlert(id);
    setAlerts((current) => current.filter((item) => item.id !== id));
  }

  return (
    <>
      <PageHead
        title="Agenda y tareas"
        subtitle="Organiza llamadas, visitas, renovaciones y seguimientos."
        action="Nueva tarea"
      />

      {orderedAlerts.length > 0 && (
        <section
          style={{
            marginBottom: 18,
            padding: 16,
            border: "1px solid #eadfd7",
            borderRadius: 14,
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <div>
              <span style={{ color: "#ef4f2f", fontSize: 11, fontWeight: 900 }}>ONE · ENERGÍA</span>
              <h2 style={{ margin: "3px 0 0", fontSize: 20 }}>Avisos comerciales automáticos</h2>
            </div>
            <Badge tone="orange">{orderedAlerts.length} pendientes</Badge>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {orderedAlerts.map((alert) => (
              <article
                key={alert.id}
                style={{
                  padding: 12,
                  display: "grid",
                  gridTemplateColumns: "110px 1fr auto auto",
                  gap: 12,
                  alignItems: "center",
                  border: "1px solid #eee6e0",
                  borderRadius: 10,
                  background: alert.priority === "Alta" ? "#fff5f1" : "#fff",
                }}
              >
                <time style={{ fontWeight: 900 }}>{alert.date}</time>
                <div style={{ display: "grid", gap: 3 }}>
                  <strong>{alert.title}</strong>
                  <span style={{ color: "#777", fontSize: 13 }}>{alert.description}</span>
                  <small style={{ color: "#999" }}>
                    CUPS {alert.cups} · Comercial: {alert.commercial}
                  </small>
                </div>
                <Link href={`/clientes/${alert.clientId}`} style={{ color: "#ef4f2f", fontWeight: 800 }}>
                  Abrir cliente
                </Link>
                <button
                  type="button"
                  onClick={() => completeAlert(alert.id)}
                  style={{
                    minHeight: 34,
                    padding: "0 10px",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Hecho
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="toolbar">
        <button>‹ Semana anterior</button>
        <b>20 – 24 julio 2026</b>
        <button>Semana siguiente ›</button>
      </div>

      <div className="calendar">
        {days.map((day, index) => (
          <section key={day}>
            <header>
              <b>{day}</b>
              <span>{index === 0 ? "4 tareas" : "2 tareas"}</span>
            </header>

            {(index === 0
              ? [
                  ["09:30", "Renovación energía", "Clínica Dental Sur", "orange"],
                  ["11:00", "Demo TPV", "Restaurante Albores", "blue"],
                  ["13:15", "Seguimiento alarma", "Estanco La Rotonda", "green"],
                  ["17:00", "Reunión equipo", "Oficina AN24", "purple"],
                ]
              : [
                  ["10:00", "Llamada comercial", "Cliente potencial", "blue"],
                  ["16:30", "Seguimiento propuesta", "Hotel Jerez Centro", "orange"],
                ]
            ).map((item) => (
              <article key={item[0]}>
                <time>{item[0]}</time>
                <b>{item[1]}</b>
                <span>{item[2]}</span>
                <Badge tone={item[3]}>{index === 0 ? "Pendiente" : "Programada"}</Badge>
              </article>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
