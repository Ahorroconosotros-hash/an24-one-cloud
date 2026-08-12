"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ClienteForm from "../../ClienteForm";
import { ClientRecord, getClient } from "@/lib/clientes";
import styles from "../../nuevo/NuevoCliente.module.css";

export default function EditarClientePage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientRecord | null | undefined>(undefined);

  useEffect(() => {
    setClient(getClient(params.id));
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
