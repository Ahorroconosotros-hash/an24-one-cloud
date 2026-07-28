import Link from "next/link";

export default async function ContratacionClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main style={{maxWidth:1100,margin:"0 auto",padding:"28px"}}>
      <Link href={`/clientes/${id}`} style={{color:"#666",textDecoration:"none",fontSize:13}}>← Volver a la ficha</Link>
      <section style={{marginTop:18,padding:28,border:"1px solid #e9e9e9",borderRadius:20,background:"#fff"}}>
        <span style={{fontSize:11,fontWeight:800,letterSpacing:".12em",color:"#f5811f"}}>CONTRATACIÓN</span>
        <h1 style={{margin:"8px 0 6px",fontSize:34}}>Selecciona un servicio</h1>
        <p style={{margin:0,color:"#7d7d7d",fontSize:14}}>La contratación quedará vinculada automáticamente al cliente {id}.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,marginTop:24}}>
          {["Energía","Telefonía","Alarmas","TPV","Certificados","Seguros","Otros"].map((service)=><button key={service} style={{minHeight:86,border:"1px solid #e9e9e9",borderRadius:15,background:"#fff",fontSize:15,fontWeight:750,cursor:"pointer"}}>{service}</button>)}
        </div>
      </section>
    </main>
  );
}
