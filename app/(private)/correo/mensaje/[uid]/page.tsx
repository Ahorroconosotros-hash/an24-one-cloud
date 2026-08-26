"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import styles from "../../Mail.module.css";

async function token(){const {data:{session}}=await supabaseBrowser.auth.getSession();if(!session?.access_token)throw new Error("Sesión no encontrada");return session.access_token;}
function addressOnly(value:string){const m=String(value||"").match(/<([^>]+)>/);return (m?.[1]||value).trim();}

export default function MailMessagePage(){
  const params=useParams<{uid:string}>();
  const [message,setMessage]=useState<any>(null);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{try{const t=await token();const r=await fetch(`/api/mail/message?uid=${encodeURIComponent(params.uid)}`,{headers:{Authorization:`Bearer ${t}`},cache:"no-store"});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"No se pudo leer el mensaje");setMessage(j.message);}catch(e:any){setError(e?.message||"No se pudo leer el mensaje");}finally{setLoading(false);}})();},[params.uid]);
  if(loading)return <main className={styles.page}><div className={styles.panel}><div className={styles.loading}>Abriendo correo…</div></div></main>;
  if(error||!message)return <main className={styles.page}><div className={styles.error}>{error||"Mensaje no disponible"}</div><Link className={styles.back} href="/correo">← Volver a Entrada</Link></main>;
  const replySubject=/^re:/i.test(message.subject)?message.subject:`Re: ${message.subject}`;
  const replyBody=`\n\n--- Mensaje original ---\nDe: ${message.from}\nFecha: ${message.date}\n\n${message.bodyText||""}`;
  return <main className={styles.page}><div className={styles.composer}><div className={styles.composerHead}><div><Link className={styles.back} href="/correo">← Bandeja de entrada</Link><span className={styles.eyebrow} style={{marginTop:18}}>ONE MAIL · MENSAJE</span><h1>{message.subject}</h1></div><div className={styles.actions}><Link className={styles.primary} href={`/correo/redactar?to=${encodeURIComponent(addressOnly(message.from))}&subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(replyBody)}`}>Responder</Link></div></div><div className={styles.mailMeta}><div><span>De</span><strong>{message.from}</strong></div><div><span>Para</span><strong>{message.to||"—"}</strong></div><div><span>Fecha</span><strong>{message.date||"—"}</strong></div></div><div className={styles.readBody}>{message.bodyText||"(Mensaje sin contenido de texto legible)"}</div></div></main>;
}
