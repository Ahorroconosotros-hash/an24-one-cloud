"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ClientRecord, getClient } from "@/lib/clientes";
import { getContract, type OneContract } from "@/lib/contratos";
import styles from "./Contrato.module.css";

export default function ContratoPage() {
  const params = useParams<{ id: string; servicio: string; contratoId: string }>();
  const service = decodeURIComponent(params.servicio);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [contract, setContract] = useState<OneContract | null>(null);

  useEffect(() => {
    setClient(getClient(params.id));
    setContract(getContract(params.contratoId));
  }, [params.id, params.contratoId]);

  if (!client || !contract) return <div>Cargando contrato...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.crumb}>
        <Link href={`/clientes/${client.id}`}>Cliente 360º</Link><span>/</span>
        <Link href={`/clientes/${client.id}/servicios/${encodeURIComponent(service)}`}>{service}</Link><span>/</span>
        <span>{contract.reference}</span>
      </div>

      <section className={styles.hero}>
        <div>
          <span>CONTRATO ONE</span>
          <h1>{contract.mainProduct}</h1>
          <p>{client.name} · {contract.reference}</p>
        </div>
        <strong>{contract.status}</strong>
      </section>

      <section className={styles.kpis}>
        <Info label="Proveedor" value={contract.provider} />
        <Info label="Servicio" value={contract.service} />
        <Info label="Comercial" value={contract.commercial} />
        <Info label="BackOffice" value={contract.backoffice} />
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span>PRODUCTOS DEL CONTRATO</span><h2>{contract.products.length} líneas configuradas</h2></div></div>
          <div className={styles.productList}>
            {contract.products.map((product) => (
              <article key={product.id}>
                <span>{product.quantity}</span>
                <div><strong>{product.name}</strong><small>{product.details || `Comisión por ${product.commissionMode.toLowerCase()}`}</small></div>
                <b>{product.commissionMode}</b>
              </article>
            ))}
          </div>
        </section>

        <aside className={styles.stack}>
          <section className={styles.panel}>
            <div className={styles.panelHead}><div><span>IDENTIFICADORES</span><h2>Datos únicos</h2></div></div>
            <div className={styles.dataList}>
              {contract.cups && <Info label="CUPS" value={contract.cups} />}
              {contract.supplyType && <Info label="Tipo suministro" value={contract.supplyType} />}
              {contract.providerContractReference && <Info label="Contrato proveedor" value={contract.providerContractReference} />}
              {contract.policyNumber && <Info label="N.º póliza" value={contract.policyNumber} />}
              <Info label="Fecha activación" value={formatDate(contract.activationDate)} />
              <Info label="Renovación" value={formatDate(contract.renewalDate)} />
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}><div><span>ONE</span><h2>Todo conectado</h2></div></div>
            <div className={styles.links}>
              <Link href="/operaciones">Operaciones <b>→</b></Link>
              <Link href="/documentos">Documentos <b>→</b></Link>
              <Link href="/agenda">Seguimientos <b>→</b></Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className={styles.info}><span>{label}</span><strong>{value || "Pendiente"}</strong></div>;
}
function formatDate(value: string) {
  if (!value) return "Pendiente";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-ES");
}
