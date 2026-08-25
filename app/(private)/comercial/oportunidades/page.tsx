"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Opportunity = {
  id: string;
  service?: string;
  clientName?: string;
  operator?: string;
  productName?: string;
  status?: string;
  updatedAt?: string;
  createdAt?: string;
};

type Workflow = {
  opportunity_id: string;
  status: string;
  review_status: string;
  commercial_editable: boolean;
  updated_at?: string;
};

type Ticket = {
  id: string;
  opportunity_id: string;
  title: string;
  description?: string | null;
  status: string;
};

type ProductLink = {
  opportunity_id: string;
  product_name_snapshot?: string | null;
  provider_name_snapshot?: string | null;
  product_config_snapshot?: Record<string, any> | null;
};

type Tab = "all" | "draft" | "correction" | "backoffice" | "processing" | "activated";

const tabs: { key: Tab; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "draft", label: "Borradores" },
  { key: "correction", label: "Correcciones" },
  { key: "backoffice", label: "En BackOffice" },
  { key: "processing", label: "En tramitación" },
  { key: "activated", label: "Activadas" },
];

function statusOf(w?: Workflow, local?: string): Tab {
  if (w?.review_status === "correction_requested") return "correction";
  if (w?.status === "draft") return "draft";
  if (["sent_backoffice", "in_review", "validated"].includes(w?.status || "")) return "backoffice";
  if (w?.status === "processing") return "processing";
  if (w?.status === "activated") return "activated";

  const s = String(local || "").toLowerCase();
  if (s.includes("borrador")) return "draft";
  if (s.includes("backoffice")) return "backoffice";
  if (s.includes("tramit")) return "processing";
  if (s.includes("activ")) return "activated";
  return "draft";
}

function statusUI(status: Tab) {
  if (status === "correction") return ["CORRECCIÓN SOLICITADA", "#a23a16", "#fff1e9", "#ffd0bb"];
  if (status === "backoffice") return ["EN BACKOFFICE", "#2c5e91", "#eef6ff", "#ccdef2"];
  if (status === "processing") return ["EN TRAMITACIÓN", "#7c641b", "#fff8e7", "#e7d99f"];
  if (status === "activated") return ["ACTIVADA", "#16734a", "#edf9f3", "#cbe9da"];
  return ["BORRADOR", "#555", "#f6f6f6", "#e4e4e4"];
}

export default function ComercialOportunidadesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [workflow, setWorkflow] = useState<Workflow[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [links, setLinks] = useState<ProductLink[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      let local: Opportunity[] = [];
      try {
        const raw = JSON.parse(localStorage.getItem("one_phone_opportunities_v1") || "[]");
        local = Array.isArray(raw) ? raw : [];
      } catch {
        local = [];
      }

      const ids = local.map((x) => x.id).filter(Boolean);
      if (!ids.length) {
        setItems([]);
        return;
      }

      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/commercial-workflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ opportunityIds: ids }),
        cache: "no-store",
      });

      const data = await response.json();
      if (response.ok && data.ok) {
        const allowed = new Set<string>(data.allowedOpportunityIds || []);
        setItems(local.filter((op) => allowed.has(op.id)));
        setWorkflow(data.workflow || []);
        setTickets(data.tickets || []);
        setLinks(data.products || []);
      } else {
        setItems([]);
        setWorkflow([]);
        setTickets([]);
        setLinks([]);
      }
    }

    load();
  }, [router]);

  const rows = useMemo(() => {
    return items.map((op) => {
      const w = workflow.find((x) => x.opportunity_id === op.id);
      const link = links.find((x) => x.opportunity_id === op.id);
      const openTickets = tickets.filter((x) => x.opportunity_id === op.id && x.status === "open");
      const status = statusOf(w, op.status);
      const editable = w?.commercial_editable ?? ["draft", "correction"].includes(status);

      return { op, w, link, openTickets, status, editable };
    });
  }, [items, workflow, links, tickets]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: rows.length, draft: 0, correction: 0, backoffice: 0, processing: 0, activated: 0 };
    rows.forEach((x) => { c[x.status] += 1; });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((x) => {
      const provider = x.link?.provider_name_snapshot || x.op.operator || "";
      const product = x.link?.product_name_snapshot || x.op.productName || "";
      const text = `${x.op.clientName || ""} ${provider} ${product}`.toLowerCase();
      return (tab === "all" || x.status === tab) && (!q || text.includes(q));
    });
  }, [rows, tab, query]);

  return (
    <main style={{ maxWidth: 1380, margin: "0 auto", padding: 28 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 18, marginBottom: 22 }}>
        <div>
          <span style={{ color: "#ff5728", fontWeight: 900, fontSize: 11, letterSpacing: 1 }}>ONE · ENTORNO COMERCIAL</span>
          <h1 style={{ margin: "5px 0 6px", fontSize: 34, letterSpacing: -0.8 }}>Mis oportunidades</h1>
          <p style={{ margin: 0, color: "#6e6e6e" }}>
            Vende, corrige cuando BackOffice lo solicite y consulta el estado de cada operación.
          </p>
        </div>

        <button
          onClick={() => router.push("/oportunidades/nuevo/telefonia")}
          style={{ border: 0, borderRadius: 12, padding: "12px 16px", color: "#fff", fontWeight: 900, cursor: "pointer", background: "linear-gradient(135deg,#ff7a35,#ff4d22)" }}
        >
          + Nueva oportunidad
        </button>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 18 }}>
        <Kpi label="Mis oportunidades" value={counts.all} />
        <Kpi label="Necesitan corrección" value={counts.correction} accent />
        <Kpi label="En BackOffice" value={counts.backoffice + counts.processing} />
        <Kpi label="Activadas" value={counts.activated} />
      </section>

      <section style={{ background: "#fff", border: "1px solid #ececec", borderRadius: 18, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,.035)" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {tabs.map((x) => (
              <button
                key={x.key}
                onClick={() => setTab(x.key)}
                style={{
                  border: tab === x.key ? "1px solid #ffc1aa" : "1px solid #e8e8e8",
                  background: tab === x.key ? "#fff3ed" : "#fff",
                  color: tab === x.key ? "#d94c22" : "#555",
                  borderRadius: 999,
                  padding: "8px 11px",
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {x.label} · {counts[x.key]}
              </button>
            ))}
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente, producto o proveedor..."
            style={{ width: 320, maxWidth: "100%", height: 40, border: "1px solid #ddd", borderRadius: 11, padding: "0 12px" }}
          />
        </div>

        <div style={{ padding: 16 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", background: "#fafafa", borderRadius: 12, color: "#888" }}>
              No hay oportunidades en esta bandeja.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: 14 }}>
              {filtered.map(({ op, w, link, openTickets, status, editable }) => {
                const provider = link?.provider_name_snapshot || op.operator || "Proveedor";
                const product = link?.product_name_snapshot || op.productName || "Producto";
                const logo = link?.product_config_snapshot?.provider_logo;
                const [label, fg, bg, border] = statusUI(status);
                const ticket = openTickets[0];

                return (
                  <article key={op.id} style={{ border: "1px solid #ececec", borderRadius: 16, background: "#fff", overflow: "hidden" }}>
                    <div style={{ height: 4, background: status === "correction" ? "linear-gradient(90deg,#ff7a35,#ff4d22)" : "linear-gradient(90deg,#f0d7cd,#f8eee9)" }} />

                    <div style={{ padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ display: "flex", gap: 11, minWidth: 0 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, border: "1px solid #ebebeb", display: "grid", placeItems: "center", overflow: "hidden", flex: "0 0 auto" }}>
                            {logo ? (
                              <img src={String(logo)} alt={provider} style={{ width: "82%", height: "82%", objectFit: "contain" }} />
                            ) : (
                              <strong style={{ fontSize: 13 }}>{provider.slice(0, 2).toUpperCase()}</strong>
                            )}
                          </div>

                          <div>
                            <small style={{ color: "#999", fontSize: 9, fontWeight: 900, letterSpacing: .7, textTransform: "uppercase" }}>
                              {op.service || "Telefonía"}
                            </small>
                            <h3 style={{ margin: "3px 0 2px", fontSize: 17 }}>{op.clientName || "Cliente"}</h3>
                            <div style={{ fontSize: 13, fontWeight: 800 }}>{product}</div>
                            <div style={{ fontSize: 12, color: "#777", marginTop: 2 }}>{provider}</div>
                          </div>
                        </div>

                        <span style={{ height: "fit-content", border: `1px solid ${border}`, background: bg, color: fg, borderRadius: 999, padding: "6px 8px", fontSize: 9, fontWeight: 900, whiteSpace: "nowrap" }}>
                          {label}
                        </span>
                      </div>

                      {ticket && (
                        <div style={{ marginTop: 14, border: "1px solid #ffd0bb", background: "#fff6f1", borderRadius: 11, padding: 11 }}>
                          <strong style={{ display: "block", color: "#a23a16", fontSize: 12 }}>BackOffice solicita corrección</strong>
                          <div style={{ marginTop: 4, color: "#60463b", fontSize: 12, lineHeight: 1.45 }}>
                            {ticket.title}{ticket.description ? ` · ${ticket.description}` : ""}
                          </div>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 15, paddingTop: 13, borderTop: "1px solid #f0f0f0" }}>
                        <small style={{ color: "#999" }}>{w?.updated_at ? new Date(w.updated_at).toLocaleString("es-ES") : "Sin actualizar"}</small>

                        <button
                          onClick={() => router.push(`/oportunidades/nuevo/telefonia?id=${encodeURIComponent(op.id)}`)}
                          style={{
                            border: editable ? "1px solid #ffbca5" : "1px solid #ddd",
                            background: editable ? "#fff3ed" : "#fafafa",
                            color: editable ? "#d94b20" : "#555",
                            borderRadius: 10,
                            padding: "8px 10px",
                            fontSize: 11,
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          {editable ? "Abrir y editar" : "Consultar"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Kpi({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ background: accent ? "#fff8f4" : "#fff", border: accent ? "1px solid #ffd7c6" : "1px solid #ececec", borderRadius: 15, padding: 16 }}>
      <span style={{ color: "#777", fontSize: 11, fontWeight: 700 }}>{label}</span>
      <strong style={{ display: "block", marginTop: 5, fontSize: 25, color: accent ? "#e25328" : "#202020" }}>{value}</strong>
    </div>
  );
}
