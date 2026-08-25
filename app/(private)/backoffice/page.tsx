"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Opportunity = {
  id: string;
  clientId?: string;
  clientName?: string;
  service?: string;
  operator?: string;
  productName?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type Workflow = {
  opportunity_id: string;
  status: string;
  review_status: string;
  commercial_editable: boolean;
  commercial_user_id?: string | null;
  backoffice_user_id?: string | null;
  updated_at?: string;
};

type Ticket = {
  id: string;
  opportunity_id: string;
  title: string;
  description?: string | null;
  status: string;
  created_at?: string;
};

type ProductLink = {
  opportunity_id: string;
  product_name_snapshot?: string | null;
  provider_name_snapshot?: string | null;
  product_type_snapshot?: string | null;
  product_config_snapshot?: Record<string, any> | null;
};

type OneUser = {
  id: string;
  name: string;
  email: string;
  role: "Administrador" | "BackOffice" | "Comercial";
  active: boolean;
};

type QueueItem = {
  op: Opportunity;
  workflow?: Workflow;
  ticket?: Ticket;
  product?: ProductLink;
};

type DirectContract = {
  id:string;
  reference?:string;
  external_reference?:string;
  client_id:string;
  client?:{id:string;name:string;reference?:string}|null;
  service_name?:string;
  provider?:string;
  product_name?:string;
  status:string;
  commercial_name?:string|null;
  created_at?:string;
  data?:Record<string,any>|null;
};

const tabs = [
  ["all", "Todas"],
  ["sent_backoffice", "Recibidas"],
  ["in_review", "En revisión"],
  ["correction_requested", "Correcciones"],
  ["validated", "Validadas"],
  ["processing", "En tramitación"],
  ["contracted", "Tramitadas"],
] as const;

type TabKey = typeof tabs[number][0];

function contractState(contract:DirectContract): TabKey {
  if (contract.data?.correction_requested || contract.data?.backoffice_status === "correction_requested") return "correction_requested";
  if (contract.status === "En tramitación") return "processing";
  if (contract.status === "Tramitado en compañía" || contract.status === "Pendiente de activación") return "contracted";
  return "sent_backoffice";
}

function effectiveState(item: QueueItem): TabKey {
  if (item.workflow?.review_status === "correction_requested") {
    return "correction_requested";
  }
  const st = item.workflow?.status;
  if (
    st === "sent_backoffice" ||
    st === "in_review" ||
    st === "validated" ||
    st === "processing" ||
    st === "contracted"
  ) {
    return st;
  }

  const local = String(item.op.status || "").toLowerCase();
  if (local.includes("backoffice")) return "sent_backoffice";
  if (local.includes("tramitad")) return "contracted";
  if (local.includes("tramit")) return "processing";
  return "sent_backoffice";
}

function badge(state: TabKey) {
  if (state === "sent_backoffice") return ["RECIBIDA", "#2c5e91", "#eef6ff", "#ccdef2"];
  if (state === "in_review") return ["EN REVISIÓN", "#7b5a19", "#fff9e8", "#eadba5"];
  if (state === "correction_requested") return ["CORRECCIÓN", "#a23a16", "#fff2ea", "#ffd1bd"];
  if (state === "validated") return ["VALIDADA", "#176343", "#eef8f2", "#cfe7d9"];
  if (state === "processing") return ["EN TRAMITACIÓN", "#765d17", "#fff9e8", "#eadba5"];
  if (state === "contracted") return ["TRAMITADA", "#16734a", "#edf9f3", "#cce9da"];
  return ["OPORTUNIDAD", "#555", "#f6f6f6", "#e5e5e5"];
}

export default function BackOfficePage() {
  const router = useRouter();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [contracts, setContracts] = useState<DirectContract[]>([]);
  const [commercials, setCommercials] = useState<OneUser[]>([]);
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonTitle, setReasonTitle] = useState("Datos incorrectos");
  const [reasonText, setReasonText] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data: { session } } = await supabaseBrowser.auth.getSession();

    // Contratos centrales: nunca deben depender del módulo legado de oportunidades.
    try {
      const contractRes = await fetch("/api/backoffice-contracts", {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
        cache: "no-store",
      });
      const contractData = await contractRes.json();
      if (!contractRes.ok || !contractData.ok) {
        throw new Error(contractData.error || "No se pudieron cargar los contratos.");
      }
      setContracts(contractData.contracts || []);
    } catch (e) {
      console.error("Error cargando contratos centrales de BackOffice", e);
      setContracts([]);
    }

    // Compatibilidad temporal con ofertas/oportunidades antiguas. Si falla,
    // NO vaciamos los contratos reales de one_contracts.
    try {
      const opRes = await fetch("/api/backoffice-opportunities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({}),
        cache: "no-store",
      });
      const data = await opRes.json();
      if (!opRes.ok || !data.ok) {
        throw new Error(data.error || "No se pudo cargar el módulo legado de ofertas.");
      }

      const central: Opportunity[] = data.opportunities || [];
      const wf: Workflow[] = data.workflow || [];
      const tickets: Ticket[] = data.tickets || [];
      const products: ProductLink[] = data.products || [];
      setItems(central.map((op) => ({
        op,
        workflow: wf.find((x) => x.opportunity_id === op.id),
        ticket: tickets.find((x) => x.opportunity_id === op.id && x.status === "open"),
        product: products.find((x) => x.opportunity_id === op.id),
      })));
      setCommercials((data.users || []).filter((u: OneUser) => u.role === "Comercial" && u.active));
    } catch (e) {
      console.warn("Módulo legado de ofertas no disponible; Tramitaciones continúa con contratos centrales.", e);
      setItems([]);
      setCommercials([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const out: Record<TabKey, number> = {
      all: items.length + contracts.length,
      sent_backoffice: 0,
      in_review: 0,
      correction_requested: 0,
      validated: 0,
      processing: 0,
      contracted: 0,
    };

    items.forEach((item) => {
      out[effectiveState(item)] += 1;
    });
    contracts.forEach((contract) => {
      out[contractState(contract)] += 1;
    });

    return out;
  }, [items, contracts]);

  const filteredContracts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contracts.filter((contract) => {
      const state = contractState(contract);
      const text = `${contract.client?.name || ""} ${contract.provider || ""} ${contract.product_name || ""} ${contract.service_name || ""}`.toLowerCase();
      return (tab === "all" || state === tab) && (!q || text.includes(q));
    });
  }, [contracts, tab, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((item) => {
      const state = effectiveState(item);
      const provider =
        item.product?.provider_name_snapshot ||
        item.op.operator ||
        "";
      const product =
        item.product?.product_name_snapshot ||
        item.op.productName ||
        "";

      const text = `${item.op.clientName || ""} ${provider} ${product} ${
        item.op.service || ""
      }`.toLowerCase();

      return (tab === "all" || state === tab) && (!q || text.includes(q));
    });
  }, [items, tab, query]);

  async function action(
    opportunityId: string,
    actionName:
      | "start_review"
      | "validate"
      | "processing"
      | "complete_processing"
      | "return_draft"
      | "assign",
    extra: Record<string, any> = {}
  ) {
    setSaving(true);
    try {
      const res = await fetch("/api/backoffice-opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId,
          action: actionName,
          ...extra,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        alert(data.error || "No se pudo completar la acción.");
        return;
      }

      await load();

      if (selected?.op.id === opportunityId) {
        const refreshed = data.workflow;
        setSelected((current) =>
          current ? { ...current, workflow: refreshed } : current
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function contractAction(contractId:string, actionName:"start_processing"|"submit_company"|"mark_active") {
    setSaving(true);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch("/api/backoffice-contracts", {
        method:"PATCH",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${session?.access_token || ""}`},
        body:JSON.stringify({contractId, action:actionName}),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { alert(data.error || "No se pudo tramitar el contrato."); return; }
      await load();
    } finally { setSaving(false); }
  }

  async function returnToDraft() {
    if (!selected) return;
    if (!reasonTitle.trim() || !reasonText.trim()) {
      alert("Indica motivo y comentario.");
      return;
    }

    await action(selected.op.id, "return_draft", {
      title: reasonTitle.trim(),
      description: reasonText.trim(),
    });

    setReasonOpen(false);
    setReasonText("");
    setSelected(null);
  }

  return (
    <main style={{ maxWidth: 1440, margin: "0 auto", padding: 28 }}>
      <header style={{ marginBottom: 22 }}>
        <span style={eyebrow}>ONE · TRAMITACIONES</span>
        <h1 style={{ margin: "5px 0 6px", fontSize: 34, letterSpacing: -0.8 }}>
          Tramitaciones
        </h1>
        <p style={{ margin: 0, color: "#6f6f6f" }}>
          Revisa, valida y tramita ofertas y contratos desde una única bandeja de ONE.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,minmax(0,1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <Kpi label="Recibidas" value={counts.sent_backoffice} />
        <Kpi label="En revisión" value={counts.in_review} />
        <Kpi label="Correcciones abiertas" value={counts.correction_requested} accent />
        <Kpi
          label="En curso"
          value={counts.validated + counts.processing}
        />
      </section>

      <section
        style={{
          background: "#fff",
          border: "1px solid #ececec",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,.035)",
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {tabs.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  border:
                    tab === key
                      ? "1px solid #ffc2aa"
                      : "1px solid #e8e8e8",
                  background: tab === key ? "#fff3ed" : "#fff",
                  color: tab === key ? "#d94d23" : "#555",
                  borderRadius: 999,
                  padding: "8px 11px",
                  fontWeight: 900,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {label} · {counts[key]}
              </button>
            ))}
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente, proveedor o producto..."
            style={{
              width: 330,
              maxWidth: "100%",
              height: 40,
              border: "1px solid #ddd",
              borderRadius: 11,
              padding: "0 12px",
            }}
          />
        </div>

        <div style={{ padding: 16 }}>
          {loading ? (
            <Empty text="Cargando bandeja BackOffice..." />
          ) : filtered.length === 0 && filteredContracts.length === 0 ? (
            <Empty text="No hay tramitaciones en esta bandeja." />
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {filteredContracts.map((contract) => {
                const state = contractState(contract);
                const [label, fg, bg, border] = badge(state);
                return <article key={contract.id} style={{display:"grid",gridTemplateColumns:"52px minmax(220px,1.4fr) minmax(220px,1.2fr) 150px 170px auto",gap:12,alignItems:"center",border:"1px solid #ffd9ca",background:"#fffaf7",borderRadius:14,padding:12}}>
                  <div style={{width:48,height:48,borderRadius:12,border:"1px solid #ffd9ca",display:"grid",placeItems:"center",fontWeight:950,color:"#e25328",background:"#fff"}}>C</div>
                  <div><small style={{color:"#e25328",fontSize:9,fontWeight:900,letterSpacing:.6,textTransform:"uppercase"}}>CONTRATO DIRECTO · {contract.service_name || "Servicio"}</small><div style={{fontWeight:900,fontSize:15,marginTop:2}}>{contract.client?.name || "Cliente"}</div><div style={{color:"#777",fontSize:12,marginTop:2}}>{contract.commercial_name || "DIRECTO AN24"}</div></div>
                  <div><div style={{fontWeight:850,fontSize:13}}>{contract.product_name || "Producto pendiente"}</div><div style={{color:"#777",fontSize:12,marginTop:3}}>{contract.provider || "Proveedor pendiente"}</div><div style={{color:"#999",fontSize:10,marginTop:3}}>{contract.external_reference || contract.reference || contract.id}</div></div>
                  <span style={{justifySelf:"start",border:`1px solid ${border}`,background:bg,color:fg,borderRadius:999,padding:"6px 8px",fontSize:9,fontWeight:900,whiteSpace:"nowrap"}}>{label}</span>
                  {state === "correction_requested" ? <button onClick={()=>router.push(`/contratos/${contract.id}`)} style={primarySoft}>Revisar corrección</button> : state === "contracted" ? <button onClick={()=>router.push(`/contratos/${contract.id}`)} style={primarySoft}>Comprobar activación</button> : <button disabled={saving} onClick={()=>state === "processing" ? router.push(`/contratos/${contract.id}`) : contractAction(contract.id,"start_processing")} style={primarySoft}>{state === "processing" ? "Abrir para tramitar" : "Iniciar tramitación"}</button>}
                  <button onClick={()=>router.push(`/contratos/${contract.id}`)} style={primarySoft}>Abrir contrato</button>
                </article>;
              })}
              {filtered.map((item) => {
                const state = effectiveState(item);
                const [label, fg, bg, border] = badge(state);
                const provider =
                  item.product?.provider_name_snapshot ||
                  item.op.operator ||
                  "Proveedor";
                const product =
                  item.product?.product_name_snapshot ||
                  item.op.productName ||
                  "Producto";
                const logo =
                  item.product?.product_config_snapshot?.provider_logo || null;

                const commercial = commercials.find(
                  (x) => x.id === item.workflow?.commercial_user_id
                );

                return (
                  <article
                    key={item.op.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "52px minmax(220px,1.4fr) minmax(220px,1.2fr) 150px 160px auto",
                      gap: 12,
                      alignItems: "center",
                      border: "1px solid #eee",
                      borderRadius: 14,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        border: "1px solid #ececec",
                        display: "grid",
                        placeItems: "center",
                        overflow: "hidden",
                      }}
                    >
                      {logo ? (
                        <img
                          src={String(logo)}
                          alt={provider}
                          style={{
                            width: "82%",
                            height: "82%",
                            objectFit: "contain",
                          }}
                        />
                      ) : (
                        <strong style={{ fontSize: 12 }}>
                          {provider.slice(0, 2).toUpperCase()}
                        </strong>
                      )}
                    </div>

                    <div>
                      <small
                        style={{
                          color: "#999",
                          fontSize: 9,
                          fontWeight: 900,
                          letterSpacing: 0.6,
                          textTransform: "uppercase",
                        }}
                      >
                        {item.op.service || "Telefonía"}
                      </small>
                      <div style={{ fontWeight: 900, fontSize: 15, marginTop: 2 }}>
                        {item.op.clientName || "Cliente"}
                      </div>
                      <div style={{ color: "#777", fontSize: 12, marginTop: 2 }}>
                        {commercial
                          ? `Comercial: ${commercial.name}`
                          : "Sin comercial asignado"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 850, fontSize: 13 }}>
                        {product}
                      </div>
                      <div style={{ color: "#777", fontSize: 12, marginTop: 3 }}>
                        {provider}
                      </div>
                      {item.ticket && (
                        <div
                          style={{
                            color: "#a23a16",
                            fontSize: 11,
                            marginTop: 4,
                            fontWeight: 800,
                          }}
                        >
                          Ticket: {item.ticket.title}
                        </div>
                      )}
                    </div>

                    <span
                      style={{
                        justifySelf: "start",
                        border: `1px solid ${border}`,
                        background: bg,
                        color: fg,
                        borderRadius: 999,
                        padding: "6px 8px",
                        fontSize: 9,
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </span>

                    <select
                      value={item.workflow?.commercial_user_id || ""}
                      onChange={(e) =>
                        action(item.op.id, "assign", {
                          commercialUserId: e.target.value || null,
                          clientId: item.op.clientId || null,
                          clientName: item.op.clientName || null,
                        })
                      }
                      style={{
                        height: 38,
                        border: "1px solid #ddd",
                        borderRadius: 10,
                        padding: "0 9px",
                        background: "#fff",
                        fontSize: 12,
                      }}
                    >
                      <option value="">Asignar comercial...</option>
                      {commercials.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => setSelected(item)}
                      style={primarySoft}
                    >
                      Gestionar
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {selected && (
        <div style={overlay} onClick={() => setSelected(null)}>
          <section style={modal} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "flex-start",
              }}
            >
              <div>
                <span style={eyebrow}>GESTIÓN BACKOFFICE</span>
                <h2 style={{ margin: "5px 0 3px" }}>
                  {selected.op.clientName || "Cliente"}
                </h2>
                <div style={{ color: "#777", fontSize: 13 }}>
                  {selected.product?.product_name_snapshot ||
                    selected.op.productName ||
                    "Producto"}
                </div>
              </div>

              <button
                onClick={() => setSelected(null)}
                style={closeButton}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                gap: 10,
                marginTop: 18,
              }}
            >
              <Info
                label="Estado"
                value={badge(effectiveState(selected))[0]}
              />
              <Info
                label="Revisión"
                value={selected.workflow?.review_status || "Pendiente"}
              />
              <Info
                label="Edición comercial"
                value={
                  selected.workflow?.commercial_editable
                    ? "Permitida"
                    : "Bloqueada"
                }
              />
            </div>

            {selected.ticket && (
              <div
                style={{
                  marginTop: 14,
                  border: "1px solid #ffd1bd",
                  background: "#fff6f1",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <strong style={{ color: "#a23a16", fontSize: 12 }}>
                  Corrección abierta
                </strong>
                <div style={{ marginTop: 4, fontSize: 12, color: "#674a3e" }}>
                  {selected.ticket.title}
                  {selected.ticket.description
                    ? ` · ${selected.ticket.description}`
                    : ""}
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                gap: 10,
              }}
            >
              <Action
                title="Iniciar revisión"
                text="BackOffice abre formalmente la revisión."
                onClick={() =>
                  action(selected.op.id, "start_review").then(() =>
                    setSelected(null)
                  )
                }
              />
              <Action
                title="Solicitar corrección"
                text="Devuelve a borrador y abre un ticket al comercial."
                danger
                onClick={() => setReasonOpen(true)}
              />
              <Action
                title="Validar"
                text="Datos correctos. El comercial queda bloqueado."
                onClick={() =>
                  action(selected.op.id, "validate").then(() =>
                    setSelected(null)
                  )
                }
              />
              <Action
                title="Pasar a tramitación"
                text="La operación pasa a gestión técnica."
                onClick={() =>
                  action(selected.op.id, "processing").then(() =>
                    setSelected(null)
                  )
                }
              />
              <Action
                title="Marcar tramitada"
                text="Cierra la tramitación y crea el contrato pendiente de activación."
                onClick={() =>
                  action(selected.op.id, "complete_processing").then(() =>
                    setSelected(null)
                  )
                }
              />
              <Action
                title="Volver a borrador"
                text="También desde tramitación. Motivo obligatorio."
                danger
                onClick={() => setReasonOpen(true)}
              />
            </div>

            {saving && (
              <div
                style={{
                  marginTop: 14,
                  fontSize: 12,
                  color: "#777",
                  textAlign: "center",
                }}
              >
                Guardando cambios...
              </div>
            )}
          </section>
        </div>
      )}

      {reasonOpen && selected && (
        <div style={overlay} onClick={() => setReasonOpen(false)}>
          <section
            style={{ ...modal, width: "min(560px,100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={eyebrow}>DEVOLVER A BORRADOR</span>
            <h2 style={{ margin: "5px 0 4px" }}>Motivo obligatorio</h2>
            <p style={{ margin: "0 0 16px", color: "#777", fontSize: 13 }}>
              ONE abrirá un ticket para que el comercial corrija la operación.
            </p>

            <label style={fieldLabel}>
              Motivo
              <input
                value={reasonTitle}
                onChange={(e) => setReasonTitle(e.target.value)}
                style={input}
              />
            </label>

            <label style={{ ...fieldLabel, marginTop: 12 }}>
              Comentario
              <textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                rows={5}
                style={{
                  ...input,
                  height: "auto",
                  paddingTop: 10,
                  resize: "vertical",
                }}
                placeholder="Ej.: DNI incorrecto. Revisar número y volver a enviar."
              />
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 18,
              }}
            >
              <button style={secondary} onClick={() => setReasonOpen(false)}>
                Cancelar
              </button>
              <button style={dangerButton} onClick={returnToDraft}>
                Devolver a borrador
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Kpi({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: accent ? "#fff8f4" : "#fff",
        border: accent ? "1px solid #ffd7c6" : "1px solid #ececec",
        borderRadius: 15,
        padding: 16,
      }}
    >
      <span style={{ color: "#777", fontSize: 11, fontWeight: 700 }}>
        {label}
      </span>
      <strong
        style={{
          display: "block",
          marginTop: 5,
          fontSize: 25,
          color: accent ? "#e25328" : "#202020",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <span
        style={{
          display: "block",
          color: "#999",
          fontSize: 9,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {label}
      </span>
      <strong style={{ display: "block", marginTop: 4, fontSize: 13 }}>
        {value}
      </strong>
    </div>
  );
}

function Action({
  title,
  text,
  onClick,
  danger = false,
}: {
  title: string;
  text: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        border: danger ? "1px solid #ffd1bd" : "1px solid #e6e6e6",
        background: danger ? "#fff8f4" : "#fff",
        borderRadius: 13,
        padding: 13,
        cursor: "pointer",
      }}
    >
      <strong
        style={{
          display: "block",
          fontSize: 13,
          color: danger ? "#a23a16" : "#222",
        }}
      >
        {title}
      </strong>
      <span
        style={{
          display: "block",
          marginTop: 4,
          color: "#777",
          fontSize: 11,
          lineHeight: 1.45,
        }}
      >
        {text}
      </span>
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: 42,
        textAlign: "center",
        background: "#fafafa",
        borderRadius: 13,
        color: "#888",
      }}
    >
      {text}
    </div>
  );
}

const eyebrow: React.CSSProperties = {
  color: "#ff5a2a",
  fontWeight: 900,
  fontSize: 11,
  letterSpacing: 1,
};

const primarySoft: React.CSSProperties = {
  border: "1px solid #ffbda5",
  borderRadius: 10,
  padding: "9px 11px",
  background: "#fff3ed",
  color: "#d94b20",
  fontWeight: 900,
  cursor: "pointer",
};

const secondary: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: "9px 11px",
  background: "#fff",
  color: "#444",
  fontWeight: 800,
  cursor: "pointer",
};

const dangerButton: React.CSSProperties = {
  border: "1px solid #e99878",
  borderRadius: 10,
  padding: "9px 11px",
  background: "#fff0e9",
  color: "#a23a16",
  fontWeight: 900,
  cursor: "pointer",
};

const input: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  borderRadius: 11,
  border: "1px solid #ddd",
  padding: "0 11px",
  background: "#fff",
};

const fieldLabel: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  fontWeight: 800,
};

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.42)",
  display: "grid",
  placeItems: "center",
  zIndex: 9999,
  padding: 20,
};

const modal: React.CSSProperties = {
  width: "min(760px,100%)",
  maxHeight: "90vh",
  overflow: "auto",
  background: "#fff",
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 26px 90px rgba(0,0,0,.24)",
};

const closeButton: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  border: "1px solid #e5e5e5",
  background: "#fafafa",
  cursor: "pointer",
  fontSize: 22,
};
