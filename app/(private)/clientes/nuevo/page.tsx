"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./NuevoCliente.module.css";

type TipoIdentidad = "empresa" | "autonomo" | "particular";
type RolUsuario = "administracion" | "backoffice" | "comercial";
type AccionGuardado = "guardar" | "contratar";

export default function NuevoClientePage() {
  const router = useRouter();
  const [tipoIdentidad, setTipoIdentidad] = useState<TipoIdentidad>("empresa");
  const [guardado, setGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [accion, setAccion] = useState<AccionGuardado>("guardar");

  // En la siguiente fase este rol vendrá de la sesión del usuario.
  const rolUsuario: RolUsuario = "administracion";
  const puedeGestionar = rolUsuario === "administracion" || rolUsuario === "backoffice";
  const esEmpresa = tipoIdentidad === "empresa";
  const etiquetaNombre = useMemo(
    () => (esEmpresa ? "Razón social" : "Nombre y apellidos"),
    [esEmpresa],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardando(true);
    setGuardado(false);
    setError("");

    try {
      const formData = new FormData(event.currentTarget);
      const payload = Object.fromEntries(formData.entries()) as Record<string, FormDataEntryValue>;
      payload.tipoIdentidad = tipoIdentidad;
      payload.marketingEmail = formData.has("marketingEmail") ? "true" : "";
      payload.marketingWhatsapp = formData.has("marketingWhatsapp") ? "true" : "";
      payload.marketingSms = formData.has("marketingSms") ? "true" : "";
      payload.marketingOfertas = formData.has("marketingOfertas") ? "true" : "";

      const response = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          marketingEmail: Boolean(payload.marketingEmail),
          marketingWhatsapp: Boolean(payload.marketingWhatsapp),
          marketingSms: Boolean(payload.marketingSms),
          marketingOfertas: Boolean(payload.marketingOfertas),
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar el cliente.");

      setGuardado(true);
      if (accion === "contratar" && puedeGestionar) {
        router.push(`/servicios?cliente=${result.id}`);
      } else {
        router.push(`/clientes/${result.id}`);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error inesperado al guardar.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setGuardando(false);
    }
  }

  function handlePdf() {
    window.print();
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>CLIENTES</span>
          <h1>Nuevo cliente</h1>
          <p>Datos esenciales, contratación directa y ficha preparada para PDF.</p>
        </div>
        <div className={styles.headerActions}>
          {puedeGestionar && (
            <button type="button" className={styles.pdfButton} onClick={handlePdf}>
              Descargar ficha PDF
            </button>
          )}
          <Link href="/clientes" className={styles.back}>← Volver</Link>
        </div>
      </header>

      {guardado && <div className={styles.success}>Cliente guardado correctamente.</div>}
      {error && <div className={styles.error}>{error}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <Section
          number="01"
          title="Identificación y contacto"
          description="Datos principales y formas de contacto"
          open
        >
          <div className={styles.grid4}>
            <Field label="Tipo *">
              <select name="tipoIdentidad" value={tipoIdentidad} onChange={(e) => setTipoIdentidad(e.target.value as TipoIdentidad)}>
                <option value="empresa">Empresa</option>
                <option value="autonomo">Autónomo</option>
                <option value="particular">Particular</option>
              </select>
            </Field>
            <Field label={`${etiquetaNombre} *`} className={styles.span2}>
              <input name="nombre" required placeholder={etiquetaNombre} />
            </Field>
            <Field label="DNI / CIF *"><input name="documento" required /></Field>
            <Field label="Móvil *"><input name="telefonoMovil" type="tel" required /></Field>
            <Field label="Teléfono"><input name="telefonoFijo" type="tel" /></Field>
            <Field label="Email *" className={styles.span2}><input name="email" type="email" required /></Field>
          </div>

          {esEmpresa && (
            <div className={styles.responsableBlock}>
              <div className={styles.subsectionTitle}>
                <strong>Responsable de la empresa</strong>
                <span>Se muestra automáticamente al seleccionar Empresa</span>
              </div>
              <div className={styles.grid4}>
                <Field label="Nombre y apellidos *" className={styles.span2}>
                  <input name="gerenteNombre" required={esEmpresa} />
                </Field>
                <Field label="Teléfono"><input name="gerenteTelefono" type="tel" /></Field>
                <Field label="Email"><input name="gerenteEmail" type="email" /></Field>
              </div>
            </div>
          )}
        </Section>

        <Section number="02" title="Dirección" description="Domicilio principal" open>
          <div className={styles.addressGrid}>
            <Field label="Dirección *" className={styles.addressWide}><input name="direccion" required /></Field>
            <Field label="N.º"><input name="numero" /></Field>
            <Field label="Bloque"><input name="bloque" /></Field>
            <Field label="Esc."><input name="escalera" /></Field>
            <Field label="Piso"><input name="piso" /></Field>
            <Field label="Puerta"><input name="puerta" /></Field>
            <Field label="C. P. *"><input name="codigoPostal" required maxLength={5} /></Field>
            <Field label="Población *" className={styles.span2}><input name="poblacion" required /></Field>
            <Field label="Provincia *" className={styles.span2}><input name="provincia" required /></Field>
          </div>
        </Section>

        <Section number="03" title="Marketing" description="Consentimientos de comunicación">
          <div className={styles.inlineChecks}>
            <Check name="marketingEmail" label="Email" />
            <Check name="marketingWhatsapp" label="WhatsApp" />
            <Check name="marketingSms" label="SMS" />
            <Check name="marketingOfertas" label="Ofertas" />
          </div>
        </Section>

        <Section number="04" title="Datos bancarios" description="Solo cuando sea necesario">
          <div className={styles.grid4}>
            <Field label="Titular" className={styles.span2}><input name="titularBanco" /></Field>
            <Field label="IBAN" className={styles.span2}><input name="iban" placeholder="ES00 0000 0000 0000 0000 0000" /></Field>
          </div>
        </Section>

        <Section number="05" title="Asignación y observaciones" description="Gestión interna" open>
          <div className={styles.grid4}>
            <Field label="Comercial asignado *" className={styles.span2}>
              <select name="comercialAsignado" defaultValue="" required>
                <option value="" disabled>Seleccionar comercial</option>
                <option value="jesus">Jesús Martínez</option>
                <option value="maria">María López</option>
                <option value="pedro">Pedro García</option>
              </select>
            </Field>
            <Field label="Creado por"><input value="Backoffice" readOnly /></Field>
            <Field label="Fecha de alta"><input value={new Intl.DateTimeFormat("es-ES").format(new Date())} readOnly /></Field>
            <Field label="Observaciones" className={styles.fullWidth}>
              <textarea name="observaciones" rows={2} />
            </Field>
          </div>
        </Section>

        <div className={styles.actions}>
          <Link href="/clientes" className={styles.secondaryButton}>Cancelar</Link>
          {puedeGestionar && (
            <button
              type="submit"
              disabled={guardando}
              className={styles.contractButton}
              onClick={() => setAccion("contratar")}
            >
              {guardando && accion === "contratar" ? "Guardando..." : "Guardar e ir a contratación"}
            </button>
          )}
          <button
            type="submit"
            disabled={guardando}
            className={styles.primaryButton}
            onClick={() => setAccion("guardar")}
          >
            {guardando && accion === "guardar" ? "Guardando..." : "Guardar cliente"}
          </button>
        </div>
      </form>
    </main>
  );
}

function Section({ number, title, description, children, open = false }: { number: string; title: string; description: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className={styles.card} open={open}>
      <summary className={styles.sectionHeader}>
        <div className={styles.sectionHeading}><span>{number}</span><h2>{title}</h2></div>
        <p>{description}</p>
        <span className={styles.chevron}>⌄</span>
      </summary>
      <div className={styles.sectionBody}>{children}</div>
    </details>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`${styles.field} ${className}`}><span>{label}</span>{children}</label>;
}

function Check({ name, label }: { name: string; label: string }) {
  return <label className={styles.check}><input name={name} type="checkbox" /><span>{label}</span></label>;
}
