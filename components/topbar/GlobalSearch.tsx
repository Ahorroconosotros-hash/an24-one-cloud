"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import styles from "./TopbarTools.module.css";

type SearchResult = {
  id: string;
  kind: "client" | "contract" | "offer" | "user";
  title: string;
  subtitle: string;
  meta?: string;
  href: string;
};

const LABELS: Record<SearchResult["kind"], string> = {
  client: "Cliente",
  contract: "Contrato",
  offer: "Oferta",
  user: "Usuario",
};

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

export default function GlobalSearch({ triggerClassName }: { triggerClassName: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const {
          data: { session },
        } = await supabaseBrowser.auth.getSession();
        if (!session) throw new Error("Sesión no válida");
        const response = await fetch(`/api/global-search?q=${encodeURIComponent(q)}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo buscar");
        if (!cancelled) setResults(Array.isArray(data.results) ? data.results : []);
      } catch (err: any) {
        if (!cancelled) {
          setResults([]);
          setError(err?.message || "No se pudo buscar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const grouped = useMemo(() => {
    const map = new Map<SearchResult["kind"], SearchResult[]>();
    for (const result of results) {
      const list = map.get(result.kind) || [];
      list.push(result);
      map.set(result.kind, list);
    }
    return map;
  }, [results]);

  function go(result: SearchResult) {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  }

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        aria-label="Buscar en ONE"
        title="Buscar en ONE (⌘K)"
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
      </button>

      {open && (
        <div className={styles.modalLayer} role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            className={styles.searchDialog}
            role="dialog"
            aria-modal="true"
            aria-label="Buscar en ONE"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.searchInputWrap}>
              <SearchIcon />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && results[0]) go(results[0]);
                }}
                placeholder="Cliente, CIF/DNI, teléfono, CUPS, contrato, oferta…"
                className={styles.searchInput}
              />
              <span className={styles.keyHint}>ESC</span>
            </div>

            <div className={styles.searchBody}>
              {query.trim().length < 2 && (
                <div className={styles.emptyState}>
                  <strong>Busca en todo ONE.</strong>
                  <span>Escribe al menos 2 caracteres. También puedes abrirlo con ⌘K.</span>
                </div>
              )}

              {loading && <div className={styles.loadingState}>Buscando…</div>}
              {!loading && error && <div className={styles.errorState}>{error}</div>}

              {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
                <div className={styles.emptyState}>
                  <strong>No encontramos coincidencias.</strong>
                  <span>Prueba con nombre, referencia, DNI/CIF, CUPS o proveedor.</span>
                </div>
              )}

              {!loading && results.length > 0 && (
                <div className={styles.resultGroups}>
                  {(["client", "contract", "offer", "user"] as SearchResult["kind"][]).map((kind) => {
                    const list = grouped.get(kind) || [];
                    if (!list.length) return null;
                    return (
                      <div className={styles.resultGroup} key={kind}>
                        <p>{LABELS[kind]}{list.length === 1 ? "" : "s"}</p>
                        {list.map((result) => (
                          <button key={result.id} type="button" className={styles.resultItem} onClick={() => go(result)}>
                            <span className={styles.resultKind}>{LABELS[result.kind].charAt(0)}</span>
                            <span className={styles.resultText}>
                              <strong>{result.title}</strong>
                              <small>{result.subtitle || LABELS[result.kind]}</small>
                            </span>
                            {result.meta && <span className={styles.resultMeta}>{result.meta}</span>}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className={styles.searchFooter}>
              <span>ONE busca solo dentro de lo que tu perfil puede ver.</span>
              <span>↵ abrir</span>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
