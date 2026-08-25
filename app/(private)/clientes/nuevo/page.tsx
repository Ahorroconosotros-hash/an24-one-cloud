"use client";

import Link from "next/link";
import ClienteForm from "../ClienteForm";
import styles from "./NuevoCliente.module.css";

export default function NuevoClientePage() {
  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div>
          <span className={styles.eyebrow}>CLIENTES · ALTA</span>
          <h1>Crear cliente</h1>
          <p>
            Crea una única ficha central en ONE. El cliente quedará disponible para los perfiles autorizados y vinculado al comercial correspondiente.
          </p>
        </div>

        <Link href="/clientes" className={styles.back}>
          ← Volver a clientes
        </Link>
      </header>

      <ClienteForm mode="create" />
    </main>
  );
}
