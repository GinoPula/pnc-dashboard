import { badgeCls, fmt, pct } from '../utils/data'

// ── KPI CARD ──────────────────────────────────────────
export function KpiCard({ label, value, sub, color = 'blue', size = 'md' }) {
  const colors = {
    blue: 'border-t-blue-500', teal: 'border-t-emerald-500',
    amber: 'border-t-amber-500', red: 'border-t-red-500',
    purple: 'border-t-purple-500', gray: 'border-t-gray-400',
  }
  const valSize = size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-lg' : 'text-2xl'
  return (
    <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-t-4 ${colors[color]} rounded-xl p-3`}>
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</div>
      <div className={`${valSize} font-extrabold text-slate-800 dark:text-slate-100 leading-none`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

// ── BADGE ─────────────────────────────────────────────
export function Badge({ estado }) {
  const cls = badgeCls(estado)
  const colors = {
    'badge-ej': 'bg-emerald-100 text-emerald-800',
    'badge-en': 'bg-amber-100 text-amber-800',
    'badge-pr': 'bg-blue-100 text-blue-800',
    'badge-de': 'bg-gray-100 text-gray-600',
    'badge-pa': 'bg-red-100 text-red-800',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${colors[cls] || ''}`}>
      {estado}
    </span>
  )
}

// ── CHIP MAQUINARIA ───────────────────────────────────
export function ChipMaq({ tipo, cod }) {
  return (
    <span className="inline-block bg-purple-50 border border-purple-200 text-purple-800 rounded text-xs px-1.5 py-0.5 mr-1 mb-0.5 font-medium">
      {tipo} <span className="text-purple-400 font-normal">{cod}</span>
    </span>
  )
}

export function MaqChips({ maquinas }) {
  if (!maquinas || maquinas.length === 0)
    return <span className="text-xs text-slate-400">Sin asignar</span>
  return maquinas.map((m, i) => <ChipMaq key={i} tipo={m.tipo} cod={m.cod} />)
}



// ── PANEL LATERAL (estilo sistema Main) ──────────────────
export function SidePanel({ row, onClose, EST_FICHA_LBL, EST_FICHA_COLS }) {
  if (!row) return null

  const exportPDF = () => {
    const fichaLink = row.enlace_ficha ? `<a href="${row.enlace_ficha}" style="color:#2563EB">🔗 Abrir ficha técnica</a>` : 'Sin enlace'
    const cierreSection = row.tiene_cierre
      ? `<div class="row"><span class="lbl">Ficha cierre</span><span class="val" style="color:#0F6E56;font-weight:700">✓ ${row.num_cierre}${row.enlace_cierre?` <a href="${row.enlace_cierre}" style="color:#2563EB">🔗 Ver</a>`:''}</span></div><div class="row"><span class="lbl">F. entrega cierre</span><span class="val">${row.f_cierre||'—'}</span></div>`
      : `<div class="row"><span class="lbl">Ficha cierre</span><span class="val" style="color:#A32D2D;font-weight:700">Sin ficha de cierre</span></div>`
    const maqHTML = row.maquinas && row.maquinas.length > 0
      ? row.maquinas.map(m=>`<span style="background:#EEEDFE;color:#3C3489;padding:2px 8px;border-radius:4px;font-size:10px;margin:2px;display:inline-block;font-weight:600">${m.tipo} <span style="color:#7F77DD;font-weight:400">${m.cod}</span></span>`).join('')
      : 'Sin maquinaria asignada'
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:'Segoe UI',sans-serif;font-size:10px;padding:20px;max-width:520px}
      h1{background:#1F3864;color:#fff;padding:12px 16px;border-radius:8px;font-size:14px;margin-bottom:4px}
      .sub{font-size:10px;color:#64748B;margin-bottom:14px}
      .sec{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #F1F5F9}
      .sec-title{font-size:9px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
      .row{display:flex;gap:8px;margin-bottom:5px;align-items:flex-start}
      .lbl{font-size:10px;color:#64748B;min-width:130px;flex-shrink:0}
      .val{font-size:10px;font-weight:500;color:#1E293B;flex:1}
      .badge{padding:3px 10px;border-radius:20px;font-size:9px;font-weight:700}
      @media print{@page{margin:1cm;size:A4 portrait}}
    </style></head><body>
    <h1>N°${row.num} · ${row.ficha}</h1>
    <div class="sub">Programa Nuestras Ciudades — MVCS · Generado: ${new Date().toLocaleDateString('es-PE')}</div>
    <div class="sec"><div class="sec-title">Identificación</div>
      <div class="row"><span class="lbl">Ficha técnica</span><span class="val">${row.ficha}</span></div>
      <div class="row"><span class="lbl">Enlace ficha</span><span class="val">${fichaLink}</span></div>
      <div class="row"><span class="lbl">Marco legal</span><span class="val">${row.marco||'—'}</span></div>
      <div class="row"><span class="lbl">Cod. actividad</span><span class="val">${row.cod_act} · ${row.act_label}</span></div>
      ${cierreSection}
    </div>
    <div class="sec"><div class="sec-title">Ubicación</div>
      <div class="row"><span class="lbl">UBO</span><span class="val">${row.ubo}</span></div>
      <div class="row"><span class="lbl">Departamento</span><span class="val">${row.dep}</span></div>
      <div class="row"><span class="lbl">Provincia / Distrito</span><span class="val">${row.prov} / ${row.dist}</span></div>
      <div class="row"><span class="lbl">Sector</span><span class="val">${row.sector||'—'}</span></div>
    </div>
    <div class="sec"><div class="sec-title">Estado y avance</div>
      <div class="row"><span class="lbl">Tipo</span><span class="val">${row.tipo}</span></div>
      <div class="row"><span class="lbl">Estado</span><span class="val"><span class="badge" style="background:${row.estado==='EJECUTADA'?'#E1F5EE':row.estado.includes('EJEC')?'#FAEEDA':'#EBF3FB'};color:${row.estado==='EJECUTADA'?'#085041':row.estado.includes('EJEC')?'#633806':'#0C447C'}">${row.estado}</span></span></div>
      <div class="row"><span class="lbl">Estado convenio</span><span class="val">${row.conv||'—'}</span></div>
      <div class="row"><span class="lbl">Estado ficha TEC</span><span class="val" style="color:${EST_FICHA_COLS[row.est_ficha]||'#888'};font-weight:600">${EST_FICHA_LBL[row.est_ficha]||row.est_ficha||'—'}</span></div>
      <div class="row"><span class="lbl">Avance volumen</span><span class="val" style="font-weight:700;color:${row.porc_vol!=null&&row.porc_vol<20?'#EF4444':row.porc_vol!=null&&row.porc_vol>=100?'#10B981':'#1E293B'}">${row.porc_vol!=null?row.porc_vol.toFixed(1)+'%':'—'}</span></div>
      <div class="row"><span class="lbl">Meta / M³ ejec.</span><span class="val">${row.meta_vol!=null?row.meta_vol.toLocaleString('es-PE',{maximumFractionDigits:0})+' m³':'—'} / ${row.m3!=null?row.m3.toLocaleString('es-PE',{maximumFractionDigits:0})+' m³':'—'}</span></div>
      <div class="row"><span class="lbl">Plazo</span><span class="val">${row.plazo!=null?row.plazo+' días':'—'}</span></div>
    </div>
    <div class="sec"><div class="sec-title">Fechas</div>
      <div class="row"><span class="lbl">Inicio / Fin</span><span class="val">${row.f_ini||'—'} → ${row.f_fin||'—'}</span></div>
      <div class="row"><span class="lbl">Primer avance</span><span class="val">${row.primer_av||'—'}</span></div>
      <div class="row"><span class="lbl">Último avance</span><span class="val">${row.ultimo_av||'—'}</span></div>
    </div>
    <div class="sec"><div class="sec-title">Maquinaria asignada</div><div style="margin-top:6px">${maqHTML}</div></div>
    <div class="sec"><div class="sec-title">Costos</div>
      <div class="row"><span class="lbl">Combustible ficha</span><span class="val">${row.combus!=null?'S/ '+row.combus.toLocaleString('es-PE',{maximumFractionDigits:2}):'—'}</span></div>
      <div class="row"><span class="lbl">Mto. aportes</span><span class="val">${row.mto_ap!=null?'S/ '+row.mto_ap.toLocaleString('es-PE',{maximumFractionDigits:2}):'—'}</span></div>
      <div class="row"><span class="lbl">Mto. MVCS</span><span class="val">${row.mto_mv!=null?'S/ '+row.mto_mv.toLocaleString('es-PE',{maximumFractionDigits:2}):'—'}</span></div>
      <div class="row"><span class="lbl">Supervisor</span><span class="val">${row.supervisor||'No asignado'}</span></div>
    </div>
    ${row.obs?`<div class="sec"><div class="sec-title">Observación</div><p style="font-size:10px;color:#64748B;line-height:1.6;background:#F8FAFC;padding:8px;border-radius:6px">${row.obs}</p></div>`:''}
    <div style="font-size:8px;color:#94A3B8;text-align:center;border-top:1px solid #E2E8F0;padding-top:8px">PNC Maquinarias · ${row.ubo} · ${new Date().toLocaleDateString('es-PE')}</div>
    </body></html>`
    const w=window.open('','_blank','width=600,height=850'); w.document.write(html); w.document.close(); w.onload=()=>{w.focus();w.print()}
  }

  const fichaLink = row.enlace_ficha
    ? <a href={row.enlace_ficha} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">🔗 Abrir en Drive</a>
    : <span className="text-xs text-slate-400">Sin enlace</span>

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}/>
      <div className="fixed top-0 right-0 w-full sm:w-[460px] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 z-50 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-[#1F3864] px-4 py-3 sticky top-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="text-white font-bold text-sm">N°{row.num} · {row.ficha}</div>
              <div className="text-blue-300 text-xs mt-0.5">{row.ubo} · {row.dep} · {row.prov}</div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={exportPDF} className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors">↓ PDF</button>
              <button onClick={onClose} className="text-blue-200 hover:text-white text-xl leading-none">✕</button>
            </div>
          </div>
          {/* Badges rápidos */}
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge estado={row.estado}/>
            {row.porc_vol != null && <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${row.porc_vol>=100?'bg-emerald-500 text-white':row.porc_vol<20?'bg-red-500 text-white':'bg-amber-400 text-amber-900'}`}>{row.porc_vol.toFixed(1)}%</span>}
            {row.tiene_cierre && <span className="inline-block bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">✓ Con cierre</span>}
          </div>
        </div>
        {/* Body */}
        <div className="p-4 space-y-4 text-sm">
          <Section title="Identificación">
            <Row label="Ficha técnica" value={row.ficha}/>
            <Row label="Enlace" value={fichaLink}/>
            <Row label="Marco legal" value={<span className="text-xs">{row.marco||'—'}</span>}/>
            <Row label="Cod. actividad" value={`${row.cod_act} · ${row.act_label}`}/>
            <Row label="Ficha cierre" value={
              row.tiene_cierre
                ? <div>
                    <span className="text-emerald-700 font-bold text-xs">✓ {row.num_cierre}</span>
                    {row.enlace_cierre && <a href={row.enlace_cierre} target="_blank" rel="noreferrer" className="ml-2 text-blue-600 hover:underline text-xs">🔗 Ver</a>}
                    {row.f_cierre && <div className="text-xs text-slate-400 mt-0.5">Entregado: {row.f_cierre}</div>}
                  </div>
                : <span className="text-red-600 text-xs font-bold">Sin ficha de cierre</span>
            }/>
          </Section>

          <Section title="Ubicación">
            <Row label="UBO" value={row.ubo}/>
            <Row label="Departamento" value={row.dep}/>
            <Row label="Provincia / Distrito" value={`${row.prov} / ${row.dist}`}/>
            <Row label="Sector" value={row.sector||'—'}/>
          </Section>

          <Section title="Estado y avance">
            <Row label="Tipo" value={row.tipo}/>
            <Row label="Estado" value={<Badge estado={row.estado}/>}/>
            <Row label="Estado convenio" value={row.conv||'—'}/>
            <Row label="Estado ficha TEC" value={
              <span style={{color: EST_FICHA_COLS[row.est_ficha]||'#888', fontWeight:600, fontSize:11}}>
                {EST_FICHA_LBL[row.est_ficha]||row.est_ficha||'—'}
              </span>
            }/>
            <Row label="Avance volumen" value={
              <span className={`font-bold ${row.porc_vol!=null&&row.porc_vol<20?'text-red-500':row.porc_vol!=null&&row.porc_vol>=100?'text-emerald-600':''}`}>
                {row.porc_vol!=null?row.porc_vol.toFixed(1)+'%':'—'}
              </span>
            }/>
            <Row label="Meta / M³ ejec." value={`${row.meta_vol!=null?(row.meta_vol.toLocaleString('es-PE',{maximumFractionDigits:0})+' m³'):'—'} / ${row.m3!=null?(row.m3.toLocaleString('es-PE',{maximumFractionDigits:0})+' m³'):'—'}`}/>
            <Row label="Plazo" value={row.plazo!=null?row.plazo+' días':'—'}/>
          </Section>

          <Section title="Fechas">
            <Row label="Inicio / Fin" value={`${row.f_ini||'—'} → ${row.f_fin||'—'}`}/>
            <Row label="Primer avance" value={row.primer_av||'—'}/>
            <Row label="Último avance" value={row.ultimo_av||'—'}/>
          </Section>

          <Section title="Maquinaria asignada">
            <div className="mt-1"><MaqChips maquinas={row.maquinas}/></div>
          </Section>

          <Section title="Costos">
            <Row label="Combustible ficha" value={row.combus!=null?'S/ '+row.combus.toLocaleString('es-PE',{maximumFractionDigits:2}):'—'}/>
            <Row label="Mto. aportes" value={row.mto_ap!=null?'S/ '+row.mto_ap.toLocaleString('es-PE',{maximumFractionDigits:2}):'—'}/>
            <Row label="Mto. MVCS" value={row.mto_mv!=null?'S/ '+row.mto_mv.toLocaleString('es-PE',{maximumFractionDigits:2}):'—'}/>
            <Row label="Supervisor" value={row.supervisor||'No asignado'}/>
          </Section>

          {row.descripcion && <Section title="Descripción"><p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg p-2 leading-relaxed">{row.descripcion}</p></Section>}
          {row.obs && <Section title="Observación"><p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg p-2 leading-relaxed">{row.obs}</p></Section>}
        </div>
      </div>
    </>
  )
}

function Section({ title, children }) {
  return (
    <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</div>
      {children}
    </div>
  )
}
function Row({ label, value }) {
  return (
    <div className="flex gap-2 mb-1.5 items-start">
      <span className="text-xs text-slate-500 dark:text-slate-400 min-w-[120px] flex-shrink-0">{label}</span>
      <span className="text-xs text-slate-800 dark:text-slate-200 font-medium flex-1">{value}</span>
    </div>
  )
}

export { FilterBar } from './FilterBar'
