"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./Clientes.module.css";

type Cliente = {
  id: string;
  codigo?: string | null;
  nombre: string;
  documento?: string | null;
  tipo?: string | null;
  email?: string | null;
  telefono?: string | null;
  responsable_nombre?: string | null;
  comercial_asignado?: string | null;
  estado?: string | null;
  created_at?: string | null;
};

function labelTipo(tipo?: string | null) {
  if (tipo === "autonomo") return "Autónomo";
  if (tipo === "particular") return "Particular";
  return "Empresa";
}

export default function ClientesReal() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/clientes", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudieron cargar los clientes.");
        if (active) setClientes(result);
      })
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setCargando(false));
    return () => { active = false; };
  }, []);

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return clientes;
    return clientes.filter((cliente) =>
      [cliente.nombre, cliente.documento, cliente.email, cliente.telefono, cliente.codigo]
        .some((value) => String(value ?? "").toLowerCase().includes(term)),
    );
  }, [busqueda, clientes]);

  const empresas = clientes.filter((cliente) => cliente.tipo === "empresa").length;

  return <div className={styles.page}>
    <section className={styles.heading}>
      <div><span className={styles.eyebrow}>GESTIÓN COMERCIAL</span><h1>Clientes</h1><p>Clientes reales guardados en Supabase.</p></div>
      <Link href="/clientes/nuevo" className={styles.primaryButton}><span>+</span>Nuevo cliente</Link>
    </section>

    <section className={styles.statsGrid}>
      <article className={styles.statCard}><div className={styles.statHeader}><span className={styles.statIcon}>◎</span><span className={styles.statTrend}>Base real</span></div><p>Total clientes</p><strong>{clientes.length}</strong><small>Registros en Supabase</small></article>
      <article className={styles.statCard}><div className={styles.statHeader}><span className={styles.statIcon}>▢</span><span className={styles.statLabel}>Empresas</span></div><p>Clientes profesionales</p><strong>{empresas}</strong><small>Empresas registradas</small></article>
      <article className={styles.statCard}><div className={styles.statHeader}><span className={styles.statIcon}>◷</span><span className={styles.statWarning}>Activos</span></div><p>En gestión</p><strong>{clientes.filter(c => c.estado !== "inactivo").length}</strong><small>Clientes activos</small></article>
      <article className={styles.statCard}><div className={styles.statHeader}><span className={styles.statIcon}>↗</span><span className={styles.statOpportunity}>ONE</span></div><p>Siguiente fase</p><strong>Servicios</strong><small>Plantillas por cliente</small></article>
    </section>

    <section className={styles.contentCard}>
      <div className={styles.toolbar}>
        <label className={styles.search}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} type="search" placeholder="Buscar por nombre, DNI/CIF, teléfono o correo..."/></label>
      </div>
      <div className={styles.tableHeader}><div><strong>Listado de clientes</strong><span>{filtrados.length} registros</span></div></div>
      {cargando && <div style={{padding: 28}}>Cargando clientes…</div>}
      {error && <div style={{padding: 28, color: "#b42318"}}>{error}</div>}
      {!cargando && !error && filtrados.length === 0 && <div style={{padding: 28}}>Todavía no hay clientes. Pulsa «Nuevo cliente» para crear el primero.</div>}
      {!cargando && !error && filtrados.length > 0 && <div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Cliente</th><th>Contacto</th><th>Tipo</th><th>DNI / CIF</th><th>Estado</th><th>Comercial</th><th/></tr></thead><tbody>{filtrados.map((cliente) => <tr key={cliente.id}><td><Link href={`/clientes/${cliente.id}`} className={styles.clientCell}><span className={styles.clientAvatar}>{cliente.nombre.charAt(0).toUpperCase()}</span><span className={styles.clientData}><strong>{cliente.nombre}</strong><small>{cliente.codigo || cliente.id.slice(0, 8)}</small></span></Link></td><td><div className={styles.contactData}><strong>{cliente.responsable_nombre || cliente.telefono || "Sin responsable"}</strong><span>{cliente.email || "Sin correo"}</span></div></td><td><span className={styles.typeBadge}>{labelTipo(cliente.tipo)}</span></td><td>{cliente.documento || "—"}</td><td><span className={`${styles.estado} ${styles.estadoActivo}`}><span/>Activo</span></td><td>{cliente.comercial_asignado || "Sin asignar"}</td><td><Link href={`/clientes/${cliente.id}`} className={styles.menuButton}>Abrir</Link></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
