import { useState, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Badge, MaqChips, SidePanel } from '../components'
import { ACT_LABELS_DIST, EST_FICHA_LBL, EST_FICHA_COLS, fmt } from '../utils/data'

export default function Distribucion({ filtered, inventario, raw }) {
  const [uboSel, setUboSel] = useState('TODOS')
  const [estSel, setEstSel] = useState('EN EJECUCIÓN')
  const [panel, setPanel] = useState(null)

  const ubosDisp = useMemo(() => {
    return [...new Set([
      ...filtered.map(r => r.ubo),
      ...inventario.map(e => e.ubo)
    ].filter(Boolean))].sort()
  }, [filtered, inventario])

  // Intervenciones activas con maquinaria
  const interv = useMemo(() => {
    return filtered.filter(r => {
      const enEjec = r.estado.normalize('NFC') === 'EN EJECUCIÓN'
      const estOk = estSel === 'EN EJECUCIÓN' ? enEjec : (enEjec || r.estado_g === 'PROGRAMADA')
      if (!estOk || !r.maquinas || r.maquinas.length === 0) return false
      if (uboSel !== 'TODOS' && r.ubo !== uboSel) return false
      return true
    })
  }, [filtered, estSel, uboSel])

  // Códigos en uso
  const codEnUso = useMemo(() => {
    const s = new Set()
    filtered
      .filter(r => r.estado.normalize('NFC') === 'EN EJECUCIÓN' || r.estado_g === 'PROGRAMADA')
      .forEach(r => r.maquinas.forEach(m => s.add(m.cod)))
    return s
  }, [filtered])

  // Inventario disponible
  const invDisp = useMemo(() => {
    return inventario.filter(e => {
      if (codEnUso.has(e.codigo)) return false
      const uboEfectivo = uboSel !== 'TODOS' ? uboSel : 'TODOS'
      if (uboEfectivo !== 'TODOS' && e.ubo !== uboEfectivo) return false
      return true
    })
  }, [inventario, codEnUso, uboSel])

  // KPIs
  const totalEnUso = interv.reduce((a, r) => a + r.maquinas.length, 0)
  const mpUso = interv.reduce((a, r) => a + r.maquinas.filter(m => /EXCAVADORA|TRACTOR|CARGADOR|RETROEXCAVADORA|MOTONIVELADORA|RODILLO/i.test(m.tipo)).length, 0)
  const vpUso = totalEnUso - mpUso
  const totalMP = invDisp.filter(e => e.clasificacion === 'MP').length
  const totalVP = invDisp.filter(e => e.clasificacion === 'VP').length

  const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

  // Export Excel
  const exportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new()
    const allUBOs = uboSel !== 'TODOS' ? [uboSel] : ubosDisp

    const buildSheet = (uboName, intervRows, invRows) => {
      const headers1 = ['LUGAR_INTERVENCION', 'ACTIVIDAD', 'MAQUINA_VEHICULO', 'FECHA_INICIO', 'FECHA_FIN', 'CONDICION', 'OBSERVACION']
      const rows1 = intervRows.map(r => [
        [r.dep, r.prov, r.dist].filter(Boolean).join(', '),
        ACT_LABELS_DIST[r.cod_act] || r.cod_act || '',
        r.maquinas.map(m => `${m.tipo} ( ${m.cod} )`).join(', '),
        r.f_ini, r.f_fin, 'OPERATIVO', r.obs || ''
      ])
      const rows2 = invRows.map(e => ['Ubicados en la UBO', `${e.tipo_unidad}(${e.codigo})`, 'OPERATIVO', ''])
      const mpD = invRows.filter(e => e.clasificacion === 'MP').length
      const vpD = invRows.filter(e => e.clasificacion === 'VP').length
      return [
        [`DISTRIBUCIÓN DE MAQUINARIA EN ${uboName} - ${fecha} ${hora}`], [[]],
        headers1, ...rows1, [[]],
        ['Recursos para atención en intervenciones:'],
        ['Ubicados en la UBO', 'MAQUINA_VEHICULO', 'CONDICION', 'OBSERVACION'],
        ...rows2,
        ['Total de máquinas y vehículos', invRows.length, `${mpD} Máquinas`, `${vpD} Vehículos`]
      ]
    }

    // Hoja GENERAL
    const genSheet = XLSX.utils.aoa_to_sheet(buildSheet(uboSel === 'TODOS' ? 'GENERAL' : uboSel, interv, invDisp))
    genSheet['!cols'] = [{wch:30},{wch:32},{wch:45},{wch:14},{wch:14},{wch:12},{wch:45}]
    XLSX.utils.book_append_sheet(wb, genSheet, 'GENERAL')

    // Hoja por UBO
    allUBOs.forEach(ubo => {
      const uboInterv = interv.filter(r => r.ubo === ubo)
      const uboInv = invDisp.filter(e => e.ubo === ubo)
      if (!uboInterv.length && !uboInv.length) return
      const ws = XLSX.utils.aoa_to_sheet(buildSheet(ubo, uboInterv, uboInv))
      ws['!cols'] = [{wch:30},{wch:32},{wch:45},{wch:14},{wch:14},{wch:12},{wch:45}]
      XLSX.utils.book_append_sheet(wb, ws, ubo.slice(0, 28))
    })

    XLSX.writeFile(wb, `PNC_Distribucion_${new Date().toISOString().slice(0,10)}.xlsx`)
  }, [interv, invDisp, uboSel, ubosDisp, fecha, hora])

  const sel = 'text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-white dark:bg-slate-800 dark:border-slate-600'

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1F3864] dark:text-blue-300">
            Distribución de Maquinaria {uboSel !== 'TODOS' ? `— ${uboSel}` : ''} · {fecha}
          </h2>
          <p className="text-xs text-slate-500">
            {estSel === 'EN EJECUCIÓN' ? 'Solo intervenciones en ejecución' : 'En ejecución + Programadas'} + Recursos disponibles por UBO
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select className={sel} value={uboSel} onChange={e => setUboSel(e.target.value)}>
            <option value="TODOS">Todos los UBOs</option>
            {ubosDisp.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select className={sel} value={estSel} onChange={e => setEstSel(e.target.value)}>
            <option value="EN EJECUCIÓN">Solo En ejecución</option>
            <option value="ACTIVAS">En ejecución + Programadas</option>
          </select>
          <button onClick={exportExcel} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 whitespace-nowrap">
            ↓ Excel (General + por UBO)
          </button>
        </div>
      </div>

      {/* KPIs */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-3">📂</div>
          <div className="text-sm font-semibold">Carga tu archivo Excel para ver la distribución</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              {l:'Intervenciones activas',v:interv.length,s:'con maquinaria',c:'amber'},
              {l:'Total unidades en uso',v:totalEnUso,s:'asignadas',c:'purple'},
              {l:'MP en operación',v:mpUso,s:'maquinaria pesada',c:'amber'},
              {l:'VP en operación',v:vpUso,s:'vehículos pesados',c:'blue'},
              {l:'Disponibles en UBO',v:invDisp.length,s:`${totalMP} MP · ${totalVP} VP`,c:'teal'},
            ].map(({l,v,s,c})=>(
              <div key={l} className={`bg-white dark:bg-slate-800 border border-slate-200 rounded-xl p-3 border-t-4 border-t-${c}-500`}>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{l}</div>
                <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{v}</div>
                <div className="text-xs text-slate-400 mt-0.5">{s}</div>
              </div>
            ))}
          </div>

          {/* Sección 1 */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                {estSel === 'EN EJECUCIÓN' ? 'Intervenciones en ejecución con maquinaria' : 'Intervenciones activas con maquinaria'}
              </span>
              <span className="text-xs text-slate-400 ml-auto">{interv.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[800px]">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>{['UBO','Lugar de intervención','Actividad','Máquina / Vehículo','F. Inicio','F. Fin','Estado','Condición','Observación'].map(h=>(
                    <th key={h} className="px-2 py-2 text-left font-bold text-slate-500 text-xs uppercase border-b border-slate-200 whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {interv.slice(0,300).map((r,i)=>(
                    <tr key={i} onClick={()=>setPanel(r)} className="hover:bg-slate-50 cursor-pointer border-b border-slate-100">
                      <td className="px-2 py-2 font-semibold text-[#1F3864]">{r.ubo}</td>
                      <td className="px-2 py-2 uppercase text-slate-600">{[r.dep,r.prov,r.dist].filter(Boolean).join(', ')}</td>
                      <td className="px-2 py-2 font-semibold">{ACT_LABELS_DIST[r.cod_act]||r.cod_act||'—'}</td>
                      <td className="px-2 py-2"><MaqChips maquinas={r.maquinas}/></td>
                      <td className="px-2 py-2 whitespace-nowrap">{r.f_ini||'—'}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{r.f_fin||'—'}</td>
                      <td className="px-2 py-2"><Badge estado={r.estado}/></td>
                      <td className="px-2 py-2"><span className="inline-block bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">OPERATIVO</span></td>
                      <td className="px-2 py-2 text-slate-400 max-w-[140px] truncate">{r.obs||''}</td>
                    </tr>
                  ))}
                  {!interv.length && (
                    <tr><td colSpan={9} className="text-center py-8 text-slate-400">Sin intervenciones activas con maquinaria para este filtro</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sección 2 */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Recursos ubicados en la UBO (disponibles)</span>
              <span className="text-xs text-slate-400 ml-auto">{invDisp.length} unidades · {totalMP} MP · {totalVP} VP</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[600px]">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>{['UBO','Máquina / Vehículo','Clasificación','Marca','Condición','Observación'].map(h=>(
                    <th key={h} className="px-2 py-2 text-left font-bold text-slate-500 text-xs uppercase border-b border-slate-200">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {invDisp.slice(0,300).map((e,i)=>(
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-2 py-2 font-semibold">{e.ubo}</td>
                      <td className="px-2 py-2"><span className="inline-block bg-purple-50 border border-purple-200 text-purple-800 rounded text-xs px-2 py-0.5 font-medium">{e.tipo_unidad} <span className="text-purple-400">{e.codigo}</span></span></td>
                      <td className="px-2 py-2"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${e.clasificacion==='MP'?'bg-amber-100 text-amber-800':'bg-blue-100 text-blue-800'}`}>{e.clasificacion}</span></td>
                      <td className="px-2 py-2 text-slate-500">{e.marca}</td>
                      <td className="px-2 py-2"><span className="inline-block bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">OPERATIVO</span></td>
                      <td className="px-2 py-2"></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-700">
                    <td colSpan={2} className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">Total de máquinas y vehículos</td>
                    <td className="px-3 py-2 font-bold text-center">{invDisp.length}</td>
                    <td className="px-3 py-2 font-bold text-amber-700">{totalMP} Máquinas (MP)</td>
                    <td className="px-3 py-2 font-bold text-blue-700">{totalVP} Vehículos (VP)</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
      {panel && <SidePanel row={panel} onClose={()=>setPanel(null)} EST_FICHA_LBL={EST_FICHA_LBL} EST_FICHA_COLS={EST_FICHA_COLS}/>}
    </div>
  )
}
