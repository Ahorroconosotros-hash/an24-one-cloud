"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ClientRecord, getClient } from "@/lib/clientes";
import { getClientServiceContracts, SERVICE_PRESENTATION, type OneContract } from "@/lib/contratos";
import styles from "./ServicioCliente.module.css";

export default function ServicioClientePage() {
  const params = useParams<{ id: string; servicio: string }>();
  const service = decodeURIComponent(params.servicio);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [contracts, setContracts] = useState<OneContract[]>([]);

  useEffect(() => {
    setClient(getClient(params.id));
    setContracts(getClientServiceContracts(params.id, service));
  }, [params.id, service]);

  if (!client) return <div>Cargando servicio...</div>;
  const presentation = SERVICE_PRESENTATION[service] ?? { icon: "📦", label: "contratos" };

  return (
    <div className={styles.page}>
      <div className={styles.crumb}>
        <Link href={`/clientes/${client.id}`}>Cliente 360º</Link><span>/</span><span>{service}</span>
      </div>

      <section className={styles.hero}>
        <span className={styles.icon}>{presentation.icon}</span>
        <div>
          <span>CLIENTE 360º · {service.toUpperCase()}</span>
          <h1>{client.name}</h1>
          <p>{contracts.length} {presentation.label} · {contracts.reduce((sum, item) => sum + item.products.reduce((acc, product) => acc + product.quantity, 0), 0)} productos</p>
        </div>
        <Link href={`/contratos/nuevo?cliente=${encodeURIComponent(client.id)}&servicio=${encodeURIComponent(service)}`}>+ Nuevo contrato</Link>
      </section>

      <section className={styles.list}>
        {contracts.map((contract) => (
          <Link className={styles.card} href={`/clientes/${client.id}/servicios/${encodeURIComponent(service)}/${contract.id}`} key={contract.id}>
            <div className={styles.cardHead}>
              <div>
                <span>{contract.reference}</span>
                <h2>{contract.mainProduct}</h2>
                <p>{contract.provider}</p>
              </div>
              <strong className={styles.status}>{contract.status}</strong>
            </div>

            <div className={styles.meta}>
              {contract.cups && <div><span>CUPS</span><strong>{contract.cups}</strong></div>}
              {contract.providerContractReference && <div><span>Contrato proveedor</span><strong>{contract.providerContractReference}</strong></div>}
              <div><span>Productos</span><strong>{contract.products.reduce((sum, item) => sum + item.quantity, 0)}</strong></div>
              <div><span>Renovación</span><strong>{formatDate(contract.renewalDate)}</strong></div>
            </div>

            <div className={styles.products}>
              {contract.products.slice(0, 4).map((product) => <span key={product.id}>{product.quantity} × {product.name}</span>)}
              {contract.products.length > 4 && <span>+ {contract.products.length - 4} más</span>}
            </div>

            <div className={styles.open}>Abrir contrato <b>→</b></div>
          </Link>
        ))}

        {!contracts.length && <div className={styles.empty}><strong>No hay contratos en {service}.</strong><Link href={`/oportunidades/nuevo?cliente=${client.id}&servicio=${encodeURIComponent(service)}`}>Crear el primero</Link></div>}
      </section>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "Pendiente";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-ES");
}
