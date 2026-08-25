"use client";

import { FormEvent,useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupAdmin(){
  const router=useRouter();
  const [email,setEmail]=useState("info@begover.es");
  const [password,setPassword]=useState("");
  const [repeat,setRepeat]=useState("");
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [done,setDone]=useState(false);

  async function submit(e:FormEvent){
    e.preventDefault();
    setError("");

    if(password.length<8){setError("La contraseña debe tener al menos 8 caracteres.");return;}
    if(password!==repeat){setError("Las dos contraseñas no coinciden.");return;}

    setSaving(true);
    try{
      const r=await fetch("/api/setup-admin",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email,password})
      });
      const d=await r.json();
      if(!r.ok||!d.ok) throw new Error(d.error||"No se pudo activar.");
      setDone(true);
      setPassword("");
      setRepeat("");
    }catch(err:any){
      setError(err?.message||"No se pudo activar.");
    }finally{
      setSaving(false);
    }
  }

  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f7f7f7",fontFamily:"Arial"}}>
    <section style={{width:"min(520px,100%)",padding:34,border:"1px solid #e7e7e7",borderRadius:22,background:"#fff",boxShadow:"0 24px 70px rgba(0,0,0,.10)"}}>
      <div style={{color:"#e64a2d",fontSize:11,fontWeight:900,letterSpacing:".13em"}}>ONE · SOLO LOCALHOST</div>
      <h1 style={{fontSize:34,margin:"10px 0"}}>{done?"Administrador activado":"Activar Administrador"}</h1>

      {done ? <>
        <p>El acceso de <strong>{email}</strong> ya está preparado como Administrador.</p>
        <button onClick={()=>router.push("/login")} style={btn}>Ir al login de ONE →</button>
      </> : <form onSubmit={submit}>
        <label style={label}>Correo administrador
          <input style={input} type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        </label>
        <label style={label}>Nueva contraseña
          <input style={input} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 8 caracteres"/>
        </label>
        <label style={label}>Repetir contraseña
          <input style={input} type="password" value={repeat} onChange={e=>setRepeat(e.target.value)} placeholder="Repite la contraseña"/>
        </label>
        {error&&<div style={{padding:10,background:"#fff1ed",color:"#a64025",borderRadius:10,marginBottom:12,fontWeight:700}}>{error}</div>}
        <button type="submit" disabled={saving} style={btn}>{saving?"Activando...":"Activar acceso Administrador"}</button>
      </form>}

      <p style={{fontSize:11,color:"#999",marginTop:18,textAlign:"center"}}>
        No compartas la contraseña por chat. Cuando confirmemos el acceso eliminaremos esta pantalla temporal.
      </p>
    </section>
  </main>;
}

const label={display:"block",marginBottom:15,fontSize:12,fontWeight:800} as const;
const input={display:"block",width:"100%",boxSizing:"border-box",marginTop:7,padding:"13px 14px",border:"1px solid #ddd",borderRadius:11,fontSize:15} as const;
const btn={width:"100%",padding:"14px 16px",border:0,borderRadius:12,background:"linear-gradient(105deg,#ffca3a,#f5821f 50%,#e8432e)",color:"#fff",fontSize:14,fontWeight:900,cursor:"pointer"} as const;
