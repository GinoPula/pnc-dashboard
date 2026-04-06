import { useState, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Badge, MaqChips, SidePanel } from '../components'
import { fmt, badgeCls, EST_FICHA_LBL, EST_FICHA_COLS } from '../utils/data'

const ESTADOS = ['TODOS','PARALIZADA','EN EJECUCIÓN','EJECUTADA','PROGRAMADA','DESESTIMADA']
const EST_LABELS = {'TODOS':'Todos','PARALIZADA':'Paralizadas','EN EJECUCIÓN':'En ejecución','EJECUTADA':'Ejecutadas','PROGRAMADA':'Programadas','DESESTIMADA':'Desestimadas'}

export default function Detalle({ filtered, raw }) {
  const [estSel, setEstSel] = useState(new Set(['TODOS']))
  const [busq, setBusq] = useState('')
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
    if (!estSel.has('TODOS')) {
      r = r.filter(x => {
        if (estSel.has(x.estado)) return true
        if (estSel.has('PROGRAMADA') && x.estado_g === 'PROGRAMADA') return true
        if (estSel.has('EN EJECUCIÓN') && x.estado.normalize('NFC') === 'EN EJECUCIÓN') return true
        return false
      })
    }
    if (busq) {
      const q = busq.toLowerCase()
      r = r.filter(x => [x.num,x.ubo,x.dep,x.prov,x.tipo,x.estado,x.ficha,x.maq_str,x.marco].join(' ').toLowerCase().includes(q))
    }
    return r
  }, [filtered, estSel, busq])

  const exportExcel = useCallback(() => {
    const headers = ['N°','UBO','Departamento','Provincia','Tipo','Marco Legal','Estado','Avance%','M³ Ejec.','F. Inicio','F. Fin','Ficha Técnica','Unidad / Maquinaria']
    const data = rows.map(r => [r.num,r.ubo,r.dep,r.prov,r.tipo,r.marco,r.estado,r.porc_vol!=null?+r.porc_vol.toFixed(2):null,r.m3!=null?+r.m3.toFixed(2):null,r.f_ini,r.f_fin,r.ficha,r.maquinas.map(m=>`${m.tipo} (${m.cod})`).join(' | ')])
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([['REPORTE PNC MAQUINARIAS'],['Total: '+rows.length],[],headers,...data])
    ws['!cols'] = [{wch:6},{wch:14},{wch:16},{wch:14},{wch:16},{wch:28},{wch:22},{wch:10},{wch:14},{wch:12},{wch:12},{wch:28},{wch:50}]
    XLSX.utils.book_append_sheet(wb,ws,'Intervenciones')
    XLSX.writeFile(wb,`PNC_Intervenciones_${new Date().toISOString().slice(0,10)}.xlsx`)
  }, [rows])

  const exportPDF = useCallback(() => {
    const fecha = new Date().toLocaleDateString('es-PE')
    const uboGroups = {}
    rows.forEach(r => { if (!uboGroups[r.ubo]) uboGroups[r.ubo]=[]; uboGroups[r.ubo].push(r) })
    const tbody = Object.entries(uboGroups).map(([ubo,rws])=>`
      <tr><td colspan="10" style="background:#1F3864;color:#fff;padding:5px 8px;font-size:10px;font-weight:700">UBO: ${ubo} — ${rws.length} intervención${rws.length>1?'es':''}</td></tr>
      ${rws.map(r=>`<tr><td>${r.num}</td><td>${r.dep}</td><td>${r.prov}</td><td>${r.tipo}</td><td style="font-size:8px;color:#64748B">${r.marco?r.marco.slice(0,25):'—'}</td><td style="font-weight:700;color:${r.estado==='EJECUTADA'?'#0F6E56':r.estado.includes('EJEC')?'#854F0B':'#1F3864'};font-size:8px">${r.estado}</td><td style="text-align:right">${r.porc_vol!=null?r.porc_vol.toFixed(1)+'%':'—'}</td><td style="text-align:right">${r.m3!=null?r.m3.toLocaleString('es-PE',{maximumFractionDigits:0}):'—'}</td><td>${r.f_ini||'—'}</td><td style="font-size:8px">${r.maquinas.map(m=>m.tipo+' ('+m.cod+')').join(', ').slice(0,60)}</td></tr>`).join('')}
    `).join('')
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:'Segoe UI',sans-serif;font-size:9px;padding:14px}h1{background:#1F3864;color:#fff;padding:10px 14px;border-radius:6px;font-size:13px;margin-bottom:10px}.info{background:#EBF3FB;border-left:3px solid #2563EB;padding:4px 10px;margin-bottom:8px;font-size:8px}table{width:100%;border-collapse:collapse}th{background:#1F3864;color:#fff;padding:4px 5px;text-align:left;font-size:7px;text-transform:uppercase}td{padding:4px 5px;border-bottom:1px solid #F1F5F9;vertical-align:top}tr:nth-child(even) td{background:#F8FAFC}@media print{@page{margin:1cm;size:A4 landscape}}</style></head><body>
    <h1>Estado de Maquinarias — PNC · Módulo Mantenimiento</h1>
    <div class="info">Total: ${rows.length} registros · Filtros: ${[...estSel].join('+')} · Generado: ${fecha}</div>
    <table><thead><tr><th>N°</th><th>Depto.</th><th>Provincia</th><th>Tipo</th><th>Marco Legal</th><th>Estado</th><th>Avance%</th><th>M³</th><th>Inicio</th><th>Unidad / Maquinaria</th></tr></thead><tbody>${tbody}</tbody></table>
    </body></html>`
    const w=window.open('','_blank','width=1200,height=750'); w.document.write(html); w.document.close(); w.onload=()=>{w.focus();w.print()}
  }, [rows, estSel])

  return (
    <div className="p-4">
      {/* Controles */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <input className="flex-1 min-w-[200px] text-xs border border-slate-300 rounded-lg px-3 py-1.5 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
          placeholder="Buscar N°, UBO, departamento, ficha, marco legal..." value={busq} onChange={e=>setBusq(e.target.value)}/>
        <div className="flex flex-wrap gap-1">
          {ESTADOS.map(e=>(
            <button key={e} onClick={()=>toggleEst(e)}
              className={`px-2 py-0.5 rounded-full text-xs border transition-all ${estSel.has(e)?'bg-[#1F3864] text-white border-[#1F3864] font-bold':'bg-transparent text-slate-500 border-slate-300 hover:border-blue-400'}`}>
              {EST_LABELS[e]}
            </button>
          ))}
        </div>
        <button onClick={exportExcel} className="px-3 py-1 rounded-lg text-xs font-semibold border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">↓ Excel</button>
        <button onClick={exportPDF} className="px-3 py-1 rounded-lg text-xs font-semibold border border-red-600 bg-red-50 text-red-700 hover:bg-red-100">↓ PDF</button>
      </div>
      <p className="text-xs text-slate-400 mb-2">{rows.length.toLocaleString()} intervenciones · click en fila para detalle{!estSel.has('TODOS')?' · Filtro: '+[...estSel].join(' + '):''}</p>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-xs min-w-[1000px]">
          <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
            <tr>{['N°','UBO','Depto.','Provincia','Tipo','Marco Legal','Estado','Avance%','M³ ejec.','Inicio','Fin','Ficha técnica','Unidad / Maquinaria'].map(h=>(
              <th key={h} className="px-2 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap border-b border-slate-200">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.slice(0,500).map((r,i)=>(
              <tr key={i} onClick={()=>setPanel(r)} className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-700">
                <td className="px-2 py-1.5 font-mono">{r.num||'—'}</td>
                <td className="px-2 py-1.5 font-semibold">{r.ubo}</td>
                <td className="px-2 py-1.5">{r.dep}</td>
                <td className="px-2 py-1.5">{r.prov}</td>
                <td className="px-2 py-1.5">{r.tipo}</td>
                <td className="px-2 py-1.5 text-slate-400 max-w-[120px] truncate" title={r.marco}>{r.marco||'—'}</td>
                <td className="px-2 py-1.5"><Badge estado={r.estado}/></td>
                <td className={`px-2 py-1.5 font-bold ${r.porc_vol!=null&&r.porc_vol<20?'text-red-500':r.porc_vol!=null&&r.porc_vol>=100?'text-emerald-600':''}`}>{r.porc_vol!=null?r.porc_vol.toFixed(1)+'%':'—'}</td>
                <td className="px-2 py-1.5">{r.m3!=null?fmt(r.m3):'—'}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.f_ini}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{r.f_fin}</td>
                <td className="px-2 py-1.5">{r.enlace_ficha?<a href={r.enlace_ficha} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline" onClick={e=>e.stopPropagation()}>{r.ficha}</a>:r.ficha||'—'}</td>
                <td className="px-2 py-1.5"><MaqChips maquinas={r.maquinas}/></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs text-slate-400 border-t border-slate-200">
          {rows.length>500?`Mostrando 500 de ${rows.length.toLocaleString()} — aplica más filtros`:`Total: ${rows.length.toLocaleString()} registros`}
        </div>
      </div>
      {panel && <SidePanel row={panel} onClose={()=>setPanel(null)} EST_FICHA_LBL={EST_FICHA_LBL} EST_FICHA_COLS={EST_FICHA_COLS}/>}
    </div>
  )
}
