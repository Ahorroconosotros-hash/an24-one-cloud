"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "Administrador" | "BackOffice" | "Comercial";
type Profile = "Premium" | "Avanzado" | "Estándar" | "Colaborador" | "";

type PermissionKey =
  | "can_create_clients" | "can_edit_clients" | "can_assign_clients"
  | "can_create_opportunities" | "can_assign_opportunities"
  | "can_validate_opportunities" | "can_return_to_draft"
  | "can_process" | "can_activate" | "can_manage_catalog"
  | "can_view_commissions" | "can_print" | "can_view_reports"
  | "can_create_reports" | "can_generate_commission_annex";

type OneUser = {
  id: string;
  auth_user_id?: string | null;
  name: string;
  email: string;
  role: Role;
  profile_type?: Profile | null;
  department?: string | null;
  active: boolean;
} & Record<PermissionKey, boolean>;

type CommercialProfile = {
  id?: string;
  user_id: string;
  first_name: string;
  last_name: string;
  document_type: string;
  document_number: string;
  contact_email: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  province: string;
  country: string;
  collaborator_type: string;
  company_name: string;
  company_tax_id: string;
  iban: string;
  commercial_status: string;
  start_date: string;
  end_date: string;
  internal_notes: string;
};

type CommercialDocument = {
  id: string;
  document_type: string;
  title: string;
  version: number;
  status: string;
  profile_snapshot?: string | null;
  generated_at?: string;
  signed_at?: string | null;
};

const permissions: { key: PermissionKey; label: string; group: string }[] = [
  { key:"can_create_clients",label:"Crear clientes",group:"Clientes" },
  { key:"can_edit_clients",label:"Editar clientes",group:"Clientes" },
  { key:"can_assign_clients",label:"Asignar / reasignar clientes",group:"Clientes" },
  { key:"can_create_opportunities",label:"Crear oportunidades",group:"Oportunidades" },
  { key:"can_assign_opportunities",label:"Asignar / reasignar oportunidades",group:"Oportunidades" },
  { key:"can_validate_opportunities",label:"Validar oportunidades",group:"BackOffice" },
  { key:"can_return_to_draft",label:"Devolver a borrador",group:"BackOffice" },
  { key:"can_process",label:"Tramitar",group:"BackOffice" },
  { key:"can_activate",label:"Activar",group:"BackOffice" },
  { key:"can_manage_catalog",label:"Gestionar catálogo",group:"Gestión" },
  { key:"can_view_commissions",label:"Ver comisiones",group:"Comisiones" },
  { key:"can_print",label:"Permitir impresión",group:"Documentos" },
  { key:"can_view_reports",label:"Ver informes",group:"Informes" },
  { key:"can_create_reports",label:"Crear informes",group:"Informes" },
  { key:"can_generate_commission_annex",label:"Generar anexo de comisiones",group:"Comisiones" },
];

function blankProfile(user: OneUser): CommercialProfile {
  const p = user.name.trim().split(/\s+/);
  return {
    user_id:user.id, first_name:p[0]||"", last_name:p.slice(1).join(" "),
    document_type:"DNI", document_number:"", contact_email:user.email, phone:"",
    address:"", postal_code:"", city:"", province:"", country:"España",
    collaborator_type:"Particular", company_name:"", company_tax_id:"", iban:"",
    commercial_status:"Candidato", start_date:"", end_date:"", internal_notes:""
  };
}

export default function UsuariosPage() {
  const [users,setUsers]=useState<OneUser[]>([]);
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState("");
  const [editing,setEditing]=useState<OneUser|null>(null);
  const [tab,setTab]=useState<"acceso"|"ficha"|"permisos"|"documentos">("acceso");
  const [profile,setProfile]=useState<CommercialProfile|null>(null);
  const [documents,setDocuments]=useState<CommercialDocument[]>([]);
  const [password,setPassword]=useState("");
  const [saving,setSaving]=useState(false);
  const [profileLoading,setProfileLoading]=useState(false);
  const [profileError,setProfileError]=useState("");
  const [documentsLoading,setDocumentsLoading]=useState(false);
  const [documentsError,setDocumentsError]=useState("");
  const [creating,setCreating]=useState(false);

  const [newUser,setNewUser]=useState({
    name:"",email:"",password:"",
    role:"Comercial" as Role,
    profile_type:"Estándar" as Profile,
    department:"General"
  });

  async function loadUsers(){
    setLoading(true);
    try{
      const r=await fetch("/api/one-users",{cache:"no-store"});
      const d=await r.json();
      if(!r.ok||!d.ok) throw new Error(d.error||"Error");
      setUsers(d.users||[]);
    }catch(e){console.error(e);alert("No se pudieron cargar usuarios.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{loadUsers();},[]);

  const filtered=useMemo(()=>{
    const q=query.toLowerCase().trim();
    return !q?users:users.filter(u=>`${u.name} ${u.email} ${u.role} ${u.department||""} ${u.profile_type||""}`.toLowerCase().includes(q));
  },[users,query]);

  const counts=useMemo(()=>({
    total:users.length,
    active:users.filter(u=>u.active).length,
    comerciales:users.filter(u=>u.role==="Comercial"&&u.active).length,
    backoffice:users.filter(u=>u.role==="BackOffice"&&u.active).length
  }),[users]);

  const persistedEditingUser = editing ? users.find(u=>u.id===editing.id) || editing : null;
  const persistedProfileType = persistedEditingUser?.profile_type || "";

  async function loadDocumentsForUser(userId:string){
    setDocumentsLoading(true);
    setDocumentsError("");

    try{
      const dr=await fetch(`/api/commercial-documents?userId=${encodeURIComponent(userId)}`,{cache:"no-store"});
      let dd:any={};
      try{ dd=await dr.json(); }catch{}

      if(!dr.ok || !dd.ok){
        setDocumentsError(dd.error || "No se pudo cargar el histórico documental.");
        return;
      }

      setDocuments(dd.documents || []);
    }catch(e:any){
      console.error(e);
      setDocumentsError(e?.message || "No se pudo cargar el histórico documental.");
    }finally{
      setDocumentsLoading(false);
    }
  }

  async function openUser(user:OneUser){
    setEditing({...user});
    setPassword("");
    setTab("acceso");
    setProfileError("");
    setDocumentsError("");

    // La ficha y el histórico se cargan de forma independiente.
    setProfile(blankProfile(user));
    setProfileLoading(true);
    setDocumentsLoading(true);

    // CARGA FICHA
    (async()=>{
      try{
        const pr=await fetch(`/api/commercial-profile?userId=${encodeURIComponent(user.id)}`,{cache:"no-store"});
        let pd:any={};
        try{ pd=await pr.json(); }catch{}

        if(pr.ok && pd.ok && pd.profile){
          setProfile({
            ...blankProfile(user),
            ...pd.profile,
            user_id:user.id,
            first_name:pd.profile.first_name ?? "",
            last_name:pd.profile.last_name ?? "",
            document_type:pd.profile.document_type || "DNI",
            document_number:pd.profile.document_number ?? "",
            contact_email:pd.profile.contact_email ?? user.email,
            phone:pd.profile.phone ?? "",
            address:pd.profile.address ?? "",
            postal_code:pd.profile.postal_code ?? "",
            city:pd.profile.city ?? "",
            province:pd.profile.province ?? "",
            country:pd.profile.country || "España",
            collaborator_type:pd.profile.collaborator_type || "Particular",
            company_name:pd.profile.company_name ?? "",
            company_tax_id:pd.profile.company_tax_id ?? "",
            iban:pd.profile.iban ?? "",
            commercial_status:pd.profile.commercial_status || "Candidato",
            start_date:pd.profile.start_date ?? "",
            end_date:pd.profile.end_date ?? "",
            internal_notes:pd.profile.internal_notes ?? ""
          });
        }else if(!pr.ok || pd.ok===false){
          setProfileError(pd.error || "No se pudo leer la ficha guardada. Puedes editarla y volver a guardarla.");
        }
      }catch(e:any){
        console.error(e);
        setProfileError("No se pudo cargar la ficha guardada. ONE mantiene una ficha editable.");
      }finally{
        setProfileLoading(false);
      }
    })();

    // CARGA DOCUMENTOS
    loadDocumentsForUser(user.id);
  }

  async function createUser(){
    if(!newUser.name.trim()||!newUser.email.trim()||!newUser.password.trim()){
      alert("Nombre, email y contraseña son obligatorios."); return;
    }
    if(newUser.password.length<8){alert("La contraseña debe tener al menos 8 caracteres.");return;}
    setSaving(true);
    try{
      const r=await fetch("/api/one-users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newUser)});
      const d=await r.json();
      if(!r.ok||!d.ok){alert(d.error||"No se pudo crear.");return;}
      setCreating(false);
      setNewUser({name:"",email:"",password:"",role:"Comercial",profile_type:"Estándar",department:"General"});
      await loadUsers();
    }finally{setSaving(false);}
  }

  async function saveUser(){
    if(!editing)return;
    if(password && password.length<8){alert("La contraseña debe tener al menos 8 caracteres.");return;}
    setSaving(true);
    try{
      const r=await fetch("/api/one-users",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({...editing,password:password||undefined})});
      const d=await r.json();
      if(!r.ok||!d.ok){alert(d.error||"No se pudo guardar.");return;}
      setEditing(d.user); setPassword("");
      setUsers(v=>v.map(x=>x.id===d.user.id?d.user:x));
      alert("Usuario actualizado.");
    }finally{setSaving(false);}
  }

  async function toggleActive(user:OneUser){
    const next=!user.active;
    if(!confirm(next?`¿Activar a ${user.name}?`:`¿Desactivar a ${user.name}?`)) return;
    try{
      const r=await fetch("/api/one-users",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:user.id,active:next})});
      const d=await r.json();
      if(!r.ok||!d.ok){alert(d.error||"No se pudo cambiar el estado.");return;}
      setUsers(v=>v.map(x=>x.id===d.user.id?d.user:x));
      if(editing?.id===d.user.id)setEditing(d.user);
    }catch(e:any){alert(e?.message||"Error");}
  }

  async function saveProfile(){
    if(!profile){
      alert("No hay ficha cargada.");
      return;
    }

    setSaving(true);
    setProfileError("");

    try{
      const r=await fetch("/api/commercial-profile",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(profile)
      });

      let d:any={};
      try{ d=await r.json(); }catch{}

      if(!r.ok||!d.ok){
        const message=d.error||"No se pudo guardar la ficha comercial.";
        setProfileError(message);
        alert(message);
        return;
      }

      setProfile({
        ...profile,
        ...d.profile,
        user_id:profile.user_id,
        first_name:d.profile?.first_name ?? "",
        last_name:d.profile?.last_name ?? "",
        document_number:d.profile?.document_number ?? "",
        contact_email:d.profile?.contact_email ?? "",
        phone:d.profile?.phone ?? "",
        address:d.profile?.address ?? "",
        postal_code:d.profile?.postal_code ?? "",
        city:d.profile?.city ?? "",
        province:d.profile?.province ?? "",
        company_name:d.profile?.company_name ?? "",
        company_tax_id:d.profile?.company_tax_id ?? "",
        iban:d.profile?.iban ?? "",
        start_date:d.profile?.start_date ?? "",
        end_date:d.profile?.end_date ?? "",
        internal_notes:d.profile?.internal_notes ?? ""
      });

      alert("Ficha comercial guardada.");
    }catch(e:any){
      const message=e?.message||"No se pudo guardar la ficha comercial.";
      setProfileError(message);
      alert(message);
    }finally{
      setSaving(false);
    }
  }

  async function generate(type:"Contrato comercial"|"Anexo de comisiones"){
    if(!editing||!profile?.id){alert("Primero guarda la ficha comercial.");return;}
    setSaving(true);
    try{
      const endpoint = type==="Anexo de comisiones" ? "/api/commercial-annex" : "/api/commercial-documents";
      const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        userId:editing.id,commercialProfileId:profile.id,documentType:type,profileSnapshot:persistedProfileType||null
      })});
      const d=await r.json();
      if(!r.ok||!d.ok){alert(d.error||"No se pudo generar.");return;}
      setDocuments(v=>[d.document,...v]);
      if(type==="Anexo de comisiones"){
        window.location.href=`/usuarios/anexo/${d.document.id}`;
        return;
      }
      alert(`Contrato generado como borrador v${d.document.version}.`);
    }finally{setSaving(false);}
  }


  function openDocument(doc: CommercialDocument){
    if(doc.document_type==="Anexo de comisiones"){
      window.location.href=`/usuarios/anexo/${doc.id}`;
      return;
    }

    if(doc.document_type==="Contrato comercial"){
      window.location.href=`/usuarios/contrato/${doc.id}`;
      return;
    }
  }

  async function updateDocumentStatus(doc: CommercialDocument, status: "Firmado"|"Sustituido"|"Cancelado"){
    const question =
      status==="Firmado" ? `¿Marcar "${doc.title}" v${doc.version} como firmado?` :
      status==="Sustituido" ? `¿Marcar "${doc.title}" v${doc.version} como sustituido?` :
      `¿Cancelar "${doc.title}" v${doc.version}?`;

    if(!confirm(question)) return;

    try{
      const r=await fetch("/api/commercial-documents/status",{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({documentId:doc.id,status})
      });
      const d=await r.json();
      if(!r.ok||!d.ok){alert(d.error||"No se pudo actualizar el documento.");return;}
      setDocuments(v=>v.map(x=>x.id===d.document.id?d.document:x));
    }catch(e:any){
      alert(e?.message||"No se pudo actualizar el documento.");
    }
  }

  return <main style={{maxWidth:1380,margin:"0 auto",padding:28}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:16,marginBottom:22}}>
      <div>
        <span style={eyebrow}>ONE · USUARIOS Y PERMISOS</span>
        <h1 style={{margin:"5px 0 6px",fontSize:34}}>Personas, roles y control</h1>
        <p style={{margin:0,color:"#707070"}}>Acceso, ficha comercial, permisos y contratación.</p>
      </div>
      <button style={primary} onClick={()=>setCreating(true)}>+ Nuevo usuario</button>
    </header>

    <section style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12,marginBottom:18}}>
      <Kpi label="Usuarios" value={counts.total}/>
      <Kpi label="Activos" value={counts.active}/>
      <Kpi label="Comerciales activos" value={counts.comerciales}/>
      <Kpi label="BackOffice activos" value={counts.backoffice}/>
    </section>

    <section style={panel}>
      <div style={{padding:16,borderBottom:"1px solid #eee"}}>
        <input style={input} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar usuario..." />
      </div>
      <div style={{padding:16}}>
        {loading?<div>Cargando...</div>:<div style={{display:"grid",gap:10}}>
          {filtered.map(u=><article key={u.id} style={row}>
            <div><b>{u.name}</b><div style={{fontSize:12,color:"#777"}}>{u.email}</div></div>
            <div>{u.role}</div><div>{u.department||"General"}</div>
            <div>{u.role==="Comercial"?u.profile_type||"Estándar":"—"}</div>
            <button onClick={()=>toggleActive(u)} style={{
              border:u.active?"1px solid #cbe8d9":"1px solid #ffd1bd",
              background:u.active?"#edf9f3":"#fff2ea",
              color:u.active?"#16734a":"#a23a16",
              borderRadius:999,padding:"7px 9px",fontSize:9,fontWeight:900,cursor:"pointer"
            }}>{u.active?"ACTIVO":"INACTIVO"}</button>
            <button style={secondary} onClick={()=>openUser(u)}>Editar / Gestionar</button>
          </article>)}
        </div>}
      </div>
    </section>

    {creating&&<div style={overlay} onClick={()=>setCreating(false)}>
      <section style={{...modal,width:"min(640px,100%)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <div><span style={eyebrow}>NUEVO USUARIO</span><h2 style={{margin:"5px 0"}}>Dar acceso a ONE</h2></div>
          <button style={closeBtn} onClick={()=>setCreating(false)}>×</button>
        </div>
        <div style={{display:"grid",gap:12,marginTop:16}}>
          <Field label="Nombre"><input style={input} value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})}/></Field>
          <Field label="Email / acceso"><input style={input} value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})}/></Field>
          <Field label="Contraseña inicial"><input style={input} type="password" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})}/></Field>
          <div style={grid2}>
            <Field label="Rol"><select style={input} value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value as Role})}><option>Comercial</option><option>BackOffice</option><option>Administrador</option></select></Field>
            <Field label="Departamento"><select style={input} value={newUser.department} onChange={e=>setNewUser({...newUser,department:e.target.value})}><option>General</option><option>Telefonía</option><option>Energía</option><option>Alarmas</option><option>Seguros</option><option>Inmobiliaria</option></select></Field>
          </div>
          {newUser.role==="Comercial"&&<Field label="Perfil comercial"><select style={input} value={newUser.profile_type} onChange={e=>setNewUser({...newUser,profile_type:e.target.value as Profile})}><option>Premium</option><option>Avanzado</option><option>Estándar</option><option>Colaborador</option></select></Field>}
        </div>
        <div style={footer}><button style={secondary} onClick={()=>setCreating(false)}>Cancelar</button><button style={primary} onClick={createUser} disabled={saving}>Crear usuario</button></div>
      </section>
    </div>}

    {editing&&<div style={overlay} onClick={()=>setEditing(null)}>
      <section style={modal} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <div><span style={eyebrow}>USUARIO ONE</span><h2 style={{margin:"5px 0 2px"}}>{editing.name}</h2></div>
          <button style={closeBtn} onClick={()=>setEditing(null)}>×</button>
        </div>

        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:18}}>
          <Tab active={tab==="acceso"} onClick={()=>setTab("acceso")}>Acceso</Tab>
          <Tab active={tab==="ficha"} onClick={()=>setTab("ficha")}>Ficha comercial</Tab>
          <Tab active={tab==="permisos"} onClick={()=>setTab("permisos")}>Permisos</Tab>
          <Tab active={tab==="documentos"} onClick={()=>setTab("documentos")}>Documentos</Tab>
        </div>

        {tab==="acceso"&&<div style={{marginTop:18}}>
          <div style={grid2}>
            <Field label="Nombre"><input style={input} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></Field>
            <Field label="Email / acceso"><input style={input} value={editing.email} onChange={e=>setEditing({...editing,email:e.target.value})}/></Field>
            <Field label="Rol"><select style={input} value={editing.role} onChange={e=>setEditing({...editing,role:e.target.value as Role})}><option>Comercial</option><option>BackOffice</option><option>Administrador</option></select></Field>
            <Field label="Departamento"><select style={input} value={editing.department||"General"} onChange={e=>setEditing({...editing,department:e.target.value})}><option>General</option><option>Telefonía</option><option>Energía</option><option>Alarmas</option><option>Seguros</option><option>Inmobiliaria</option></select></Field>
          </div>
          {editing.role==="Comercial"&&<div style={{marginTop:12}}><Field label="Perfil comercial"><select style={input} value={editing.profile_type||"Estándar"} onChange={e=>setEditing({...editing,profile_type:e.target.value as Profile})}><option>Premium</option><option>Avanzado</option><option>Estándar</option><option>Colaborador</option></select></Field></div>}
          <div style={{marginTop:12}}><Field label="Nueva contraseña"><input style={input} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Vacío = mantener actual"/></Field></div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:18}}>
            <button style={{...secondary,color:editing.active?"#a23a16":"#16734a"}} onClick={()=>toggleActive(editing)}>{editing.active?"Desactivar usuario":"Activar usuario"}</button>
            <button style={primary} onClick={saveUser} disabled={saving}>Guardar acceso</button>
          </div>
        </div>}

        {tab==="ficha"&&<div style={{marginTop:18}}>
          {profileLoading&&<div style={{padding:14,border:"1px solid #eee",borderRadius:12,marginBottom:12,color:"#777"}}>Cargando ficha comercial...</div>}
          {profileError&&<div style={{padding:12,border:"1px solid #ffd4bf",background:"#fff5ef",borderRadius:12,marginBottom:12,color:"#9b421f",fontSize:12}}>{profileError}</div>}
          {profile&&<>
          <div style={grid2}>
            <Field label="Nombre"><input style={input} value={profile.first_name} onChange={e=>setProfile({...profile,first_name:e.target.value})}/></Field>
            <Field label="Apellidos"><input style={input} value={profile.last_name} onChange={e=>setProfile({...profile,last_name:e.target.value})}/></Field>
            <Field label="Tipo documento"><select style={input} value={profile.document_type} onChange={e=>setProfile({...profile,document_type:e.target.value})}><option>DNI</option><option>NIE</option><option>Pasaporte</option><option>CIF</option></select></Field>
            <Field label="DNI/NIE/CIF"><input style={input} value={profile.document_number} onChange={e=>setProfile({...profile,document_number:e.target.value})}/></Field>
            <Field label="Email contacto"><input style={input} value={profile.contact_email} onChange={e=>setProfile({...profile,contact_email:e.target.value})}/></Field>
            <Field label="Teléfono"><input style={input} value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})}/></Field>
            <Field label="Dirección"><input style={input} value={profile.address} onChange={e=>setProfile({...profile,address:e.target.value})}/></Field>
            <Field label="Código postal"><input style={input} value={profile.postal_code} onChange={e=>setProfile({...profile,postal_code:e.target.value})}/></Field>
            <Field label="Población"><input style={input} value={profile.city} onChange={e=>setProfile({...profile,city:e.target.value})}/></Field>
            <Field label="Provincia"><input style={input} value={profile.province} onChange={e=>setProfile({...profile,province:e.target.value})}/></Field>
            <Field label="Tipo colaborador"><select style={input} value={profile.collaborator_type} onChange={e=>setProfile({...profile,collaborator_type:e.target.value})}><option>Particular</option><option>Autónomo</option><option>Empresa</option></select></Field>
            <Field label="Estado"><select style={input} value={profile.commercial_status} onChange={e=>setProfile({...profile,commercial_status:e.target.value})}><option>Candidato</option><option>Pendiente de contrato</option><option>Activo</option><option>Suspendido</option><option>Baja</option></select></Field>
            <Field label="Razón social"><input style={input} value={profile.company_name} onChange={e=>setProfile({...profile,company_name:e.target.value})}/></Field>
            <Field label="CIF/NIF empresa"><input style={input} value={profile.company_tax_id} onChange={e=>setProfile({...profile,company_tax_id:e.target.value})}/></Field>
            <Field label="IBAN"><input style={input} value={profile.iban} onChange={e=>setProfile({...profile,iban:e.target.value})}/></Field>
            <Field label="Fecha alta"><input style={input} type="date" value={profile.start_date||""} onChange={e=>setProfile({...profile,start_date:e.target.value})}/></Field>
          </div>
          <div style={{marginTop:12}}><Field label="Observaciones internas"><textarea style={{...input,minHeight:90,paddingTop:10}} value={profile.internal_notes} onChange={e=>setProfile({...profile,internal_notes:e.target.value})}/></Field></div>
          <div style={footer}><button style={primary} onClick={saveProfile} disabled={saving}>Guardar ficha comercial</button></div>
          </>}
        </div>}

        {tab==="permisos"&&<div style={{marginTop:18,display:"grid",gap:8}}>
          {permissions.map(p=><div key={p.key} style={permissionRow}>
            <span style={{fontSize:9,fontWeight:900,color:"#999",textTransform:"uppercase"}}>{p.group}</span>
            <span style={{fontSize:13,fontWeight:750}}>{p.label}</span>
            <button style={{...toggle,background:editing[p.key]?"#fff0e9":"#f4f4f4",color:editing[p.key]?"#d94d23":"#777"}} onClick={()=>setEditing({...editing,[p.key]:!editing[p.key]})}>{editing[p.key]?"ON":"OFF"}</button>
          </div>)}
          <div style={footer}><button style={primary} onClick={saveUser} disabled={saving}>Guardar permisos</button></div>
        </div>}

        {tab==="documentos"&&<div style={{marginTop:18}}>
          <div style={{border:"1px solid #ffd7c7",background:"#fff7f2",borderRadius:14,padding:14}}>
            <span style={eyebrow}>CONTRATACIÓN DEL COMERCIAL</span>
            <h3 style={{margin:"5px 0"}}>
              {persistedProfileType ? `Perfil ${persistedProfileType}` : `Rol ${editing.role}`}
            </h3>
            <p style={{margin:"4px 0 0",fontSize:12,color:"#6e5a52"}}>Cada emisión queda guardada como una versión histórica.</p>
            {editing.profile_type !== persistedProfileType && editing.role==="Comercial" && (
              <div style={{marginTop:10,padding:"9px 11px",borderRadius:10,background:"#fff3cd",border:"1px solid #ffe69c",fontSize:11,color:"#775a00"}}>
                Tienes un cambio de perfil sin guardar. Los documentos usarán el perfil guardado: <b>{persistedProfileType || "sin perfil"}</b>.
              </div>
            )}
            <div style={{display:"flex",gap:10,marginTop:12,flexWrap:"wrap"}}>
              <button style={primary} onClick={()=>generate("Contrato comercial")}>Generar contrato</button>
              <button style={primary} onClick={()=>generate("Anexo de comisiones")}>Generar anexo</button>
            </div>
          </div>
          <h3>Histórico</h3>
          <div style={{display:"grid",gap:8}}>
            {documentsLoading ? (
              <div style={{padding:20,background:"#fafafa",borderRadius:12,color:"#777"}}>
                Cargando histórico documental...
              </div>
            ) : documentsError ? (
              <div style={{padding:16,background:"#fff5ef",border:"1px solid #ffd4bf",borderRadius:12}}>
                <div style={{fontSize:12,color:"#9b421f",fontWeight:800}}>No se pudo cargar el histórico.</div>
                <div style={{fontSize:11,color:"#8a5a46",marginTop:4}}>{documentsError}</div>
                <button
                  style={{...secondary,marginTop:10}}
                  onClick={()=>editing && loadDocumentsForUser(editing.id)}
                >
                  Reintentar
                </button>
              </div>
            ) : documents.length===0 ? (
              <div style={{padding:20,background:"#fafafa",borderRadius:12,color:"#888"}}>
                Todavía no hay documentos.
              </div>
            ) :
            documents.map(d=><div key={d.id} style={{
              display:"grid",
              gridTemplateColumns:"1fr auto",
              gap:14,
              border:"1px solid #eee",
              borderRadius:14,
              padding:14,
              background:"#fff"
            }}>
              <div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <b style={{fontSize:13}}>{d.title}</b>
                  <span style={{fontSize:10,fontWeight:900,color:"#ff5a2a"}}>v{d.version}</span>
                  <span style={{
                    fontSize:9,
                    fontWeight:900,
                    borderRadius:999,
                    padding:"5px 8px",
                    background:d.status==="Firmado"?"#edf9f3":d.status==="Sustituido"?"#f3f3f3":"#fff3ed",
                    color:d.status==="Firmado"?"#16734a":d.status==="Sustituido"?"#666":"#c74a20"
                  }}>{d.status}</span>
                </div>
                <div style={{fontSize:11,color:"#777",marginTop:5}}>
                  {d.profile_snapshot?`Perfil ${d.profile_snapshot}`:d.document_type}
                  {d.generated_at?` · ${new Date(d.generated_at).toLocaleString("es-ES")}`:""}
                </div>
                {d.signed_at&&<div style={{fontSize:10,color:"#16734a",marginTop:4}}>
                  Firmado: {new Date(d.signed_at).toLocaleString("es-ES")}
                </div>}
              </div>

              <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                <button style={secondary} onClick={()=>openDocument(d)}>
                  {d.document_type==="Anexo de comisiones"?"Ver / Imprimir":"Ver contrato"}
                </button>
                {d.status!=="Firmado"&&d.status!=="Cancelado"&&
                  <button style={secondary} onClick={()=>updateDocumentStatus(d,"Firmado")}>Firmado</button>}
                {d.status!=="Sustituido"&&d.status!=="Cancelado"&&
                  <button style={secondary} onClick={()=>updateDocumentStatus(d,"Sustituido")}>Sustituido</button>}
              </div>
            </div>)}
          </div>
        </div>}
      </section>
    </div>}
  </main>;
}

function Kpi({label,value}:{label:string;value:number}) {
  return <div style={{border:"1px solid #ececec",borderRadius:15,padding:16,background:"#fff"}}>
    <span style={{color:"#777",fontSize:11,fontWeight:700}}>{label}</span>
    <strong style={{display:"block",marginTop:5,fontSize:26}}>{value}</strong>
  </div>;
}
function Tab({active,children,onClick}:{active:boolean;children:React.ReactNode;onClick:()=>void}){
  return <button onClick={onClick} style={{border:active?"1px solid #ffc2aa":"1px solid #e8e8e8",background:active?"#fff3ed":"#fff",color:active?"#d94d23":"#555",borderRadius:999,padding:"8px 11px",fontWeight:900,fontSize:12,cursor:"pointer"}}>{children}</button>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800}}>{label}{children}</label>;}

const eyebrow:React.CSSProperties={color:"#ff5a2a",fontWeight:900,fontSize:11,letterSpacing:1};
const input:React.CSSProperties={width:"100%",minHeight:42,borderRadius:11,border:"1px solid #ddd",padding:"0 11px",background:"#fff"};
const primary:React.CSSProperties={border:0,borderRadius:11,padding:"10px 13px",background:"linear-gradient(135deg,#ff7a35,#ff4d22)",color:"#fff",fontWeight:900,cursor:"pointer"};
const secondary:React.CSSProperties={border:"1px solid #ddd",borderRadius:10,padding:"9px 11px",background:"#fff",color:"#444",fontWeight:800,cursor:"pointer"};
const panel:React.CSSProperties={background:"#fff",border:"1px solid #ececec",borderRadius:18,overflow:"hidden"};
const row:React.CSSProperties={display:"grid",gridTemplateColumns:"1.5fr 130px 120px 110px 90px auto",gap:12,alignItems:"center",border:"1px solid #eee",borderRadius:14,padding:12,fontSize:12};
const overlay:React.CSSProperties={position:"fixed",inset:0,background:"rgba(0,0,0,.42)",display:"grid",placeItems:"center",zIndex:9999,padding:20};
const modal:React.CSSProperties={width:"min(920px,100%)",maxHeight:"92vh",overflow:"auto",background:"#fff",borderRadius:20,padding:20,boxShadow:"0 26px 90px rgba(0,0,0,.24)"};
const closeBtn:React.CSSProperties={width:36,height:36,borderRadius:999,border:"1px solid #e5e5e5",background:"#fafafa",cursor:"pointer",fontSize:22};
const footer:React.CSSProperties={display:"flex",justifyContent:"flex-end",gap:10,marginTop:18};
const permissionRow:React.CSSProperties={display:"grid",gridTemplateColumns:"120px 1fr auto",gap:12,alignItems:"center",border:"1px solid #eee",borderRadius:12,padding:11};
const toggle:React.CSSProperties={width:52,height:28,borderRadius:999,border:"1px solid #ddd",cursor:"pointer",fontWeight:900,fontSize:10};
const grid2:React.CSSProperties={display:"grid",gridTemplateColumns:"1fr 1fr",gap:12};
