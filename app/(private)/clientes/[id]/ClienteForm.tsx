"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClientContact,
  ClientDraft,
  ClientRecord,
  emptyClientDraft,
  findDuplicateClients,
} from "@/lib/clientes";
import SpainAddressFields from "@/components/SpainAddressFields";
import styles from "./ClienteForm.module.css";
import { getCurrentOneUser } from "@/lib/current-one-user-client";
import { supabaseBrowser } from "@/lib/supabase-browser";

const services = [
  "Energía",
  "Telefonía",
  "Alarmas",
  "Seguros",
  "Asesoramiento",
  "Inmobiliaria",
  "IA",
];

function newContact(): ClientContact {
  return {
    id: `contact-${Date.now()}`,
    name: "",
    dni: "",
    role: "",
    phone: "",
    email: "",
    main: true,
  };
}

export default function ClienteForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: ClientRecord | null;
}) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState("Usuario actual");
  const [canAssignCommercial, setCanAssignCommercial] = useState(false);
  const [commercials, setCommercials] = useState<Array<{ id: string; name: string }>>([]);
  const [draft, setDraft] = useState<ClientDraft>(() => {
    if (!initial) return { ...emptyClientDraft(), status: "Cliente" };
    const {
      id: _id,
      reference: _reference,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      deletedAt: _deletedAt,
      ...rest
    } = initial;
    return {
      ...rest,
      commercial:
        rest.commercial === "Sin asignar" || rest.commercial === "Cliente directo AN24"
          ? ""
          : rest.commercial,
    };
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentOneUser()
      .then((user) => {
        if (!active) return;
        setCurrentUser(user.name);
        const canAssign = user.role === "Administrador" || user.role === "BackOffice";
        setCanAssignCommercial(canAssign);
        if (mode === "create") {
          setDraft((current) => ({
            ...current,
            commercial: user.role === "Comercial" ? user.name : current.commercial || "",
          }));
        }
        if (canAssign) {
          supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
            if (!session?.access_token) return;
            fetch("/api/commercials", {
              headers: { Authorization: `Bearer ${session.access_token}` },
            })
              .then((response) => response.json())
              .then((payload) => {
                if (active && payload?.ok && Array.isArray(payload.commercials)) {
                  setCommercials(payload.commercials);
                }
              })
              .catch(() => {});
          });
        }
      })
      .catch(() => {
        if (initial?.commercial) setCurrentUser(initial.commercial);
      });
    return () => { active = false; };
  }, [initial?.commercial, mode]);


  const isCompany = draft.type === "Empresa";
  const isPerson = draft.type === "Particular" || draft.type === "Autónomo";

  const duplicates = useMemo(
    () =>
      findDuplicateClients(
        {
          taxId: draft.taxId,
          phone: draft.phone,
          mobile: draft.mobile,
          email: draft.email,
          iban: draft.iban,
        },
        initial?.id
      ),
    [draft.taxId, draft.phone, draft.mobile, draft.email, draft.iban, initial?.id]
  );

  function set<K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleService(service: string) {
    set(
      "services",
      draft.services.includes(service)
        ? draft.services.filter((item) => item !== service)
        : [...draft.services, service]
    );
  }

  function ensureCompanyContact() {
    if (draft.contacts.length) return;
    set("contacts", [newContact()]);
  }

  function updateContact(id: string, key: keyof ClientContact, value: string | boolean) {
    set(
      "contacts",
      draft.contacts.map((contact) =>
        contact.id === id
          ? {
              ...contact,
              [key]: value,
              ...(key === "main" && value
                ? {}
                : {}),
            }
          : key === "main" && value
          ? { ...contact, main: false }
          : contact
      )
    );
  }

  function addContact() {
    set(
      "contacts",
      draft.contacts.length
        ? [...draft.contacts, { ...newContact(), main: false }]
        : [newContact()]
    );
  }

  function removeContact(id: string) {
    const remaining = draft.contacts.filter((contact) => contact.id !== id);
    if (remaining.length && !remaining.some((contact) => contact.main)) {
      remaining[0] = { ...remaining[0], main: true };
    }
    set("contacts", remaining);
  }

  function validate() {
    if (!draft.name.trim()) return "El nombre o razón social es obligatorio.";
    if (!draft.taxId.trim()) return "El DNI/NIE/CIF es obligatorio.";
    if (!draft.iban.trim()) return "El IBAN es obligatorio para abrir la ficha de cliente.";
    if (!draft.mobile.trim() && !draft.phone.trim())
      return "Indica al menos un teléfono.";
    if (!draft.email.trim()) return "El correo electrónico es obligatorio.";
    if (!draft.address.trim() || !draft.postalCode.trim() || !draft.city.trim() || !draft.province.trim())
      return "Completa la dirección, código postal, población y provincia.";
    if (isPerson && !draft.birthDate)
      return "La fecha de nacimiento es obligatoria para particulares y autónomos.";
    if (isCompany && !draft.incorporationDate)
      return "La fecha de constitución es obligatoria para empresas.";
    if (isCompany) {
      if (!draft.contacts.length) return "Añade al menos un representante o persona de contacto.";
      const main = draft.contacts.find((contact) => contact.main) ?? draft.contacts[0];
      if (!main.name.trim() || !main.dni.trim() || !main.role.trim())
        return "El contacto principal debe tener nombre, DNI/NIE y cargo.";
    }
    if (duplicates.length)
      return `Posible duplicado detectado: ${duplicates
        .map((client) => `${client.name} (${client.reference})`)
        .join(", ")}. Revisa DNI/CIF, teléfono, email o IBAN.`;
    return "";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validate();
    if (error) {
      setMessage(error);
      return;
    }

    setSaving(true);
    const normalizedDraft: ClientDraft = {
      ...draft,
      contacts: isCompany ? draft.contacts : [],
      birthDate: isPerson ? draft.birthDate : "",
      incorporationDate: isCompany ? draft.incorporationDate : "",
    };

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session?.access_token) throw new Error("Sesión no encontrada.");
      const response = await fetch("/api/one-clients", {
        method: mode === "edit" && initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(mode === "edit" && initial ? { id: initial.id, client: normalizedDraft } : { client: normalizedDraft }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok || !data?.client) throw new Error(data?.error || "No se ha podido guardar el cliente.");

      // Cache local solo para compatibilidad con pantallas todavía en migración.
      // La escritura real ya se ha hecho en Supabase antes de navegar.
      const result = data.client as ClientRecord;
      const local = typeof window !== "undefined" ? JSON.parse(window.localStorage.getItem("one_clients_v1") || "[]") : [];
      const next = Array.isArray(local) ? [result, ...local.filter((item: ClientRecord) => item.id !== result.id)] : [result];
      window.localStorage.setItem("one_clients_v1", JSON.stringify(next));
      router.push(`/clientes/${result.id}`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se ha podido guardar el cliente.");
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      {message && <div className={styles.alert}>{message}</div>}

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <span>01</span>
            <div>
              <h2>Tipo y datos principales</h2>
              <p>La ficha cambia automáticamente según sea particular, autónomo o empresa.</p>
            </div>
          </div>
        </div>

        <div className={styles.grid3}>
          <label className={styles.field}>
            <span>Tipo de cliente *</span>
            <select
              value={draft.type}
              onChange={(event) => {
                const value = event.target.value as ClientDraft["type"];
                set("type", value);
                if (value === "Empresa") setTimeout(ensureCompanyContact, 0);
              }}
            >
              <option>Particular</option>
              <option>Autónomo</option>
              <option>Empresa</option>
            </select>
          </label>

          <label className={`${styles.field} ${styles.span2}`}>
            <span>{isCompany ? "Razón social *" : "Nombre y apellidos *"}</span>
            <input
              value={draft.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder={isCompany ? "Ej. Clínica Dental Sur, S.L." : "Ej. Antonio Ruiz Gómez"}
            />
          </label>

          <label className={styles.field}>
            <span>{isCompany ? "CIF *" : "DNI / NIE *"}</span>
            <input
              value={draft.taxId}
              onChange={(event) => set("taxId", event.target.value.toUpperCase())}
              placeholder={isCompany ? "B12345678" : "12345678A"}
            />
          </label>

          {isPerson && (
            <label className={styles.field}>
              <span>Fecha de nacimiento *</span>
              <input
                type="date"
                value={draft.birthDate}
                onChange={(event) => set("birthDate", event.target.value)}
              />
            </label>
          )}

          {isCompany && (
            <label className={styles.field}>
              <span>Fecha de constitución *</span>
              <input
                type="date"
                value={draft.incorporationDate}
                onChange={(event) => set("incorporationDate", event.target.value)}
              />
            </label>
          )}

          <div className={`${styles.assignment} ${styles.span2}`}>
            <div>
              <span>Comercial asignado</span>
              <strong>{draft.commercial || (canAssignCommercial ? "Cliente directo AN24" : currentUser)}</strong>
              <small>
                {canAssignCommercial
                  ? "Puedes asignarlo a un comercial o dejarlo como cliente directo de AN24."
                  : "La ficha se asigna automáticamente al comercial que la registra."}
              </small>
            </div>
            {canAssignCommercial ? (
              <label className={styles.field}>
                <span>Comercial responsable</span>
                <select
                  value={draft.commercial}
                  onChange={(event) => set("commercial", event.target.value)}
                >
                  <option value="">Cliente directo AN24 / sin comercial</option>
                  {commercials.map((commercial) => (
                    <option key={commercial.id} value={commercial.name}>
                      {commercial.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className={styles.locked}>🔒 Asignado automáticamente a tu usuario comercial</span>
            )}
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <span>02</span>
            <div>
              <h2>Contacto, dirección y banco</h2>
              <p>IBAN obligatorio en la ficha completa; no se exigirá en una oportunidad inicial.</p>
            </div>
          </div>
        </div>

        <div className={styles.grid3}>
          <div className={styles.addressFull}>
            <SpainAddressFields
              address={draft.address}
              postalCode={draft.postalCode}
              province={draft.province}
              city={draft.city}
              onChange={(value) => setDraft((current) => ({
                ...current,
                address: value.address,
                postalCode: value.postalCode,
                province: value.province,
                city: value.city,
              }))}
            />
          </div>
          <label className={styles.field}>
            <span>Teléfono</span>
            <input value={draft.phone} onChange={(event) => set("phone", event.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Móvil *</span>
            <input value={draft.mobile} onChange={(event) => set("mobile", event.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Email *</span>
            <input
              type="email"
              value={draft.email}
              onChange={(event) => set("email", event.target.value)}
            />
          </label>
          <label className={`${styles.field} ${styles.span2}`}>
            <span>IBAN *</span>
            <input
              value={draft.iban}
              onChange={(event) => set("iban", event.target.value.toUpperCase().replace(/\s/g, ""))}
              placeholder="ES00..."
            />
          </label>
        </div>
      </section>

      {isCompany && (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <span>03</span>
              <div>
                <h2>Representantes y contactos</h2>
                <p>DNI/NIE y cargo obligatorios para el contacto principal de la empresa.</p>
              </div>
            </div>
            <button type="button" className={styles.addButton} onClick={addContact}>
              + Añadir contacto
            </button>
          </div>

          <div className={styles.contacts}>
            {draft.contacts.map((contact, index) => (
              <article className={styles.contactCard} key={contact.id}>
                <div className={styles.contactTitle}>
                  <strong>Contacto {index + 1}</strong>
                  <div>
                    <label className={styles.mainCheck}>
                      <input
                        type="radio"
                        name="main-contact"
                        checked={contact.main}
                        onChange={() => updateContact(contact.id, "main", true)}
                      />
                      Principal
                    </label>
                    {draft.contacts.length > 1 && (
                      <button type="button" onClick={() => removeContact(contact.id)}>
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.grid3}>
                  <label className={styles.field}>
                    <span>Nombre y apellidos *</span>
                    <input
                      value={contact.name}
                      onChange={(event) => updateContact(contact.id, "name", event.target.value)}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>DNI / NIE *</span>
                    <input
                      value={contact.dni}
                      onChange={(event) =>
                        updateContact(contact.id, "dni", event.target.value.toUpperCase())
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Cargo *</span>
                    <input
                      value={contact.role}
                      onChange={(event) => updateContact(contact.id, "role", event.target.value)}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Teléfono directo</span>
                    <input
                      value={contact.phone}
                      onChange={(event) => updateContact(contact.id, "phone", event.target.value)}
                    />
                  </label>
                  <label className={`${styles.field} ${styles.span2}`}>
                    <span>Email directo</span>
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(event) => updateContact(contact.id, "email", event.target.value)}
                    />
                  </label>
                </div>
              </article>
            ))}

            {!draft.contacts.length && (
              <button type="button" className={styles.emptyContact} onClick={addContact}>
                + Añadir representante o persona de contacto
              </button>
            )}
          </div>
        </section>
      )}

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <span>{isCompany ? "04" : "03"}</span>
            <div>
              <h2>Interés comercial y notas</h2>
              <p>La información se reutilizará después en oportunidades, propuestas y operaciones.</p>
            </div>
          </div>
        </div>

        <div className={styles.services}>
          {services.map((service) => (
            <label className={styles.service} key={service}>
              <input
                type="checkbox"
                checked={draft.services.includes(service)}
                onChange={() => toggleService(service)}
              />
              {service}
            </label>
          ))}
        </div>

        <label className={`${styles.field} ${styles.notes}`}>
          <span>Notas internas</span>
          <textarea
            value={draft.notes}
            onChange={(event) => set("notes", event.target.value)}
            placeholder="Contexto, necesidades, documentación pendiente..."
          />
        </label>
      </section>

      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={() => router.back()}>
          Cancelar
        </button>
        <button type="submit" className={styles.primary} disabled={saving}>
          {saving ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Crear cliente"}
        </button>
      </div>
    </form>
  );
}
