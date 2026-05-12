import { useState, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Badge, MaqChips, SidePanel } from '../components'
import { fmt, EST_FICHA_LBL, EST_FICHA_COLS, MESES } from '../utils/data'

const ESTADOS = ['TODOS','PARALIZADA','EN EJECUCIÓN','EJECUTADA','PROGRAMADA','DESESTIMADA']
const EST_LABELS = {'TODOS':'Todos','PARALIZADA':'Paralizadas','EN EJECUCIÓN':'En ejecución','EJECUTADA':'Ejecutadas','PROGRAMADA':'Programadas','DESESTIMADA':'Desestimadas'}
const SORT_OPTS = [
  {v:'',l:'Sin ordenar'},
  {v:'f_ini_asc',l:'Fecha inicio ↑'},
  {v:'f_ini_desc',l:'Fecha inicio ↓'},
  {v:'f_fin_desc',l:'Fecha fin ↓'},
  {v:'porc_vol_desc',l:'Avance % ↓'},
  {v:'porc_vol_asc',l:'Avance % ↑'},
]

export default function Detalle({ filtered, raw }) {
  const [estSel, setEstSel]       = useState(new Set(['TODOS']))
  const [mesesSel, setMesesSel]   = useState(new Set())
  const [busq, setBusq]           = useState('')
  const [sortBy, setSortBy]       = useState('')
  const [cierreFiltro, setCierreFiltro] = useState('TODOS')
  const [panel, setPanel]         = useState(null)
  const [showMeses, setShowMeses] = useState(false)
  // ── FILTRO POR RANGO DE FECHAS ──
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [fechaFiltroActivo, setFechaFiltroActivo] = useState(false)

  // Meses disponibles en los datos
  const mesesDisp = useMemo(() => {
    const s = new Set()
    filtered.forEach(r => { if (r.mes) s.add(r.mes) })
    return [...s].sort()
  }, [filtered])

  // ── HELPER: parsear fecha DD/MM/YYYY o YYYY-MM-DD ──
  const pd = (str) => {
    if (!str) return null
    const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (m) return new Date(+m[3], +m[2]-1, +m[1])
    const m2 = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m2) return new Date(+m2[1], +m2[2]-1, +m2[3])
    return null
  }

  // ── RESUMEN por rango de fechas (contadores de los 3 cards) ──
  const resumenFechas = useMemo(() => {
    if (!fechaFiltroActivo || !fechaDesde || !fechaHasta) return null
    const dDesde = pd(fechaDesde)
    const dHasta = pd(fechaHasta)
    const ejecutadas = filtered.filter(r => {
      const f = pd(r.f_fin); return f && f >= dDesde && f <= dHasta && r.estado === 'EJECUTADA'
    })
    const enEjecucion = filtered.filter(r => {
      const f = pd(r.f_ini); return f && f >= dDesde && f <= dHasta && r.estado.normalize('NFC') === 'EN EJECUCIÓN'
    })
    const programadas = filtered.filter(r => {
      const f = pd(r.f_ini); return f && f >= dDesde && f <= dHasta && r.estado_g === 'PROGRAMADA'
    })
    return { ejecutadas, enEjecucion, programadas }
  }, [filtered, fechaDesde, fechaHasta, fechaFiltroActivo])

  const toggleEst = (est) => {
    setEstSel(prev => {
      const next = new Set(prev)
      if (est === 'TODOS') return new Set(['TODOS'])
      next.delete('TODOS')
      if (next.has(est)) { next.delete(est); if (next.size === 0) return new Set(['TODOS']) }
      else next.add(est)
      return next
    })
  }

  const toggleMes = (mes) => {
    setMesesSel(prev => {
      const next = new Set(prev)
      if (next.has(mes)) next.delete(mes)
      else next.add(mes)
      return next
    })
  }

  const rows = useMemo(() => {
    let r = filtered
    if (!estSel.has('TODOS')) {
      r = r.filter(x => {
        if (estSel.has(x.estado)) return true
        if (estSel.has('PROGRAMADA') && x.estado_g === 'PROGRAMADA') return true
        if (estSel.has('EN EJECUCIÓN') && x.estado.normalize('NFC') === 'EN EJECUCIÓN') return true
        return false
      })
    }
    if (mesesSel.size > 0) r = r.filter(x => mesesSel.has(x.mes))
    if (cierreFiltro === 'CON') r = r.filter(x => x.tiene_cierre)
    if (cierreFiltro === 'SIN') r = r.filter(x => !x.tiene_cierre)
    // ── Filtro por rango de fechas ──
    if (fechaFiltroActivo && fechaDesde && fechaHasta) {
      const dD = pd(fechaDesde)
      const dH = pd(fechaHasta)
      r = r.filter(x => {
        const est = x.estado.normalize('NFC')
        if (est === 'EJECUTADA')   { const f = pd(x.f_fin); return f && f >= dD && f <= dH }
        if (est === 'EN EJECUCIÓN'){ const f = pd(x.f_ini); return f && f >= dD && f <= dH }
        if (x.estado_g === 'PROGRAMADA') { const f = pd(x.f_ini); return f && f >= dD && f <= dH }
        return false
      })
    }
    if (busq) {
      const q = busq.toLowerCase()
      r = r.filter(x => [x.num,x.ubo,x.dep,x.prov,x.dist,x.tipo,x.estado,x.ficha,x.maq_str,x.marco].join(' ').toLowerCase().includes(q))
    }
    if (sortBy) {
      const [field, dir] = sortBy.includes('_asc') ? [sortBy.replace('_asc',''),'asc'] : [sortBy.replace('_desc',''),'desc']
      const pd = d => { if(!d)return 0; const m=d.match(/(\d{2})\/(\d{2})\/(\d{4})/); return m?new Date(+m[3],+m[2]-1,+m[1]).getTime():0 }
      r = [...r].sort((a,b) => {
        if (field === 'porc_vol') { const va=a.porc_vol??-1,vb=b.porc_vol??-1; return dir==='asc'?va-vb:vb-va }
        if (['f_ini','f_fin','ultimo_av'].includes(field)) { const va=pd(a[field]),vb=pd(b[field]); return dir==='asc'?va-vb:vb-va }
        return dir==='asc' ? String(a[field]||'').localeCompare(String(b[field]||'')) : String(b[field]||'').localeCompare(String(a[field]||''))
      })
    }
    return r
  }, [filtered, estSel, mesesSel, cierreFiltro, busq, sortBy, fechaDesde, fechaHasta, fechaFiltroActivo])

  // ── EXPORT EXCEL COMPLETO ─────────────────────────────
  const exportExcel = useCallback(() => {
    const headers = ['N°','UBO','Departamento','Provincia','Distrito','Tipo','Marco Legal','Estado','Avance%','M³ Ejec.','F. Inicio','F. Fin','Ficha_Intervención','Enlace Ficha','Tiene Cierre','N° Cierre','Unidad / Maquinaria']
    const data = rows.map(r => [
      r.num, r.ubo, r.dep, r.prov, r.dist, r.tipo, r.marco, r.estado,
      r.porc_vol!=null?+r.porc_vol.toFixed(2):null,
      r.m3!=null?+r.m3.toFixed(2):null,
      r.f_ini, r.f_fin, r.ficha, r.enlace_ficha,
      r.tiene_cierre?'SÍ':'NO', r.num_cierre,
      r.maquinas.map(m=>`${m.tipo} (${m.cod})`).join(' | ')
    ])
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['REPORTE PNC MAQUINARIAS — ESTADO DE INTERVENCIONES'],
      [`Filtros: Estado=${[...estSel].join('+')} | Meses=${mesesSel.size>0?[...mesesSel].map(m=>MESES[m]||m).join('+'):'Todos'} | Total=${rows.length}`],
      [`Generado: ${new Date().toLocaleDateString('es-PE')}`], [],
      headers, ...data
    ])
    ws['!cols'] = [{wch:6},{wch:14},{wch:16},{wch:14},{wch:14},{wch:16},{wch:28},{wch:22},{wch:10},{wch:14},{wch:12},{wch:12},{wch:32},{wch:50},{wch:8},{wch:18},{wch:60}]
    XLSX.utils.book_append_sheet(wb, ws, 'Intervenciones')
    XLSX.writeFile(wb, `PNC_Intervenciones_${new Date().toISOString().slice(0,10)}.xlsx`)
  }, [rows, estSel, mesesSel, cierreFiltro])

  // ── EXPORT EXCEL ASESORES VICEMINISTRO ───────────────
  const exportExcelAsesores = useCallback(() => {
    const fecha = new Date().toLocaleDateString('es-PE')
    const mesesLabel = mesesSel.size>0 ? [...mesesSel].map(m=>MESES[m]||m).join(' + ') : 'Todos los meses'
    const estadosLabel = estSel.has('TODOS') ? 'Todos' : [...estSel].join(' + ')

    // Fila de encabezado del reporte diario (igual al Excel subido)
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['REPORTE DIARIO DE INTERVENCIONES Y EMERGENCIAS - PNC'],
      ['', 'Fecha del reporte:', fecha, '', 'hrs'],
      ['', 'Responsable:', 'Coordinación Nacional de Maquinarias'],
      ['', 'Filtros aplicados:', `Estado: ${estadosLabel} | Meses: ${mesesLabel}`],
      [],
      ['', `${rows.length} Intervenciones del dia`],
      ['N°','DEPARTAMENTO','PROVINCIA','DISTRITO','SECTOR','TIPO','MARCO LEGAL','DESCRIPCION','FECHA INICIO','FECHA FIN','MAQUINARIA'],
      ...rows.map((r,i) => [
        i+1,
        r.dep,
        r.prov,
        r.dist || '',
        r.sector || '',
        r.tipo,
        r.marco || '',
        r.descripcion || '',
        r.f_ini || '',
        r.f_fin || '',
        r.maquinas.map(m=>`${m.tipo} ( ${m.cod})`).join(', ')
      ])
    ])

    // Estilos de columnas
    ws['!cols'] = [
      {wch:5},{wch:16},{wch:14},{wch:14},{wch:30},
      {wch:20},{wch:30},{wch:60},{wch:12},{wch:12},{wch:60}
    ]

    // Combinar celdas del encabezado
    ws['!merges'] = [
      {s:{r:0,c:0},e:{r:0,c:10}}, // Título principal
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
    XLSX.writeFile(wb, `Reporte_Intervenciones_Asesores_${new Date().toISOString().slice(0,10)}.xlsx`)
  }, [rows, estSel, mesesSel])

  const exportPDF = useCallback(() => {
    const fecha = new Date().toLocaleDateString('es-PE')
    const uboGroups = {}
    rows.forEach(r => { if (!uboGroups[r.ubo]) uboGroups[r.ubo]=[]; uboGroups[r.ubo].push(r) })
    const tbody = Object.entries(uboGroups).map(([ubo, rws]) =>
      '<tr><td colspan="10" style="background:#1F3864;color:#fff;padding:5px 8px;font-size:10px;font-weight:700">UBO: ' + ubo + ' — ' + rws.length + ' intervención' + (rws.length>1?'es':'') + '</td></tr>' +
      rws.map(r =>
        '<tr><td>' + (r.num||'—') + '</td><td>' + r.dep + '</td><td>' + r.prov + '</td><td>' + (r.dist||'—') + '</td>' +
        '<td>' + r.tipo + '</td>' +
        '<td style="font-weight:700;font-size:8px;color:' + (r.estado==='EJECUTADA'?'#0F6E56':r.estado.includes('EJEC')?'#854F0B':'#1F3864') + '">' + r.estado + '</td>' +
        '<td style="text-align:right;font-weight:700">' + (r.porc_vol!=null?r.porc_vol.toFixed(1)+'%':'—') + '</td>' +
        '<td>' + (r.f_ini||'—') + '</td><td>' + (r.f_fin||'—') + '</td>' +
        '<td style="font-size:8px">' + r.maquinas.map(m=>m.tipo+' ('+m.cod+')').join(', ').slice(0,60) + '</td></tr>'
      ).join('')
    ).join('')
    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
      'body{font-family:Segoe UI,sans-serif;font-size:9px;padding:14px}' +
      'h1{background:#1F3864;color:#fff;padding:10px 14px;border-radius:6px;font-size:13px;margin-bottom:8px}' +
      '.info{background:#EBF3FB;border-left:3px solid #2563EB;padding:4px 10px;margin-bottom:8px;font-size:8px;color:#1F3864}' +
      'table{width:100%;border-collapse:collapse}' +
      'th{background:#1F3864;color:#fff;padding:4px 5px;text-align:left;font-size:7px;text-transform:uppercase}' +
      'td{padding:4px 5px;border-bottom:1px solid #F1F5F9;vertical-align:top}' +
      'tr:nth-child(even) td{background:#F8FAFC}' +
      '@media print{@page{margin:1cm;size:A4 landscape}}' +
      '</style></head><body>' +
      '<h1>Estado de Intervenciones General — PNC Maquinarias</h1>' +
      '<div class="info">Total: ' + rows.length + ' · Estados: ' + [...estSel].join('+') + ' · ' + fecha + '</div>' +
      '<table><thead><tr><th>N°</th><th>Depto.</th><th>Provincia</th><th>Distrito</th><th>Tipo</th><th>Estado</th><th>Avance%</th><th>Inicio</th><th>Fin</th><th>Maquinaria</th></tr></thead>' +
      '<tbody>' + tbody + '</tbody></table>' +
      '<div style="margin-top:10px;font-size:8px;color:#aaa;text-align:right">Ministerio de Vivienda, Construcción y Saneamiento · Generado: ' + fecha + '</div>' +
      '</body></html>'
    const w = window.open('','_blank','width=1200,height=750')
    if (w) { w.document.write(html); w.document.close(); w.onload = () => { w.focus(); w.print() } }
  }, [rows, estSel])

  const sel = 'text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-800'

  return (
    <div className="p-3 sm:p-4">

      {/* Controles */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <input className="flex-1 min-w-[180px] text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-800"
          placeholder="Buscar N°, UBO, departamento, distrito, ficha..." value={busq} onChange={e=>setBusq(e.target.value)}/>
        <select className={sel} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
          {SORT_OPTS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <select className={sel} value={cierreFiltro} onChange={e=>setCierreFiltro(e.target.value)}>
          <option value="TODOS">Con y sin cierre</option>
          <option value="CON">✓ Con ficha cierre</option>
          <option value="SIN">✗ Sin ficha cierre</option>
        </select>
      </div>

      {/* Pills estado */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {ESTADOS.map(e=>(
          <button key={e} onClick={()=>toggleEst(e)}
            className={`px-2 py-0.5 rounded-full text-xs border transition-all ${estSel.has(e)?'bg-[#1F3864] text-white border-[#1F3864] font-bold':'bg-transparent text-slate-500 border-slate-300 hover:border-blue-400'}`}>
            {EST_LABELS[e]}
          </button>
        ))}
      </div>

      {/* Filtro multi-mes */}
      <div className="mb-3">
        <button onClick={()=>setShowMeses(!showMeses)}
          className="text-xs font-semibold text-blue-700 border border-blue-300 bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100">
          📅 Filtrar por mes {mesesSel.size>0?`(${mesesSel.size} seleccionados)`:''} {showMeses?'▲':'▼'}
        </button>
        {mesesSel.size>0 && (
          <button onClick={()=>setMesesSel(new Set())}
            className="ml-2 text-xs text-slate-500 hover:text-red-600">✕ Limpiar meses</button>
        )}
        {showMeses && (
          <div className="flex flex-wrap gap-1.5 mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
            {mesesDisp.map(m=>(
              <button key={m} onClick={()=>toggleMes(m)}
                className={`px-2 py-0.5 rounded-full text-xs border transition-all ${mesesSel.has(m)?'bg-[#CC1C2C] text-white border-[#CC1C2C] font-bold':'bg-white text-slate-600 border-slate-300 hover:border-red-400'}`}>
                {MESES[m]||m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filtro por rango de fechas */}
      <div className="mb-3 border border-slate-200 rounded-xl bg-slate-50 p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-[#1F3864]">📅 Filtrar por rango de fechas</span>
          {fechaFiltroActivo && (
            <button onClick={() => { setFechaDesde(''); setFechaHasta(''); setFechaFiltroActivo(false) }}
              className="ml-auto text-xs text-slate-500 hover:text-red-600 border border-slate-300 rounded px-2 py-0.5">
              ✕ Limpiar fechas
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-slate-500 font-medium">Fecha inicio</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-[#1F3864]"/>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-slate-500 font-medium">Fecha fin</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-[#1F3864]"/>
          </div>
          <button
            disabled={!fechaDesde || !fechaHasta}
            onClick={() => setFechaFiltroActivo(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1F3864] text-white hover:bg-[#2E5EAA] disabled:opacity-40 disabled:cursor-not-allowed">
            🔍 Aplicar
          </button>
        </div>

        {/* Resumen: 3 cards con contadores */}
        {fechaFiltroActivo && resumenFechas && (
          <div className="mt-3">
            <div className="text-[10px] text-slate-500 mb-1.5 font-medium">
              Período: {fechaDesde.split('-').reverse().join('/')} al {fechaHasta.split('-').reverse().join('/')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => { setEstSel(new Set(['EJECUTADA'])); setFechaFiltroActivo(true) }}
                className="bg-white border border-emerald-200 rounded-lg p-2 text-left hover:bg-emerald-50 transition-colors">
                <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-0.5">✓ Ejecutadas</div>
                <div className="text-2xl font-bold text-emerald-800 leading-none">{resumenFechas.ejecutadas.length}</div>
                <div className="text-[9px] text-slate-400 mt-0.5">por fecha fin</div>
              </button>
              <button onClick={() => { setEstSel(new Set(['EN EJECUCIÓN'])); setFechaFiltroActivo(true) }}
                className="bg-white border border-blue-200 rounded-lg p-2 text-left hover:bg-blue-50 transition-colors">
                <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-0.5">▶ En ejecución</div>
                <div className="text-2xl font-bold text-blue-800 leading-none">{resumenFechas.enEjecucion.length}</div>
                <div className="text-[9px] text-slate-400 mt-0.5">por fecha inicio</div>
              </button>
              <button onClick={() => { setEstSel(new Set(['PROGRAMADA'])); setFechaFiltroActivo(true) }}
                className="bg-white border border-amber-200 rounded-lg p-2 text-left hover:bg-amber-50 transition-colors">
                <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-0.5">◷ Programadas</div>
                <div className="text-2xl font-bold text-amber-800 leading-none">{resumenFechas.programadas.length}</div>
                <div className="text-[9px] text-slate-400 mt-0.5">por fecha inicio</div>
              </button>
            </div>
            <div className="mt-1.5 text-[9px] text-slate-400">
              💡 Clic en un estado para filtrar la tabla · Ejecutadas = fecha fin en rango · En ejecución/Programadas = fecha inicio en rango
            </div>
          </div>
        )}
      </div>

      {/* Botones export */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <div className="flex-1 bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-1.5">
          <span className="text-sm font-extrabold text-yellow-800">{rows.length.toLocaleString()} intervenciones</span>
          {!estSel.has('TODOS') && <span className="text-xs text-yellow-700 ml-2">· {[...estSel].join(' + ')}</span>}
          {mesesSel.size>0 && <span className="text-xs text-yellow-700 ml-2">· Meses: {[...mesesSel].map(m=>MESES[m]||m).join(', ')}</span>}
        </div>
        <button onClick={exportExcel}
          className="px-3 py-1 rounded-lg text-xs font-semibold border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
          ↓ Excel completo
        </button>
        <button onClick={exportExcelAsesores}
          className="px-3 py-1 rounded-lg text-xs font-semibold border border-[#1F3864] bg-blue-50 text-[#1F3864] hover:bg-blue-100">
          📋 Reporte Asesores Vice
        </button>
        <button onClick={exportPDF}
          className="px-3 py-1 rounded-lg text-xs font-semibold border border-red-600 bg-red-50 text-red-700 hover:bg-red-100">
          ↓ PDF
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs min-w-[1200px]">
          <thead className="bg-[#1F3864] sticky top-0">
            <tr>
              {['N°','UBO','Depto.','Provincia','Distrito','Tipo','Marco Legal','Estado','Avance%','M³ ejec.','Inicio','Fin','Ficha técnica','Cierre','Unidad / Maquinaria'].map(h=>(
                <th key={h} className="px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0,500).map((r,i)=>(
              <tr key={i} onClick={()=>setPanel(r)}
                className={`hover:bg-blue-50 cursor-pointer border-b border-slate-100 transition-colors ${i%2===0?'bg-white':'bg-slate-50'}`}>
                <td className="px-2 py-1.5 font-mono font-bold text-[#1F3864]">{r.num||'—'}</td>
                <td className="px-2 py-1.5 font-semibold">{r.ubo}</td>
                <td className="px-2 py-1.5">{r.dep}</td>
                <td className="px-2 py-1.5">{r.prov}</td>
                <td className="px-2 py-1.5 text-slate-600">{r.dist||'—'}</td>
                <td className="px-2 py-1.5">{r.tipo}</td>
                <td className="px-2 py-1.5 text-slate-400 max-w-[110px] truncate" title={r.marco}>{r.marco||'—'}</td>
                <td className="px-2 py-1.5"><Badge estado={r.estado}/></td>
                <td className={`px-2 py-1.5 font-bold ${r.porc_vol!=null&&r.porc_vol<20?'text-red-500':r.porc_vol!=null&&r.porc_vol>=100?'text-emerald-600':''}`}>
                  {r.porc_vol!=null?r.porc_vol.toFixed(1)+'%':'—'}
                </td>
                <td className="px-2 py-1.5">{r.m3!=null?fmt(r.m3):'—'}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.f_ini}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.f_fin}</td>
                <td className="px-2 py-1.5">
                  {r.enlace_ficha
                    ? <a href={r.enlace_ficha} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs" onClick={e=>e.stopPropagation()}>{r.ficha}</a>
                    : <span className="text-xs">{r.ficha||'—'}</span>}
                </td>
                <td className="px-2 py-1.5">
                  {r.tiene_cierre
                    ? <a href={r.enlace_cierre} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
                        className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold hover:bg-emerald-200">
                        ✓ {String(r.num_cierre).slice(0,12)}
                      </a>
                    : <span className="inline-block bg-red-50 text-red-500 text-xs px-2 py-0.5 rounded-full">Sin cierre</span>}
                </td>
                <td className="px-2 py-1.5"><MaqChips maquinas={r.maquinas}/></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-3 py-2 bg-slate-50 text-xs text-slate-400 border-t border-slate-200">
          {rows.length>500?`Mostrando 500 de ${rows.length.toLocaleString()}`:`Total: ${rows.length.toLocaleString()} registros`}
        </div>
      </div>

      {panel && <SidePanel row={panel} onClose={()=>setPanel(null)} EST_FICHA_LBL={EST_FICHA_LBL} EST_FICHA_COLS={EST_FICHA_COLS}/>}
    </div>
  )
}
