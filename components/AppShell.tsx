import Link from "next/link";
const nav = [
  ["/dashboard","⌂","Dashboard"],["/clientes","◉","Clientes"],["/agenda","◷","Agenda"],
  ["/oportunidades","◇","Oportunidades"],["/productos","▦","Productos"],["/comerciales","♙","Comerciales"],
  ["/servicios","⚡","Servicios AN24"],["/documentos","▤","Documentos"],["/informes","↗","Informes"],
  ["/configuracion","⚙","Configuración"]
];
export default function AppShell({children}:{children:React.ReactNode}){
 return <div className="appShell">
  <aside className="sidebar">
   <div className="brand"><div className="brandMark">AN<span>24</span></div><div><b>AN24 ONE</b><small>CRM inteligente</small></div></div>
   <nav>{nav.map(([href,icon,label])=><Link key={href} href={href} className="navItem"><span>{icon}</span>{label}</Link>)}</nav>
   <div className="sidebarCard"><strong>Equipo AN24</strong><span>7 usuarios activos</span><div className="avatars"><i>JM</i><i>SR</i><i>AC</i><i>+4</i></div></div>
   <Link className="logout" href="/login">↪ Cerrar sesión</Link>
  </aside>
  <main className="content"><header className="topbar"><div><p className="eyebrow">AN24 · TODO EN UN MISMO LUGAR</p></div><div className="topActions"><button className="search">⌕ Buscar clientes, contratos...</button><button className="bell">♢<span>3</span></button><div className="user"><b>JM</b><div><strong>Jesús Martínez</strong><small>Administrador</small></div></div></div></header>{children}</main>
 </div>
}
