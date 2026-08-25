"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadClients } from "@/lib/clientes";
import { addClientActivity } from "@/lib/client-activity";
import styles from "../NuevoNegocio.module.css";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { getCurrentOneUser } from "@/lib/current-one-user-client";

type Mode = "Comercial" | "BackOffice";

type Line = {
  id: string;
  number: string;
  action: "Portabilidad" | "Alta nueva";
  iccid: string;
  sim: "SIM" | "eSIM";
  donor: string;
  status:
    | "Pendiente BackOffice"
    | "Solicitada"
    | "Portabilidad confirmada"
    | "Activada"
    | "Incidencia";
  portDate: string;
};

type Provider = {
  id: string;
  name: string;
  service?: string | null;
  active?: boolean | null;
};

type CatalogProduct = {
  id: string;
  name: string;
  service?: string | null;
  category?: string | null;
  description?: string | null;
  provider_id?: string | null;
  active?: boolean | null;
  product_type?: string | null;
  operation_type?: string | null;
  pvp?: number | null;
  config?: Record<string, any> | null;
};

type PhoneOpportunity = {
  id: string;
  service: "Telefonía";
  clientId: string;
  clientName: string;
  providerId: string;
  operator: string;
  productId: string;
  productName: string;
  productDescription: string;
  productType: string;
  productSnapshot: Record<string, any>;
  address: string;
  lines: Line[];
  monthly: number;
  single: number;
  vat: number;
  monthlyTotal: number;
  singleTotal: number;
  firstYearTotal: number;
  activation: string;
  reference: string;
  notes: string;
  status:
    | "Borrador"
    | "Pendiente BackOffice"
    | "En tramitación"
    | "Activada"
    | "Incidencia";
  createdAt: string;
  updatedAt: string;
};

function newLine(): Line {
  return {
    id: `l-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    number: "",
    action: "Portabilidad",
    iccid: "",
    sim: "SIM",
    donor: "",
    status: "Pendiente BackOffice",
    portDate: "",
  };
}

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

function TelefoniaContent() {
  const router = useRouter();
  const search = useSearchParams();

  const clients = useMemo(
    () => loadClients().filter((c) => !c.deletedAt),
    []
  );

  const [opportunityId, setOpportunityId] = useState(search.get("id") || "");
  const [clientId, setClientId] = useState(search.get("cliente") || "");
  const [mode, setMode] = useState<Mode>("Comercial");
  const [roleReady, setRoleReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentOneUser()
      .then((user) => {
        if (cancelled) return;
        setMode(user.role === "Comercial" ? "Comercial" : "BackOffice");
      })
      .catch(() => {
        if (!cancelled) setMode("Comercial");
      })
      .finally(() => {
        if (!cancelled) setRoleReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  const [providerId, setProviderId] = useState("");
  const [productId, setProductId] = useState("");

  const [address, setAddress] = useState("");
  const [monthly, setMonthly] = useState("");
  const [single, setSingle] = useState("");
  const [vat, setVat] = useState("21");
  const [notes, setNotes] = useState("");

  const [lines, setLines] = useState<Line[]>([
    {
      id: "l1",
      number: "",
      action: "Portabilidad",
      iccid: "",
      sim: "SIM",
      donor: "",
      status: "Pendiente BackOffice",
      portDate: "",
    },
  ]);

  const [activation, setActivation] = useState("");
  const [reference, setReference] = useState("");

  const client = clients.find((c) => c.id === clientId);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        setCatalogLoading(true);
        setCatalogError("");

        const response = await fetch("/api/catalog", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "No se pudo cargar el catálogo");
        }

        const telProviders: Provider[] = (data.providers || []).filter(
          (p: Provider) =>
            p.active !== false &&
            normalize(p.service).toLowerCase() === "telefonía"
        );

        const telProducts: CatalogProduct[] = (data.products || []).filter(
          (p: CatalogProduct) => {
            const service = normalize(p.service || p.category).toLowerCase();
            return p.active !== false && service === "telefonía";
          }
        );

        if (cancelled) return;

        setProviders(telProviders);
        setCatalogProducts(telProducts);

        if (telProviders.length > 0) {
          setProviderId((current) => current || telProviders[0].id);
        }
      } catch (error: any) {
        if (!cancelled) {
          setCatalogError(error?.message || "Error cargando el catálogo");
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const providerProducts = useMemo(
    () => catalogProducts.filter((p) => p.provider_id === providerId),
    [catalogProducts, providerId]
  );

  useEffect(() => {
    if(catalogLoading) return;
    setProductId((current) =>
      providerProducts.some((p) => p.id === current)
        ? current
        : providerProducts[0]?.id || ""
    );
  }, [providerId, providerProducts, catalogLoading]);

  const selectedProvider =
    providers.find((p) => p.id === providerId) || null;

  const selectedProduct =
    catalogProducts.find((p) => p.id === productId) || null;

  const config = selectedProduct?.config || {};

  const productType =
    selectedProduct?.product_type ||
    config.phone_type ||
    "";

  const hasFiber =
    Boolean(config.fiber_speed) ||
    /fibra|convergente/i.test(productType) ||
    /fibra/i.test(selectedProduct?.name || "");

  const mobileLinesFromProduct = Number(config.mobile_lines || 0);

  const hasMobile =
    mobileLinesFromProduct > 0 ||
    /móvil|movil|línea|linea|convergente/i.test(productType) ||
    /móvil|movil|línea|linea/i.test(selectedProduct?.name || "");

  useEffect(() => {
    if (mobileLinesFromProduct > 0) {
      setLines((current) => {
        if (current.length === mobileLinesFromProduct) return current;

        if (current.length > mobileLinesFromProduct) {
          return current.slice(0, mobileLinesFromProduct);
        }

        return [
          ...current,
          ...Array.from(
            { length: mobileLinesFromProduct - current.length },
            () => newLine()
          ),
        ];
      });
    }
  }, [mobileLinesFromProduct]);

  useEffect(() => {
    if(opportunityId) return;
    if (selectedProduct?.pvp != null && selectedProduct.pvp > 0) {
      setMonthly(String(selectedProduct.pvp));
    }
  }, [selectedProduct?.id, opportunityId]);


  useEffect(()=>{
    const editId=search.get("id");
    if(!editId || catalogLoading) return;
    try{
      const stored=JSON.parse(localStorage.getItem("one_phone_opportunities_v1")||"[]");
      const saved:PhoneOpportunity|undefined=Array.isArray(stored)
        ? stored.find((item:any)=>String(item?.id)===String(editId))
        : undefined;
      if(!saved) return;

      setOpportunityId(saved.id);
      setClientId(saved.clientId||"");
      setProviderId(saved.providerId||"");
      setProductId(saved.productId||"");
      setAddress(saved.address||"");
      setLines(Array.isArray(saved.lines)&&saved.lines.length?saved.lines:[newLine()]);
      setMonthly(String(saved.monthly??""));
      setSingle(String(saved.single??""));
      setVat(String(saved.vat??21));
      setActivation(saved.activation||"");
      setReference(saved.reference||"");
      setNotes(saved.notes||"");
    }catch{}
  },[search,catalogLoading]);

  const tax = 1 + Number(vat || 0) / 100;
  const monthlyTotal = Number(monthly || 0) * tax;
  const singleTotal = Number(single || 0) * tax;
  const firstYearTotal = monthlyTotal * 12 + singleTotal;

  function addLine() {
    setLines((current) => [...current, newLine()]);
  }

  function removeLine(id: string) {
    setLines((current) => {
      if (current.length <= 1) return current;
      return current.filter((line) => line.id !== id);
    });
  }

  function update(id: string, key: keyof Line, value: string) {
    setLines((current) =>
      current.map((line) =>
        line.id === id ? { ...line, [key]: value } : line
      )
    );
  }

  function validateCommercial() {
    if (!clientId) {
      alert("Selecciona un cliente.");
      return false;
    }

    if (!providerId) {
      alert("Selecciona un operador.");
      return false;
    }

    if (!productId) {
      alert("Selecciona un producto.");
      return false;
    }

    if (hasMobile) {
      if (!lines.length) {
        alert("Añade al menos una línea móvil.");
        return false;
      }

      const incomplete = lines.some((line) => !line.number.trim());

      if (incomplete) {
        alert(
          "Indica el número de todas las líneas móviles antes de generar el presupuesto."
        );
        return false;
      }
    }

    return true;
  }

  function validateBackOffice() {
    const wantsActivation =
      Boolean(activation) ||
      (hasMobile &&
        lines.length > 0 &&
        lines.every((line) => line.status === "Activada"));

    if (wantsActivation && !reference.trim()) {
      alert(
        "Para marcar la operación como activada, indica la referencia o número de pedido."
      );
      return false;
    }

    return true;
  }

  function getBackOfficeStatus():
    | "En tramitación"
    | "Activada"
    | "Incidencia" {
    if (
      hasMobile &&
      lines.some((line) => line.status === "Incidencia")
    ) {
      return "Incidencia";
    }

    const mobileActivated =
      !hasMobile ||
      (lines.length > 0 &&
        lines.every((line) => line.status === "Activada"));

    if (mobileActivated && activation) {
      return "Activada";
    }

    return "En tramitación";
  }

  async function save(action: "draft" | "budget" | "backoffice") {
    if (action === "budget" && !validateCommercial()) {
      return;
    }

    if (action === "backoffice" && !validateBackOffice()) {
      return;
    }

    if (action === "draft" && !clientId) {
      alert("Selecciona un cliente.");
      return;
    }

    if (!selectedProduct || !selectedProvider) {
      alert("Selecciona operador y producto.");
      return;
    }

    const id = opportunityId || `tel-${Date.now()}`;

    if (!opportunityId) {
      setOpportunityId(id);
    }

    const now = new Date().toISOString();

    const status:
      | "Borrador"
      | "Pendiente BackOffice"
      | "En tramitación"
      | "Activada"
      | "Incidencia" =
      action === "draft"
        ? "Borrador"
        : action === "budget"
        ? "Borrador"
        : getBackOfficeStatus();

    const productSnapshot = {
      id: selectedProduct.id,
      name: selectedProduct.name,
      description: selectedProduct.description || "",
      productType,
      operationType: selectedProduct.operation_type || "",
      pvp: selectedProduct.pvp || 0,
      config: selectedProduct.config || {},
      providerId: selectedProvider.id,
      providerName: selectedProvider.name,
    };

    const item: PhoneOpportunity = {
      id,
      service: "Telefonía",
      clientId,
      clientName: client?.name || "",
      providerId: selectedProvider.id,
      operator: selectedProvider.name,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productDescription: selectedProduct.description || "",
      productType,
      productSnapshot,
      address: hasFiber ? address : "",
      lines: hasMobile ? lines : [],
      monthly: Number(monthly || 0),
      single: Number(single || 0),
      vat: Number(vat || 0),
      monthlyTotal,
      singleTotal,
      firstYearTotal,
      activation,
      reference,
      notes,
      status,
      createdAt: now,
      updatedAt: now,
    };

    const key = "one_phone_opportunities_v1";

    let previous: PhoneOpportunity[] = [];

    try {
      const raw = JSON.parse(localStorage.getItem(key) || "[]");
      previous = Array.isArray(raw) ? raw : [];
    } catch {
      previous = [];
    }

    const existing = previous.find(
      (opportunity) => opportunity.id === id
    );

    const savedItem: PhoneOpportunity = existing
      ? {
          ...item,
          createdAt: existing.createdAt || item.createdAt,
        }
      : item;

    const next = existing
      ? previous.map((opportunity) =>
          opportunity.id === id ? savedItem : opportunity
        )
      : [savedItem, ...previous];

    localStorage.setItem(key, JSON.stringify(next));

    // El Comercial registra la propiedad de la oportunidad en el servidor.
    // La API obtiene el usuario desde la sesión: el navegador no decide el propietario.
    if (action === "draft" || action === "budget") {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        alert("Tu sesión ha caducado. Vuelve a iniciar sesión antes de guardar el presupuesto.");
        router.push("/login");
        return;
      }

      const workflowResponse = await fetch("/api/commercial-workflow", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          opportunityId: id,
          status: "draft",
        }),
      });

      const workflowData = await workflowResponse.json();

      if (!workflowResponse.ok || !workflowData.ok) {
        // Revertimos el guardado local para no dejar una oportunidad sin propietario.
        localStorage.setItem(key, JSON.stringify(previous));
        alert(workflowData.error || "No se pudo asignar la presupuesto al comercial actual.");
        return;
      }
    }

    addClientActivity({
      clientId,
      type: "Presupuesto",
      title: `Presupuesto Telefonía · ${selectedProduct.name}`,
      detail:
        action === "draft"
          ? `Borrador de presupuesto · ${selectedProvider.name}`
          : action === "budget"
          ? `Presupuesto generado · ${selectedProvider.name}`
          : `${status} · ${selectedProvider.name}`,
      user: client?.commercial || "Usuario actual",
    });

    if (action === "backoffice") {
      alert(`Tramitación guardada. Estado actual: ${status}.`);
      router.push("/backoffice");
      return;
    }

    if(action==="draft"){
      alert("Borrador guardado.");
      return;
    }

    // Generar presupuesto abre su documento y NO continúa automáticamente.
    router.push(`/oportunidades/${savedItem.id}`);
  }

  const featureRows = [
    ["Tipo de producto", productType],
    ["Fibra", config.fiber_speed],
    ["Líneas móviles", config.mobile_lines],
    ["Datos móviles", config.mobile_data],
    ["Tipo de operación", selectedProduct?.operation_type],
  ].filter(([, value]) => normalize(value));

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <button type="button" onClick={() => router.back()}>
            ← Presupuestoes
          </button>

          <span>ONE · TELEFONÍA</span>

          <h1>
            {mode === "Comercial"
              ? "Nuevo presupuesto · Telefonía"
              : "Tramitación BackOffice · Telefonía"}
          </h1>

          <div
            style={{
              display: "inline-flex",
              marginTop: 8,
              padding: "7px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: ".04em",
              background: mode === "Comercial" ? "#fff3ed" : "#f1f1f1",
              color: mode === "Comercial" ? "#d95327" : "#222",
              border: "1px solid #e8e8e8",
            }}
          >
            PERFIL ACTUAL · {mode.toUpperCase()}
          </div>

          <p>
            {mode === "Comercial"
              ? "El comercial selecciona el producto y completa únicamente los datos de la venta."
              : "BackOffice recibe la venta ya creada y completa exclusivamente la tramitación técnica."}
          </p>
        </div>
      </header>

      <div className={styles.workspace}>
        <section className={styles.workArea}>
          <article className={styles.block}>
            <div className={styles.blockHead}>
              <span>01</span>
              <div>
                <h2>Cliente y producto</h2>
                <p>Selecciona cliente, operador y producto del catálogo.</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label>
                Cliente *
                <select
                  value={clientId}
                  disabled={mode === "BackOffice" && Boolean(opportunityId)}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">Seleccionar cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.taxId}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Operador *
                <select
                  value={providerId}
                  disabled={(mode === "BackOffice" && Boolean(opportunityId)) || catalogLoading}
                  onChange={(e) => setProviderId(e.target.value)}
                >
                  {providers.length === 0 && (
                    <option value="">
                      {catalogLoading
                        ? "Cargando operadores..."
                        : "Sin operadores disponibles"}
                    </option>
                  )}
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Producto *
                <select
                  value={productId}
                  disabled={mode === "BackOffice" || !providerId}
                  onChange={(e) => setProductId(e.target.value)}
                >
                  {providerProducts.length === 0 && (
                    <option value="">Sin productos para este operador</option>
                  )}
                  {providerProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {catalogError && (
              <p style={{ marginTop: 12, color: "#b42318" }}>
                {catalogError}
              </p>
            )}
          </article>

          {selectedProduct && (
            <article className={styles.block}>
              <div className={styles.blockHead}>
                <span>02</span>
                <div>
                  <h2>Producto seleccionado</h2>
                  <p>Las características vienen del catálogo. No se vuelven a picar.</p>
                </div>
              </div>

              <div style={{ padding: 16 }}>
                <div
                  style={{
                    border: "1px solid #ececec",
                    borderRadius: 12,
                    padding: 16,
                    background: "#fafafa",
                    marginBottom: 14,
                  }}
                >
                  <strong style={{ fontSize: 17 }}>{selectedProduct.name}</strong>
                  <div style={{ marginTop: 5, color: "#666" }}>
                    {selectedProvider?.name}
                  </div>

                  {selectedProduct.description && (
                    <p style={{ margin: "10px 0 0", color: "#555" }}>
                      {selectedProduct.description}
                    </p>
                  )}
                </div>

                {featureRows.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 10,
                    }}
                  >
                    {featureRows.map(([label, value]) => (
                      <div
                        key={String(label)}
                        style={{
                          border: "1px solid #eee",
                          borderRadius: 10,
                          padding: 12,
                          background: "#fff",
                        }}
                      >
                        <small style={{ color: "#777" }}>{label}</small>
                        <div style={{ marginTop: 4, fontWeight: 700 }}>
                          {String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          )}

          {hasFiber && selectedProduct && (
            <article className={styles.block}>
              <div className={styles.blockHead}>
                <span>03</span>
                <div>
                  <h2>Instalación</h2>
                  <p>Solo datos propios de esta oportunidad.</p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.span2}>
                  Domicilio instalación
                  <input
                    value={address}
                    disabled={mode === "BackOffice" && Boolean(opportunityId)}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Solo si es distinto al domicilio del cliente"
                  />
                </label>
              </div>
            </article>
          )}

          {hasMobile && selectedProduct && (
            <article className={styles.block}>
              <div className={styles.blockHead}>
                <span>{hasFiber ? "04" : "03"}</span>
                <div>
                  <h2>Líneas móviles</h2>
                  <p>
                    {mode === "Comercial"
                      ? "Solo datos propios de la venta: número y si es alta o portabilidad."
                      : "BackOffice completa ICCID, SIM, operador donante y activación."}
                  </p>
                </div>
              </div>

              <div className={styles.phoneLines}>
                {lines.map((line, i) => (
                  <div className={styles.phoneLine} key={line.id}>
                    <b>Línea {i + 1}</b>

                    <label>
                      Número
                      <input
                        value={line.number}
                        disabled={mode === "BackOffice" && Boolean(opportunityId)}
                        onChange={(e) =>
                          update(line.id, "number", e.target.value)
                        }
                        placeholder="600 000 000"
                      />
                    </label>

                    <label>
                      Operación
                      <select
                        value={line.action}
                        disabled={mode === "BackOffice" && Boolean(opportunityId)}
                        onChange={(e) =>
                          update(line.id, "action", e.target.value)
                        }
                      >
                        <option>Portabilidad</option>
                        <option>Alta nueva</option>
                      </select>
                    </label>

                    {mode === "BackOffice" && (
                      <>
                        <label>
                          ICCID
                          <input
                            value={line.iccid}
                            onChange={(e) =>
                              update(line.id, "iccid", e.target.value)
                            }
                            placeholder="8934..."
                          />
                        </label>

                        <label>
                          SIM
                          <select
                            value={line.sim}
                            onChange={(e) =>
                              update(line.id, "sim", e.target.value)
                            }
                          >
                            <option>SIM</option>
                            <option>eSIM</option>
                          </select>
                        </label>

                        <label>
                          Operador donante
                          <input
                            value={line.donor}
                            onChange={(e) =>
                              update(line.id, "donor", e.target.value)
                            }
                            placeholder="Operador actual"
                          />
                        </label>

                        <label>
                          Fecha portabilidad
                          <input
                            type="date"
                            value={line.portDate}
                            onChange={(e) =>
                              update(line.id, "portDate", e.target.value)
                            }
                          />
                        </label>

                        <label>
                          Estado
                          <select
                            value={line.status}
                            onChange={(e) =>
                              update(line.id, "status", e.target.value)
                            }
                          >
                            <option>Pendiente BackOffice</option>
                            <option>Solicitada</option>
                            <option>Portabilidad confirmada</option>
                            <option>Activada</option>
                            <option>Incidencia</option>
                          </select>
                        </label>
                      </>
                    )}

                    {mode === "Comercial" && lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                      >
                        Eliminar línea
                      </button>
                    )}
                  </div>
                ))}

                {mode === "Comercial" && (
                  <button
                    type="button"
                    className={styles.phoneAdd}
                    onClick={addLine}
                  >
                    ＋ Añadir línea
                  </button>
                )}
              </div>
            </article>
          )}

          <article className={styles.block}>
            <div className={styles.blockHead}>
              <span>{hasFiber && hasMobile ? "05" : "04"}</span>
              <div>
                <h2>Condiciones económicas</h2>
                <p>Resumen comercial de la venta.</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label>
                Cuota mensual €
                <input
                  type="number"
                  min="0"
                  step=".01"
                  value={monthly}
                  disabled={mode === "BackOffice" && Boolean(opportunityId)}
                  onChange={(e) => setMonthly(e.target.value)}
                />
              </label>

              <label>
                Pago único €
                <input
                  type="number"
                  min="0"
                  step=".01"
                  value={single}
                  disabled={mode === "BackOffice" && Boolean(opportunityId)}
                  onChange={(e) => setSingle(e.target.value)}
                />
              </label>

              <label>
                IVA
                <select
                  value={vat}
                  disabled={mode === "BackOffice" && Boolean(opportunityId)}
                  onChange={(e) => setVat(e.target.value)}
                >
                  <option>21</option>
                  <option>10</option>
                  <option>0</option>
                </select>
              </label>
            </div>
          </article>

          {mode === "BackOffice" && (
            <article className={styles.block}>
              <div className={styles.blockHead}>
                <span>06</span>
                <div>
                  <h2>Tramitación BackOffice</h2>
                  <p>Datos que no debe picar el comercial.</p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <label>
                  Referencia / nº pedido
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </label>

                <label>
                  Fecha activación
                  <input
                    type="date"
                    value={activation}
                    onChange={(e) => setActivation(e.target.value)}
                  />
                </label>

                <label className={styles.span2}>
                  Incidencias / notas
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Solo si BackOffice necesita dejar constancia..."
                  />
                </label>
              </div>
            </article>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => router.back()}
            >
              Cancelar
            </button>

            {mode === "Comercial" && (
              <>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => save("draft")}
                >
                  Guardar borrador
                </button>

                <button
                  type="button"
                  className={styles.primary}
                  onClick={() => save("budget")}
                  disabled={!roleReady}
                >
                  Generar presupuesto
                </button>
              </>
            )}

            {mode === "BackOffice" && (
              <button
                type="button"
                className={styles.primary}
                onClick={() => save("backoffice")}
                disabled={!roleReady}
              >
                Guardar y tramitar
              </button>
            )}
          </div>
        </section>

        <aside className={styles.context}>
          <article className={styles.contextCard}>
            <span>RESUMEN</span>

            <h3>{selectedProduct?.name || "Sin producto"}</h3>

            <p>
              {selectedProvider?.name || "Sin operador"}
              {hasMobile ? ` · ${lines.length} línea(s)` : ""}
            </p>

            <div className={styles.phoneMoney}>
              <small>Mensual IVA incl.</small>
              <strong>{monthlyTotal.toFixed(2)} €</strong>

              <small>Pago único IVA incl.</small>
              <strong>{singleTotal.toFixed(2)} €</strong>

              <small>Total primer año</small>
              <strong>{firstYearTotal.toFixed(2)} €</strong>
            </div>
          </article>

          <article className={styles.advisor}>
            <span>FILOSOFÍA ONE</span>

            <h4>
              {mode === "Comercial"
                ? "Elegir producto, no reconstruirlo"
                : "Completar, no volver a picar"}
            </h4>

            <p>
              {mode === "Comercial"
                ? "El producto y sus características vienen del catálogo. El comercial solo añade los datos propios de esta venta."
                : "BackOffice recibe la venta ya construida y añade únicamente los datos técnicos de tramitación."}
            </p>
          </article>
        </aside>
      </div>
    </main>
  );
}

export default function TelefoniaPage() {
  return (
    <Suspense
      fallback={<div style={{ padding: 24 }}>Cargando telefonía...</div>}
    >
      <TelefoniaContent />
    </Suspense>
  );
}
