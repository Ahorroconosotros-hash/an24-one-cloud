import Link from "next/link";
import styles from "./Servicios.module.css";

type Department = {
  key: string;
  name: string;
  description: string;
  icon: string;
  contracts: number;
  pending: string;
  accent: string;
};

const departments: Department[] = [
  {
    key: "energia",
    name: "Energía",
    description: "Luz, gas, renovaciones, tarifas y ahorro energético.",
    icon: "⚡",
    contracts: 412,
    pending: "37 renovaciones próximas",
    accent: "energy",
  },
  {
    key: "telefonia",
    name: "Telefonía",
    description: "Fibra, móvil, centralitas y soluciones de conectividad.",
    icon: "⌕",
    contracts: 365,
    pending: "18 revisiones de tarifa",
    accent: "phone",
  },
  {
    key: "alarmas",
    name: "Alarmas",
    description: "Seguridad, instalaciones, mantenimientos y seguimiento.",
    icon: "◇",
    contracts: 198,
    pending: "9 instalaciones pendientes",
    accent: "alarm",
  },
  {
    key: "seguros",
    name: "Seguros",
    description: "Pólizas, renovaciones, oportunidades y documentación.",
    icon: "✦",
    contracts: 126,
    pending: "14 pólizas por revisar",
    accent: "insurance",
  },
  {
    key: "inmobiliaria",
    name: "Inmobiliaria",
    description: "Captación, inmuebles, compradores y operaciones abiertas.",
    icon: "⌂",
    contracts: 48,
    pending: "7 operaciones activas",
    accent: "realestate",
  },
  {
    key: "asesoramiento",
    name: "Asesoramiento",
    description: "Trámites, certificados y servicios profesionales AN24.",
    icon: "≡",
    contracts: 93,
    pending: "11 gestiones en curso",
    accent: "advice",
  },
];

const renewals = [
  ["Clínica Dental Sur", "Energía", "Endesa", "03/09/2026", "Sara R.", "45 días"],
  ["Hotel Jerez Centro", "Telefonía", "Vodafone", "12/09/2026", "David R.", "54 días"],
  ["Farmacia San Miguel", "Alarmas", "Segurma", "18/09/2026", "Jesús M.", "60 días"],
];

export default function ServiciosPage() {
  const totalContracts = departments.reduce((sum, department) => sum + department.contracts, 0);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>AN24 ONE · CENTRO DE NEGOCIO</span>
          <h1>TODO TU NEGOCIO<br />EN UN SOLO CLICK</h1>
          <p>
            Accede a cada área de AN24, controla su actividad y gestiona todo desde un único lugar.
          </p>
        </div>
        <Link href="/servicios/nuevo" className={styles.primaryAction}>＋ Nuevo servicio</Link>
      </header>

      <section className={styles.kpis} aria-label="Resumen del centro de negocio">
        <article><span>Contratos activos</span><strong>{totalContracts.toLocaleString("es-ES")}</strong><small>En todos los departamentos</small></article>
        <article><span>Renovaciones</span><strong>89</strong><small>Próximos 90 días</small></article>
        <article><span>Oportunidades</span><strong>37</strong><small>12 en negociación</small></article>
        <article><span>Objetivo mensual</span><strong>74%</strong><small>+8% respecto al mes anterior</small></article>
      </section>

      <section className={styles.sectionHead}>
        <div>
          <span className={styles.sectionEyebrow}>DEPARTAMENTOS</span>
          <h2>Elige dónde quieres trabajar</h2>
        </div>
        <span className={styles.liveBadge}><i /> 6 áreas conectadas</span>
      </section>

      <section className={styles.departmentGrid}>
        {departments.map((department) => (
          <article className={`${styles.departmentCard} ${styles[department.accent]}`} key={department.key}>
            <div className={styles.cardTop}>
              <span className={styles.departmentIcon}>{department.icon}</span>
              <span className={styles.openPill}>OPERATIVO</span>
            </div>
            <div className={styles.departmentBody}>
              <h3>{department.name}</h3>
              <p>{department.description}</p>
            </div>
            <div className={styles.departmentStats}>
              <div><span>Contratos</span><strong>{department.contracts}</strong></div>
              <div><span>Atención</span><strong>{department.pending}</strong></div>
            </div>
            <Link href={`/servicios/${department.key}`} className={styles.departmentLink}>
              Entrar en {department.name} <span>→</span>
            </Link>
          </article>
        ))}
      </section>

      <section className={styles.bottomGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div><span className={styles.sectionEyebrow}>PRÓXIMAMENTE</span><h3>Renovaciones que no pueden esperar</h3></div>
            <Link href="/agenda">Ver agenda →</Link>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>Cliente</th><th>Departamento</th><th>Proveedor</th><th>Vencimiento</th><th>Responsable</th><th>Estado</th></tr></thead>
              <tbody>
                {renewals.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, index) => <td key={`${row[0]}-${index}`}>{index === 5 ? <span className={styles.deadline}>{cell}</span> : cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className={styles.aiPanel}>
          <span className={styles.aiTag}>ONE IA</span>
          <h3>Oportunidad detectada</h3>
          <p>Hay 28 clientes de Energía que todavía no tienen ningún servicio de Telefonía o Alarmas asociado.</p>
          <strong>Potencial de venta cruzada: alto</strong>
          <Link href="/oportunidades">Crear campaña comercial →</Link>
        </aside>
      </section>
    </div>
  );
}
