"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const VARIABLES = [
  "{{commercial.full_name}}",
  "{{commercial.document_type}}",
  "{{commercial.document_number}}",
  "{{commercial.address}}",
  "{{commercial.company_name}}",
  "{{commercial.company_tax_id}}",
  "{{commercial.company_block}}",
  "{{commercial.profile}}",
  "{{company.name}}",
  "{{company.tax_id}}",
  "{{company.address}}",
  "{{company.representative_name}}",
  "{{contract.date}}",
  "{{contract.place}}",
];

const VARIABLE_LABELS: Record<string, string> = {
  "{{commercial.full_name}}": "Nombre completo comercial",
  "{{commercial.document_type}}": "Tipo documento",
  "{{commercial.document_number}}": "Nº documento",
  "{{commercial.address}}": "Dirección comercial",
  "{{commercial.company_name}}": "Empresa comercial",
  "{{commercial.company_tax_id}}": "CIF empresa comercial",
  "{{commercial.company_block}}": "Bloque empresa/domicilio",
  "{{commercial.profile}}": "Perfil comercial",
  "{{company.name}}": "Empresa AN24",
  "{{company.tax_id}}": "CIF AN24",
  "{{company.address}}": "Dirección AN24",
  "{{company.representative_name}}": "Representante AN24",
  "{{contract.date}}": "Fecha contrato",
  "{{contract.place}}": "Lugar contrato",
};

const PREVIEW_VALUES: Record<string, string> = {
  "{{commercial.full_name}}": "SARAI PRIETO",
  "{{commercial.document_type}}": "DNI",
  "{{commercial.document_number}}": "31655979180",
  "{{commercial.address}}": "Botica, 19 · 11580 Jerez de la Frontera, Cádiz",
  "{{commercial.company_name}}": "",
  "{{commercial.company_tax_id}}": "",
  "{{commercial.company_block}}": ", con domicilio en Botica, 19 · 11580 Jerez de la Frontera, Cádiz",
  "{{commercial.profile}}": "Premium",
  "{{company.name}}": "BEGOVER CONSULTORES S.L.",
  "{{company.tax_id}}": "B75820746",
  "{{company.address}}": "Calle Bizcocheros 2 Dpdo, Ofc 18 · Jerez de la Frontera (Cádiz)",
  "{{company.representative_name}}": "JESUS RAMON MARTINEZ GOMEZ",
  "{{contract.date}}": "20/08/2026",
  "{{contract.place}}": "Jerez de la Frontera",
};

function renderPreview(html: string) {
  let result = html || "";
  for (const [token, value] of Object.entries(PREVIEW_VALUES)) {
    result = result.split(token).join(value);
  }
  return result;
}

export default function ContractTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"visual" | "html" | "preview">("visual");
  const editorRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const r = await fetch("/api/contract-templates", { cache: "no-store" });
      const d = await r.json();

      if (!r.ok || !d.ok) {
        throw new Error(d.error || "No se pudieron cargar las plantillas.");
      }

      setTemplates(d.templates || []);
      setVersions(d.versions || []);

      const firstTemplate = d.templates?.[0];
      if (firstTemplate && !selectedTemplateId) {
        setSelectedTemplateId(firstTemplate.id);
      }
    } catch (e: any) {
      setError(e?.message || "Error cargando plantillas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const templateVersions = useMemo(
    () => versions.filter(v => v.template_id === selectedTemplateId),
    [versions, selectedTemplateId]
  );

  useEffect(() => {
    if (!selectedVersionId || !templateVersions.some(v => v.id === selectedVersionId)) {
      setSelectedVersionId(templateVersions[0]?.id || "");
    }
  }, [selectedTemplateId, versions, selectedVersionId, templateVersions]);

  const selected = versions.find(v => v.id === selectedVersionId);

  useEffect(() => {
    if (mode === "visual" && editorRef.current && selected) {
      if (editorRef.current.innerHTML !== (selected.body_html || "")) {
        editorRef.current.innerHTML = selected.body_html || "";
      }
    }
  }, [selectedVersionId, mode]);

  function patchSelected(key: string, value: any) {
    setVersions(prev =>
      prev.map(v => (v.id === selectedVersionId ? { ...v, [key]: value } : v))
    );
  }

  function syncVisual() {
    if (!editorRef.current || !selected) return;
    patchSelected("body_html", editorRef.current.innerHTML);
  }

  function command(commandName: string, value?: string) {
    if (mode !== "visual") setMode("visual");

    setTimeout(() => {
      editorRef.current?.focus();
      document.execCommand(commandName, false, value);
      syncVisual();
    }, 0);
  }

  function insertVariable(token: string) {
    if (!selected) return;

    if (mode === "html") {
      patchSelected("body_html", (selected.body_html || "") + token);
      return;
    }

    if (mode === "preview") {
      setMode("visual");
    }

    setTimeout(() => {
      editorRef.current?.focus();
      document.execCommand("insertText", false, token);
      syncVisual();
    }, 0);
  }

  async function save() {
    if (!selected) return;

    if (mode === "visual") syncVisual();

    setSaving(true);

    try {
      const current = versions.find(v => v.id === selectedVersionId);
      if (!current) return;

      const r = await fetch("/api/contract-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version_id: current.id,
          title: current.title,
          subtitle: current.subtitle,
          body_html:
            mode === "visual" && editorRef.current
              ? editorRef.current.innerHTML
              : current.body_html,
          notes: current.notes || "",
          variables: VARIABLES,
        }),
      });

      const d = await r.json();

      if (!r.ok || !d.ok) {
        throw new Error(d.error || "No se pudo guardar.");
      }

      await load();
      alert("Plantilla guardada.");
    } catch (e: any) {
      alert(e?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function duplicate() {
    if (!selected) return;

    setSaving(true);

    try {
      const r = await fetch("/api/contract-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "duplicate-version",
          version_id: selected.id,
        }),
      });

      const d = await r.json();

      if (!r.ok || !d.ok) {
        throw new Error(d.error || "No se pudo duplicar.");
      }

      await load();
      setSelectedVersionId(d.version.id);
      setMode("visual");
    } catch (e: any) {
      alert(e?.message || "No se pudo duplicar.");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!selected) return;

    if (
      !confirm(
        `¿Publicar la versión ${selected.version}? La versión publicada anterior quedará archivada.`
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      const r = await fetch("/api/contract-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          version_id: selected.id,
        }),
      });

      const d = await r.json();

      if (!r.ok || !d.ok) {
        throw new Error(d.error || "No se pudo publicar.");
      }

      await load();
      alert(`Versión ${selected.version} publicada.`);
    } catch (e: any) {
      alert(e?.message || "No se pudo publicar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main style={{ padding: 32 }}>Cargando plantillas contractuales...</main>;
  }

  return (
    <main className="page">
      <div className="top">
        <div>
          <div className="eyebrow">ONE · CONFIGURACIÓN</div>
          <h1>Plantillas contractuales</h1>
          <p>Edita, versiona, revisa y publica contratos sin tocar código.</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="grid">
        <aside className="panel sidebar">
          <div className="label">Plantilla</div>

          <select
            value={selectedTemplateId}
            onChange={e => setSelectedTemplateId(e.target.value)}
          >
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <div className="label versionsLabel">Versiones</div>

          <div className="versions">
            {templateVersions.map(v => (
              <button
                key={v.id}
                className={v.id === selectedVersionId ? "version active" : "version"}
                onClick={() => {
                  setSelectedVersionId(v.id);
                  setMode("visual");
                }}
              >
                <span>v{v.version}</span>
                <small>{v.status}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel editorPanel">
          {!selected ? (
            <div className="empty">Selecciona una versión.</div>
          ) : (
            <>
              <div className="editorTop">
                <div>
                  <div className="eyebrow">VERSIÓN {selected.version}</div>
                  <h2>{selected.title}</h2>
                </div>

                <span className={`badge ${selected.status.toLowerCase()}`}>
                  {selected.status}
                </span>
              </div>

              {selected.status !== "Borrador" && (
                <div className="readOnlyNotice">
                  Esta versión está <strong>{selected.status}</strong> y es de solo lectura.
                  Para modificarla, pulsa <strong>Duplicar versión</strong> y trabaja sobre el nuevo borrador.
                </div>
              )}

              <div className="fields2">
                <label>
                  Título
                  <input
                    value={selected.title || ""}
                    disabled={selected.status !== "Borrador"}
                    onChange={e => patchSelected("title", e.target.value)}
                  />
                </label>

                <label>
                  Subtítulo
                  <input
                    value={selected.subtitle || ""}
                    disabled={selected.status !== "Borrador"}
                    onChange={e => patchSelected("subtitle", e.target.value)}
                  />
                </label>
              </div>

              <div className="modeTabs">
                <button
                  className={mode === "visual" ? "tab activeTab" : "tab"}
                  onClick={() => setMode("visual")}
                >
                  Editor visual
                </button>

                <button
                  className={mode === "html" ? "tab activeTab" : "tab"}
                  onClick={() => {
                    if (mode === "visual") syncVisual();
                    setMode("html");
                  }}
                >
                  HTML
                </button>

                <button
                  className={mode === "preview" ? "tab activeTab" : "tab"}
                  onClick={() => {
                    if (mode === "visual") syncVisual();
                    setMode("preview");
                  }}
                >
                  Vista previa
                </button>
                {mode === "preview" && (
                  <button
                    className="printPreview"
                    onClick={() => window.print()}
                    title="Imprimir esta vista previa"
                  >
                    Imprimir vista previa
                  </button>
                )}
              </div>

              {mode === "visual" && (
                <>
                  <div className="toolbar">
                    <div className="toolbarGroup">
                      <button type="button" onClick={() => command("undo")} title="Deshacer">↶</button>
                      <button type="button" onClick={() => command("redo")} title="Rehacer">↷</button>
                    </div>

                    <span className="separator" />

                    <div className="toolbarGroup">
                      <button type="button" onClick={() => command("bold")} title="Negrita"><b>B</b></button>
                      <button type="button" onClick={() => command("italic")} title="Cursiva"><i>I</i></button>
                      <button type="button" onClick={() => command("underline")} title="Subrayado"><u>U</u></button>
                      <button type="button" onClick={() => command("strikeThrough")} title="Tachado"><s>S</s></button>
                    </div>

                    <span className="separator" />

                    <div className="toolbarGroup">
                      <button type="button" onClick={() => command("formatBlock", "p")}>Párrafo</button>
                      <button type="button" onClick={() => command("formatBlock", "h2")}>Título</button>
                      <button type="button" onClick={() => command("formatBlock", "h3")}>Sección</button>
                    </div>

                    <span className="separator" />

                    <div className="toolbarGroup">
                      <button type="button" onClick={() => command("justifyLeft")} title="Alinear izquierda">≡←</button>
                      <button type="button" onClick={() => command("justifyCenter")} title="Centrar">≡</button>
                      <button type="button" onClick={() => command("justifyRight")} title="Alinear derecha">→≡</button>
                      <button type="button" onClick={() => command("justifyFull")} title="Justificar">☰</button>
                    </div>

                    <span className="separator" />

                    <div className="toolbarGroup">
                      <button type="button" onClick={() => command("insertUnorderedList")}>• Lista</button>
                      <button type="button" onClick={() => command("insertOrderedList")}>1. Lista</button>
                      <button type="button" onClick={() => command("outdent")} title="Reducir sangría">⇤</button>
                      <button type="button" onClick={() => command("indent")} title="Aumentar sangría">⇥</button>
                    </div>

                    <span className="separator" />

                    <div className="toolbarGroup">
                      <button type="button" onClick={() => command("removeFormat")} title="Quitar formato">Tx</button>
                    </div>
                  </div>

                  <div className="editorHint">
                    Selecciona el texto y usa la barra superior para aplicar formato. Los cambios se guardan en la versión borrador.
                  </div>

                  <div
                    ref={editorRef}
                    className="visualEditor"
                    contentEditable={selected.status === "Borrador"}
                    suppressContentEditableWarning
                    onInput={syncVisual}
                  />
                </>
              )}

              {mode === "html" && (
                <textarea
                  className="htmlEditor"
                  disabled={selected.status !== "Borrador"}
                  value={selected.body_html || ""}
                  onChange={e => patchSelected("body_html", e.target.value)}
                  rows={30}
                />
              )}

              {mode === "preview" && (
                <div className="previewWrap">
                  <div className="previewNotice">
                    Vista de prueba con datos ficticios. No genera ningún contrato.
                  </div>

                  <article className="contractPreview">
                    <header className="paperHeader">
                      <div className="brandBlock">
                        <img src="/an24-logo.png" alt="AN24" className="brandLogo" />
                        <div className="brandRule" />
                      </div>

                      <div className="docMeta">
                        <span>CONTRATO COMERCIAL</span>
                        <strong>{selected.title || "Contrato de colaboración"}</strong>
                        <small>{selected.subtitle || "No exclusivo"}</small>
                      </div>
                    </header>

                    <div className="paperInfo">
                      <div>
                        <small>PLANTILLA</small>
                        <strong>Contrato de colaboración comercial</strong>
                      </div>
                      <div>
                        <small>VERSIÓN</small>
                        <strong>v{selected.version}</strong>
                      </div>
                      <div>
                        <small>ESTADO</small>
                        <strong>{selected.status}</strong>
                      </div>
                    </div>

                    <section
                      className="contractBody"
                      dangerouslySetInnerHTML={{
                        __html: renderPreview(selected.body_html || ""),
                      }}
                    />

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
                        <span>SARAI PRIETO</span>
                        <small>Perfil comercial: Premium</small>
                      </div>
                    </section>

                    <footer className="paperFooter">
                      <span>AN24 · BEGOVER CONSULTORES S.L.</span>
                      <span>Contrato de colaboración · v{selected.version}</span>
                    </footer>
                  </article>
                </div>
              )}

              <div className="variablesBox">
                <div>
                  <div className="label">Campos automáticos</div>
                  <p className="helper">
                    Haz clic para insertar el campo en el contrato.
                  </p>
                </div>

                <div className="chips">
                  {VARIABLES.map(v => (
                    <button
                      key={v}
                      className="variableChip"
                      title={v}
                      onClick={() => insertVariable(v)}
                    >
                      <span>{VARIABLE_LABELS[v] || v}</span>
                      <small>{v}</small>
                    </button>
                  ))}
                </div>
              </div>

              <label className="notesLabel">
                Notas internas
                <textarea
                  value={selected.notes || ""}
                  onChange={e => patchSelected("notes", e.target.value)}
                  rows={3}
                />
              </label>

              <div className="actions">
                <button className="secondary" onClick={duplicate} disabled={saving}>
                  Duplicar versión
                </button>

                <button className="secondary" onClick={save} disabled={saving || selected.status !== "Borrador"}>
                  Guardar cambios
                </button>

                <button
                  className="primary"
                  onClick={publish}
                  disabled={saving || selected.status === "Publicado"}
                >
                  Publicar versión
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        .page{
          padding:38px 34px 60px;
          max-width:1500px;
          margin:0 auto;
        }

        .top{
          margin-bottom:24px;
          padding-top:8px;
        }

        .eyebrow{
          font-size:11px;
          font-weight:900;
          letter-spacing:.14em;
          color:#ff5a2a;
        }

        h1{
          font-size:30px;
          margin:5px 0 5px;
        }

        h2{
          margin:4px 0 0;
        }

        p{
          color:#707070;
          margin:0;
        }

        .grid{
          display:grid;
          grid-template-columns:280px minmax(0,1fr);
          gap:18px;
          align-items:start;
        }

        .panel{
          background:#fff;
          border:1px solid #ececec;
          border-radius:18px;
          padding:18px;
          box-shadow:0 10px 35px rgba(0,0,0,.04);
        }

        .sidebar{
          position:sticky;
          top:24px;
        }

        .label,label{
          font-size:12px;
          font-weight:800;
          color:#555;
        }

        select,input,textarea{
          width:100%;
          box-sizing:border-box;
          border:1px solid #ddd;
          border-radius:10px;
          padding:10px;
          font:inherit;
          margin-top:7px;
          background:#fff;
        }

        .versionsLabel{
          margin-top:18px;
        }

        .versions{
          display:grid;
          gap:8px;
          margin-top:10px;
        }

        .version{
          display:flex;
          justify-content:space-between;
          border:1px solid #e7e7e7;
          background:#fafafa;
          border-radius:10px;
          padding:11px 12px;
          cursor:pointer;
        }

        .version.active{
          border-color:#ff5a2a;
          background:#fff4ef;
        }

        .version small{
          color:#777;
        }

        .editorTop{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          margin-bottom:16px;
        }

        .badge{
          font-size:11px;
          font-weight:900;
          padding:6px 9px;
          border-radius:999px;
          background:#eee;
        }

        .badge.publicado{
          background:#e9f7ef;
          color:#26734d;
        }

        .badge.borrador{
          background:#fff0e8;
          color:#b34d24;
        }

        .badge.archivado{
          background:#eee;
          color:#666;
        }

        .readOnlyNotice{
          margin-bottom:14px;
          padding:12px 14px;
          border:1px solid #ffd2bf;
          border-radius:10px;
          background:#fff7f2;
          color:#8c4529;
          font-size:12px;
          line-height:1.45;
        }

        .fields2{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
          margin-bottom:14px;
        }

        label{
          display:block;
          margin-bottom:14px;
        }

        .modeTabs{
          display:flex;
          gap:8px;
          margin:8px 0 10px;
        }

        .tab{
          border:1px solid #ddd;
          background:#fff;
          border-radius:9px;
          padding:8px 12px;
          font-weight:800;
          cursor:pointer;
        }

        .activeTab{
          border-color:#ff5a2a;
          background:#fff4ef;
          color:#d64b21;
        }

        .printPreview{
          margin-left:auto;
          border:0;
          background:#171717;
          color:#fff;
          border-radius:9px;
          padding:8px 12px;
          font-weight:800;
          cursor:pointer;
        }

        .toolbar{
          position:sticky;
          top:8px;
          z-index:30;
          display:flex;
          align-items:center;
          flex-wrap:wrap;
          gap:7px;
          padding:10px 12px;
          border:1px solid #d9d9d9;
          border-radius:12px 12px 0 0;
          background:#ffffff;
          box-shadow:0 8px 24px rgba(0,0,0,.08);
        }

        .toolbarGroup{
          display:flex;
          align-items:center;
          gap:5px;
        }

        .toolbar button{
          border:1px solid #d8d8d8;
          background:#fff;
          min-height:34px;
          border-radius:8px;
          padding:6px 10px;
          font-size:12px;
          font-weight:800;
          color:#222;
          cursor:pointer;
          transition:.15s ease;
        }

        .toolbar button:hover{
          border-color:#ff7d55;
          background:#fff4ef;
          color:#d94d21;
        }

        .separator{
          width:1px;
          height:28px;
          background:#ddd;
          margin:0 2px;
        }

        .editorHint{
          padding:8px 12px;
          border-left:1px solid #ddd;
          border-right:1px solid #ddd;
          background:#fffaf7;
          color:#8a5a45;
          font-size:11px;
          font-weight:700;
        }

        .visualEditor{
          min-height:720px;
          padding:36px 42px;
          border:1px solid #ddd;
          border-radius:0 0 12px 12px;
          outline:none;
          background:#fff;
          font-family:Arial,Helvetica,sans-serif;
          font-size:14px;
          line-height:1.65;
          color:#1c1c1c;
        }

        .visualEditor:focus{
          border-color:#ff8b68;
          box-shadow:0 0 0 3px rgba(255,90,42,.08);
        }

        .htmlEditor{
          min-height:650px;
          font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
          font-size:12px;
          line-height:1.55;
        }

        .previewWrap{
          border:1px solid #e4e4e4;
          border-radius:12px;
          background:#f4f4f4;
          padding:16px;
        }

        .previewNotice{
          font-size:11px;
          font-weight:800;
          color:#8b5a45;
          background:#fff5ef;
          border:1px solid #ffd3bf;
          border-radius:9px;
          padding:9px 11px;
          margin-bottom:14px;
        }

        .contractPreview{
          max-width:794px;
          margin:0 auto;
          min-height:1123px;
          background:#fff;
          padding:42px 48px 34px;
          border-radius:4px;
          box-shadow:0 14px 45px rgba(0,0,0,.10);
          font-family:Arial,Helvetica,sans-serif;
          font-size:12.5px;
          line-height:1.62;
          color:#202020;
          box-sizing:border-box;
          position:relative;
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
          grid-template-columns:1fr 100px 120px;
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

        .variablesBox{
          margin-top:18px;
          padding:15px;
          border:1px solid #eee;
          border-radius:12px;
          background:#fafafa;
        }

        .helper{
          font-size:11px;
          margin-top:3px;
        }

        .chips{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:8px;
          margin-top:12px;
        }

        .variableChip{
          display:flex;
          flex-direction:column;
          align-items:flex-start;
          gap:2px;
          text-align:left;
          border:1px solid #e1e1e1;
          background:#fff;
          padding:9px 10px;
          border-radius:9px;
          cursor:pointer;
        }

        .variableChip:hover{
          border-color:#ff9a79;
          background:#fff7f3;
        }

        .variableChip span{
          font-size:11px;
          font-weight:800;
        }

        .variableChip small{
          color:#888;
          font-size:9px;
        }

        .notesLabel{
          margin-top:16px;
        }

        .actions{
          display:flex;
          justify-content:flex-end;
          gap:10px;
          margin-top:18px;
        }

        .actions button{
          border:0;
          border-radius:10px;
          padding:11px 15px;
          font-weight:800;
          cursor:pointer;
        }

        .primary{
          background:#ff5a2a;
          color:white;
        }

        .secondary{
          background:#f1f1f1;
          color:#222;
        }

        .error{
          padding:12px;
          background:#fff0ea;
          border:1px solid #ffd2bf;
          border-radius:12px;
          color:#a4421c;
          margin-bottom:16px;
        }

        .empty{
          padding:20px;
          background:#fafafa;
          border-radius:12px;
          color:#777;
        }

        @media print{
          :global(body){
            background:#fff !important;
          }

          .top,
          .sidebar,
          .editorTop,
          .fields2,
          .modeTabs,
          .toolbar,
          .variablesBox,
          .notesLabel,
          .actions,
          .previewNotice{
            display:none !important;
          }

          .page,
          .grid,
          .panel,
          .editorPanel,
          .previewWrap{
            display:block !important;
            padding:0 !important;
            margin:0 !important;
            border:0 !important;
            box-shadow:none !important;
            background:#fff !important;
            max-width:none !important;
          }

          .contractPreview{
            width:100% !important;
            max-width:none !important;
            min-height:auto !important;
            padding:0 !important;
            margin:0 !important;
            box-shadow:none !important;
          }

          @page{
            size:A4;
            margin:15mm 16mm;
          }
        }

        @media(max-width:1100px){
          .chips{
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
        }

        @media(max-width:900px){
          .grid{
            grid-template-columns:1fr;
          }
          .sidebar{
            position:static;
          }
          .fields2{
            grid-template-columns:1fr;
          }
          .chips{
            grid-template-columns:1fr;
          }
        }
      `}</style>
    </main>
  );
}
