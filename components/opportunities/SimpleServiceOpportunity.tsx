"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loadClients } from "@/lib/clientes";
import { addClientActivity } from "@/lib/client-activity";
import styles from "./SimpleServiceOpportunity.module.css";

type Product = {
  id: string;
  service: string;
  providerId?: string;
  company?: string;
  name: string;
  features?: string;
  priceBase?: number;
  vat?: number;
  billingType?: "Único" | "Mensual" | "Ambos";
  monthlyPrice?: number;
  active: boolean;
};

type Doc = {
  id: string;
  type: string;
  name: string;
  date: string;
};

const DOCS = [
  "Propuesta / presupuesto",
  "Contrato",
  "DNI / NIE",
  "CIF",
  "Factura",
  "Justificante de pago",
  "Otro",
];

function SimpleServiceOpportunityContent({
  service,
}: {
  service: "Asesoramiento" | "IA";
}) {
  const router = useRouter();
  const search = useSearchParams();

  const clients = useMemo(
    () => loadClients().filter((c: any) => !c.deletedAt),
    []
  );

  const [clientId, setClientId] = useState(search.get("cliente") || "");
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [single, setSingle] = useState("");
  const [monthly, setMonthly] = useState("");
  const [vat, setVat] = useState("21");
  const [billing, setBilling] = useState<"Único" | "Mensual" | "Ambos">(
    "Único"
  );
  const [docType, setDocType] = useState(DOCS[0]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [notes, setNotes] = useState("");

  const client: any = clients.find((c: any) => c.id === clientId);
  const product = products.find((p) => p.id === productId);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("one_product_catalog");
      const parsed = raw ? JSON.parse(raw) : [];

      setProducts(
        Array.isArray(parsed)
          ? parsed.filter(
              (p: any) => p.active !== false && p.service === service
            )
          : []
      );
    } catch {
      setProducts([]);
    }
  }, [service]);

  function chooseProduct(id: string) {
    setProductId(id);

    const p = products.find((x) => x.id === id);

    if (!p) return;

    setSingle(String(Number(p.priceBase || 0)));
    setMonthly(String(Number(p.monthlyPrice || 0)));
    setVat(String(Number(p.vat ?? 21)));
    setBilling(p.billingType || "Único");
  }

  const tax = Number(vat || 0) / 100;
  const singleBase = billing === "Mensual" ? 0 : Number(single || 0);
  const monthlyBase = billing === "Único" ? 0 : Number(monthly || 0);
  const singleTotal = singleBase * (1 + tax);
  const monthlyTotal = monthlyBase * (1 + tax);
  const annualRecurring = monthlyTotal * 12;
  const firstYear = singleTotal + annualRecurring;

  function addDoc(file: File | null) {
    if (!file) return;

    setDocs((cur) => [
      ...cur,
      {
        id: `doc-${Date.now()}`,
        type: docType,
        name: file.name,
        date: new Date().toLocaleDateString("es-ES"),
      },
    ]);
  }

  function save() {
    if (!clientId || !productId) {
      alert("Selecciona cliente y producto.");
      return;
    }

    const opportunity = {
      id: `service-${Date.now()}`,
      service,
      clientId,
      clientName: client?.name || "",
      productId,
      productSnapshot: product || null,
      billingType: billing,
      economics: {
        singleBase,
        monthlyBase,
        vat: Number(vat || 0),
        singleTotal,
        monthlyTotal,
        annualRecurring,
        firstYear,
      },
      documents: docs,
      notes,
      createdAt: new Date().toISOString(),
    };

    const key = "one_simple_service_opportunities_v1";
    const prev = JSON.parse(localStorage.getItem(key) || "[]");

    localStorage.setItem(
      key,
      JSON.stringify([
        opportunity,
        ...(Array.isArray(prev) ? prev : []),
      ])
    );

    addClientActivity({
      clientId,
      type: "Oportunidad",
      title: `${service} · ${product?.name || "Servicio"}`,
      detail: `${
        billing === "Único"
          ? "Pago único"
          : billing === "Mensual"
          ? "Recurrente mensual"
          : "Alta + recurrente"
      } · ${firstYear.toFixed(2)} € primer año`,
      user: client?.commercial || "Usuario actual",
    });

    router.push(`/clientes/${clientId}`);
  }

  return (
    <main className={styles.page}>
      <div className={styles.crumb}>
        <Link href="/oportunidades">Oportunidades</Link>
        <span>/</span>
        <strong>{service}</strong>
      </div>

      <header className={styles.hero}>
        <div>
          <span>ONE · NUEVO NEGOCIO</span>
          <h1>Nueva oportunidad · {service}</h1>
          <p>
            Selecciona producto, adjunta lo necesario y ONE hace el resto.
          </p>
        </div>
        <b>{service === "IA" ? "✨" : "🤝"}</b>
      </header>

      <section className={styles.summary}>
        <div>
          <small>PAGO INICIAL</small>
          <strong>{singleTotal.toFixed(2)} €</strong>
          <span>IVA incluido</span>
        </div>

        <div>
          <small>CUOTA RECURRENTE</small>
          <strong>{monthlyTotal.toFixed(2)} €</strong>
          <span>{monthlyBase > 0 ? "/ mes" : "—"}</span>
        </div>

        <div>
          <small>RECURRENTE ANUAL</small>
          <strong>{annualRecurring.toFixed(2)} €</strong>
          <span>IVA incluido</span>
        </div>

        <div className={styles.total}>
          <small>TOTAL PRIMER AÑO</small>
          <strong>{firstYear.toFixed(2)} €</strong>
          <span>IVA incluido</span>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.title}>
          <span>1.</span>
          <h2>Cliente y producto</h2>
        </div>

        <div className={styles.grid}>
          <label>
            Cliente *
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Seleccionar cliente</option>

              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.taxId}
                </option>
              ))}
            </select>
          </label>

          <label>
            Producto *
            <select
              value={productId}
              onChange={(e) => chooseProduct(e.target.value)}
            >
              <option value="">
                Seleccionar producto de {service}
              </option>

              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {product?.features && (
          <div className={styles.productInfo}>
            <strong>{product.name}</strong>
            <span>{product.features}</span>
          </div>
        )}

        {!products.length && (
          <div className={styles.hint}>
            No hay productos de {service} configurados todavía. Créalo una
            vez en Productos y Proveedores y aparecerá aquí automáticamente.
          </div>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.title}>
          <span>2.</span>
          <h2>Importes y facturación</h2>
          <small>Se cargan desde la ficha del producto.</small>
        </div>

        <div className={styles.billingGrid}>
          <label>
            Tipo de pago
            <select
              value={billing}
              onChange={(e) =>
                setBilling(
                  e.target.value as "Único" | "Mensual" | "Ambos"
                )
              }
            >
              <option value="Único">Pago único</option>
              <option value="Mensual">Recurrente mensual</option>
              <option value="Ambos">
                Pago inicial + recurrente
              </option>
            </select>
          </label>

          {billing !== "Mensual" && (
            <label>
              Importe inicial
              <input
                type="number"
                min="0"
                step=".01"
                value={single}
                onChange={(e) => setSingle(e.target.value)}
              />
            </label>
          )}

          {billing !== "Único" && (
            <label>
              Cuota mensual
              <input
                type="number"
                min="0"
                step=".01"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
              />
            </label>
          )}

          <label>
            IVA
            <select
              value={vat}
              onChange={(e) => setVat(e.target.value)}
            >
              <option value="0">0%</option>
              <option value="4">4%</option>
              <option value="10">10%</option>
              <option value="21">21%</option>
            </select>
          </label>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.title}>
          <span>3.</span>
          <h2>Documentación</h2>
        </div>

        <div className={styles.docs}>
          <div>
            <span>📎</span>
            <small>
              {docs.length
                ? `${docs.length} documento(s)`
                : "Sin documentos adjuntos"}
            </small>
          </div>

          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            {DOCS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>

          <label className={styles.upload}>
            ☁ Añadir documento
            <input
              hidden
              type="file"
              onChange={(e) => {
                addDoc(e.target.files?.[0] || null);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        {docs.map((d) => (
          <div className={styles.doc} key={d.id}>
            <span>📄</span>

            <div>
              <strong>{d.name}</strong>
              <small>
                {d.type} · {d.date}
              </small>
            </div>

            <button
              type="button"
              onClick={() =>
                setDocs((x) => x.filter((v) => v.id !== d.id))
              }
            >
              Eliminar
            </button>
          </div>
        ))}
      </section>

      <section className={styles.card}>
        <div className={styles.title}>
          <span>4.</span>
          <h2>Notas</h2>
          <small>Opcional</small>
        </div>

        <textarea
          className={styles.notes}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Solo si hay algo que ONE deba recordar..."
        />
      </section>

      <section className={styles.card}>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => router.back()}
          >
            Cancelar
          </button>

          <button
            className={styles.primary}
            type="button"
            onClick={save}
          >
            Guardar oportunidad
          </button>
        </div>
      </section>
    </main>
  );
}

export default function SimpleServiceOpportunity(
  props: { service: "Asesoramiento" | "IA" }
) {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 24 }}>
          Cargando servicio...
        </div>
      }
    >
      <SimpleServiceOpportunityContent {...props} />
    </Suspense>
  );
}