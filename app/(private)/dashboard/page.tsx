import Link from "next/link";

const priorities = [
  { n:"01", cls:"danger", eyebrow:"RIESGO DE BAJA", client:"Antonio Ruiz", detail:"Contactar con el cliente y registrar la gestión.", action:"Gestionar" },
  { n:"02", cls:"warning", eyebrow:"RENOVACIÓN PRÓXIMA", client:"Bar Andalucía", detail:"Contrato de Energía próximo a vencimiento.", action:"Renovar" },
  { n:"03", cls:"notice", eyebrow:"DOCUMENTACIÓN", client:"Farmacia Centro", detail:"Revisar documentación antes de tramitar.", action:"Revisar" },
];

const agenda = [
  ["09:30","Seguimiento comercial","Antonio Ruiz"],
  ["11:00","Revisar propuesta","Bar Andalucía"],
  ["13:15","Documentación","Farmacia Centro"],
];

export default function MiDiaPage() {
  return (
    <>
      <style>{`
        .md{--o:#ff7417;--r:#ef3f32;--ink:#24211f;--muted:#8b8580;--line:#ebe6e1;max-width:1420px;margin:0 auto;padding:28px 0 46px;color:var(--ink)}
        .md *{box-sizing:border-box}.md a{text-decoration:none;color:inherit}
        .mdHero{display:flex;justify-content:space-between;align-items:flex-end;gap:22px;padding:23px 25px;margin-bottom:13px;border:1px solid var(--line);border-radius:19px;background:linear-gradient(115deg,#fff 58%,#fff5df)}
        .mdKicker{font-size:10px;font-weight:900;letter-spacing:.18em;color:var(--r)}.mdHero h1{font-size:31px;line-height:1;margin:7px 0 7px;letter-spacing:-.04em}.mdHero p{margin:0;font-size:12px;color:var(--muted)}
        .mdButtons{display:flex;gap:8px}.mdBtn{display:flex;align-items:center;justify-content:center;height:38px;padding:0 14px;border:1px solid var(--line);border-radius:10px;background:#fff;font-size:11px;font-weight:800;white-space:nowrap}.mdBtnPrimary{border:0;color:#fff!important;background:linear-gradient(110deg,#ffad1f,var(--r));box-shadow:0 8px 18px #ef3f3220}
        .mdTickets{display:grid;grid-template-columns:1.05fr .95fr;gap:13px;margin-bottom:13px}
        .mdTicketAlert{background:linear-gradient(110deg,#fff 55%,#fff2ef);border:1px solid #f1d9d5;border-radius:16px;padding:17px}
        .mdTicketTop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.mdTicketCount{font-size:32px;font-weight:950;letter-spacing:-.05em;color:#d83a2f}
        .mdTicketAlert h2{font-size:17px;margin:3px 0 4px}.mdTicketAlert p{font-size:10px;color:var(--muted);margin:0 0 12px}
        .mdTicketFlags{display:flex;gap:7px;flex-wrap:wrap}.mdFlag{font-size:9px;font-weight:900;border-radius:99px;padding:6px 9px;background:#fff;border:1px solid #eedbd8}.mdFlag.red{color:#c92f25;background:#fff0ee}.mdFlag.orange{color:#b96618;background:#fff5e8}
        .mdTicketList{background:#fff;border:1px solid var(--line);border-radius:16px;padding:13px 16px}.mdTicketRow{display:grid;grid-template-columns:9px 1fr auto;gap:9px;align-items:center;padding:9px 0;border-top:1px solid #f2efec}.mdTicketRow:first-child{border-top:0}.mdTicketBall{width:7px;height:7px;border-radius:50%;background:#e54134}.mdTicketRow b{font-size:10px;display:block}.mdTicketRow small{font-size:9px;color:var(--muted)}.mdTicketState{font-size:9px;font-weight:900;color:#c93429}
        .mdStats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:13px}.mdStat{background:#fff;border:1px solid var(--line);border-radius:14px;padding:15px 16px;min-height:93px}.mdStatTop{display:flex;justify-content:space-between;align-items:center}.mdStat span{font-size:9px;font-weight:900;color:#99918b;letter-spacing:.04em}.mdStat b{display:block;font-size:27px;margin-top:7px;letter-spacing:-.04em}.mdStat small{font-size:10px;color:var(--muted)}.mdDot{width:8px;height:8px;border-radius:50%;background:var(--o)}
        .mdPanel{background:#fff;border:1px solid var(--line);border-radius:16px;padding:17px;margin-bottom:13px}.mdPanelHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.mdPanelHead h2{font-size:17px;margin:3px 0 0;letter-spacing:-.025em}.mdPill{font-size:10px;font-weight:900;color:#c9362b;background:#fff0ed;border-radius:99px;padding:6px 9px}
        .mdPriorities{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.mdPriority{display:grid;grid-template-columns:31px 1fr auto;align-items:center;gap:10px;padding:12px;border:1px solid var(--line);border-radius:12px;transition:.15s;background:#fff}.mdPriority:hover{transform:translateY(-1px);box-shadow:0 7px 20px #2d21160c}.mdNum{height:29px;width:29px;border-radius:9px;display:grid;place-items:center;font-size:10px;font-weight:900}.danger .mdNum{background:#ffe8e5;color:#ca3026}.warning .mdNum{background:#fff0e2;color:#c56b17}.notice .mdNum{background:#fff8d8;color:#907200}.mdPriority strong{display:block;font-size:9px;color:#918983;letter-spacing:.05em}.mdPriority b{display:block;font-size:12px;margin:2px 0}.mdPriority small{display:block;color:var(--muted);font-size:9px}.mdAction{font-size:10px;font-weight:900;color:var(--r)}
        .mdGrid{display:grid;grid-template-columns:1.1fr .9fr;gap:13px}.mdGoalRow{display:flex;align-items:flex-end;justify-content:space-between}.mdMoney b{font-size:30px;letter-spacing:-.04em}.mdMoney span{font-size:11px;color:var(--muted);margin-left:6px}.mdPercent{font-size:22px;font-weight:900}.mdBar{height:8px;background:#f1ede9;border-radius:99px;margin:13px 0 8px;overflow:hidden}.mdBar i{display:block;width:78%;height:100%;background:linear-gradient(90deg,#ffc02f,#ff841c,#ed4033);border-radius:99px}.mdHint{font-size:10px;color:var(--muted)}.mdCommission{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #f0ece8;margin-top:13px;padding-top:12px}.mdCommission span{font-size:10px;font-weight:800}.mdCommission b{font-size:18px}
        .mdAgenda{display:grid}.mdAgendaRow{display:grid;grid-template-columns:55px 1fr auto;align-items:center;padding:10px 0;border-top:1px solid #f2efec}.mdAgendaRow:first-child{border-top:0}.mdAgendaRow time{font-size:11px;font-weight:900}.mdAgendaRow b{font-size:11px;display:block}.mdAgendaRow small{font-size:9px;color:var(--muted)}.mdArrow{color:var(--r);font-weight:900}
        .mdBottom{display:grid;grid-template-columns:1fr 1fr;gap:13px}.mdNews{display:grid;gap:7px}.mdNews div{display:grid;grid-template-columns:34px 1fr auto;align-items:center;border:1px solid #f0ece8;border-radius:10px;padding:8px 10px;font-size:10px}.mdNews i{font-style:normal;font-size:15px}.mdNews b{color:var(--r)}
        .mdQuick{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mdQuick a{min-height:55px;border:1px solid var(--line);border-radius:11px;padding:10px;display:flex;align-items:center;gap:10px;font-size:11px;font-weight:800}.mdQuick i{font-style:normal;width:29px;height:29px;border-radius:9px;background:#fff1e7;display:grid;place-items:center;color:var(--r);font-size:16px}
        .mdVersion{font-size:9px;color:#aaa;text-align:right;margin-top:4px}
        @media(max-width:1000px){.mdTickets{grid-template-columns:1fr}.mdPriorities,.mdStats{grid-template-columns:repeat(2,1fr)}.mdGrid,.mdBottom{grid-template-columns:1fr}}
        @media(max-width:650px){.md{padding:16px 0}.mdHero{align-items:flex-start;flex-direction:column}.mdHero h1{font-size:27px}.mdButtons{width:100%;flex-wrap:wrap}.mdStats,.mdPriorities,.mdQuick{grid-template-columns:1fr}.mdBtn{flex:1}}
      `}</style>

      <main className="md">
        <section className="mdHero">
          <div>
            <div className="mdKicker">MI DÍA</div>
            <h1>Buenos días, Jesús</h1>
            <p>Todo lo importante para empezar a trabajar, de un vistazo.</p>
          </div>
          <div className="mdButtons">
            <Link className="mdBtn" href="/clientes/nuevo">+ Nuevo cliente</Link>
            <Link className="mdBtn mdBtnPrimary" href="/oportunidades/nuevo">+ Nueva oportunidad</Link>
          </div>
        </section>

        <section className="mdPanel">
          <div className="mdPanelHead">
            <div><div className="mdKicker">PRIORIDADES</div><h2>Hoy debes hacer esto</h2></div>
            <div className="mdPill">3 pendientes</div>
          </div>
          <div className="mdPriorities">
            {priorities.map(p => (
              <Link href="/clientes" key={p.n} className={`mdPriority ${p.cls}`}>
                <div className="mdNum">{p.n}</div>
                <div><strong>{p.eyebrow}</strong><b>{p.client}</b><small>{p.detail}</small></div>
                <div className="mdAction">{p.action} →</div>
              </Link>
            ))}
          </div>
        </section>


        <section className="mdTickets">
          <article className="mdTicketAlert">
            <div className="mdTicketTop">
              <div>
                <div className="mdKicker">TICKETS · NECESITAN TU ATENCIÓN</div>
                <h2>Operaciones incompletas</h2>
                <p>Resuélvelas para que puedan completar su tramitación y computar correctamente.</p>
              </div>
              <div className="mdTicketCount">3</div>
            </div>
            <div className="mdTicketFlags">
              <span className="mdFlag red">● 1 bloquea activación / comisión</span>
              <span className="mdFlag orange">● 2 requieren gestión</span>
              <Link className="mdBtn mdBtnPrimary" href="/operaciones">Ver tickets →</Link>
            </div>
          </article>

          <article className="mdTicketList">
            <div className="mdPanelHead" style={{marginBottom:0}}>
              <div><div className="mdKicker">MÁS URGENTES</div><h2>Tickets abiertos</h2></div>
            </div>
            <Link href="/operaciones" className="mdTicketRow">
              <i className="mdTicketBall"/><div><b>Antonio Ruiz · Energía</b><small>Falta documentación · Operación bloqueada</small></div><span className="mdTicketState">Resolver →</span>
            </Link>
            <Link href="/operaciones" className="mdTicketRow">
              <i className="mdTicketBall" style={{background:"#e8902f"}}/><div><b>Bar Andalucía · Energía</b><small>Revisión requerida por BackOffice</small></div><span className="mdTicketState">Revisar →</span>
            </Link>
            <Link href="/operaciones" className="mdTicketRow">
              <i className="mdTicketBall" style={{background:"#e8902f"}}/><div><b>Farmacia Centro · Telefonía</b><small>Dato pendiente para continuar</small></div><span className="mdTicketState">Revisar →</span>
            </Link>
          </article>
        </section>

        <section className="mdStats">
          <Link className="mdStat" href="/operaciones"><div className="mdStatTop"><span>ACTIVADOS ESTE MES</span><i className="mdDot"/></div><b>18</b><small>Contratos activos</small></Link>
          <Link className="mdStat" href="/operaciones"><div className="mdStatTop"><span>PENDIENTES DE ACTIVAR</span><i className="mdDot"/></div><b>7</b><small>Requieren seguimiento</small></Link>
          <Link className="mdStat" href="/oportunidades"><div className="mdStatTop"><span>OPORTUNIDADES</span><i className="mdDot"/></div><b>14</b><small>Abiertas</small></Link>
          <Link className="mdStat" href="/operaciones"><div className="mdStatTop"><span>OPERACIONES</span><i className="mdDot"/></div><b>5</b><small>Pendientes</small></Link>
        </section>

        <section className="mdGrid">
          <article className="mdPanel">
            <div className="mdPanelHead"><div><div className="mdKicker">OBJETIVO</div><h2>Producción mensual</h2></div><div className="mdPercent">78%</div></div>
            <div className="mdGoalRow"><div className="mdMoney"><b>3.850 €</b><span>de 5.000 €</span></div></div>
            <div className="mdBar"><i/></div>
            <div className="mdHint">Te faltan <b>1.150 €</b> para alcanzar el objetivo.</div>
            <div className="mdCommission"><span>Previsión de comisiones<br/><small>Según producción y activaciones</small></span><b>1.240 €</b></div>
          </article>

          <article className="mdPanel">
            <div className="mdPanelHead"><div><div className="mdKicker">AGENDA</div><h2>Hoy</h2></div><Link className="mdAction" href="/agenda">Ver agenda →</Link></div>
            <div className="mdAgenda">
              {agenda.map(a => <div className="mdAgendaRow" key={a[0]}><time>{a[0]}</time><div><b>{a[1]}</b><small>{a[2]}</small></div><span className="mdArrow">→</span></div>)}
            </div>
          </article>
        </section>

        <section className="mdBottom">
          <article className="mdPanel">
            <div className="mdPanelHead"><div><div className="mdKicker">NOVEDADES AN24</div><h2>Lo último</h2></div><span className="mdAction">Ver todas →</span></div>
            <div className="mdNews">
              <div><i>⚡</i><span>Nueva tarifa de Energía disponible</span><b>→</b></div>
              <div><i>📱</i><span>Oferta Finetwork del mes</span><b>→</b></div>
              <div><i>📄</i><span>Nuevo documento SEPA en Biblioteca</span><b>→</b></div>
            </div>
          </article>
          <article className="mdPanel">
            <div className="mdPanelHead"><div><div className="mdKicker">ACCESOS RÁPIDOS</div><h2>¿Qué quieres hacer?</h2></div></div>
            <div className="mdQuick">
              <Link href="/clientes/nuevo"><i>+</i>Nuevo cliente</Link>
              <Link href="/oportunidades/nuevo"><i>+</i>Nueva oportunidad</Link>
              <Link href="/agenda"><i>✓</i>Agenda / tarea</Link>
              <Link href="/documentos"><i>↗</i>Biblioteca</Link>
            </div>
          </article>
        </section>
        <div className="mdVersion">ONE v0.3.3 · Tu negocio, siempre contigo.</div>
      </main>
    </>
  );
}
