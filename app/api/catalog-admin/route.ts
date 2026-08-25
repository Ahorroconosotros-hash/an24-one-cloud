import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function nullableNumber(v:any){
  if(v===null||v===undefined||String(v).trim()==="") return null;
  const n=Number(v);
  return Number.isFinite(n)?n:null;
}

function positiveNumber(v:any){
  const n=nullableNumber(v);
  return n!==null&&n>0?n:null;
}

async function deactivate(table:string, productId:string){
  const {error}=await supabaseAdmin
    .from(table)
    .update({active:false})
    .eq("product_id",productId)
    .eq("active",true);

  if(error) throw error;
}

export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    const action=String(body.action||"");

    if(action==="save-provider"){
      const p=body.provider||{};
      const payload={
        service:String(p.service||""),
        name:String(p.name||"").trim(),
        logo:p.logo||null,
        reference_only:Boolean(p.referenceOnly),
        active:p.active!==false
      };

      if(!payload.name){
        return NextResponse.json({ok:false,error:"Falta el nombre del proveedor."},{status:400});
      }

      let result:any;

      if(p.id){
        result=await supabaseAdmin
          .from("providers")
          .update(payload)
          .eq("id",String(p.id))
          .select("*")
          .single();
      }else{
        result=await supabaseAdmin
          .from("providers")
          .insert(payload)
          .select("*")
          .single();
      }

      if(result.error) throw result.error;
      return NextResponse.json({ok:true,provider:result.data});
    }

    if(action==="toggle-provider"){
      const id=String(body.id||"");
      if(!id) return NextResponse.json({ok:false,error:"Falta id."},{status:400});

      const {data,error}=await supabaseAdmin
        .from("providers")
        .update({active:Boolean(body.active)})
        .eq("id",id)
        .select("*")
        .single();

      if(error) throw error;
      return NextResponse.json({ok:true,provider:data});
    }

    if(action==="toggle-product"){
      const id=String(body.id||"");
      if(!id) return NextResponse.json({ok:false,error:"Falta id."},{status:400});

      const {data,error}=await supabaseAdmin
        .from("products")
        .update({active:Boolean(body.active)})
        .eq("id",id)
        .select("*")
        .single();

      if(error) throw error;
      return NextResponse.json({ok:true,product:data});
    }

    if(action==="save-product"){
      const p=body.product||{};
      const providerId=String(p.providerId||"");

      if(!providerId){
        return NextResponse.json({ok:false,error:"Falta proveedor."},{status:400});
      }

      const name=String(p.name||"").trim();
      if(!name){
        return NextResponse.json({ok:false,error:"Falta el nombre del producto."},{status:400});
      }

      const productPayload={
        provider_id:providerId,
        service:String(p.service||""),
        category:String(p.service||""),
        name,
        description:String(p.description||""),
        product_type:String(p.productType||""),
        operation_type:String(p.operationType||""),
        pvp:nullableNumber(p.pvp)||0,
        active:p.active!==false,
        config:{
          ...(p.config||{}),
          features:String(p.description||""),
          phone_type:String(p.productType||""),
          one_rules:{
            target:body.target||null,
            accelerator:body.accelerator||null,
            clawback:body.clawback||null
          }
        }
      };

      let productResult:any;

      if(p.id){
        productResult=await supabaseAdmin
          .from("products")
          .update(productPayload)
          .eq("id",String(p.id))
          .select("*")
          .single();
      }else{
        productResult=await supabaseAdmin
          .from("products")
          .insert(productPayload)
          .select("*")
          .single();
      }

      if(productResult.error) throw productResult.error;

      const product=productResult.data;
      const productId=String(product.id);

      // 1) Comisión AN24
      await deactivate("commission_rules",productId);

      const a=body.an24Rule||{};
      const mode=String(a.commissionMode||"fixed");
      const fixed=nullableNumber(a.fixedAmount);
      const pct=nullableNumber(a.percentage);
      const recurring=nullableNumber(a.recurringAmount);
      const recurringPct=nullableNumber(a.recurringPercentage);
      const points=nullableNumber(a.points);

      const hasAn24=
        fixed!==null||pct!==null||recurring!==null||
        recurringPct!==null||points!==null;

      let mainRule:any=null;

      if(hasAn24){
        const {data,error}=await supabaseAdmin
          .from("commission_rules")
          .insert({
            product_id:productId,
            provider_id:providerId,
            operation_type:String(a.operationType||p.operationType||""),
            fixed_amount:fixed,
            percentage:pct,
            recurring_amount:recurring,
            points,
            commission_mode:mode,
            percentage_base:a.percentageBase||null,
            side:a.side||null,
            role_context:a.roleContext||null,
            recurring_percentage:recurringPct,
            recurring_base:a.recurringBase||null,
            active:true,
            config:{}
          })
          .select("*")
          .single();

        if(error) throw error;
        mainRule=data;
      }

      // 2) Comisión comercial: SIEMPRE fija en euros
      await deactivate("commercial_commission_rules",productId);

      const commercialRows=(Array.isArray(body.commercialProfiles)?body.commercialProfiles:[])
        .map((x:any)=>{
          const amount=positiveNumber(x.fixedAmount);
          if(amount===null) return null;

          return {
            product_id:productId,
            provider_id:providerId,
            operation_type:String(p.operationType||""),
            profile_type:String(x.profileType||""),
            commission_mode:"fixed",
            fixed_amount:amount,
            percentage:null,
            percentage_base:null,
            points:null,
            active:true
          };
        })
        .filter(Boolean);

      let commercialRules:any[]=[];

      if(commercialRows.length){
        const {data,error}=await supabaseAdmin
          .from("commercial_commission_rules")
          .insert(commercialRows)
          .select("*");

        if(error) throw error;
        commercialRules=data||[];
      }

      // 3) Objetivos / aceleradores / clawback
      // En esta fase NO escribimos todavía en target_rules / accelerator_rules /
      // clawback_rules porque el esquema real actual no comparte una estructura
      // universal por product_id.
      //
      // Para no perder los datos del formulario, quedan congelados dentro de
      // products.config.one_rules. Más adelante conectaremos cada motor con su
      // esquema real sin bloquear el catálogo principal.

      return NextResponse.json({
        ok:true,
        product,
        mainRule,
        commercialRules
      });
    }

    return NextResponse.json(
      {ok:false,error:"Acción no reconocida."},
      {status:400}
    );
  }catch(e:any){
    console.error("ONE · catalog-admin",e);

    return NextResponse.json(
      {
        ok:false,
        error:e?.message||"No se pudo guardar el catálogo."
      },
      {status:500}
    );
  }
}
