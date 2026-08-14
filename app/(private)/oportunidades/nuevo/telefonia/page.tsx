"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadClients } from "@/lib/clientes";
import { addClientActivity } from "@/lib/client-activity";
import styles from "../NuevoNegocio.module.css";

type SaleType =
  | "Convergente"
  | "Solo fibra"
  | "Solo móvil"
  | "Fibra + móviles"
  | "Telefonía empresa";

type Mode = "Comercial" | "BackOffice";

type Line = {
  id: string;
  number: string;
  action: "Portabilidad" | "Alta nueva";
  tariff: string;
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

type PhoneOpportunity = {
  id: string;
  service: "Telefonía";
  clientId: string;
  clientName: string;
  saleType: SaleType;
  operator: string;
  fiber: string;
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

const operators = [
  "Vodafone",
  "Orange",
  "Movistar",
  "DIGI",
  "MásMóvil",
  "Yoigo",
  "Otro",
];

const tariffs = [
  "Ilimitada",
  "100 GB",
  "50 GB",
  "25 GB",
  "Solo voz",
  "Otra",
];

function newLine(): Line {
  return {
    id: `l-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    number: "",
    action: "Portabilidad",
    tariff: "Ilimitada",
    iccid: "",
    sim: "SIM",
    donor: "",
    status: "Pendiente BackOffice",
    portDate: "",
  };
}

function TelefoniaContent() {
  const router = useRouter();
  const search = useSearchParams();

  const clients = useMemo(
    () => loadClients().filter((c) => !c.deletedAt),
    []
  );

  const [opportunityId, setOpportunityId] = useState("");
  const [clientId, setClientId] = useState(search.get("cliente") || "");
  const [mode, setMode] = useState<Mode>("Comercial");

  const [saleType, setSaleType] = useState<SaleType>("Convergente");
  const [operator, setOperator] = useState("Vodafone");
  const [fiber, setFiber] = useState("1 Gb");
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
      tariff: "Ilimitada",
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

  const hasFiber = saleType !== "Solo móvil";
  const hasMobile = saleType !== "Solo fibra";

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

  function update(
    id: string,
    key: keyof Line,
    value: string
  ) {
    setLines((current) =>
      current.map((line) =>
        line.id === id
          ? { ...line, [key]: value }
          : line
      )
    );
  }

  function validateCommercial() {
    if (!clientId) {
      alert("Selecciona un cliente.");
      return false;
    }

    if (!operator) {
      alert("Selecciona un operador.");
      return false;
    }

    if (hasMobile) {
      if (!lines.length) {
        alert("Añade al menos una línea móvil.");
        return false;
      }

      const incomplete = lines.some(
        (line) => !line.number.trim()
      );

      if (incomplete) {
        alert(
          "Indica el número de todas las líneas móviles antes de enviar a BackOffice."
        );
        return false;
      }
    }

    return true;
  }

  function validateBackOffice() {
    if (!reference.trim()) {
      alert("Indica la referencia o número de pedido.");
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

  function save(
    action: "draft" | "send" | "backoffice"
  ) {
    if (action === "send" && !validateCommercial()) {
      return;
    }

    if (
      action === "backoffice" &&
      !validateBackOffice()
    ) {
      return;
    }

    if (action === "draft" && !clientId) {
      alert("Selecciona un cliente.");
      return;
    }

    const id =
      opportunityId || `tel-${Date.now()}`;

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
        : action === "send"
        ? "Pendiente BackOffice"
        : getBackOfficeStatus();

    const item: PhoneOpportunity = {
      id,
      service: "Telefonía",
      clientId,
      clientName: client?.name || "",
      saleType,
      operator,
      fiber: hasFiber ? fiber : "",
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
      const raw = JSON.parse(
        localStorage.getItem(key) || "[]"
      );

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
          createdAt:
            existing.createdAt || item.createdAt,
        }
      : item;

    const next = existing
      ? previous.map((opportunity) =>
          opportunity.id === id
            ? savedItem
            : opportunity
        )
      : [savedItem, ...previous];

    localStorage.setItem(
      key,
      JSON.stringify(next)
    );

    addClientActivity({
      clientId,
      type: "Oportunidad",
      title: `Telefonía · ${saleType}`,
      detail:
        action === "draft"
          ? `Borrador · ${
              hasMobile ? lines.length : 0
            } línea(s)`
          : action === "send"
          ? `Enviada a BackOffice · ${
              hasMobile ? lines.length : 0
            } línea(s)`
          : `${status} · ${
              hasMobile ? lines.length : 0
            } línea(s)`,
      user:
        client?.commercial ||
        "Usuario actual",
    });

    if (action === "send") {
      setMode("BackOffice");

      alert(
        "Oportunidad enviada a BackOffice correctamente."
      );

      return;
    }

    if (action === "backoffice") {
      alert(
        `Tramitación guardada. Estado actual: ${status}.`
      );

      return;
    }

    alert("Borrador guardado.");
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <button
            type="button"
            onClick={() => router.back()}
          >
            ← Oportunidades
          </button>

          <span>ONE · TELEFONÍA</span>

          <h1>
            Nueva oportunidad · Telefonía
          </h1>

          <p>
            El comercial vende. BackOffice
            completa la tramitación.
          </p>
        </div>
      </header>

      <div className={styles.phoneRole}>
        <button
          type="button"
          className={
            mode === "Comercial"
              ? styles.phoneRoleActive
              : ""
          }
          onClick={() =>
            setMode("Comercial")
          }
        >
          🟠 Comercial
        </button>

        <button
          type="button"
          className={
            mode === "BackOffice"
              ? styles.phoneRoleActive
              : ""
          }
          onClick={() =>
            setMode("BackOffice")
          }
        >
          🔵 BackOffice
        </button>
      </div>

      <div className={styles.workspace}>
        <section className={styles.workArea}>
          <article className={styles.block}>
            <div className={styles.blockHead}>
              <span>01</span>

              <div>
                <h2>Cliente y venta</h2>
                <p>
                  Lo mínimo para construir la
                  operación.
                </p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label>
                Cliente *
                <select
                  value={clientId}
                  disabled={
                    mode === "BackOffice"
                  }
                  onChange={(e) =>
                    setClientId(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Seleccionar cliente
                  </option>

                  {clients.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                    >
                      {c.name} · {c.taxId}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tipo de venta
                <select
                  value={saleType}
                  disabled={
                    mode === "BackOffice"
                  }
                  onChange={(e) =>
                    setSaleType(
                      e.target
                        .value as SaleType
                    )
                  }
                >
                  <option>
                    Convergente
                  </option>
                  <option>
                    Solo fibra
                  </option>
                  <option>
                    Solo móvil
                  </option>
                  <option>
                    Fibra + móviles
                  </option>
                  <option>
                    Telefonía empresa
                  </option>
                </select>
              </label>

              <label>
                Operador
                <select
                  value={operator}
                  disabled={
                    mode === "BackOffice"
                  }
                  onChange={(e) =>
                    setOperator(
                      e.target.value
                    )
                  }
                >
                  {operators.map((x) => (
                    <option key={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </article>

          {hasFiber && (
            <article
              className={styles.block}
            >
              <div
                className={styles.blockHead}
              >
                <span>02</span>

                <div>
                  <h2>Fibra</h2>
                  <p>
                    Producto y domicilio de
                    instalación.
                  </p>
                </div>
              </div>

              <div
                className={styles.formGrid}
              >
                <label>
                  Velocidad
                  <select
                    value={fiber}
                    disabled={
                      mode === "BackOffice"
                    }
                    onChange={(e) =>
                      setFiber(
                        e.target.value
                      )
                    }
                  >
                    <option>300 Mb</option>
                    <option>600 Mb</option>
                    <option>1 Gb</option>
                    <option>10 Gb</option>
                  </select>
                </label>

                <label
                  className={styles.span2}
                >
                  Domicilio instalación

                  <input
                    value={address}
                    disabled={
                      mode === "BackOffice"
                    }
                    onChange={(e) =>
                      setAddress(
                        e.target.value
                      )
                    }
                    placeholder="Solo si es distinto al domicilio del cliente"
                  />
                </label>
              </div>
            </article>
          )}

          {hasMobile && (
            <article
              className={styles.block}
            >
              <div
                className={styles.blockHead}
              >
                <span>03</span>

                <div>
                  <h2>
                    Líneas móviles
                  </h2>

                  <p>
                    {mode === "Comercial"
                      ? "Número, portabilidad y tarifa. Nada de ICCID todavía."
                      : "Completa los datos técnicos sobre las líneas que ya vendió el comercial."}
                  </p>
                </div>
              </div>

              <div
                className={styles.phoneLines}
              >
                {lines.map((line, i) => (
                  <div
                    className={
                      styles.phoneLine
                    }
                    key={line.id}
                  >
                    <b>
                      Línea {i + 1}
                    </b>

                    <label>
                      Número
                      <input
                        value={
                          line.number
                        }
                        disabled={
                          mode ===
                          "BackOffice"
                        }
                        onChange={(e) =>
                          update(
                            line.id,
                            "number",
                            e.target.value
                          )
                        }
                        placeholder="600 000 000"
                      />
                    </label>

                    <label>
                      Operación
                      <select
                        value={
                          line.action
                        }
                        disabled={
                          mode ===
                          "BackOffice"
                        }
                        onChange={(e) =>
                          update(
                            line.id,
                            "action",
                            e.target.value
                          )
                        }
                      >
                        <option>
                          Portabilidad
                        </option>

                        <option>
                          Alta nueva
                        </option>
                      </select>
                    </label>

                    <label>
                      Tarifa
                      <select
                        value={
                          line.tariff
                        }
                        disabled={
                          mode ===
                          "BackOffice"
                        }
                        onChange={(e) =>
                          update(
                            line.id,
                            "tariff",
                            e.target.value
                          )
                        }
                      >
                        {tariffs.map(
                          (x) => (
                            <option
                              key={x}
                            >
                              {x}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    {mode ===
                      "BackOffice" && (
                      <>
                        <label>
                          ICCID
                          <input
                            value={
                              line.iccid
                            }
                            onChange={(e) =>
                              update(
                                line.id,
                                "iccid",
                                e.target
                                  .value
                              )
                            }
                            placeholder="8934..."
                          />
                        </label>

                        <label>
                          SIM
                          <select
                            value={
                              line.sim
                            }
                            onChange={(e) =>
                              update(
                                line.id,
                                "sim",
                                e.target
                                  .value
                              )
                            }
                          >
                            <option>
                              SIM
                            </option>
                            <option>
                              eSIM
                            </option>
                          </select>
                        </label>

                        <label>
                          Operador donante
                          <input
                            value={
                              line.donor
                            }
                            onChange={(e) =>
                              update(
                                line.id,
                                "donor",
                                e.target
                                  .value
                              )
                            }
                            placeholder="Operador actual"
                          />
                        </label>

                        <label>
                          Fecha portabilidad
                          <input
                            type="date"
                            value={
                              line.portDate
                            }
                            onChange={(e) =>
                              update(
                                line.id,
                                "portDate",
                                e.target
                                  .value
                              )
                            }
                          />
                        </label>

                        <label>
                          Estado
                          <select
                            value={
                              line.status
                            }
                            onChange={(e) =>
                              update(
                                line.id,
                                "status",
                                e.target
                                  .value
                              )
                            }
                          >
                            <option>
                              Pendiente
                              BackOffice
                            </option>

                            <option>
                              Solicitada
                            </option>

                            <option>
                              Portabilidad
                              confirmada
                            </option>

                            <option>
                              Activada
                            </option>

                            <option>
                              Incidencia
                            </option>
                          </select>
                        </label>
                      </>
                    )}

                    {mode ===
                      "Comercial" &&
                      lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeLine(
                              line.id
                            )
                          }
                        >
                          Eliminar línea
                        </button>
                      )}
                  </div>
                ))}

                {mode ===
                  "Comercial" && (
                  <button
                    type="button"
                    className={
                      styles.phoneAdd
                    }
                    onClick={addLine}
                  >
                    ＋ Añadir línea
                  </button>
                )}
              </div>
            </article>
          )}

          <article className={styles.block}>
            <div
              className={styles.blockHead}
            >
              <span>04</span>

              <div>
                <h2>
                  Condiciones económicas
                </h2>
                <p>
                  Resumen comercial de la
                  venta.
                </p>
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
                  disabled={
                    mode === "BackOffice"
                  }
                  onChange={(e) =>
                    setMonthly(
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Pago único €
                <input
                  type="number"
                  min="0"
                  step=".01"
                  value={single}
                  disabled={
                    mode === "BackOffice"
                  }
                  onChange={(e) =>
                    setSingle(
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                IVA
                <select
                  value={vat}
                  disabled={
                    mode === "BackOffice"
                  }
                  onChange={(e) =>
                    setVat(e.target.value)
                  }
                >
                  <option>21</option>
                  <option>10</option>
                  <option>0</option>
                </select>
              </label>
            </div>
          </article>

          {mode === "BackOffice" && (
            <article
              className={styles.block}
            >
              <div
                className={styles.blockHead}
              >
                <span>05</span>

                <div>
                  <h2>
                    Tramitación BackOffice
                  </h2>

                  <p>
                    Datos que no debe picar
                    el comercial.
                  </p>
                </div>
              </div>

              <div
                className={styles.formGrid}
              >
                <label>
                  Referencia / nº pedido
                  <input
                    value={reference}
                    onChange={(e) =>
                      setReference(
                        e.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Fecha activación
                  <input
                    type="date"
                    value={activation}
                    onChange={(e) =>
                      setActivation(
                        e.target.value
                      )
                    }
                  />
                </label>

                <label
                  className={styles.span2}
                >
                  Incidencias / notas
                  <textarea
                    value={notes}
                    onChange={(e) =>
                      setNotes(
                        e.target.value
                      )
                    }
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
              onClick={() =>
                router.back()
              }
            >
              Cancelar
            </button>

            {mode === "Comercial" && (
              <>
                <button
                  type="button"
                  className={
                    styles.secondary
                  }
                  onClick={() =>
                    save("draft")
                  }
                >
                  Guardar borrador
                </button>

                <button
                  type="button"
                  className={styles.primary}
                  onClick={() =>
                    save("send")
                  }
                >
                  Enviar a BackOffice
                </button>
              </>
            )}

            {mode === "BackOffice" && (
              <button
                type="button"
                className={styles.primary}
                onClick={() =>
                  save("backoffice")
                }
              >
                Guardar tramitación
              </button>
            )}
          </div>
        </section>

        <aside className={styles.context}>
          <article
            className={styles.contextCard}
          >
            <span>RESUMEN</span>

            <h3>{saleType}</h3>

            <p>
              {operator}
              {hasMobile
                ? ` · ${lines.length} línea(s)`
                : " · Sin líneas móviles"}
            </p>

            <div
              className={styles.phoneMoney}
            >
              <small>
                Mensual IVA incl.
              </small>
              <strong>
                {monthlyTotal.toFixed(2)} €
              </strong>

              <small>
                Pago único IVA incl.
              </small>
              <strong>
                {singleTotal.toFixed(2)} €
              </strong>

              <small>
                Total primer año
              </small>
              <strong>
                {firstYearTotal.toFixed(2)} €
              </strong>
            </div>
          </article>

          <article
            className={styles.advisor}
          >
            <span>FILOSOFÍA ONE</span>

            <h4>
              {mode === "Comercial"
                ? "Vender, no tramitar"
                : "Completar, no volver a picar"}
            </h4>

            <p>
              {mode === "Comercial"
                ? "Pide solo lo que el comercial conoce durante la venta. ICCID y datos técnicos quedan para BackOffice."
                : "BackOffice recibe la venta ya construida y añade únicamente los datos de alta, portabilidad y activación."}
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
      fallback={
        <div style={{ padding: 24 }}>
          Cargando telefonía...
        </div>
      }
    >
      <TelefoniaContent />
    </Suspense>
  );
}