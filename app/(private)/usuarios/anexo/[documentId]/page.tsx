"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type AnnexRow = {
  service: string;
  provider_name: string;
  provider_logo?: string | null;
  product_name: string;
  product_reference?: string;
  product_type?: string;
  description?: string;
  operation_type?: string;
  commission_mode?: string;
  fixed_amount?: number | null;
  percentage?: number | null;
  recurring_amount?: number | null;
  recurring_percentage?: number | null;
  points?: number | null;
  commission_label?: string;
};

function money(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return `${Number(value).toFixed(2)} €`;
}

export default function AnnexPreviewPage() {
  const params = useParams<{ documentId: string }>();
  const router = useRouter();

  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(
          `/api/commercial-annex?documentId=${encodeURIComponent(
            params.documentId
          )}`,
          { cache: "no-store" }
        );

        const d = await r.json();

        if (!r.ok || !d.ok) {
          throw new Error(d.error || "No se pudo cargar el anexo.");
        }

        setDoc(d.document);
      } catch (e: any) {
        setError(e?.message || "No se pudo cargar el anexo.");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.documentId]);

  const rows: AnnexRow[] = doc?.commission_snapshot?.rows || [];

  const grouped = useMemo(() => {
    const SERVICE_ORDER = [
      "Telefonía",
      "Energía",
      "Alarmas",
      "Seguros",
      "Inmobiliaria",
      "Asesoramiento",
      "IA",
      "General",
    ];

    const serviceMap = new Map<string, Map<string, AnnexRow[]>>();

    for (const row of rows) {
      const service = row.service || "General";
      const provider = row.provider_name || "Sin proveedor";

      if (!serviceMap.has(service)) {
        serviceMap.set(service, new Map());
      }

      const providers = serviceMap.get(service)!;

      if (!providers.has(provider)) {
        providers.set(provider, []);
      }

      providers.get(provider)!.push(row);
    }

    return Array.from(serviceMap.entries())
      .sort(([a], [b]) => {
        const ai = SERVICE_ORDER.indexOf(a);
        const bi = SERVICE_ORDER.indexOf(b);

        if (ai !== -1 || bi !== -1) {
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        }

        return a.localeCompare(b, "es");
      })
      .map(([service, providers]) => ({
        service,
        providers: Array.from(providers.entries())
          .sort(([a], [b]) => a.localeCompare(b, "es"))
          .map(([provider, providerRows]) => ({
            provider,
            rows: [...providerRows].sort((a, b) =>
              `${a.product_name || ""}|${a.operation_type || ""}`.localeCompare(
                `${b.product_name || ""}|${b.operation_type || ""}`,
                "es"
              )
            ),
          })),
      }));
  }, [rows]);

  if (loading) {
    return <main style={{ padding: 40 }}>Cargando anexo económico...</main>;
  }

  if (error || !doc) {
    return (
      <main style={{ padding: 40 }}>
        <h2>No se pudo abrir el anexo</h2>
        <p>{error || "Documento no encontrado."}</p>
        <button onClick={() => router.push("/usuarios")}>Volver</button>
      </main>
    );
  }

  const user = doc.data_snapshot?.user || {};
  const cp = doc.data_snapshot?.commercial_profile || {};
  const linked = doc.data_snapshot?.linked_contract || {};
  const snap = doc.commission_snapshot || {};

  const fullName =
    `${cp.first_name || ""} ${cp.last_name || ""}`.trim() ||
    user.name ||
    "—";

  const generated = doc.generated_at
    ? new Date(doc.generated_at).toLocaleDateString("es-ES")
    : "—";

  return (
    <main>
      <div className="toolbar">
        <button onClick={() => router.push("/usuarios")}>← Volver</button>

        <div className="toolbarRight">
          <span>Anexo económico inicial · {doc.status}</span>
          <button className="print" onClick={() => window.print()}>
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <article className="sheet">
        <header className="paperHeader">
          <div className="brandBlock">
            <img src="/an24-logo.png" alt="AN24" className="brandLogo" />
            <div className="brandRule" />
          </div>

          <div className="docMeta">
            <span>CONDICIONES ECONÓMICAS</span>
            <strong>Anexo de condiciones económicas</strong>
            <small>Condiciones vigentes en la fecha de emisión</small>
          </div>
        </header>

        <section className="intro">
          <p>
            El presente documento recoge las condiciones económicas aplicables
            al comercial en la fecha indicada. Estas condiciones corresponden
            al catálogo y perfil comercial vigentes en el momento de emisión y
            quedan conservadas como referencia histórica del acuerdo.
          </p>
        </section>

        <section className="person">
          <div>
            <small>COMERCIAL</small>
            <strong>{fullName}</strong>
          </div>

          <div>
            <small>{cp.document_type || "DNI / NIE"}</small>
            <strong>{cp.document_number || "—"}</strong>
          </div>

          <div>
            <small>PERFIL COMERCIAL</small>
            <strong>{doc.profile_snapshot || user.profile_type || "—"}</strong>
          </div>

          <div>
            <small>FECHA DE EFECTO</small>
            <strong>{generated}</strong>
          </div>

          <div>
            <small>CONTRATO VINCULADO</small>
            <strong>
              {linked.title
                ? `${linked.title}`
                : snap.contract_document_id
                ? "Contrato comercial"
                : "—"}
            </strong>
          </div>

          <div>
            <small>CONDICIONES</small>
            <strong>{rows.length} reglas económicas</strong>
          </div>
        </section>

        {grouped.length === 0 ? (
          <div className="empty">
            No hay condiciones económicas guardadas en este anexo.
          </div>
        ) : (
          grouped.map(({ service, providers }) => (
            <section key={service} className="service">
              <div className="serviceTitle">
                <span>{service.toUpperCase()}</span>
                <small>
                  {providers.reduce((sum, p) => sum + p.rows.length, 0)} condiciones
                </small>
              </div>

              {providers.map((providerGroup) => (
                <div key={`${service}-${providerGroup.provider}`} className="providerGroup">
                  <div className="providerHeader">
                    <strong>{providerGroup.provider}</strong>
                    <small>{providerGroup.rows.length} productos / condiciones</small>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th>Proveedor</th>
                        <th>Producto</th>
                        <th>Operación</th>
                        <th>Comisión aplicable</th>
                      </tr>
                    </thead>

                    <tbody>
                      {providerGroup.rows.map((r, i) => (
                        <tr
                          key={`${r.provider_name}-${r.product_name}-${r.operation_type}-${i}`}
                        >
                          <td>
                            <div className="providerCell">
                              {r.provider_logo ? (
                                <img src={r.provider_logo} alt="" />
                              ) : (
                                <span className="providerFallback">
                                  {(r.provider_name || "?").slice(0, 2)}
                                </span>
                              )}

                              <strong>{r.provider_name || "—"}</strong>
                            </div>
                          </td>

                          <td>
                            <strong>{r.product_name || "—"}</strong>
                            {(r.product_reference || r.product_type) && (
                              <div className="sub">
                                {[r.product_reference, r.product_type]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            )}
                          </td>

                          <td>{r.operation_type || "—"}</td>

                          <td>
                            <strong className="commission">
                              {r.commission_label ||
                                (r.fixed_amount != null
                                  ? money(r.fixed_amount)
                                  : r.percentage != null
                                  ? `${Number(r.percentage).toFixed(2)} %`
                                  : "—")}
                            </strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </section>
          ))
        )}

        <section className="conditions">
          <h3>Aplicación de las condiciones</h3>

          <p>
            Las comisiones reflejadas en este anexo son las registradas para el
            perfil comercial indicado en el momento de su emisión. Su devengo,
            liquidación, posibles retrocomisiones, permanencias u otras
            condiciones específicas estarán sujetas a las reglas aplicables a
            cada producto y a lo establecido en el contrato de colaboración.
          </p>

          <p>
            Las modificaciones económicas posteriores no alterarán este
            documento. Cuando cambien una o varias condiciones, ONE podrá emitir
            una <strong>Modificación de condiciones económicas</strong> que
            identificará únicamente los productos afectados, la condición
            anterior, la nueva condición y su fecha de efecto.
          </p>
        </section>

        <section className="signatureArea">
          <div>
            <strong>LA SOCIEDAD</strong>
            <div className="signatureLine" />
            <span>JESUS RAMON MARTINEZ GOMEZ</span>
            <small>BEGOVER CONSULTORES S.L.</small>
          </div>

          <div>
            <strong>EL COMERCIAL</strong>
            <div className="signatureLine" />
            <span>{fullName}</span>
            <small>
              Perfil: {doc.profile_snapshot || user.profile_type || "—"}
            </small>
          </div>
        </section>

        <footer className="paperFooter">
          <span>AN24 · BEGOVER CONSULTORES S.L.</span>
          <span>Anexo de condiciones económicas · {generated}</span>
        </footer>
      </article>

      <style jsx>{`
        :global(body) {
          background: #f4f4f4;
        }

        .toolbar {
          max-width: 900px;
          margin: 18px auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .toolbar button {
          border: 1px solid #ddd;
          background: #fff;
          border-radius: 10px;
          padding: 10px 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .toolbarRight {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 11px;
          color: #666;
          font-weight: 800;
        }

        .print {
          background: #171717 !important;
          color: #fff;
          border-color: #171717 !important;
        }

        .sheet {
          width: min(794px, calc(100% - 32px));
          margin: 0 auto 50px;
          min-height: 1123px;
          background: #fff;
          padding: 42px 48px 34px;
          box-sizing: border-box;
          border-radius: 4px;
          box-shadow: 0 14px 45px rgba(0, 0, 0, 0.1);
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          line-height: 1.55;
          color: #202020;
        }

        .paperHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 28px;
          padding-bottom: 18px;
          border-bottom: 1px solid #e8e8e8;
        }

        .brandBlock {
          width: 210px;
        }

        .brandLogo {
          width: 150px;
          height: auto;
          display: block;
          object-fit: contain;
        }

        .brandRule {
          width: 44px;
          height: 3px;
          border-radius: 999px;
          background: linear-gradient(90deg, #ff7a28, #ff3d22);
          margin-top: 10px;
        }

        .docMeta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          text-align: right;
          max-width: 390px;
        }

        .docMeta span {
          font-size: 9px;
          letter-spacing: 0.18em;
          font-weight: 900;
          color: #ff5a2a;
          margin-bottom: 6px;
        }

        .docMeta strong {
          font-size: 18px;
          line-height: 1.2;
          color: #171717;
        }

        .docMeta small {
          margin-top: 4px;
          color: #777;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .intro {
          margin: 18px 0 14px;
          padding: 12px 14px;
          background: #fff8f4;
          border-left: 3px solid #ff5a2a;
          color: #5c504b;
        }

        .intro p {
          margin: 0;
          text-align: justify;
        }

        .person {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 9px;
          margin: 18px 0 26px;
        }

        .person div {
          padding: 10px 11px;
          background: #fafafa;
          border: 1px solid #ededed;
          border-radius: 8px;
          min-width: 0;
        }

        .person small {
          display: block;
          color: #999;
          font-size: 7.5px;
          font-weight: 900;
          letter-spacing: 0.1em;
          margin-bottom: 3px;
        }

        .person strong {
          font-size: 9.5px;
          overflow-wrap: anywhere;
        }

        .service {
          margin-top: 30px;
          page-break-inside: auto;
        }

        .providerGroup {
          margin-top: 12px;
          page-break-inside: auto;
        }

        .providerHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 7px 9px;
          margin-bottom: 2px;
          background: #f7f7f7;
          border-left: 3px solid #ff5a2a;
          page-break-after: avoid;
        }

        .providerHeader strong {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .05em;
        }

        .providerHeader small {
          color: #999;
          font-size: 8px;
        }

        .serviceTitle {
          page-break-after: avoid;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #222;
          padding-bottom: 7px;
          margin-bottom: 4px;
        }

        .serviceTitle span {
          font-size: 14px;
          font-weight: 900;
        }

        .serviceTitle small {
          color: #888;
          font-size: 9px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9.5px;
        }

        thead {
          display: table-header-group;
        }

        tr {
          page-break-inside: avoid;
        }

        th,
        td {
          border-bottom: 1px solid #ececec;
          text-align: left;
          padding: 8px 6px;
          vertical-align: middle;
        }

        th {
          font-size: 7.5px;
          text-transform: uppercase;
          color: #888;
          letter-spacing: 0.06em;
          background: #fafafa;
        }

        th:last-child,
        td:last-child {
          text-align: right;
        }

        .providerCell {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .providerCell img {
          width: 30px;
          height: 20px;
          object-fit: contain;
        }

        .providerFallback {
          width: 28px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 5px;
          background: #f1f1f1;
          font-size: 7px;
          font-weight: 900;
          color: #777;
        }

        .sub {
          font-size: 8px;
          color: #8a8a8a;
          margin-top: 2px;
        }

        .commission {
          color: #111;
          white-space: nowrap;
        }

        .empty {
          padding: 28px;
          border: 1px dashed #ccc;
          border-radius: 10px;
          text-align: center;
          color: #777;
        }

        .conditions {
          margin-top: 30px;
          padding-top: 16px;
          border-top: 1px solid #ddd;
          color: #555;
          font-size: 9.5px;
          line-height: 1.65;
        }

        .conditions h3 {
          margin: 0 0 8px;
          color: #222;
          font-size: 11px;
        }

        .conditions p {
          margin: 0 0 9px;
          text-align: justify;
        }

        .signatureArea {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 70px;
          margin-top: 42px;
          padding-top: 20px;
          border-top: 1px solid #ececec;
        }

        .signatureArea > div {
          display: flex;
          flex-direction: column;
          font-size: 9px;
        }

        .signatureArea > div > strong {
          font-size: 9px;
          letter-spacing: 0.08em;
        }

        .signatureLine {
          height: 62px;
          border-bottom: 1px solid #999;
          margin: 6px 0 7px;
        }

        .signatureArea span {
          font-weight: 800;
        }

        .signatureArea small {
          color: #777;
          margin-top: 2px;
        }

        .paperFooter {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-top: 28px;
          padding-top: 9px;
          border-top: 1px solid #ededed;
          font-size: 7.5px;
          color: #999;
        }

        @media print {
          :global(body) {
            background: #fff !important;
          }

          .toolbar {
            display: none !important;
          }

          .sheet {
            width: 100% !important;
            max-width: none !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }

          @page {
            size: A4;
            margin: 15mm 16mm;
          }
        }

        @media (max-width: 760px) {
          .toolbar {
            padding: 0 12px;
            align-items: flex-start;
          }

          .toolbarRight {
            flex-direction: column;
            align-items: flex-end;
          }

          .sheet {
            padding: 28px 24px;
          }

          .paperHeader {
            flex-direction: column;
          }

          .docMeta {
            align-items: flex-start;
            text-align: left;
          }

          .person {
            grid-template-columns: 1fr;
          }

          .signatureArea {
            grid-template-columns: 1fr;
            gap: 28px;
          }
        }
      `}</style>
    </main>
  );
}
