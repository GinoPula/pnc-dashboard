import { useState, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'

const VP_OPERACION = ['VOLQUETE', 'CAMION CISTERNA DE AGUA']

// Datos de mantenimiento simulados (en producción vendrían del Excel o API)
// Por ahora usamos los datos del Excel de Estado Maquinarias

export default function GestionActivos({ inventario, raw }) {
  const [busq, setBusq]         = useState('')
  const [uboSel, setUboSel]     = useState('TODOS')
  const [flotaSel, setFlotaSel] = useState('TODOS')
  const [estOpSel, setEstOpSel] = useState('TODOS')
  const [activoSel, setActivoSel] = useState(null)
  const [tabActivo, setTabActivo] = useState('historial')

  const ubos = useMemo(() => [...new Set(inventario.map(e=>e.ubo).filter(Boolean))].sort(), [inventario])

  // Solo los 353 operacionales
  const activos353 = useMemo(() => {
    return inventario.filter(e =>
      e.clasificacion === 'MP' ||
      (e.clasificacion === 'VP' && VP_OPERACION.includes(e.tipo_unidad))
    )
  }, [inventario])

  // Filtrado
  const lista = useMemo(() => {
    let r = activos353
    if (uboSel !== 'TODOS') r = r.filter(e => e.ubo === uboSel)
    if (flotaSel !== 'TODOS') r = r.filter(e => e.clasificacion === flotaSel)
    if (estOpSel !== 'TODOS') r = r.filter(e => e.estado_maq === estOpSel)
    if (busq) {
      const q = busq.toLowerCase()
      r = r.filter(e => [e.codigo,e.tipo_unidad,e.marca,e.modelo,e.ubo,e.comentario].join(' ').toLowerCase().includes(q))
    }
    return r
  }, [activos353, uboSel, flotaSel, estOpSel, busq])

  // Historial de intervenciones de un activo
  const getHistorial = useCallback((codigo) => {
    if (!raw?.length) return []
    return raw.filter(r => r.maquinas?.some(m => m.cod === codigo))
      .sort((a,b) => {
        const pa = d => { if(!d)return new Date(0); const m=d.match(/(\d{2})\/(\d{2})\/(\d{4})/); return m?new Date(+m[3],+m[2]-1,+m[1]):new Date(0) }
        return pa(b.f_ini) - pa(a.f_ini)
      })
  }, [raw])

  // Export Excel del listado
  const exportExcel = useCallback(() => {
    const headers = ['Código','Clasificación','Tipo','Marca','Modelo','Año','UBO','Operatividad','Horómetro','Kilometraje','Intervenciones','Comentario Mantenimiento']
    const data = lista.map(e => [
      e.codigo, e.clasificacion, e.tipo_unidad, e.marca, e.modelo, e.anio_fab,
      e.ubo, e.estado_maq, e.horometro, e.kilometraje,
      (e.fichas_intervencion||[]).length, e.comentario
    ])
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['GESTIÓN DE ACTIVOS PNC MAQUINARIAS'],
      [`UBO: ${uboSel} | Flota: ${flotaSel} | Total: ${lista.length}`],
      [`Generado: ${new Date().toLocaleDateString('es-PE')}`], [],
      headers, ...data
    ])
    ws['!cols'] = [{wch:12},{wch:12},{wch:24},{wch:16},{wch:14},{wch:6},{wch:14},{wch:12},{wch:12},{wch:14},{wch:12},{wch:40}]
    XLSX.utils.book_append_sheet(wb, ws, 'Activos')
    XLSX.writeFile(wb, `PNC_GestionActivos_${new Date().toISOString().slice(0,10)}.xlsx`)
  }, [lista, uboSel, flotaSel])

  const sel = 'text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-[#1F3864]'
  const tabBtn = (id) => `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${tabActivo===id?'bg-[#1F3864] text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`

  // Stats
  const opCount   = activos353.filter(e=>e.estado_maq==='OPERATIVO').length
  const inopCount = activos353.filter(e=>e.estado_maq==='INOPERATIVO').length
  const conInt    = activos353.filter(e=>(e.fichas_intervencion||[]).length>0).length

  return (
    <div className="p-3 sm:p-4 space-y-4">

      {/* Header */}
      <div>
        <h2 className="text-lg font-extrabold text-[#1F3864]">📋 Gestión de Activos</h2>
        <p className="text-xs text-slate-500">Historial, operatividad y mantenimiento de los 353 equipos operacionales</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {l:'Total Operacional', v:activos353.length, c:'text-[#1F3864]', b:'border-t-blue-600'},
          {l:'Operativos',        v:opCount,   c:'text-emerald-700', b:'border-t-emerald-500'},
          {l:'Inoperativos',      v:inopCount, c:'text-red-700',     b:'border-t-red-500'},
          {l:'Con intervención',  v:conInt,    c:'text-purple-700',  b:'border-t-purple-500'},
        ].map(({l,v,c,b}) => (
          <div key={l} className={`bg-white border border-slate-200 border-t-4 ${b} rounded-xl p-3 shadow-sm`}>
            <div className={`text-2xl font-extrabold ${c}`}>{v}</div>
            <div className="text-xs text-slate-400 mt-1">{l}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center bg-white border border-slate-200 rounded-xl p-3">
        <input className="flex-1 min-w-[200px] text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-[#1F3864]"
          placeholder="🔍 Código, tipo, marca, UBO..."
          value={busq} onChange={e=>setBusq(e.target.value)}/>
        <select className={sel} value={uboSel} onChange={e=>setUboSel(e.target.value)}>
          <option value="TODOS">Todas las UBOs</option>
          {ubos.map(u=><option key={u} value={u}>{u}</option>)}
        </select>
        <select className={sel} value={flotaSel} onChange={e=>setFlotaSel(e.target.value)}>
          <option value="TODOS">MP + VP</option>
          <option value="MP">Solo MP</option>
          <option value="VP">Solo VP</option>
        </select>
        <select className={sel} value={estOpSel} onChange={e=>setEstOpSel(e.target.value)}>
          <option value="TODOS">Todos</option>
          <option value="OPERATIVO">Operativos</option>
          <option value="INOPERATIVO">Inoperativos</option>
        </select>
        <span className="text-xs text-slate-400">{lista.length} activos</span>
        <button onClick={exportExcel}
          className="ml-auto px-3 py-1.5 text-xs font-semibold border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg">
          ↓ Excel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Lista de activos */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase">
            Equipos ({lista.length})
          </div>
          <div className="overflow-y-auto" style={{maxHeight:'600px'}}>
            {lista.map((e,i) => {
              const esOp = e.estado_maq === 'OPERATIVO'
              const numInt = (e.fichas_intervencion||[]).length
              const sel = activoSel?.codigo === e.codigo
              return (
                <div key={i}
                  onClick={() => { setActivoSel(e); setTabActivo('historial') }}
                  className={`px-3 py-2.5 border-b border-slate-100 cursor-pointer transition-colors ${sel?'bg-blue-50 border-l-4 border-l-[#1F3864]':'hover:bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-mono font-bold text-xs text-[#1F3864]">{e.codigo}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${esOp?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>
                      {esOp?'✓ OP':'✗ INOP'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 truncate">{e.tipo_unidad}</div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-slate-400">{e.ubo}</span>
                    {numInt > 0 && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 rounded-full">
                        {numInt} int.
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            {lista.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">Sin resultados</div>
            )}
          </div>
        </div>

        {/* Detalle del activo */}
        <div className="lg:col-span-2">
          {!activoSel ? (
            <div className="bg-white border border-slate-200 rounded-xl h-full flex items-center justify-center text-slate-400">
              <div className="text-center p-8">
                <div className="text-4xl mb-2">🚜</div>
                <p className="text-sm">Selecciona un equipo para ver su ficha</p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

              {/* Header del activo */}
              <div className="bg-[#1F3864] px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-white font-extrabold text-base">{activoSel.codigo}</div>
                    <div className="text-blue-300 text-xs mt-0.5">{activoSel.tipo_unidad} · {activoSel.marca} {activoSel.modelo} ({activoSel.anio_fab})</div>
                    <div className="text-blue-200 text-xs mt-0.5">UBO: {activoSel.ubo} · Flota: {activoSel.clasificacion}</div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${activoSel.estado_maq==='OPERATIVO'?'bg-emerald-500 text-white':'bg-red-500 text-white'}`}>
                    {activoSel.estado_maq==='OPERATIVO'?'✓ OPERATIVO':'✗ INOPERATIVO'}
                  </span>
                </div>

                {/* Métricas rápidas */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    {l:'Horómetro', v:activoSel.horometro||'—'},
                    {l:'Kilometraje', v:activoSel.kilometraje||'—'},
                    {l:'Intervenciones', v:(activoSel.fichas_intervencion||[]).length},
                  ].map(({l,v}) => (
                    <div key={l} className="bg-white/10 rounded-lg px-3 py-2 text-center">
                      <div className="text-white font-bold text-sm">{v}</div>
                      <div className="text-blue-300 text-xs">{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 p-3 border-b border-slate-200 bg-slate-50">
                <button className={tabBtn('historial')} onClick={()=>setTabActivo('historial')}>📋 Historial</button>
                <button className={tabBtn('operatividad')} onClick={()=>setTabActivo('operatividad')}>🔧 Operatividad</button>
                <button className={tabBtn('programacion')} onClick={()=>setTabActivo('programacion')}>📅 Programación</button>
              </div>

              {/* Contenido tabs */}
              <div className="p-4 overflow-y-auto" style={{maxHeight:'420px'}}>

                {/* Tab Historial */}
                {tabActivo === 'historial' && (() => {
                  const hist = getHistorial(activoSel.codigo)
                  return hist.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 mb-3">{hist.length} intervenciones registradas</p>
                      {hist.map((r,i) => (
                        <div key={i} className={`border rounded-xl p-3 ${r.estado==='EJECUTADA'?'border-emerald-200 bg-emerald-50':r.estado?.normalize('NFC')==='EN EJECUCIÓN'?'border-amber-200 bg-amber-50':'border-slate-200 bg-slate-50'}`}>
                          <div className="flex items-start justify-between mb-1">
                            <span className="font-bold text-xs text-[#1F3864]">N°{r.num} · {r.ficha}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.estado==='EJECUTADA'?'bg-emerald-200 text-emerald-800':r.estado?.normalize('NFC')==='EN EJECUCIÓN'?'bg-amber-200 text-amber-800':'bg-slate-200 text-slate-700'}`}>
                              {r.estado}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mb-1">{r.ubo} · {r.dep} · {r.prov}</div>
                          <div className="text-xs text-slate-500">{r.tipo}</div>
                          <div className="flex gap-3 mt-1 text-xs text-slate-400">
                            <span>📅 {r.f_ini||'—'} → {r.f_fin||'—'}</span>
                            {r.porc_vol!=null && <span>📊 {r.porc_vol.toFixed(1)}%</span>}
                            {r.m3!=null && <span>📦 {r.m3.toLocaleString('es-PE')} m³</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <div className="text-3xl mb-2">📭</div>
                      <p className="text-sm">Sin intervenciones registradas</p>
                      <p className="text-xs mt-1">Equipo disponible para asignación</p>
                    </div>
                  )
                })()}

                {/* Tab Operatividad */}
                {tabActivo === 'operatividad' && (
                  <div className="space-y-4">
                    <div className={`rounded-xl p-4 ${activoSel.estado_maq==='OPERATIVO'?'bg-emerald-50 border border-emerald-200':'bg-red-50 border border-red-200'}`}>
                      <div className={`text-lg font-extrabold ${activoSel.estado_maq==='OPERATIVO'?'text-emerald-700':'text-red-700'}`}>
                        {activoSel.estado_maq==='OPERATIVO'?'✓ OPERATIVO':'✗ INOPERATIVO'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Estado registrado en el sistema MAIN</div>
                    </div>

                    {activoSel.comentario && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                          💬 Comentario de Mantenimiento
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{activoSel.comentario}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                        <div className="text-xl font-extrabold text-amber-700">{activoSel.horometro||'—'}</div>
                        <div className="text-xs text-amber-600 mt-1">Horómetro (hrs)</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                        <div className="text-xl font-extrabold text-blue-700">{activoSel.kilometraje||'—'}</div>
                        <div className="text-xs text-blue-600 mt-1">Kilometraje</div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Datos del equipo</div>
                      {[
                        ['Código',          activoSel.codigo],
                        ['Tipo de unidad',  activoSel.tipo_unidad],
                        ['Marca / Modelo',  `${activoSel.marca} ${activoSel.modelo}`],
                        ['Año fabricación', activoSel.anio_fab||'—'],
                        ['UBO / Región',    activoSel.ubo],
                        ['Clasificación',   activoSel.clasificacion],
                        ['Última actualización', activoSel.fecha_registro||'—'],
                      ].map(([l,v]) => (
                        <div key={l} className="flex gap-2 mb-1.5">
                          <span className="text-xs text-slate-400 min-w-[130px]">{l}</span>
                          <span className="text-xs text-slate-700 font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab Programación */}
                {tabActivo === 'programacion' && (() => {
                  const prog = getHistorial(activoSel.codigo).filter(r => r.estado_g === 'PROGRAMADA')
                  const enEj = getHistorial(activoSel.codigo).filter(r => r.estado?.normalize('NFC') === 'EN EJECUCIÓN')
                  return (
                    <div className="space-y-4">
                      {enEj.length > 0 && (
                        <div>
                          <div className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">
                            🔄 En Ejecución ({enEj.length})
                          </div>
                          {enEj.map((r,i) => (
                            <div key={i} className="border border-amber-200 bg-amber-50 rounded-xl p-3 mb-2">
                              <div className="font-bold text-xs text-[#1F3864]">N°{r.num} · {r.ficha}</div>
                              <div className="text-xs text-slate-600 mt-1">{r.dep} · {r.prov} · {r.tipo}</div>
                              <div className="text-xs text-slate-400 mt-1">📅 {r.f_ini||'—'} → {r.f_fin||'—'}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {prog.length > 0 ? (
                        <div>
                          <div className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
                            📅 Intervenciones Programadas ({prog.length})
                          </div>
                          {prog.map((r,i) => (
                            <div key={i} className="border border-blue-200 bg-blue-50 rounded-xl p-3 mb-2">
                              <div className="font-bold text-xs text-[#1F3864]">N°{r.num} · {r.ficha}</div>
                              <div className="text-xs text-slate-600 mt-1">{r.dep} · {r.prov} · {r.tipo}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{r.estado}</div>
                              <div className="text-xs text-slate-400 mt-1">📅 {r.f_ini||'—'} → {r.f_fin||'—'}</div>
                              {r.meta_vol && <div className="text-xs text-slate-400">Meta: {r.meta_vol.toLocaleString('es-PE')} m³</div>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-400">
                          <div className="text-3xl mb-2">📅</div>
                          <p className="text-sm">Sin intervenciones programadas</p>
                        </div>
                      )}
                    </div>
                  )
                })()}

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
