import Link from "next/link";
export function PageHead({title,subtitle,action}:{title:string,subtitle:string,action?:string}){return <div className="pageHead"><div><h1>{title}</h1><p>{subtitle}</p></div>{action&&<button className="primary">＋ {action}</button>}</div>}
export function Stat({label,value,delta,icon}:{label:string,value:string,delta:string,icon:string}){return <article className="stat"><div className="statIcon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{delta}</small></article>}
export function Badge({children,tone="blue"}:{children:React.ReactNode,tone?:string}){return <span className={`badge ${tone}`}>{children}</span>}
export function EmptyLink({href,label}:{href:string,label:string}){return <Link className="textLink" href={href}>{label} →</Link>}
