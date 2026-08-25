import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PROFILE_FIELDS = [
  ["Premium","premium"],
  ["Avanzado","advanced"],
  ["Estándar","standard"],
  ["Colaborador","collaborator"],
] as const;

function money(v:any){
  const n=Number(v);
  return Number.isFinite(n)&&n>0?n:null;
}

function norm(v:any){
  return String(v||"").trim().toLowerCase();
}

export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    const legacy=Array.isArray(body.products)?body.products:[];

    const [{data:products,error:pe},{data:providers,error:pre}]=await Promise.all([
      supabaseAdmin.from("products").select("*"),
      supabaseAdmin.from("providers").select("*")
    ]);

    if(pe||pre){
      return NextResponse.json({ok:false,error:pe?.message||pre?.message},{status:500});
    }

    const providerMap=new Map((providers||[]).map((p:any)=>[p.id,p]));
    let productsMatched=0;
    let productsWithoutLegacyCommission=0;
    let rulesCreated=0;

    for(const old of legacy){
      const match=(products||[]).find((p:any)=>{
        if(old.id && p.id===old.id) return true;
        const provider:any=providerMap.get(p.provider_id);
        return norm(p.name)===norm(old.name)
          && (!old.company || norm(provider?.name)===norm(old.company))
          && (!old.service || norm(p.service||p.category||provider?.service)===norm(old.service));
      });

      if(!match) continue;
      productsMatched++;

      const provider:any=providerMap.get(match.provider_id);
      const rows:any[]=[];

      for(const [profile,field] of PROFILE_FIELDS){
        const value=money(old[field]);
        if(value===null) continue;
        rows.push({
          product_id:match.id,
          provider_id:match.provider_id||null,
          operation_type:match.operation_type||null,
          profile_type:profile,
          commission_mode:"fixed",
          fixed_amount:value,
          percentage:null,
          percentage_base:null,
          points:null,
          active:true
        });
      }

      if(!rows.length){
        productsWithoutLegacyCommission++;
        continue;
      }

      // No pisa reglas activas que ya se hayan guardado manualmente.
      const {data:existing,error:ee}=await supabaseAdmin
        .from("commercial_commission_rules")
        .select("profile_type")
        .eq("product_id",match.id)
        .eq("active",true);

      if(ee) throw ee;

      const existingProfiles=new Set((existing||[]).map((x:any)=>norm(x.profile_type)));
      const toInsert=rows.filter(x=>!existingProfiles.has(norm(x.profile_type)));

      if(toInsert.length){
        const {data:inserted,error:ie}=await supabaseAdmin
          .from("commercial_commission_rules")
          .insert(toInsert)
          .select("id");
        if(ie) throw ie;
        rulesCreated += inserted?.length||0;
      }
    }

    return NextResponse.json({
      ok:true,
      productsMatched,
      rulesCreated,
      productsWithoutLegacyCommission
    });
  }catch(e:any){
    return NextResponse.json({
      ok:false,
      error:e?.message||"No se pudo migrar el catálogo antiguo."
    },{status:500});
  }
}
