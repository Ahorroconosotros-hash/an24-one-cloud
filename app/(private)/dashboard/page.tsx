import Link from "next/link";
import styles from "./Dashboard.module.css";

const agenda = [
  ["09:00", "Seguimiento Restaurante La Plaza", "Llamada"],
  ["11:30", "Reunión con Grupo Sol", "Reunión"],
  ["13:15", "Enviar propuesta de fibra", "Propuesta"],
  ["17:00", "Revisión de oportunidades", "Seguimiento"],
];

const priorities = [
  ["Transportes López", "Oferta pendiente de aceptación", "3.800 €", "87%"],
  ["Clínica Dental Sur", "Renovación próxima esta semana", "1.450 €", "72%"],
  ["Restaurante La Plaza", "Interesado en energía y seguridad", "2.100 €", "64%"],
];

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <section className={styles.intro}>
        <div>
          <span className={styles.eyebrow}>MI DÍA</span>
          <h1>Buenos días</h1>
          <p>Todo lo importante de tu negocio, ordenado para empezar el día con claridad.</p>
        </div>
        <Link href="/oportunidades" className={styles.primaryButton}>
          <span>+</span> Nueva oportunidad
        </Link>
      </section>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroLabel}>RESUMEN DE JULIO</span>
          <h2>Estás cerca de superar<br />tu objetivo mensual.</h2>
          <p>Hay 14 oportunidades activas y 6 renovaciones que necesitan seguimiento.</p>
          <Link href="/oportunidades" className={styles.heroLink}>
            Ver oportunidades prioritarias <span>→</span>
          </Link>
        </div>
        <div className={styles.progressCard}>
          <div className={styles.progressCircle}><span>78%</span></div>
          <div><strong>Objetivo mensual</strong><p>42.680 € de 54.700 €</p></div>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}><div className={styles.statTop}><span className={styles.statIcon}>↗</span><span className={styles.positive}>+12,1%</span></div><p>Ventas del mes</p><strong>42.680 €</strong><small>Frente al mes anterior</small></article>
        <article className={styles.statCard}><div className={styles.statTop}><span className={styles.statIcon}>◎</span><span className={styles.positive}>+8,4%</span></div><p>Clientes activos</p><strong>1.284</strong><small>108 nuevos este mes</small></article>
        <article className={styles.statCard}><div className={styles.statTop}><span className={styles.statIcon}>◇</span><span className={styles.neutral}>14 cierres</span></div><p>Pipeline abierto</p><strong>86.450 €</strong><small>Valor comercial estimado</small></article>
        <article className={styles.statCard}><div className={styles.statTop}><span className={styles.statIcon}>◷</span><span className={styles.warning}>6 hoy</span></div><p>Tareas pendientes</p><strong>23</strong><small>Requieren seguimiento</small></article>
      </section>

      <section className={styles.mainGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>AGENDA</span><h3>Hoy</h3></div><Link href="/agenda">Ver agenda</Link></div>
          <div className={styles.agendaList}>
            {agenda.map(([time, title, type]) => (
              <div className={styles.agendaItem} key={`${time}-${title}`}>
                <div className={styles.time}><strong>{time}</strong><span /></div>
                <div className={styles.agendaText}><strong>{title}</strong><span>{type}</span></div>
                <Link href="/agenda" aria-label={`Abrir ${title}`}>→</Link>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.aiPanel}>
          <div className={styles.aiHeader}><span className={styles.aiIcon}>✦</span><div><span>ONE IA</span><h3>Tu siguiente mejor acción</h3></div></div>
          <p className={styles.aiMessage}>Empieza llamando a <strong>Transportes López</strong>. La propuesta lleva dos días abierta y tiene una probabilidad de cierre del 87%.</p>
          <div className={styles.aiMetric}><span>Valor posible hoy</span><strong>3.800 €</strong></div>
          <Link href="/oportunidades" className={styles.aiButton}>Abrir oportunidad <span>→</span></Link>
          <div className={styles.aiFooter}><span /> Actualizado hace unos segundos</div>
        </article>
      </section>

      <section className={styles.bottomGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>PRIORIDADES</span><h3>Oportunidades para cerrar</h3></div><Link href="/oportunidades">Ver todas</Link></div>
          <div className={styles.priorityList}>
            {priorities.map(([title, description, value, probability]) => (
              <Link href="/oportunidades" className={styles.priorityItem} key={title}>
                <div className={styles.priorityInitial}>{title.charAt(0)}</div>
                <div className={styles.priorityInfo}><strong>{title}</strong><span>{description}</span></div>
                <div className={styles.priorityNumbers}><strong>{value}</strong><span>{probability} cierre</span></div>
              </Link>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>PREVISIÓN</span><h3>Objetivo comercial</h3></div><Link href="/informes">Ver informe</Link></div>
          <div className={styles.forecast}>
            <div className={styles.forecastNumbers}><div><span>Conseguido</span><strong>42.680 €</strong></div><div><span>Objetivo</span><strong>54.700 €</strong></div></div>
            <div className={styles.progressTrack}><div className={styles.progressValue} /></div>
            <div className={styles.forecastFooter}><span>Faltan 12.020 €</span><strong>78%</strong></div>
            <div className={styles.forecastMessage}>Manteniendo el ritmo actual, superarás el objetivo en un <strong>6%</strong>.</div>
          </div>
        </article>
      </section>
    </div>
  );
}
