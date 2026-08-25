import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ ok:false, error:"Falta userId." },{status:400});
  const { data, error } = await supabaseAdmin.from("commercial_profiles").select("*").eq("user_id",userId).maybeSingle();
  if (error) return NextResponse.json({ok:false,error:error.message},{status:500});
  return NextResponse.json({ok:true,profile:data||null});
}

export async function POST(request: NextRequest) {
  try{
    const b=await request.json();
    if(!b.user_id) return NextResponse.json({ok:false,error:"Falta user_id."},{status:400});
    const payload={
      user_id:b.user_id, first_name:b.first_name||null, last_name:b.last_name||null,
      document_type:b.document_type||"DNI", document_number:b.document_number||null,
      contact_email:b.contact_email||null, phone:b.phone||null, address:b.address||null,
      postal_code:b.postal_code||null, city:b.city||null, province:b.province||null,
      country:b.country||"España", collaborator_type:b.collaborator_type||"Particular",
      company_name:b.company_name||null, company_tax_id:b.company_tax_id||null,
      iban:b.iban||null, commercial_status:b.commercial_status||"Candidato",
      start_date:b.start_date||null, end_date:b.end_date||null,
      internal_notes:b.internal_notes||null, updated_at:new Date().toISOString()
    };
    const {data,error}=await supabaseAdmin.from("commercial_profiles").upsert(payload,{onConflict:"user_id"}).select("*").single();
    if(error) return NextResponse.json({ok:false,error:error.message},{status:500});
    return NextResponse.json({ok:true,profile:data});
  }catch(e:any){return NextResponse.json({ok:false,error:e?.message||"Error"},{status:500});}
}
