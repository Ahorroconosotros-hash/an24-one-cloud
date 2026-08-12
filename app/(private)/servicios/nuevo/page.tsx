import Link from "next/link";
import styles from "./NuevoServicio.module.css";

const areas = [
  { key: "energia", name: "Energía", icon: "⚡", text: "Luz, gas, tarifas, renovaciones y suministros.", tone: "energy", href: "/servicios/nuevo/energia" },
  { key: "telefonia", name: "Telefonía", icon: "⌕", text: "Fibra, móvil, centralitas y conectividad.", tone: "phone", href: "/servicios/telefonia?accion=nuevo" },
  { key: "alarmas", name: "Alarmas", icon: "◇", text: "Seguridad, instalaciones y mantenimiento.", tone: "alarm", href: "/servicios/alarmas?accion=nuevo" },
  { key: "seguros", name: "Seguros", icon: "✦", text: "Pólizas, renovaciones y documentación.", tone: "insurance", href: "/servicios/seguros?accion=nuevo" },
  { key: "inmobiliaria", name: "Inmobiliaria", icon: "⌂", text: "Captación, inmuebles y operaciones.", tone: "realestate", href: "/servicios/inmobiliaria?accion=nuevo" },
  { key: "asesoramiento", name: "Asesoramiento", icon: "≡", text: "Trámites, certificados y servicios profesionales.", tone: "advice", href: "/servicios/asesoramiento?accion=nuevo" },
];

export default function NuevoServicioPage() {
  return (
    <div className={styles.page}>
      <Link href="/servicios" className={styles.back}>← Centro de Negocio</Link>

      <header className={styles.hero}>
        <span>NUEVO SERVICIO</span>
        <h1>¿Qué servicio quieres dar de alta?</h1>
        <p>Selecciona el área. ONE abrirá la ficha específica del servicio para continuar con el alta.</p>
      </header>

      <section className={styles.grid} aria-label="Selecciona un área de negocio">
        {areas.map((area) => (
          <Link
            key={area.key}
            href={area.href}
            className={`${styles.card} ${styles[area.tone]}`}
          >
            <div className={styles.cardTop}>
              <i>{area.icon}</i>
              <span>Seleccionar →</span>
            </div>
            <div>
              <h2>{area.name}</h2>
              <p>{area.text}</p>
            </div>
          </Link>
        ))}
      </section>

      <aside className={styles.note}>
        <strong>ONE</strong>
        <span>Un cliente, todos sus servicios conectados.</span>
      </aside>
    </div>
  );
}
