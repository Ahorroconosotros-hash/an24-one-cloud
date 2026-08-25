"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClientRecord,
  ClientType,
  emptyClientDraft,
  findDuplicateClients,
} from "@/lib/clientes";
import { supabaseBrowser } from "@/lib/supabase-browser";
import styles from "./Prospecto.module.css";
import { getCurrentOneUser } from "@/lib/current-one-user-client";

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
    let active = true;
    getCurrentOneUser()
      .then((user) => { if (active) setCommercial(user.name); })
      .catch(() => { if (active) setCommercial("Usuario actual"); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
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
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session?.access_token) throw new Error("Sesión no encontrada.");

      const draft = {
        ...emptyClientDraft(),
        type,
        status: "Prospecto" as const,
        name: name.trim(),
        mobile: phone.trim(),
        phone: phone.trim(),
        email: email.trim(),
        commercial,
        notes: note.trim(),
      };

      const response = await fetch("/api/one-clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ client: draft }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok || !payload?.client) {
        throw new Error(payload?.error || "No se ha podido crear el prospecto.");
      }

      const prospect = payload.client as ClientRecord;

      // Cache local solo para pantallas heredadas. Supabase ya es la fuente maestra.
      try {
        const raw = window.localStorage.getItem("one_clients_v1");
        const local = raw ? JSON.parse(raw) : [];
        const next = Array.isArray(local)
          ? [prospect, ...local.filter((item: ClientRecord) => item.id !== prospect.id)]
          : [prospect];
        window.localStorage.setItem("one_clients_v1", JSON.stringify(next));
      } catch {}

      // Registrar la captación en el timeline central del cliente.
      try {
        await fetch("/api/client-timeline", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            clientId: prospect.id,
            eventType: "Prospecto creado",
            title: "Prospecto creado",
            detail: note.trim()
              ? `Captación rápida · ${note.trim()}`
              : "Captación rápida. Pendiente de primer contacto.",
            channel: "Comercial",
          }),
        });
      } catch {}

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
