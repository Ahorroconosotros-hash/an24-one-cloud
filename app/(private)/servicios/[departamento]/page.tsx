import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./Departamento.module.css";

const names: Record<string, {name:string; icon:string; subtitle:string}> = {
  energia:{name:"Energía",icon:"⚡",subtitle:"Contratos, tarifas, renovaciones y oportunidades energéticas."},
  telefonia:{name:"Telefonía",icon:"⌕",subtitle:"Fibra, móvil, centralitas y conectividad de clientes."},
  alarmas:{name:"Alarmas",icon:"◇",subtitle:"Instalaciones, seguridad, mantenimientos y renovaciones."},
  seguros:{name:"Seguros",icon:"✦",subtitle:"Pólizas, vencimientos, documentación y oportunidades."},
  inmobiliaria:{name:"Inmobiliaria",icon:"⌂",subtitle:"Captaciones, inmuebles, compradores y operaciones."},
  asesoramiento:{name:"Asesoramiento",icon:"≡",subtitle:"Trámites, certificados y servicios profesionales."},
};

export default async function DepartamentoPage({params}:{params:Promise<{departamento:string}>}){
  const {departamento}=await params;
  const item=names[departamento];
  if(!item) notFound();
  return <div className={styles.page}>
    <Link href="/servicios" className={styles.back}>← Centro de Negocio</Link>
    <header className={styles.hero}><span className={styles.icon}>{item.icon}</span><div><span className={styles.eyebrow}>DEPARTAMENTO AN24</span><h1>{item.name}</h1><p>{item.subtitle}</p></div><button>＋ Nuevo registro</button></header>
    <section className={styles.kpis}><article><span>Activos</span><strong>—</strong><small>Conectaremos datos reales</small></article><article><span>Este mes</span><strong>—</strong><small>Nueva producción</small></article><article><span>Pendientes</span><strong>—</strong><small>Acciones por resolver</small></article><article><span>Objetivo</span><strong>—</strong><small>Seguimiento mensual</small></article></section>
    <section className={styles.empty}><span>SPRINT SIGUIENTE</span><h2>{item.name} ya tiene su espacio propio en ONE</h2><p>Esta base queda lista para desarrollar el flujo específico del departamento sin mezclarlo con el resto del negocio.</p></section>
  </div>
}
