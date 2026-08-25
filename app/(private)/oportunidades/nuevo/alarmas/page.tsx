"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SpainAddressFields from "@/components/SpainAddressFields";
import { loadClients } from "@/lib/clientes";
import { addClientActivity } from "@/lib/client-activity";
import styles from "./AlarmOpportunity.module.css";

type Provider = {
  id: string;
  service: string;
  name: string;
  active: boolean;
};

type Product = {
  id: string;
  service: string;
  providerId?: string;
  company?: string;
  name: string;
  features?: string;
  active: boolean;
  priceBase?: number;
  vat?: number;
  billingType?: "Único" | "Mensual" | "Ambos";
  monthlyPrice?: number;
  promoType?: "Ninguna" | "Porcentaje" | "Importe" | "Precio final";
  promoValue?: number;
  promoStart?: string;
  promoEnd?: string;
};

type Line = {
  id: string;
  productId: string;
  qty: number;
};

type Doc = {
  id: string;
  type: string;
  name: string;
  date: string;
};

const DOC_TYPES = [
  "Oferta firmada",
  "DNI/NIE",
  "CIF",
  "Mandato SEPA",
  "Contrato",
  "Plano / croquis",
  "Otro",
];

const DEFAULT_PROVIDERS: Provider[] = [
  { id: "prov-segurma", service: "Alarmas", name: "SEGURMA", active: true },
];

function numberOf(value: unknown) {
  return Number(String(value ?? 0).replace(",", ".")) || 0;
}

function promotionIsActive(product?: Product) {
  if (!product || !product.promoType || product.promoType === "Ninguna") return false;
  const today = new Date().toISOString().slice(0, 10);
  return (!product.promoStart || product.promoStart <= today) &&
    (!product.promoEnd || product.promoEnd >= today);
}

function promotedPrice(base: number, product?: Product) {
  if (!promotionIsActive(product)) return base;
  const value = numberOf(product?.promoValue);
  if (product?.promoType === "Porcentaje") return Math.max(0, base * (1 - value / 100));
  if (product?.promoType === "Importe") return Math.max(0, base - value);
  if (product?.promoType === "Precio final") return Math.max(0, value);
  return base;
}

function promotionText(base: number, product?: Product) {
  if (!promotionIsActive(product)) return "—";
  const final = promotedPrice(base, product);
  const saving = Math.max(0, base - final);
  if (product?.promoType === "Porcentaje") {
    return `-${saving.toFixed(2)} € (${numberOf(product.promoValue)}%)`;
  }
  return `-${saving.toFixed(2)} €`;
}

function AlarmOpportunityContent() {
  const router = useRouter();
  const search = useSearchParams();
  const clients = useMemo(() => loadClients(), []);
  const [clientId, setClientId] = useState(search.get("cliente") || "");
  const client: any = clients.find((item: any) => item.id === clientId);

  const [status, setStatus] = useState("En negociación");
  const [providers, setProviders] = useState<Provider[]>(DEFAULT_PROVIDERS);
  const [products, setProducts] = useState<Product[]>([]);
  const [providerId, setProviderId] = useState("");
  const [packId, setPackId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [installMode, setInstallMode] = useState<"client" | "other">("client");
  const [address, setAddress] = useState({
    address: "",
    postalCode: "",
    province: "",
    city: "",
  });
  const [propertyType, setPropertyType] = useState("Negocio");
  const [installationDate, setInstallationDate] = useState("");
  const [activationDate, setActivationDate] = useState("");
  const [notes, setNotes] = useState("");
  const [docType, setDocType] = useState("Oferta firmada");
  const [docs, setDocs] = useState<Doc[]>([]);

  useEffect(() => {
    try {
      const rawProviders = localStorage.getItem("one_provider_catalog");
      if (rawProviders) {
        const parsed = JSON.parse(rawProviders);
        const insurance = Array.isArray(parsed)
          ? parsed.filter((item: any) => item.active !== false && item.service === "Alarmas")
          : [];
        if (insurance.length) setProviders(insurance);
      }

      const rawProducts = localStorage.getItem("one_product_catalog");
      if (rawProducts) {
        const parsed = JSON.parse(rawProducts);
        if (Array.isArray(parsed)) {
          setProducts(
            parsed.filter((item: any) => item.active !== false && item.service === "Alarmas")
          );
        }
      }
    } catch {}
  }, []);

  const alarmProviders = providers.filter(
    (item) => item.active !== false && item.service === "Alarmas"
  );
  const selectedProvider = alarmProviders.find((item) => item.id === providerId);
  const availableProducts = products.filter(
    (item) =>
      item.active !== false &&
      item.service === "Alarmas" &&
      (!providerId ||
        item.providerId === providerId ||
        item.company === selectedProvider?.name)
  );

  const packs = availableProducts.filter((item) =>
    /pack|kit|alarma/i.test(`${item.name} ${item.features || ""}`)
  );
  const selectedPack = availableProducts.find((item) => item.id === packId);

  const packBaseInitial = numberOf(selectedPack?.priceBase);
  const packFinalInitial = promotedPrice(packBaseInitial, selectedPack);
  const packBaseMonthly = numberOf(selectedPack?.monthlyPrice);
  const packFinalMonthly = promotedPrice(packBaseMonthly, selectedPack);
  const packVat = numberOf(selectedPack?.vat || 21);

  const lineData = lines.map((line) => {
    const product = availableProducts.find((item) => item.id === line.productId);
    const vat = numberOf(product?.vat || 21);
    const baseInitial = numberOf(product?.priceBase);
    const finalInitial = promotedPrice(baseInitial, product);
    const baseMonthly = numberOf(product?.monthlyPrice);
    const finalMonthly = promotedPrice(baseMonthly, product);

    return {
      line,
      product,
      vat,
      baseInitial,
      finalInitial,
      baseMonthly,
      finalMonthly,
      totalInitialBase: finalInitial * line.qty,
      totalMonthlyBase: finalMonthly * line.qty,
      totalInitialVat: finalInitial * line.qty * (vat / 100),
      totalMonthlyVat: finalMonthly * line.qty * (vat / 100),
    };
  });

  const additionalInitialBase = lineData.reduce((sum, item) => sum + item.totalInitialBase, 0);
  const additionalInitialVat = lineData.reduce((sum, item) => sum + item.totalInitialVat, 0);
  const additionalMonthlyBase = lineData.reduce((sum, item) => sum + item.totalMonthlyBase, 0);
  const additionalMonthlyVat = lineData.reduce((sum, item) => sum + item.totalMonthlyVat, 0);

  const packInitialVat = packFinalInitial * (packVat / 100);
  const packMonthlyVat = packFinalMonthly * (packVat / 100);

  const totalInitialBase = packFinalInitial + additionalInitialBase;
  const totalInitialVat = packInitialVat + additionalInitialVat;
  const totalInitial = totalInitialBase + totalInitialVat;

  const totalMonthlyBase = packFinalMonthly + additionalMonthlyBase;
  const totalMonthlyVat = packMonthlyVat + additionalMonthlyVat;
  const totalMonthly = totalMonthlyBase + totalMonthlyVat;

  const totalFirstYear = totalInitial + totalMonthly * 12;

  const commissionMonth = activationDate
    ? (() => {
        const date = new Date(`${activationDate}T12:00:00`);
        date.setMonth(date.getMonth() + 1);
        return date.toLocaleDateString("es-ES", {
          month: "long",
          year: "numeric",
        });
      })()
    : "";

  function addLine() {
    setLines((current) => [
      ...current,
      { id: `line-${Date.now()}`, productId: "", qty: 1 },
    ]);
  }

  function updateLine(id: string, patch: Partial<Line>) {
    setLines((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function addDoc(file: File | null) {
    if (!file) return;
    setDocs((current) => [
      ...current,
      {
        id: `doc-${Date.now()}`,
        type: docType,
        name: file.name,
        date: new Date().toLocaleDateString("es-ES"),
      },
    ]);
  }

  function save() {
    if (!clientId || !providerId || !packId) {
      alert("Selecciona cliente, proveedor y pack.");
      return;
    }

    const opportunity = {
      id: `alarm-${Date.now()}`,
      service: "Alarmas",
      clientId,
      clientName: client?.name || "",
      status,
      providerId,
      providerName: selectedProvider?.name || "",
      packSnapshot: selectedPack || null,
      linesSnapshot: lineData.map((item) => ({
        line: item.line,
        product: item.product || null,
      })),
      installMode,
      address,
      propertyType,
      installationDate,
      activationDate,
      commissionMonth,
      economics: {
        totalInitialBase,
        totalInitialVat,
        totalInitial,
        totalMonthlyBase,
        totalMonthlyVat,
        totalMonthly,
        totalFirstYear,
      },
      notes,
      docs,
      createdAt: new Date().toISOString(),
    };

    const key = "one_alarm_opportunities_v2";
    const previous = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(
      key,
      JSON.stringify([opportunity, ...(Array.isArray(previous) ? previous : [])])
    );

    addClientActivity({
      clientId,
      type: "Oportunidad",
      title: "Alarma · oportunidad creada",
      detail: `${selectedProvider?.name || ""} · ${selectedPack?.name || ""} · ${totalMonthly.toFixed(2)} €/mes`,
      user: client?.commercial || "Usuario actual",
    });

    router.push(`/oportunidades/${opportunity.id}`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.crumb}>
        <Link href="/oportunidades">Oportunidades</Link>
        <span>/</span>
        <strong>Alarmas</strong>
      </div>

      <header className={styles.masterHeader}>
        <div>
          <span>OPORTUNIDADES / ALARMAS</span>
          <div className={styles.masterTitleRow}>
            <h1>Nuevo presupuesto</h1>
            <b>•</b>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>En negociación</option>
              <option>Borrador</option>
              <option>Pendiente</option>
              <option>Aceptada</option>
              <option>Perdida</option>
            </select>
          </div>
        </div>
      </header>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <section className={styles.summaryCard}>
          <div className={styles.summaryTitle}>
            <strong>Resumen económico de la oferta</strong>
            <span>(IVA incluido)</span>
          </div>

          <div className={styles.summaryGrid}>
            <div><small>BASE INICIAL</small><strong>{totalInitialBase.toFixed(2)} €</strong></div>
            <div><small>IVA</small><strong>{totalInitialVat.toFixed(2)} €</strong></div>
            <div><small>TOTAL INICIAL</small><strong>{totalInitial.toFixed(2)} €</strong></div>
            <div className={styles.summaryDivider}></div>
            <div><small>BASE MENSUAL</small><strong>{totalMonthlyBase.toFixed(2)} €</strong></div>
            <div><small>IVA</small><strong>{totalMonthlyVat.toFixed(2)} €</strong></div>
            <div><small>TOTAL MENSUAL</small><strong>{totalMonthly.toFixed(2)} €</strong></div>
            <div className={styles.summaryHero}>
              <small>TOTAL PRIMER AÑO</small>
              <strong>{totalFirstYear.toFixed(2)} €</strong>
              <span>IVA incluido</span>
            </div>
          </div>
        </section>

        <section>
          <div className={styles.sectionHead}>
            <h2>Cliente e instalación</h2>
            <small>ONE reutiliza los datos que ya conoce.</small>
          </div>

          <div className={styles.alarmGrid}>
            <label>
              Cliente *
              <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
                <option value="">Seleccionar cliente</option>
                {clients.map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.taxId}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Tipo de instalación
              <select value={propertyType} onChange={(event) => setPropertyType(event.target.value)}>
                <option>Hogar</option>
                <option>Negocio</option>
                <option>Oficina</option>
                <option>Nave</option>
                <option>Otro</option>
              </select>
            </label>

            <label>
              Proveedor *
              <select
                value={providerId}
                onChange={(event) => {
                  setProviderId(event.target.value);
                  setPackId("");
                  setLines([]);
                }}
              >
                <option value="">Seleccionar proveedor</option>
                {alarmProviders.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.installChoice}>
            <div>
              <strong>Domicilio de instalación</strong>
              <small>Solo se vuelve a escribir si es distinto al del cliente.</small>
            </div>
            <label>
              <input
                type="radio"
                checked={installMode === "client"}
                onChange={() => setInstallMode("client")}
              />
              Mismo domicilio
            </label>
            <label>
              <input
                type="radio"
                checked={installMode === "other"}
                onChange={() => setInstallMode("other")}
              />
              Otro domicilio
            </label>
          </div>

          {installMode === "other" && (
            <div className={styles.insuranceAddress}>
              <SpainAddressFields {...address} onChange={setAddress} />
            </div>
          )}
        </section>

        <section>
          <div className={styles.numberedTitle}>
            <span>1.</span>
            <h2>Pack principal seleccionado</h2>
          </div>

          <div className={styles.packSelectorRow}>
            <select
              value={packId}
              onChange={(event) => setPackId(event.target.value)}
              disabled={!providerId}
            >
              <option value="">
                {providerId ? "Seleccionar Pack principal" : "Primero selecciona proveedor"}
              </option>
              {(packs.length ? packs : availableProducts).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {selectedPack ? (
            <div className={styles.packCard}>
              <div className={styles.packIdentity}>
                <div className={styles.productPlaceholder}>▣</div>
                <div>
                  <strong>{selectedPack.name}</strong>
                  {promotionIsActive(selectedPack) && <b>PROMOCIÓN OFICIAL</b>}
                  <p>{selectedPack.features || "Producto configurado desde Gestión."}</p>
                </div>
              </div>

              <div className={styles.packFeatures}>
                <small>INCLUYE ESTE PACK</small>
                <p>{selectedPack.features || "Características pendientes de completar en Gestión."}</p>
              </div>

              <div className={styles.packEconomics}>
                <div>
                  <small>PRECIO TARIFA</small>
                  <strong>{packBaseInitial.toFixed(2)} €</strong>
                </div>
                <div className={styles.promo}>
                  <small>PROMOCIÓN OFICIAL</small>
                  <strong>{promotionText(packBaseInitial, selectedPack)}</strong>
                </div>
                <div>
                  <small>PRECIO FINAL</small>
                  <strong className={styles.orange}>{packFinalInitial.toFixed(2)} €</strong>
                  <span>IVA ({packVat}%): {packInitialVat.toFixed(2)} €</span>
                  <b>TOTAL IVA INCL.: {(packFinalInitial + packInitialVat).toFixed(2)} €</b>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.emptyPack}>
              Selecciona un Pack para ver características, promoción e importes.
            </div>
          )}
        </section>

        <section>
          <div className={styles.numberedTitle}>
            <span>2.</span>
            <h2>Productos adicionales</h2>
          </div>

          <div className={styles.productTableHead}>
            <span>Producto</span>
            <span>Características principales</span>
            <span>Uds.</span>
            <span>Precio tarifa</span>
            <span>Promoción</span>
            <span>Precio final</span>
            <span>IVA</span>
            <span>Total IVA incl.</span>
            <span>Acciones</span>
          </div>

          <div className={styles.productRows}>
            {lines.map((line) => {
              const item = lineData.find((entry) => entry.line.id === line.id);
              const product = item?.product;
              const total = (item?.totalInitialBase || 0) + (item?.totalInitialVat || 0);

              return (
                <div className={styles.productRow} key={line.id}>
                  <select
                    value={line.productId}
                    onChange={(event) =>
                      updateLine(line.id, { productId: event.target.value })
                    }
                  >
                    <option value="">Seleccionar producto</option>
                    {availableProducts
                      .filter((productItem) => productItem.id !== packId)
                      .map((productItem) => (
                        <option key={productItem.id} value={productItem.id}>
                          {productItem.name}
                        </option>
                      ))}
                  </select>

                  <div className={styles.featureCell}>
                    {product?.features || "—"}
                  </div>

                  <input
                    type="number"
                    min="1"
                    value={line.qty}
                    onChange={(event) =>
                      updateLine(line.id, {
                        qty: Math.max(1, Number(event.target.value) || 1),
                      })
                    }
                  />

                  <strong>{(item?.baseInitial || 0).toFixed(2)} €</strong>
                  <span className={styles.promoText}>
                    {promotionText(item?.baseInitial || 0, product)}
                  </span>
                  <strong>{(item?.finalInitial || 0).toFixed(2)} €</strong>
                  <span>{(item?.totalInitialVat || 0).toFixed(2)} €</span>
                  <strong>{total.toFixed(2)} €</strong>

                  <button
                    type="button"
                    onClick={() =>
                      setLines((current) =>
                        current.filter((itemLine) => itemLine.id !== line.id)
                      )
                    }
                  >
                    🗑
                  </button>
                </div>
              );
            })}
          </div>

          <button type="button" className={styles.addProductButton} onClick={addLine}>
            ＋ Añadir producto
          </button>

          <div className={styles.additionalTotals}>
            <div><small>BASE ADICIONAL</small><strong>{additionalInitialBase.toFixed(2)} €</strong></div>
            <div><small>IVA</small><strong>{additionalInitialVat.toFixed(2)} €</strong></div>
            <div><small>TOTAL ADICIONAL</small><strong>{(additionalInitialBase + additionalInitialVat).toFixed(2)} €</strong></div>
          </div>
        </section>

        <section>
          <div className={styles.numberedTitle}>
            <span>3.</span>
            <h2>Fechas importantes</h2>
          </div>

          <div className={styles.dateCards}>
            <label>
              Fecha de alta
              <input type="date" defaultValue={new Date().toISOString().slice(0, 10)} readOnly />
            </label>

            <label>
              Fecha prevista instalación
              <input
                type="date"
                value={installationDate}
                onChange={(event) => setInstallationDate(event.target.value)}
              />
            </label>

            <label className={styles.activationCard}>
              Fecha de activación *
              <input
                type="date"
                value={activationDate}
                onChange={(event) => setActivationDate(event.target.value)}
              />
              <small>La activación determina el mes de producción.</small>
            </label>

            <div className={styles.commissionCard}>
              <small>Mes previsto de comisión</small>
              <strong>
                {commissionMonth
                  ? commissionMonth.charAt(0).toUpperCase() + commissionMonth.slice(1)
                  : "Pendiente"}
              </strong>
              <span>Se cobra el mes siguiente a la activación.</span>
            </div>
          </div>
        </section>

        <section>
          <div className={styles.numberedTitle}>
            <span>4.</span>
            <h2>Documentos</h2>
          </div>

          <div className={styles.documentMasterRow}>
            <div>
              <span>📎</span>
              <small>
                {docs.length
                  ? `${docs.length} documento(s) adjunto(s)`
                  : "No hay documentos adjuntos"}
              </small>
            </div>

            <select value={docType} onChange={(event) => setDocType(event.target.value)}>
              {DOC_TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <label className={styles.masterUpload}>
              ☁ Añadir documento
              <input
                type="file"
                hidden
                onChange={(event) => {
                  addDoc(event.target.files?.[0] || null);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          {docs.length > 0 && (
            <div className={styles.documentList}>
              {docs.map((doc) => (
                <div className={styles.documentItem} key={doc.id}>
                  <span>📄</span>
                  <div>
                    <strong>{doc.name}</strong>
                    <small>{doc.type} · {doc.date}</small>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDocs((current) => current.filter((item) => item.id !== doc.id))
                    }
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className={styles.numberedTitle}>
            <span>5.</span>
            <h2>Notas</h2>
          </div>
          <textarea
            className={styles.masterNotes}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Observaciones de esta oportunidad..."
          />
        </section>

        <section>
          <div className={styles.numberedTitle}>
            <span>6.</span>
            <h2>Acciones</h2>
          </div>

          <div className={styles.masterActions}>
            <button
              type="button"
              className={styles.pdfAction}
              onClick={() =>
                alert(
                  "La estructura de la oferta ya contiene Pack + características + productos + promociones + IVA. El siguiente paso es convertir esta misma oferta en PDF."
                )
              }
            >
              ⇩ Vista / borrador oferta
            </button>

            <div>
              <button type="button" onClick={() => router.back()}>
                Cancelar
              </button>
              <button type="button" className={styles.secondaryOrange}>
                Guardar borrador
              </button>
              <button type="submit" className={styles.masterPrimary}>
                Guardar oportunidad
              </button>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}

export default function AlarmOpportunityPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Cargando alarmas...</div>}>
      <AlarmOpportunityContent />
    </Suspense>
  );
}

