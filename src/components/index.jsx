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

// ── PANEL LATERAL ─────────────────────────────────────
export function SidePanel({ row, onClose, EST_FICHA_LBL, EST_FICHA_COLS }) {
  if (!row) return null
  const fichaLink = row.enlace_ficha
    ? <a href={row.enlace_ficha} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">🔗 Abrir en Drive</a>
    : <span className="text-xs text-slate-400">Sin enlace</span>

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 w-[460px] max-w-full h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 z-50 overflow-y-auto shadow-2xl">
        <div className="bg-[#1F3864] px-4 py-3 flex items-center justify-between sticky top-0">
          <span className="text-white font-bold text-sm">N°{row.num} · {row.ficha}</span>
          <button onClick={onClose} className="text-blue-200 hover:text-white text-xl px-2">✕</button>
        </div>
        <div className="p-4 space-y-4 text-sm">
          <Section title="Identificación">
            <Row label="Ficha técnica" value={row.ficha} />
            <Row label="Enlace" value={fichaLink} />
            <Row label="Marco legal" value={row.marco || '—'} small />
            <Row label="Cod. actividad" value={`${row.cod_act} · ${row.act_label}`} />
            <Row label="Ficha cierre" value={
              row.tiene_cierre
                ? <span className="text-emerald-700 font-bold text-xs">✓ {row.num_cierre}</span>
                : <span className="text-red-600 text-xs font-bold">Sin ficha de cierre</span>
            } />
          </Section>
          <Section title="Ubicación">
            <Row label="UBO" value={row.ubo} />
            <Row label="Departamento" value={row.dep} />
            <Row label="Provincia / Distrito" value={`${row.prov} / ${row.dist}`} />
            <Row label="Sector" value={row.sector || '—'} />
          </Section>
          <Section title="Estado y avance">
            <Row label="Tipo" value={row.tipo} />
            <Row label="Estado" value={<Badge estado={row.estado} />} />
            <Row label="Convenio" value={row.conv || '—'} />
            <Row label="Estado ficha TEC" value={
              <span style={{ color: EST_FICHA_COLS[row.est_ficha] || '#888', fontWeight: 600, fontSize: 11 }}>
                {EST_FICHA_LBL[row.est_ficha] || row.est_ficha || '—'}
              </span>
            } />
            <Row label="Avance volumen" value={
              <span style={{ color: row.porc_vol < 20 ? '#EF4444' : row.porc_vol >= 100 ? '#10B981' : 'inherit', fontWeight: 700 }}>
                {row.porc_vol != null ? row.porc_vol.toFixed(1) + '%' : '—'}
              </span>
            } />
            <Row label="Meta / M³ ejec." value={`${fmt(row.meta_vol)} m³ / ${fmt(row.m3)} m³`} />
            <Row label="Plazo" value={row.plazo ? row.plazo + ' días' : '—'} />
          </Section>
          <Section title="Fechas">
            <Row label="Inicio → Fin" value={`${row.f_ini || '—'} → ${row.f_fin || '—'}`} />
            <Row label="Primer avance" value={row.primer_av || '—'} />
            <Row label="Último avance" value={row.ultimo_av || '—'} />
          </Section>
          <Section title="Maquinaria asignada">
            <div className="mt-1"><MaqChips maquinas={row.maquinas} /></div>
          </Section>
          <Section title="Costos">
            <Row label="Combustible" value={row.combus != null ? 'S/ ' + row.combus.toLocaleString('es-PE', { maximumFractionDigits: 2 }) : '—'} />
            <Row label="Mto. aportes" value={row.mto_ap != null ? 'S/ ' + row.mto_ap.toLocaleString('es-PE', { maximumFractionDigits: 2 }) : '—'} />
            <Row label="Mto. MVCS" value={row.mto_mv != null ? 'S/ ' + row.mto_mv.toLocaleString('es-PE', { maximumFractionDigits: 2 }) : '—'} />
            <Row label="Supervisor" value={row.supervisor || 'No asignado'} />
          </Section>
          {row.descripcion && <Section title="Descripción"><p className="text-xs text-slate-600 bg-slate-50 rounded p-2 leading-relaxed">{row.descripcion}</p></Section>}
          {row.obs && <Section title="Observación"><p className="text-xs text-slate-600 bg-slate-50 rounded p-2 leading-relaxed">{row.obs}</p></Section>}
        </div>
      </div>
    </>
  )
}

function Section({ title, children }) {
  return (
    <div className="border-b border-slate-100 pb-3">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</div>
      {children}
    </div>
  )
}
function Row({ label, value, small }) {
  return (
    <div className="flex gap-2 mb-1.5 items-start">
      <span className="text-xs text-slate-500 min-w-[110px] flex-shrink-0">{label}</span>
      <span className={`${small ? 'text-xs' : 'text-xs'} text-slate-800 font-medium flex-1`}>{value}</span>
    </div>
  )
}

// ── FILTER BAR ────────────────────────────────────────
export function FilterBar({ ubos, deps, anios, curAnio, curMes, curUBO, curDep, curTipo, setCurAnio, setCurMes, setCurUBO, setCurDep, setCurTipo, count, total }) {
  const sel = 'text-xs border border-slate-300 rounded-md px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 cursor-pointer'
  const MESES_OPT = [['TODOS','Todos'],['01','Enero'],['02','Febrero'],['03','Marzo'],['04','Abril'],['05','Mayo'],['06','Junio'],['07','Julio'],['08','Agosto'],['09','Setiembre'],['10','Octubre'],['11','Noviembre'],['12','Diciembre']]
  const TIPOS = ['TODOS','PREVENCIÓN','EMERGENCIA','URGENTE ATENCIÓN']
  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-2 flex flex-wrap gap-2 items-center sticky top-10 z-30">
      <span className="text-xs font-semibold text-slate-400 uppercase">Año:</span>
      <select className={sel} value={curAnio} onChange={e => setCurAnio(e.target.value)}>
        <option value="TODOS">Todos</option>
        {anios.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
      <span className="text-xs font-semibold text-slate-400 uppercase">Mes:</span>
      <select className={sel} value={curMes} onChange={e => setCurMes(e.target.value)}>
        {MESES_OPT.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <span className="text-xs font-semibold text-slate-400 uppercase">UBO:</span>
      <select className={sel} value={curUBO} onChange={e => setCurUBO(e.target.value)}>
        <option value="TODOS">Todos</option>
        {ubos.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
      <span className="text-xs font-semibold text-slate-400 uppercase">Depto:</span>
      <select className={sel} value={curDep} onChange={e => setCurDep(e.target.value)}>
        <option value="TODOS">Todos</option>
        {deps.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <span className="text-xs font-semibold text-slate-400 uppercase">Tipo:</span>
      <div className="flex gap-1">
        {TIPOS.map(t => (
          <button key={t} onClick={() => setCurTipo(t)}
            className={`px-2 py-0.5 rounded-full text-xs border transition-all ${curTipo === t ? 'bg-[#1F3864] text-white border-[#1F3864] font-bold' : 'bg-transparent text-slate-500 border-slate-300 hover:border-blue-400'}`}>
            {t === 'TODOS' ? 'Todos' : t === 'PREVENCIÓN' ? 'Prevención' : t === 'EMERGENCIA' ? 'Emergencia' : 'Urgente'}
          </button>
        ))}
      </div>
      <span className="ml-auto text-xs text-slate-400">{count.toLocaleString()} de {total.toLocaleString()}</span>
    </div>
  )
}
