import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
const BUCKET = "one-contract-documents";

async function currentOneUser(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data } = await supabaseAdmin.from("one_users").select("id,name,email,role,active").eq("auth_user_id", user.id).eq("active", true).maybeSingle();
  return data;
}

async function getContractForUser(contractId:string, user:any) {
  let q = supabaseAdmin.from("one_contracts").select("id,client_id,commercial_user_id,data").eq("id", contractId);
  if (user.role === "Comercial") q = q.eq("commercial_user_id", user.id);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function ensureBucket() {
  const { data } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 15 * 1024 * 1024 });
    if (error && !String(error.message || "").toLowerCase().includes("already")) throw new Error(error.message);
  }
}

function cleanName(name:string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g,"-");
}

export async function GET(request:NextRequest) {
  try {
    const user = await currentOneUser(request);
    if (!user) return NextResponse.json({ok:false,error:"Sesión no válida"},{status:401});
    const contractId = String(request.nextUrl.searchParams.get("contractId") || "").trim();
    if (!contractId) return NextResponse.json({ok:false,error:"Falta contractId"},{status:400});
    const contract = await getContractForUser(contractId,user);
    if (!contract) return NextResponse.json({ok:false,error:"Contrato no encontrado o sin permiso"},{status:404});
    const docs = Array.isArray(contract.data?.contract_documents) ? contract.data.contract_documents : [];
    const documents = await Promise.all(docs.map(async (doc:any) => {
      let url = "";
      if (doc.storage_path) {
        const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(doc.storage_path, 60 * 30);
        url = data?.signedUrl || "";
      }
      return {...doc, verification_status:doc.verification_status || "Pendiente", url};
    }));
    return NextResponse.json({ok:true,documents});
  } catch(e:any) {
    return NextResponse.json({ok:false,error:e?.message||"No se pudo cargar la documentación"},{status:500});
  }
}

export async function POST(request:NextRequest) {
  try {
    const user = await currentOneUser(request);
    if (!user) return NextResponse.json({ok:false,error:"Sesión no válida"},{status:401});
    const form = await request.formData();
    const contractId = String(form.get("contractId") || "").trim();
    const documentType = String(form.get("documentType") || "Documento").trim();
    const file = form.get("file");
    if (!contractId || !(file instanceof File)) return NextResponse.json({ok:false,error:"Falta contrato o archivo"},{status:400});
    if (file.size > 15 * 1024 * 1024) return NextResponse.json({ok:false,error:"El archivo supera 15 MB"},{status:400});
    const contract = await getContractForUser(contractId,user);
    if (!contract) return NextResponse.json({ok:false,error:"Contrato no encontrado o sin permiso"},{status:404});
    await ensureBucket();
    const id = crypto.randomUUID();
    const path = `${contractId}/${Date.now()}-${id}-${cleanName(file.name || "documento")}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, { contentType:file.type || "application/octet-stream", upsert:false });
    if (uploadError) return NextResponse.json({ok:false,error:uploadError.message},{status:500});
    const doc = { id, type:documentType, name:file.name, mime:file.type, size:file.size, storage_path:path, uploaded_at:new Date().toISOString(), uploaded_by:user.id, uploaded_by_name:user.name, verification_status:"Pendiente" };
    const currentData = contract.data || {};
    const currentDocs = Array.isArray(currentData.contract_documents) ? currentData.contract_documents : [];
    const nextData = {...currentData, contract_documents:[...currentDocs,doc]};
    const { error:updateError } = await supabaseAdmin.from("one_contracts").update({data:nextData,updated_at:new Date().toISOString()}).eq("id",contractId);
    if (updateError) return NextResponse.json({ok:false,error:updateError.message},{status:500});
    return NextResponse.json({ok:true,document:doc});
  } catch(e:any) {
    return NextResponse.json({ok:false,error:e?.message||"No se pudo subir la documentación"},{status:500});
  }
}

export async function PATCH(request:NextRequest) {
  try {
    const user = await currentOneUser(request);
    if (!user) return NextResponse.json({ok:false,error:"Sesión no válida"},{status:401});
    if (user.role !== "BackOffice" && user.role !== "Administrador") return NextResponse.json({ok:false,error:"Solo BackOffice o Administración pueden verificar documentos"},{status:403});
    const body = await request.json();
    const contractId = String(body.contractId || "").trim();
    const documentId = String(body.documentId || "").trim();
    const verificationStatus = String(body.verificationStatus || "").trim();
    if (!contractId || !documentId || !["Verificado","Incorrecto","Pendiente"].includes(verificationStatus)) return NextResponse.json({ok:false,error:"Datos de verificación no válidos"},{status:400});
    const contract = await getContractForUser(contractId,user);
    if (!contract) return NextResponse.json({ok:false,error:"Contrato no encontrado"},{status:404});
    const docs = Array.isArray(contract.data?.contract_documents) ? contract.data.contract_documents : [];
    let found = false;
    const now = new Date().toISOString();
    const nextDocs = docs.map((doc:any) => {
      if (doc.id !== documentId) return doc;
      found = true;
      return {...doc,verification_status:verificationStatus,verified_at:now,verified_by:user.id,verified_by_name:user.name};
    });
    if (!found) return NextResponse.json({ok:false,error:"Documento no encontrado"},{status:404});
    const nextData = {...(contract.data||{}),contract_documents:nextDocs};
    const { error } = await supabaseAdmin.from("one_contracts").update({data:nextData,updated_at:now}).eq("id",contractId);
    if (error) return NextResponse.json({ok:false,error:error.message},{status:500});
    return NextResponse.json({ok:true});
  } catch(e:any) {
    return NextResponse.json({ok:false,error:e?.message||"No se pudo verificar el documento"},{status:500});
  }
}
