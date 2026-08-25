"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ClientRecord,
  duplicateClient,
  saveClients,
  permanentlyDeleteClient,
  restoreClient,
  trashClient,
} from "@/lib/clientes";
import styles from "./Clientes.module.css";
import { getCurrentOneUser, CurrentOneUser } from "@/lib/current-one-user-client";
import { supabaseBrowser } from "@/lib/supabase-browser";

type View = "Activos" | "Empresas" | "Particulares" | "Ofertas" | "Papelera";

export default function ClientesPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("Activos");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentOneUser | null>(null);
  const [accessError, setAccessError] = useState("");

  async function reload() {
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    if (!session?.access_token) throw new Error("Sesión no encontrada.");
    const response = await fetch("/api/one-clients", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || !data?.ok) throw new Error(data?.error || "No se pudo cargar la cartera central.");
    const central = Array.isArray(data.clients) ? data.clients : [];
    saveClients(central); // cache de compatibilidad; Supabase es la fuente maestra
    setClients(central);
  }

  useEffect(() => {
    let active = true;
    getCurrentOneUser()
      .then(async (user) => { if (active) { setCurrentUser(user); await reload(); } })
      .catch((error) => { if (active) setAccessError(error instanceof Error ? error.message : "No se pudo comprobar el acceso."); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((client) => {
      if (!currentUser) return false;
      const inTrash = Boolean(client.deletedAt);
      if (view === "Papelera" && !inTrash) return false;
      if (view !== "Papelera" && inTrash) return false;
      if (view === "Empresas" && client.type !== "Empresa") return false;
      if (view === "Particulares" && client.type === "Empresa") return false;
      if (view === "Ofertas" && client.status !== "Oportunidad") return false;
      if (!q) return true;
      return [
        client.name,
        client.taxId,
        client.phone,
        client.mobile,
        client.email,
        client.iban,
        client.reference,
        client.commercial,
      ].some((value) => value.toLowerCase().includes(q));
    });
  }, [clients, query, view, currentUser]);

  const visibleClients = currentUser ? clients : [];
  const activeClients = visibleClients.filter((client) => !client.deletedAt);
  const companies = activeClients.filter((client) => client.type === "Empresa");
  const opportunities = activeClients.filter((client) => client.status === "Oportunidad");
  const complete = activeClients.filter((client) => {
    const dateOk = client.type === "Empresa" ? client.incorporationDate : client.birthDate;
    return client.taxId && client.iban && dateOk;
  });

  function moveToTrash(id: string) {
    if (!window.confirm("¿Enviar este cliente a la papelera? Podrás restaurarlo después.")) return;
    trashClient(id);
    setOpenMenu(null);
    reload();
  }

  function restore(id: string) {
    restoreClient(id);
    setOpenMenu(null);
    reload();
  }

  function removeForever(id: string) {
    if (!window.confirm("Esta acción elimina definitivamente el cliente. ¿Continuar?")) return;
    permanentlyDeleteClient(id);
    setOpenMenu(null);
    reload();
  }

  function duplicate(id: string) {
    const copy = duplicateClient(id);
    setOpenMenu(null);
    reload();
    if (copy) window.location.href = `/clientes/${copy.id}/editar`;
  }

  if (accessError) return <div className={styles.page}><div className={styles.empty}><strong>Acceso no disponible</strong><span>{accessError}</span></div></div>;
  if (!currentUser) return <div className={styles.page}><div className={styles.empty}><strong>Comprobando permisos…</strong></div></div>;

  return (
    <div className={styles.page}>
      <section className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>GESTIÓN COMERCIAL</span>
          <h1>Clientes</h1>
          <p>Busca, abre, edita y reutiliza los datos del cliente desde una única ficha.</p>
        </div>
        <div className={styles.createActions}>
          <Link href="/clientes/nuevo" className={styles.primaryButton}>
            <span>+</span> Crear cliente
          </Link>
          <Link href="/clientes/prospecto/nuevo" className={styles.prospectButton}>
            <span>+</span> Crear prospecto
          </Link>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <Stat label="Clientes activos" value={activeClients.length} note="Sin incluir papelera" />
        <Stat label="Empresas" value={companies.length} note="Con representantes asociados" />
        <Stat label="Ofertas" value={opportunities.length} note="Todavía no completadas" />
        <Stat
          label="Fichas completas"
          value={`${complete.length}/${activeClients.length}`}
          note="DNI/CIF, fecha e IBAN"
        />
      </section>

      <section className={styles.contentCard}>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar nombre, DNI/CIF, teléfono, email, IBAN..."
            />
          </label>

          <div className={styles.filters}>
            {(["Activos", "Empresas", "Particulares", "Ofertas", "Papelera"] as View[]).map(
              (item) => (
                <button
                  key={item}
                  className={view === item ? styles.filterActive : ""}
                  onClick={() => setView(item)}
                >
                  {item}
                </button>
              )
            )}
          </div>
        </div>

        <div className={styles.tableHeader}>
          <div>
            <strong>{view === "Papelera" ? "Papelera de clientes" : "Listado de clientes"}</strong>
            <span>{filtered.length} registros</span>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>DNI / CIF</th>
                <th>Contacto</th>
                <th>Tipo</th>
                <th>Servicios</th>
                <th>Estado</th>
                <th>Comercial</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const mainContact = client.contacts.find((contact) => contact.main) ?? client.contacts[0];
                return (
                  <tr key={client.id}>
                    <td>
                      <Link href={`/clientes/${client.id}`} className={styles.clientCell}>
                        <span className={styles.clientAvatar}>{client.name.charAt(0)}</span>
                        <span className={styles.clientData}>
                          <strong>{client.name}</strong>
                          <small>{client.reference}</small>
                        </span>
                      </Link>
                    </td>
                    <td><strong>{client.taxId || "Pendiente"}</strong></td>
                    <td>
                      <div className={styles.contactData}>
                        <strong>{mainContact?.name || client.mobile || client.phone || "Sin contacto"}</strong>
                        <span>{mainContact?.role || client.email}</span>
                      </div>
                    </td>
                    <td><span className={styles.typeBadge}>{client.type}</span></td>
                    <td>
                      <div className={styles.services}>
                        {client.services.slice(0, 3).map((service) => <span key={service}>{service}</span>)}
                      </div>
                    </td>
                    <td><Status status={client.status} /></td>
                    <td>{client.commercial || "Sin asignar"}</td>
                    <td className={styles.actionCell}>
                      <button
                        className={styles.menuButton}
                        onClick={() => setOpenMenu(openMenu === client.id ? null : client.id)}
                      >
                        •••
                      </button>
                      {openMenu === client.id && (
                        <div className={styles.actionMenu}>
                          {view !== "Papelera" ? (
                            <>
                              <Link href={`/clientes/${client.id}`}>Abrir ficha</Link>
                              <Link href={`/clientes/${client.id}/editar`}>Editar</Link>
                            </>
                          ) : (
                            <>
                              <button onClick={() => restore(client.id)}>Restaurar</button>
                              <button className={styles.danger} onClick={() => removeForever(client.id)}>
                                Eliminar definitivamente
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className={styles.empty}>
            <strong>No encontramos clientes</strong>
            <span>Prueba con otra búsqueda o filtro.</span>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <article className={styles.statCard}>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function Status({ status }: { status: ClientRecord["status"] }) {
  const className =
    status === "Cliente"
      ? styles.estadoActivo
      : status === "Oportunidad"
      ? styles.estadoOportunidad
      : styles.estadoInactivo;

  return (
    <span className={`${styles.estado} ${className}`}>
      <span />
      {status}
    </span>
  );
}
