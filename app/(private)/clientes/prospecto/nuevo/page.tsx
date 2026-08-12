"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClientType,
  createClient,
  emptyClientDraft,
  findDuplicateClients,
} from "@/lib/clientes";
import { addClientActivity } from "@/lib/client-activity";
import styles from "./Prospecto.module.css";

export default function NuevoProspectoPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<ClientType>("Empresa");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [commercial, setCommercial] = useState("Usuario actual");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const current =
      window.localStorage.getItem("one_current_user_name") ||
      window.localStorage.getItem("one_user_name") ||
      "Usuario actual";
    setCommercial(current);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!name.trim()) {
      setMessage("Pon al menos el nombre de la persona o del negocio.");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setMessage("Para guardar el prospecto basta con un teléfono o un email.");
      return;
    }

    const duplicates = findDuplicateClients({
      taxId: "",
      phone,
      mobile: phone,
      email,
      iban: "",
    });

    if (duplicates.length) {
      setMessage(
        `Ya existe un registro con ese teléfono o email: ${duplicates
          .map((client) => `${client.name} (${client.reference})`)
          .join(", ")}.`
      );
      return;
    }

    setSaving(true);

    try {
      const prospect = createClient({
        ...emptyClientDraft(),
        type,
        status: "Prospecto",
        name: name.trim(),
        mobile: phone.trim(),
        email: email.trim(),
        commercial,
        notes: note.trim(),
      });

      addClientActivity({
        clientId: prospect.id,
        type: "Prospecto creado",
        title: "Prospecto creado",
        detail: note.trim()
          ? `Captación rápida · ${note.trim()}`
          : "Captación rápida. Pendiente de primer contacto.",
        user: commercial,
      });

      router.push(`/clientes/${prospect.id}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se ha podido crear el prospecto.");
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div>
          <span>CAPTACIÓN RÁPIDA</span>
          <h1>Crear prospecto</h1>
          <p>Guárdalo en segundos. Ya completarás su ficha cuando avance la relación comercial.</p>
        </div>
        <Link href="/clientes">← Volver a clientes</Link>
      </header>

      <form className={styles.card} onSubmit={submit}>
        {message && <div className={styles.alert}>{message}</div>}

        <div className={styles.titleRow}>
          <div className={styles.step}>01</div>
          <div>
            <h2>Solo lo necesario</h2>
            <p>Nombre + teléfono o email. ONE se encarga del resto.</p>
          </div>
        </div>

        <div className={styles.grid}>
          <label className={styles.name}>
            <span>Nombre / negocio *</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Cafetería Plaza Nueva"
            />
          </label>

          <label>
            <span>Tipo</span>
            <select value={type} onChange={(event) => setType(event.target.value as ClientType)}>
              <option value="Empresa">Empresa / negocio</option>
              <option value="Particular">Particular</option>
              <option value="Autónomo">Autónomo</option>
            </select>
          </label>

          <label>
            <span>Teléfono</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="600 000 000"
              inputMode="tel"
            />
          </label>

          <label>
            <span>Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="contacto@negocio.es"
              inputMode="email"
            />
          </label>

          <label className={styles.full}>
            <span>Nota rápida</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ej. Va a abrir el próximo mes. Llamar por la tarde para ofrecer Energía y TPV."
            />
          </label>
        </div>

        <div className={styles.assignment}>
          <div>
            <span>COMERCIAL</span>
            <strong>{commercial}</strong>
            <small>Asignado automáticamente al usuario que capta el prospecto.</small>
          </div>
          <div>
            <span>ESTADO</span>
            <strong>Prospecto</strong>
            <small>La ficha se completará solo cuando haga falta.</small>
          </div>
        </div>

        <footer className={styles.actions}>
          <Link href="/clientes">Cancelar</Link>
          <button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "+ Crear prospecto"}
          </button>
        </footer>
      </form>
    </main>
  );
}
