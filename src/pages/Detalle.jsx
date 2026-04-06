import { useState, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Badge, MaqChips, SidePanel } from '../components'
import { fmt, EST_FICHA_LBL, EST_FICHA_COLS } from '../utils/data'

const ESTADOS = ['TODOS','PARALIZADA','EN EJECUCIÓN','EJECUTADA','PROGRAMADA','DESESTIMADA']
const EST_LABELS = {'TODOS':'Todos','PARALIZADA':'Paralizadas','EN EJECUCIÓN':'En ejecución','EJECUTADA':'Ejecutadas','PROGRAMADA':'Programadas','DESESTIMADA':'Desestimadas'}
const SORT_OPTS = [
  {v:'',l:'Sin ordenar'},
  {v:'f_ini_asc',l:'Fecha inicio ↑'},
  {v:'f_ini_desc',l:'Fecha inicio ↓'},
  {v:'f_fin_asc',l:'Fecha fin ↑'},
  {v:'f_fin_desc',l:'Fecha fin ↓'},
  {v:'ultimo_av_desc',l:'Último avance ↓'},
  {v:'porc_vol_desc',l:'Avance % ↓'},
  {v:'porc_vol_asc',l:'Avance % ↑'},
]

export default function Detalle({ filtered, raw }) {
  const [estSel, setEstSel] = useState(new Set(['TODOS']))
  const [busq, setBusq] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [cierreFiltro, setCierreFiltro] = useState('TODOS') // TODOS | CON | SIN
  const [panel, setPanel] = useState(null)

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

  const rows = useMemo(() => {
    let r = filtered
    // Filtro estado múltiple
    if (!estSel.has('TODOS')) {
      r = r.filter(x => {
        if (estSel.has(x.estado)) return true
        if (estSel.has('PROGRAMADA') && x.estado_g === 'PROGRAMADA') return true
        if (estSel.has('EN EJECUCIÓN') && x.estado.normalize('NFC') === 'EN EJECUCIÓN') return true
        return false
      })
    }
    // Filtro ficha de cierre
    if (cierreFiltro === 'CON') r = r.filter(x => x.tiene_cierre)
    if (cierreFiltro === 'SIN') r = r.filter(x => !x.tiene_cierre)
    // Búsqueda
    if (busq) {
      const q = busq.toLowerCase()
      r = r.filter(x => [x.num,x.ubo,x.dep,x.prov,x.tipo,x.estado,x.ficha,x.maq_str,x.marco,x.num_cierre].join(' ').toLowerCase().includes(q))
    }
    // Ordenamiento
    if (sortBy) {
      const [field, dir] = sortBy.split('_asc').length > 1
        ? [sortBy.replace('_asc',''), 'asc']
        : [sortBy.replace('_desc',''), 'desc']
      r = [...r].sort((a, b) => {
        let va = a[field] || '', vb = b[field] || ''
        if (field === 'porc_vol') { va = a.porc_vol ?? -1; vb = b.porc_vol ?? -1; return dir==='asc' ? va-vb : vb-va }
        return dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
      })
    }
    return r
  }, [filtered, estSel, cierreFiltro, busq, sortBy])

  const exportExcel = useCallback(() => {
    const headers = ['N°','UBO','Departamento','Provincia','Tipo','Marco Legal','Estado','Avance%','M³ Ejec.','F. Inicio','F. Fin','Ficha Técnica','Enlace Ficha','Tiene Cierre','N° Cierre','Enlace Cierre','Unidad / Maquinaria']
    const data = rows.map(r => [
      r.num, r.ubo, r.dep, r.prov, r.tipo, r.marco, r.estado,
      r.porc_vol != null ? +r.porc_vol.toFixed(2) : null,
      r.m3 != null ? +r.m3.toFixed(2) : null,
      r.f_ini, r.f_fin, r.ficha, r.enlace_ficha,
      r.tiene_cierre ? 'SÍ' : 'NO',
      r.num_cierre, r.enlace_cierre,
      r.maquinas.map(m => `${m.tipo} (${m.cod})`).join(' | ')
    ])
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['REPORTE PNC MAQUINARIAS — ESTADO DE INTERVENCIONES'],
      [`Filtros: Estado=${[...estSel].join('+')} | Cierre=${cierreFiltro} | Total=${rows.length}`],
      [`Generado: ${new Date().toLocaleDateString('es-PE')}`], [],
      headers, ...data
    ])
    ws['!cols'] = [{wch:6},{wch:14},{wch:16},{wch:14},{wch:16},{wch:28},{wch:22},{wch:10},{wch:14},{wch:12},{wch:12},{wch:32},{wch:50},{wch:8},{wch:18},{wch:50},{wch:50}]
    XLSX.utils.book_append_sheet(wb, ws, 'Intervenciones')
    XLSX.writeFile(wb, `PNC_Intervenciones_${new Date().toISOString().slice(0,10)}.xlsx`)
  }, [rows, estSel, cierreFiltro])

  const exportPDF = useCallback(() => {
    const fecha = new Date().toLocaleDateString('es-PE')
    const uboGroups = {}
    rows.forEach(r => { if (!uboGroups[r.ubo]) uboGroups[r.ubo]=[]; uboGroups[r.ubo].push(r) })
    const tbody = Object.entries(uboGroups).map(([ubo, rws]) => `
      <tr><td colspan="11" style="background:#1F3864;color:#fff;padding:5px 8px;font-size:10px;font-weight:700">UBO: ${ubo} — ${rws.length} intervención${rws.length>1?'es':''}</td></tr>
      ${rws.map(r => {
        const avColor = r.porc_vol<20?'#EF4444':r.porc_vol>=100?'#10B981':'inherit'
        const cierreCell = r.tiene_cierre
          ? `<span style="color:#0F6E56;font-weight:700">✓ ${r.num_cierre}</span>`
          : '<span style="color:#A32D2D">Sin cierre</span>'
        return `<tr>
          <td>${r.num||'—'}</td><td>${r.dep}</td><td>${r.prov}</td>
          <td>${r.tipo}</td>
          <td style="font-size:8px;color:#64748B">${r.marco?r.marco.slice(0,20):'—'}</td>
          <td style="font-weight:700;font-size:8px;color:${r.estado==='EJECUTADA'?'#0F6E56':r.estado.includes('EJEC')?'#854F0B':'#1F3864'}">${r.estado}</td>
          <td style="text-align:right;color:${avColor};font-weight:700">${r.porc_vol!=null?r.porc_vol.toFixed(1)+'%':'—'}</td>
          <td style="text-align:right">${r.m3!=null?r.m3.toLocaleString('es-PE',{maximumFractionDigits:0}):'—'}</td>
          <td>${r.f_ini||'—'}</td>
          <td style="font-size:8px">${r.maquinas.map(m=>m.tipo+' ('+m.cod+')').join(', ').slice(0,50)}</td>
          <td style="font-size:8px">${cierreCell}</td>
        </tr>`
      }).join('')}
    `).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:'Segoe UI',sans-serif;font-size:9px;padding:14px}
      h1{background:#1F3864;color:#fff;padding:10px 14px;border-radius:6px;font-size:13px;margin-bottom:8px}
      .info{background:#EBF3FB;border-left:3px solid #2563EB;padding:4px 10px;margin-bottom:8px;font-size:8px;color:#1F3864}
      table{width:100%;border-collapse:collapse}
      th{background:#1F3864;color:#fff;padding:4px 5px;text-align:left;font-size:7px;text-transform:uppercase}
      td{padding:4px 5px;border-bottom:1px solid #F1F5F9;vertical-align:top}
      tr:nth-child(even) td{background:#F8FAFC}
      @media print{@page{margin:1cm;size:A4 landscape}}
    </style></head><body>
    <h1>Estado de Maquinarias — PNC · Módulo Mantenimiento</h1>
    <div class="info">Total: ${rows.length} · Estados: ${[...estSel].join('+')} · Cierre: ${cierreFiltro} · ${fecha}</div>
    <table><thead><tr><th>N°</th><th>Depto.</th><th>Provincia</th><th>Tipo</th><th>Marco Legal</th><th>Estado</th><th>Avance%</th><th>M³</th><th>Inicio</th><th>Maquinaria</th><th>Ficha Cierre</th></tr></thead>
    <tbody>${tbody}</tbody></table>
    <div class="footer-mvcs"><span>Ministerio de Vivienda, Construcción y Saneamiento · MVCS</span><span>Elaborado por: Ing. Gino Pulache · Plataforma Web PNC Maquinarias v1.0</span><span>Generado: ${fecha}</span></div>
    </body></html>`
    const w = window.open('','_blank','width=1200,height=750')
    w.document.write(html); w.document.close()
    w.onload = () => { w.focus(); w.print() }
  }, [rows, estSel, cierreFiltro])

  const sel = 'text-xs border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 dark:text-slate-200'

  return (
    <div className="p-3 sm:p-4">
      {/* Controles */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <input className="flex-1 min-w-[180px] text-xs border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 dark:bg-slate-800 dark:text-slate-200"
          placeholder="Buscar N°, UBO, departamento, ficha..." value={busq} onChange={e=>setBusq(e.target.value)}/>
        <select className={sel} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
          {SORT_OPTS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <select className={sel} value={cierreFiltro} onChange={e=>setCierreFiltro(e.target.value)}>
          <option value="TODOS">Con y sin cierre</option>
          <option value="CON">✓ Con ficha de cierre</option>
          <option value="SIN">✗ Sin ficha de cierre</option>
        </select>
      </div>
      {/* Pills estado */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {ESTADOS.map(e=>(
          <button key={e} onClick={()=>toggleEst(e)}
            className={`px-2 py-0.5 rounded-full text-xs border transition-all ${estSel.has(e)?'bg-[#1F3864] text-white border-[#1F3864] font-bold':'bg-transparent text-slate-500 border-slate-300 hover:border-blue-400'}`}>
            {EST_LABELS[e]}
          </button>
        ))}
        <button onClick={exportExcel} className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">↓ Excel</button>
        <button onClick={exportPDF} className="px-3 py-1 rounded-lg text-xs font-semibold border border-red-600 bg-red-50 text-red-700 hover:bg-red-100">↓ PDF</button>
      </div>
      <p className="text-xs text-slate-400 mb-2">
        {rows.length.toLocaleString()} intervenciones
        {!estSel.has('TODOS') && ` · ${[...estSel].join(' + ')}`}
        {cierreFiltro !== 'TODOS' && ` · ${cierreFiltro === 'CON' ? '✓ Con ficha cierre' : '✗ Sin ficha cierre'}`}
        {' · click en fila para detalle'}
      </p>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-xs min-w-[1100px]">
          <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
            <tr>{['N°','UBO','Depto.','Provincia','Tipo','Marco Legal','Estado','Avance%','M³ ejec.','Inicio','Fin','Ficha técnica','Cierre','Unidad / Maquinaria'].map(h=>(
              <th key={h} className="px-2 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap border-b border-slate-200 dark:border-slate-700">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.slice(0,500).map((r,i)=>(
              <tr key={i} onClick={()=>setPanel(r)} className="hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-700 transition-colors">
                <td className="px-2 py-1.5 font-mono font-bold text-[#1F3864]">{r.num||'—'}</td>
                <td className="px-2 py-1.5 font-semibold">{r.ubo}</td>
                <td className="px-2 py-1.5">{r.dep}</td>
                <td className="px-2 py-1.5">{r.prov}</td>
                <td className="px-2 py-1.5">{r.tipo}</td>
                <td className="px-2 py-1.5 text-slate-400 max-w-[110px] truncate" title={r.marco}>{r.marco||'—'}</td>
                <td className="px-2 py-1.5"><Badge estado={r.estado}/></td>
                <td className={`px-2 py-1.5 font-bold ${r.porc_vol!=null&&r.porc_vol<20?'text-red-500':r.porc_vol!=null&&r.porc_vol>=100?'text-emerald-600':''}`}>{r.porc_vol!=null?r.porc_vol.toFixed(1)+'%':'—'}</td>
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
                    ? <a href={r.enlace_cierre} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold hover:bg-emerald-200">✓ {r.num_cierre.toString().slice(0,12)}</a>
                    : <span className="inline-block bg-red-50 text-red-500 text-xs px-2 py-0.5 rounded-full">Sin cierre</span>}
                </td>
                <td className="px-2 py-1.5"><MaqChips maquinas={r.maquinas}/></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs text-slate-400 border-t border-slate-200">
          {rows.length>500?`Mostrando 500 de ${rows.length.toLocaleString()}`:`Total: ${rows.length.toLocaleString()} registros`}
        </div>
      </div>
      {panel && <SidePanel row={panel} onClose={()=>setPanel(null)} EST_FICHA_LBL={EST_FICHA_LBL} EST_FICHA_COLS={EST_FICHA_COLS}/>}
    </div>
  )
}
