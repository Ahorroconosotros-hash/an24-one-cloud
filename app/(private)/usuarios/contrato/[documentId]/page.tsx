"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function escapeHtml(value: any) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function replaceTokens(html: string, values: Record<string, string>) {
  let result = html || "";

  Object.entries(values).forEach(([token, value]) => {
    result = result.split(token).join(value ?? "");
  });

  return result;
}

export default function ContratoComercialPage() {
  const params = useParams<{ documentId: string }>();
  const router = useRouter();

  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/commercial-contract?documentId=${encodeURIComponent(
            params.documentId
          )}`,
          { cache: "no-store" }
        );

        const data = await res.json();

        if (!res.ok || !data.ok) {
          throw new Error(data.error || "No se pudo cargar el contrato.");
        }

        setDoc(data.document);
      } catch (e: any) {
        setError(e?.message || "No se pudo cargar el contrato.");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.documentId]);

  const renderedContract = useMemo(() => {
    if (!doc) return "";

    const user = doc.data_snapshot?.user || {};
    const cp = doc.data_snapshot?.commercial_profile || {};
    const template = doc.data_snapshot?.contract_template || {};

    // Compatibilidad: contratos anteriores pueden no tener template snapshot.
    if (!template.body_html) return "";

    const fullName =
      `${cp.first_name || ""} ${cp.last_name || ""}`.trim() ||
      user.name ||
      "";

    const address = [
      cp.address,
      cp.postal_code,
      cp.city,
      cp.province,
      cp.country && cp.country !== "España" ? cp.country : "",
    ]
      .filter(Boolean)
      .join(", ");

    const companyBlock =
      cp.collaborator_type === "Empresa" && cp.company_name
        ? `, en nombre y representación de la mercantil <strong>${escapeHtml(
            cp.company_name
          )}</strong>${
            cp.company_tax_id
              ? `, con NIF <strong>${escapeHtml(cp.company_tax_id)}</strong>`
              : ""
          }${address ? `, con domicilio en ${escapeHtml(address)}` : ""}`
        : address
        ? `, con domicilio en ${escapeHtml(address)}`
        : "";

    const generatedDate = doc.generated_at
      ? new Date(doc.generated_at).toLocaleDateString("es-ES")
      : "";

    const values: Record<string, string> = {
      "{{commercial.full_name}}": escapeHtml(fullName),
      "{{commercial.document_type}}": escapeHtml(cp.document_type || "DNI"),
      "{{commercial.document_number}}": escapeHtml(
        cp.document_number || "—"
      ),
      "{{commercial.address}}": escapeHtml(address),
      "{{commercial.company_name}}": escapeHtml(cp.company_name || ""),
      "{{commercial.company_tax_id}}": escapeHtml(
        cp.company_tax_id || ""
      ),
      "{{commercial.company_block}}": companyBlock,
      "{{commercial.profile}}": escapeHtml(
        doc.profile_snapshot || user.profile_type || "—"
      ),

      "{{company.name}}": "BEGOVER CONSULTORES S.L.",
      "{{company.tax_id}}": "B75820746",
      "{{company.address}}":
        "Calle Bizcocheros 2 Dpdo, Ofc 18 · Jerez de la Frontera (Cádiz)",
      "{{company.representative_name}}":
        "JESUS RAMON MARTINEZ GOMEZ",

      "{{contract.date}}": escapeHtml(generatedDate),
      "{{contract.place}}": escapeHtml(
        cp.city || "Jerez de la Frontera"
      ),
    };

    return replaceTokens(template.body_html, values);
  }, [doc]);

  if (loading) {
    return <main style={{ padding: 40 }}>Cargando contrato...</main>;
  }

  if (error || !doc) {
    return (
      <main style={{ padding: 40 }}>
        <h2>No se pudo abrir el contrato</h2>
        <p>{error || "Contrato no encontrado."}</p>
        <button onClick={() => router.push("/usuarios")}>Volver</button>
      </main>
    );
  }

  const user = doc.data_snapshot?.user || {};
  const cp = doc.data_snapshot?.commercial_profile || {};
  const template = doc.data_snapshot?.contract_template || {};

  const fullName =
    `${cp.first_name || ""} ${cp.last_name || ""}`.trim() ||
    user.name ||
    "—";

  const templateVersion = template.template_version
    ? `Plantilla v${template.template_version}`
    : "Contrato histórico";

  return (
    <main>
      <div className="toolbar">
        <button onClick={() => router.push("/usuarios")}>← Volver</button>

        <div className="right">
          <span>
            Contrato v{doc.version} · {doc.status} · {templateVersion}
          </span>

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
            <span>CONTRATO COMERCIAL</span>
            <strong>
              {template.title || "Contrato de colaboración"}
            </strong>
            <small>{template.subtitle || "No exclusivo"}</small>
          </div>
        </header>

        <div className="paperInfo">
          <div>
            <small>COMERCIAL / AGENCIA</small>
            <strong>{fullName}</strong>
          </div>

          <div>
            <small>PERFIL</small>
            <strong>
              {doc.profile_snapshot || user.profile_type || "—"}
            </strong>
          </div>

          <div>
            <small>VERSIÓN</small>
            <strong>
              Contrato v{doc.version}
              {template.template_version
                ? ` · Plantilla v${template.template_version}`
                : ""}
            </strong>
          </div>
        </div>

        {renderedContract ? (
          <section
            className="contractBody"
            dangerouslySetInnerHTML={{ __html: renderedContract }}
          />
        ) : (
          <section className="legacy">
            <strong>Contrato histórico anterior al sistema de plantillas.</strong>
            <p>
              Este documento se conserva en el histórico, pero no contiene una
              copia de plantilla contractual. Los nuevos contratos sí quedarán
              congelados con su versión contractual exacta.
            </p>
          </section>
        )}

        <section className="signatureArea">
          <div>
            <strong>LA SOCIEDAD</strong>
            <div className="signatureLine" />
            <span>JESUS RAMON MARTINEZ GOMEZ</span>
            <small>BEGOVER CONSULTORES S.L.</small>
          </div>

          <div>
            <strong>LA AGENCIA</strong>
            <div className="signatureLine" />
            <span>{fullName}</span>
            <small>
              Perfil comercial:{" "}
              {doc.profile_snapshot || user.profile_type || "—"}
            </small>
          </div>
        </section>

        <footer className="paperFooter">
          <span>AN24 · BEGOVER CONSULTORES S.L.</span>
          <span>
            Contrato v{doc.version}
            {template.template_version
              ? ` · Plantilla contractual v${template.template_version}`
              : ""}
          </span>
        </footer>
      </article>

      <style jsx>{`
        :global(body){
          background:#f4f4f4;
        }

        .toolbar{
          max-width:900px;
          margin:18px auto;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
        }

        .toolbar button{
          border:1px solid #ddd;
          background:#fff;
          border-radius:10px;
          padding:10px 14px;
          font-weight:800;
          cursor:pointer;
        }

        .right{
          display:flex;
          align-items:center;
          gap:12px;
          font-size:11px;
          font-weight:800;
          color:#666;
        }

        .print{
          background:#171717!important;
          color:#fff;
          border-color:#171717!important;
        }

        .sheet{
          width:min(794px,calc(100% - 32px));
          margin:0 auto 50px;
          min-height:1123px;
          background:#fff;
          padding:42px 48px 34px;
          box-sizing:border-box;
          border-radius:4px;
          box-shadow:0 14px 45px rgba(0,0,0,.10);
          font-family:Arial,Helvetica,sans-serif;
          font-size:12.5px;
          line-height:1.62;
          color:#202020;
        }

        .paperHeader{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:28px;
          padding-bottom:18px;
          border-bottom:1px solid #e8e8e8;
        }

        .brandBlock{
          width:210px;
        }

        .brandLogo{
          width:150px;
          height:auto;
          display:block;
          object-fit:contain;
        }

        .brandRule{
          width:44px;
          height:3px;
          border-radius:999px;
          background:linear-gradient(90deg,#ff7a28,#ff3d22);
          margin-top:10px;
        }

        .docMeta{
          display:flex;
          flex-direction:column;
          align-items:flex-end;
          text-align:right;
          max-width:390px;
        }

        .docMeta span{
          font-size:9px;
          letter-spacing:.18em;
          font-weight:900;
          color:#ff5a2a;
          margin-bottom:6px;
        }

        .docMeta strong{
          font-size:18px;
          line-height:1.2;
          color:#171717;
        }

        .docMeta small{
          margin-top:4px;
          color:#777;
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.08em;
        }

        .paperInfo{
          display:grid;
          grid-template-columns:1fr 130px 180px;
          gap:10px;
          margin:16px 0 24px;
          padding:11px 14px;
          background:#fafafa;
          border:1px solid #ececec;
          border-radius:8px;
        }

        .paperInfo > div{
          display:flex;
          flex-direction:column;
          gap:2px;
        }

        .paperInfo small{
          color:#999;
          font-size:8px;
          font-weight:900;
          letter-spacing:.12em;
        }

        .paperInfo strong{
          font-size:10.5px;
          color:#333;
        }

        .contractBody{
          padding:4px 4px 0;
        }

        .contractBody :global(h1),
        .contractBody :global(h2),
        .contractBody :global(h3){
          color:#222;
          page-break-after:avoid;
        }

        .contractBody :global(h3){
          text-align:center;
          font-size:12px;
          letter-spacing:.06em;
          margin:24px 0 14px;
        }

        .contractBody :global(p){
          color:#262626;
          text-align:justify;
          margin:0 0 11px;
          orphans:3;
          widows:3;
        }

        .contractBody :global(ul),
        .contractBody :global(ol){
          margin:6px 0 12px 22px;
          padding:0;
        }

        .contractBody :global(strong){
          color:#111;
        }

        .legacy{
          margin:30px 0;
          padding:18px;
          border:1px solid #ffd5c4;
          background:#fff7f2;
          border-radius:10px;
          color:#7a452f;
        }

        .legacy p{
          margin:6px 0 0;
        }

        .signatureArea{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:70px;
          margin-top:48px;
          padding-top:22px;
          border-top:1px solid #ececec;
        }

        .signatureArea > div{
          display:flex;
          flex-direction:column;
          font-size:10px;
          color:#333;
        }

        .signatureArea > div > strong{
          font-size:10px;
          letter-spacing:.08em;
        }

        .signatureLine{
          height:72px;
          border-bottom:1px solid #999;
          margin:6px 0 8px;
        }

        .signatureArea span{
          font-weight:800;
        }

        .signatureArea small{
          color:#777;
          margin-top:2px;
        }

        .paperFooter{
          display:flex;
          justify-content:space-between;
          gap:20px;
          margin-top:32px;
          padding-top:10px;
          border-top:1px solid #ededed;
          font-size:8px;
          color:#999;
          letter-spacing:.03em;
        }

        @media print{
          :global(body){
            background:#fff!important;
          }

          .toolbar{
            display:none!important;
          }

          .sheet{
            width:100%!important;
            max-width:none!important;
            min-height:auto!important;
            padding:0!important;
            margin:0!important;
            box-shadow:none!important;
          }

          @page{
            size:A4;
            margin:15mm 16mm;
          }
        }

        @media(max-width:760px){
          .toolbar{
            padding:0 12px;
            align-items:flex-start;
          }

          .right{
            flex-direction:column;
            align-items:flex-end;
          }

          .sheet{
            padding:28px 24px;
          }

          .paperHeader{
            flex-direction:column;
          }

          .docMeta{
            align-items:flex-start;
            text-align:left;
          }

          .paperInfo{
            grid-template-columns:1fr;
          }

          .signatureArea{
            grid-template-columns:1fr;
            gap:28px;
          }
        }
      `}</style>
    </main>
  );
}
