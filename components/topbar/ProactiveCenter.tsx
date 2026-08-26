"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import styles from "./TopbarTools.module.css";

type FeedItem = {
  id: string;
  type: "correction" | "processing" | "renewal" | "agenda";
  priority: "urgent" | "high" | "normal";
  title: string;
  detail: string;
  eyebrow: string;
  href: string;
  dueAt?: string | null;
};

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export default function ProactiveCenter({ triggerClassName }: { triggerClassName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();
      if (!session) return;
      const response = await fetch("/api/proactive-feed", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo cargar el centro proactivo");
      setItems(Array.isArray(data.items) ? data.items : []);
      setError("");
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar el centro proactivo");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load(true), 60000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    load(true);
  }, [pathname, load]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function go(item: FeedItem) {
    setOpen(false);
    router.push(item.href);
  }

  const count = items.length;

  return (
    <div className={styles.proactiveWrap} ref={panelRef}>
      <button
        type="button"
        className={triggerClassName}
        aria-label={count ? `Centro proactivo: ${count} asuntos pendientes` : "Centro proactivo"}
        title="Centro proactivo ONE"
        onClick={() => {
          setOpen((value) => !value);
          load(true);
        }}
      >
        <BellIcon />
        {count > 0 && <span className={styles.notificationBadge}>{count > 99 ? "99+" : count}</span>}
      </button>

      {open && (
        <section className={styles.proactivePanel} aria-label="Centro proactivo ONE">
          <header className={styles.panelHeader}>
            <div>
              <p>ONE PROACTIVO</p>
              <h3>Requiere tu atención</h3>
            </div>
            <button type="button" onClick={() => load()} className={styles.refreshButton}>Actualizar</button>
          </header>

          <div className={styles.panelBody}>
            {loading && <div className={styles.loadingState}>Revisando tu operativa…</div>}
            {!loading && error && <div className={styles.errorState}>{error}</div>}
            {!loading && !error && items.length === 0 && (
              <div className={styles.clearState}>
                <span>✓</span>
                <strong>Todo bajo control.</strong>
                <small>ONE no detecta acciones pendientes para ti ahora mismo.</small>
              </div>
            )}

            {!loading && items.map((item) => (
              <button key={item.id} type="button" className={styles.feedItem} onClick={() => go(item)}>
                <span className={`${styles.priorityMark} ${styles[item.priority]}`} />
                <span className={styles.feedText}>
                  <span className={styles.feedEyebrow}>{item.eyebrow}</span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <span className={styles.feedArrow}>→</span>
              </button>
            ))}
          </div>

          <footer className={styles.panelFooter}>
            <span>La campana muestra trabajo real pendiente, no avisos decorativos.</span>
            <button type="button" onClick={() => { setOpen(false); router.push("/dashboard"); }}>Ir a Mi Día</button>
          </footer>
        </section>
      )}
    </div>
  );
}
