import Link from "next/link";
import ClienteForm from "../ClienteForm";
import styles from "./NuevoCliente.module.css";

export default function NuevoClientePage() {
  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <span className={styles.eyebrow}>CLIENTES · NUEVA FICHA</span>
          <h1>Crear cliente</h1>
          <p>Ficha completa preparada para oportunidades, propuestas, operaciones y contratos.</p>
        </div>
        <Link href="/clientes" className={styles.back}>← Volver a clientes</Link>
      </div>
      <ClienteForm mode="create" />
    </div>
  );
}
