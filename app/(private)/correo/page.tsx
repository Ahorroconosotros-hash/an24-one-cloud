"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import styles from "./Mail.module.css";

type InboxMsg = { uid:string; from:string; subject:string; date:string; unread:boolean };
type SentMsg = { id:string; to_addresses:string[]; subject:string; body_text:string; sent_at:string; status:string };

async function token(){
  const {data:{session}}=await supabaseBrowser.auth.getSession();
  if(!session?.access_token) throw new Error("Sesión no encontrada");
  return session.access_token;
}

export default function MailPage(){
  return <Suspense fallback={<main className={styles.page}><div className={styles.panel}><div className={styles.loading}>Abriendo ONE Mail…</div></div></main>}><MailPageContent /></Suspense>;
}

function MailPageContent(){
  const search=useSearchParams();
  const folder=search.get("folder")==="sent"?"sent":"inbox";
  const [loading,setLoading]=useState(true);
  const [connected,setConnected]=useState(false);
  const [account,setAccount]=useState<any>(null);
  const [inbox,setInbox]=useState<InboxMsg[]>([]);
  const [sent,setSent]=useState<SentMsg[]>([]);
  const [error,setError]=useState("");

  async function load(){
    setLoading(true);setError("");
    try{
      const t=await token();
      const endpoint=folder==="sent"?"/api/mail/sent":"/api/mail/inbox";
      const r=await fetch(endpoint,{headers:{Authorization:`Bearer ${t}`},cache:"no-store"});
      const j=await r.json();
      if(!r.ok||!j.ok) throw new Error(j.error||"No se pudo leer ONE Mail");
      setConnected(Boolean(j.connected));setAccount(j.account||null);
      if(folder==="sent") setSent(j.messages||[]); else setInbox(j.messages||[]);
    }catch(e:any){setError(e?.message||"No se pudo cargar el correo");}
    finally{setLoading(false);}
  }

  useEffect(()=>{load();},[folder]);
  const unread=useMemo(()=>inbox.filter(m=>m.unread).length,[inbox]);

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>ONE MAIL</span><h1>Tu correo, sin salir de ONE</h1><p>Correo, clientes, ofertas y contratos en el mismo puesto de trabajo.</p></div>
      <div className={styles.actions}><button className={styles.secondary} onClick={load}>↻ Actualizar</button><Link className={styles.secondary} href="/correo/configuracion">⚙ Configurar</Link><Link className={styles.primary} href="/correo/redactar">＋ Nuevo correo</Link></div>
    </header>

    {error&&<div className={styles.error}>{error}</div>}
    {loading?<div className={styles.panel}><div className={styles.loading}>Conectando con tu buzón…</div></div>:!connected?<section className={styles.connect}><div className={styles.connectIcon}>✉</div><h2>Conecta tu correo a ONE</h2><p>Una vez conectado, este será tu buzón de trabajo. Arsys queda precargado y ONE admite cualquier empresa con IMAP/SMTP.</p><Link className={styles.primary} href="/correo/configuracion">Conectar mi cuenta</Link></section>:<div className={styles.layout}>
      <aside className={styles.sidebar}>
        <Link className={`${styles.folder} ${folder==="inbox"?styles.folderActive:""}`} href="/correo">Entrada {folder==="inbox"&&<span className={styles.count}>{unread}</span>}</Link>
        <Link className={`${styles.folder} ${folder==="sent"?styles.folderActive:""}`} href="/correo?folder=sent">Enviados</Link>
        <Link className={styles.folder} href="/correo/redactar">Redactar</Link>
      </aside>
      <section className={styles.panel}>
        <div className={styles.panelHead}><h2>{folder==="sent"?"Enviados desde ONE":"Bandeja de entrada"}</h2><span className={styles.account}>{account?.displayName} · {account?.emailAddress}</span></div>
        {folder==="inbox" ? (inbox.length?<div className={styles.messages}>{inbox.map(m=><Link href={`/correo/mensaje/${m.uid}`} key={m.uid} className={`${styles.message} ${m.unread?styles.messageUnread:""}`}><span className={`${styles.dot} ${m.unread?"":styles.dotRead}`}/><span className={styles.from}>{m.from||"Remitente"}</span><span className={styles.subject}>{m.subject||"(Sin asunto)"}</span><time className={styles.date}>{fmt(m.date)}</time></Link>)}</div>:<div className={styles.empty}><strong>Bandeja al día</strong><span>No hay mensajes que mostrar.</span></div>) : (sent.length?<div className={styles.messages}>{sent.map(m=><article key={m.id} className={styles.message}><span className={`${styles.dot} ${styles.dotRead}`}/><span className={styles.from}>Para: {(m.to_addresses||[]).join(", ")}</span><span className={styles.subject}>{m.subject||"(Sin asunto)"}</span><time className={styles.date}>{fmt(m.sent_at)}</time></article>)}</div>:<div className={styles.empty}><strong>Aún no hay enviados</strong><span>Los correos que envíes desde ONE aparecerán aquí.</span></div>)}
      </section>
    </div>}
  </main>;
}

function fmt(v:string){if(!v)return "—";const d=new Date(v);return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(d)}
