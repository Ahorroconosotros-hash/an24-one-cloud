"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ClienteForm from "../../ClienteForm";
import { ClientRecord } from "@/lib/clientes";
import styles from "../../nuevo/NuevoCliente.module.css";
import { getCurrentOneUser } from "@/lib/current-one-user-client";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { saveClients, loadClients } from "@/lib/clientes";

export default function EditarClientePage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientRecord | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    (async () => {
      await getCurrentOneUser();
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session?.access_token) throw new Error("Sesión no encontrada");
      const response = await fetch(`/api/one-clients?id=${encodeURIComponent(params.id)}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data?.client) throw new Error(data?.error || "Cliente no encontrado");
      if (!active) return;
      const local = loadClients();
      saveClients([data.client, ...local.filter((c) => c.id !== data.client.id)]);
      setClient(data.client);
    })().catch(() => { if (active) setClient(null); });
    return () => { active = false; };
  }, [params.id]);

  if (client === undefined) return <div>Cargando cliente...</div>;
  if (!client) {
    return (
      <div>
        <p>No encontramos este cliente.</p>
        <Link href="/clientes">Volver a clientes</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <span className={styles.eyebrow}>CLIENTES · EDICIÓN</span>
          <h1>Editar cliente</h1>
          <p>{client.name} · {client.reference}</p>
        </div>
        <Link href={`/clientes/${client.id}`} className={styles.back}>
          ← Volver a la ficha
        </Link>
      </div>
      <ClienteForm mode="edit" initial={client} />
    </div>
  );
}
