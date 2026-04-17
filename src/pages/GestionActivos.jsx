import { useState, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'

const VP_OPERACION = ['VOLQUETE', 'CAMION CISTERNA DE AGUA']

const TIPO_COLOR = {
  'MANTENIMIENTO PREVENTIVO':             '#10B981',
  'MANTENIMIENTO  CORRECTIVO PROGRAMADO': '#3B82F6',
  'MANTENIMIENTO CORRECTIVO NO PROGRAMADO':'#F59E0B',
  'GARANTIA':             '#8B5CF6',
  'ACCIDENTE O SINIESTRO':'#EF4444',
  'REPARACION GENERAL':   '#EC4899',
}
const ESTADO_COLOR = {
  'CERRADO':       '#10B981',
  'GENERADA':      '#3B82F6',
  'EN PROCESO':    '#F59E0B',
  'EN ADQUISICION':'#8B5CF6',
}

export default function GestionActivos({ inventario, raw, ordenesOT = [] }) {
  const [busq, setBusq]           = useState('')
  const [uboSel, setUboSel]       = useState('TODOS')
  const [flotaSel, setFlotaSel]   = useState('TODOS')
  const [estOpSel, setEstOpSel]   = useState('TODOS')
  const [activoSel, setActivoSel] = useState(null)
  const [tabActivo, setTabActivo] = useState('mantenimiento')

  const ubos = useMemo(() => [...new Set(inventario.map(e=>e.ubo).filter(Boolean))].sort(), [inventario])

  const activos353 = useMemo(() =>
    inventario.filter(e =>
      e.clasificacion === 'MP' ||
      (e.clasificacion === 'VP' && VP_OPERACION.includes(e.tipo_unidad))
    )
  , [inventario])

  // OT por código
  const otPorCodigo = useMemo(() => {
    const m = {}
    ordenesOT.forEach(ot => {
      if (!m[ot.codigo]) m[ot.codigo] = []
      m[ot.codigo].push(ot)
    })
    // Sort by fecha desc
    Object.keys(m).forEach(k => {
      m[k].sort((a,b) => {
        const pa = d => { if(!d||d==='null')return new Date(0); const parts=d.split('/'); return parts.length===3?new Date(+parts[2],+parts[1]-1,+parts[0]):new Date(0) }
        return pa(b.fecha)-pa(a.fecha)
      })
    })
    return m
  }, [ordenesOT])

  // Costos por código
  const costosPorCodigo = useMemo(() => {
    const c = {}
    if (!raw?.length) return c
    raw.forEach(r => {
      r.maquinas?.forEach(m => {
        if (!c[m.cod]) c[m.cod] = {contratado:0,ejecutado:0,comb_ap:0,comb_mv:0,mto_ap:0,mto_mv:0,pers_ap:0,pers_mv:0,intervenciones:0}
        c[m.cod].contratado  += r.monto_contratado||0
        c[m.cod].ejecutado   += r.monto_ejecutado ||0
        c[m.cod].comb_ap     += r.monto_comb_ap   ||0
        c[m.cod].comb_mv     += r.monto_comb_mv   ||0
        c[m.cod].mto_ap      += r.mto_ap          ||0
        c[m.cod].mto_mv      += r.mto_mv          ||0
        c[m.cod].pers_ap     += r.monto_pers_ap   ||0
        c[m.cod].pers_mv     += r.monto_pers_mv   ||0
        c[m.cod].intervenciones++
      })
    })
    return c
  }, [raw])

  const lista = useMemo(() => {
    let r = activos353
    if (uboSel   !== 'TODOS') r = r.filter(e => e.ubo === uboSel)
    if (flotaSel !== 'TODOS') r = r.filter(e => e.clasificacion === flotaSel)
    if (estOpSel !== 'TODOS') r = r.filter(e => e.estado_maq === estOpSel)
    if (busq) {
      const q = busq.toLowerCase()
      r = r.filter(e => [e.codigo,e.tipo_unidad,e.marca,e.modelo,e.ubo,e.comentario].join(' ').toLowerCase().includes(q))
    }
    return r
  }, [activos353, uboSel, flotaSel, estOpSel, busq])

  const getHistorialInt = useCallback((codigo) => {
    if (!raw?.length) return []
    return raw.filter(r => r.maquinas?.some(m => m.cod === codigo))
      .sort((a,b) => {
        const pd = d => { if(!d)return new Date(0); const m=d.match(/(\d{2})\/(\d{2})\/(\d{4})/); return m?new Date(+m[3],+m[2]-1,+m[1]):new Date(0) }
        return pd(b.f_ini)-pd(a.f_ini)
      })
  }, [raw])

  const exportExcel = useCallback(() => {
    const headers = ['Código','Clasificación','Tipo','Marca','Modelo','Año','UBO','Operatividad','Horómetro','Kilometraje','N° OTs','N° Intervenciones','Monto Contratado','Combustible MVCS','Mantenimiento MVCS','Personal MVCS','Comentario']
    const data = lista.map(e => {
      const c  = costosPorCodigo[e.codigo] || {}
      const ots = otPorCodigo[e.codigo] || []
      return [e.codigo,e.clasificacion,e.tipo_unidad,e.marca,e.modelo,e.anio_fab,e.ubo,e.estado_maq,e.horometro,e.kilometraje,ots.length,c.intervenciones||0,c.contratado||0,c.comb_mv||0,c.mto_mv||0,c.pers_mv||0,e.comentario]
    })
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([['GESTIÓN DE ACTIVOS — PNC MAQUINARIAS'],[`UBO: ${uboSel} | Total: ${lista.length}`],[`Generado: ${new Date().toLocaleDateString('es-PE')}`],[],headers,...data])
    XLSX.utils.book_append_sheet(wb, ws, 'Activos')
    XLSX.writeFile(wb, `PNC_GestionActivos_${new Date().toISOString().slice(0,10)}.xlsx`)
  }, [lista, uboSel, costosPorCodigo, otPorCodigo])

  const totalCostos = useMemo(() => {
    const v = Object.values(costosPorCodigo)
    return { contratado:v.reduce((a,c)=>a+c.contratado,0), ejecutado:v.reduce((a,c)=>a+c.ejecutado,0), combustible:v.reduce((a,c)=>a+c.comb_ap+c.comb_mv,0), mto:v.reduce((a,c)=>a+c.mto_ap+c.mto_mv,0), personal:v.reduce((a,c)=>a+c.pers_ap+c.pers_mv,0) }
  }, [costosPorCodigo])

  const sel = 'text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-[#1F3864]'
  const tabBtn = id => `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${tabActivo===id?'bg-[#1F3864] text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
  const opCount   = activos353.filter(e=>e.estado_maq==='OPERATIVO').length
  const inopCount = activos353.filter(e=>e.estado_maq==='INOPERATIVO').length

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-[#1F3864]">⚙️ Gestión de Activos</h2>
        <p className="text-xs text-slate-500">Mantenimiento, OT, costos de los 353 equipos operacionales{ordenesOT.length>0?` · ${ordenesOT.length} órdenes de trabajo`:' · Carga el Excel de OT para ver historial de mantenimiento'}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {l:'Total Operacional', v:activos353.length, c:'text-[#1F3864]',   b:'border-t-blue-600'},
          {l:'Operativos',        v:opCount,           c:'text-emerald-700', b:'border-t-emerald-500'},
          {l:'Inoperativos',      v:inopCount,         c:'text-red-700',     b:'border-t-red-500'},
          {l:'OTs registradas',   v:ordenesOT.length,  c:'text-purple-700',  b:'border-t-purple-500'},
          {l:'Costo contratado',  v:totalCostos.contratado>0?`S/ ${(totalCostos.contratado/1000).toFixed(0)}K`:'—', c:'text-amber-700', b:'border-t-amber-500'},
        ].map(({l,v,c,b}) => (
          <div key={l} className={`bg-white border border-slate-200 border-t-4 ${b} rounded-xl p-3 shadow-sm`}>
            <div className={`text-2xl font-extrabold ${c}`}>{v}</div>
            <div className="text-xs text-slate-400 mt-1">{l}</div>
          </div>
        ))}
      </div>

      {totalCostos.contratado > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">💰 Resumen de Costos por Intervención — Nacional</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              {l:'Personal Contratado', v:totalCostos.personal,    c:'text-blue-700',   icon:'👷'},
              {l:'Intervención Ejec.',  v:totalCostos.ejecutado,   c:'text-emerald-700',icon:'📊'},
              {l:'Combustible',         v:totalCostos.combustible, c:'text-amber-700',  icon:'⛽'},
              {l:'Mantenimiento',       v:totalCostos.mto,         c:'text-orange-700', icon:'🔧'},
              {l:'Total Contratado',    v:totalCostos.contratado,  c:'text-[#1F3864]',  icon:'💼'},
            ].map(({l,v,c,icon}) => (
              <div key={l} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                <div className="text-lg mb-1">{icon}</div>
                <div className={`text-sm font-extrabold ${c}`}>{v>0?`S/ ${v.toLocaleString('es-PE',{maximumFractionDigits:0})}`:'—'}</div>
                <div className="text-xs text-slate-400 mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center bg-white border border-slate-200 rounded-xl p-3">
        <input className="flex-1 min-w-[200px] text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-[#1F3864]"
          placeholder="🔍 Código, tipo, marca, UBO..." value={busq} onChange={e=>setBusq(e.target.value)}/>
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
        <span className="text-xs text-slate-400">{lista.length} equipos</span>
        <button onClick={exportExcel} className="ml-auto px-3 py-1.5 text-xs font-semibold border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg">↓ Excel</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wide">Equipos ({lista.length})</div>
          <div className="overflow-y-auto" style={{maxHeight:'580px'}}>
            {lista.map((e,i) => {
              const esOp   = e.estado_maq === 'OPERATIVO'
              const costos = costosPorCodigo[e.codigo]
              const ots    = otPorCodigo[e.codigo] || []
              const isSel  = activoSel?.codigo === e.codigo
              return (
                <div key={i} onClick={() => { setActivoSel(e); setTabActivo('mantenimiento') }}
                  className={`px-3 py-2.5 border-b border-slate-100 cursor-pointer transition-colors ${isSel?'bg-blue-50 border-l-4 border-l-[#1F3864]':'hover:bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-mono font-bold text-xs text-[#1F3864]">{e.codigo}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${esOp?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{esOp?'✓ OP':'✗ INOP'}</span>
                  </div>
                  <div className="text-xs text-slate-600 truncate">{e.tipo_unidad}</div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-slate-400">{e.ubo}</span>
                    <div className="flex gap-1">
                      {ots.length > 0 && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 rounded-full">{ots.length} OT</span>}
                      {costos?.contratado > 0 && <span className="text-xs text-amber-600 font-semibold">S/{(costos.contratado/1000).toFixed(0)}K</span>}
                    </div>
                  </div>
                </div>
              )
            })}
            {lista.length === 0 && <div className="p-8 text-center text-slate-400 text-xs">Sin resultados</div>}
          </div>
        </div>

        <div className="lg:col-span-2">
          {!activoSel ? (
            <div className="bg-white border border-slate-200 rounded-xl h-full flex items-center justify-center">
              <div className="text-center p-8 text-slate-400">
                <div className="text-4xl mb-2">🚜</div>
                <p className="text-sm">Selecciona un equipo para ver su ficha</p>
              </div>
            </div>
          ) : (() => {
            const hist    = getHistorialInt(activoSel.codigo)
            const ots     = otPorCodigo[activoSel.codigo] || []
            const costos  = costosPorCodigo[activoSel.codigo] || {}
            const esOp    = activoSel.estado_maq === 'OPERATIVO'
            const progr   = hist.filter(r => r.estado_g === 'PROGRAMADA')
            const enEj    = hist.filter(r => r.estado?.normalize('NFC') === 'EN EJECUCIÓN')
            const ejec    = hist.filter(r => r.estado === 'EJECUTADA')
            return (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-[#1F3864] px-4 py-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-white font-extrabold text-base">{activoSel.codigo}</div>
                      <div className="text-blue-300 text-xs mt-0.5">{activoSel.tipo_unidad} · {activoSel.marca} {activoSel.modelo} ({activoSel.anio_fab})</div>
                      <div className="text-blue-200 text-xs mt-0.5">UBO: {activoSel.ubo} · {activoSel.clasificacion}</div>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${esOp?'bg-emerald-500 text-white':'bg-red-500 text-white'}`}>
                      {esOp?'✓ OPERATIVO':'✗ INOPERATIVO'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[{l:'Horómetro',v:activoSel.horometro||'—'},{l:'Kilometraje',v:activoSel.kilometraje||'—'},{l:'OTs mant.',v:ots.length},{l:'Intervenc.',v:hist.length}].map(({l,v}) => (
                      <div key={l} className="bg-white/10 rounded-lg px-2 py-1.5 text-center">
                        <div className="text-white font-bold text-xs">{v}</div>
                        <div className="text-blue-300 text-xs">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 p-3 border-b border-slate-200 bg-slate-50 overflow-x-auto">
                  <button className={tabBtn('mantenimiento')} onClick={()=>setTabActivo('mantenimiento')}>🔧 Estado</button>
                  <button className={tabBtn('ot')}            onClick={()=>setTabActivo('ot')}>📋 Historial OT ({ots.length})</button>
                  <button className={tabBtn('costos')}        onClick={()=>setTabActivo('costos')}>💰 Costos</button>
                  <button className={tabBtn('intervenciones')}onClick={()=>setTabActivo('intervenciones')}>🚜 Intervenciones ({hist.length})</button>
                  <button className={tabBtn('programacion')}  onClick={()=>setTabActivo('programacion')}>📅 Prog. ({progr.length+enEj.length})</button>
                </div>

                <div className="p-4 overflow-y-auto" style={{maxHeight:'420px'}}>

                  {tabActivo === 'mantenimiento' && (
                    <div className="space-y-4">
                      <div className={`rounded-xl p-4 ${esOp?'bg-emerald-50 border border-emerald-200':'bg-red-50 border border-red-200'}`}>
                        <div className={`text-base font-extrabold mb-1 ${esOp?'text-emerald-700':'text-red-700'}`}>
                          {esOp?'✓ OPERATIVO — Equipo en condiciones de operar':'✗ INOPERATIVO — Requiere atención de mantenimiento'}
                        </div>
                        <div className="text-xs text-slate-500">Última actualización: {activoSel.fecha_registro||'—'}</div>
                      </div>
                      {activoSel.comentario && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <div className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">💬 Observación del Área de Mantenimiento</div>
                          <p className="text-sm text-slate-700 leading-relaxed">{activoSel.comentario}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                          <div className="text-xs font-bold text-amber-600 uppercase mb-1">Horómetro</div>
                          <div className="text-2xl font-extrabold text-amber-700">{activoSel.horometro||'—'}</div>
                          <div className="text-xs text-amber-500 mt-1">Horas de operación</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                          <div className="text-xs font-bold text-blue-600 uppercase mb-1">Kilometraje</div>
                          <div className="text-2xl font-extrabold text-blue-700">{activoSel.kilometraje||'—'}</div>
                          <div className="text-xs text-blue-500 mt-1">Kilómetros recorridos</div>
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Ficha Técnica</div>
                        <div className="grid grid-cols-2 gap-2">
                          {[['Código',activoSel.codigo],['Clasificación',activoSel.clasificacion],['Tipo',activoSel.tipo_unidad],['Marca',activoSel.marca],['Modelo',activoSel.modelo],['Año',activoSel.anio_fab||'—'],['UBO',activoSel.ubo],['Últ. registro',activoSel.fecha_registro||'—']].map(([l,v]) => (
                            <div key={l}><div className="text-xs text-slate-400">{l}</div><div className="text-xs text-slate-700 font-semibold">{v}</div></div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-purple-50 rounded-lg p-2 border border-purple-200"><div className="text-lg font-extrabold text-purple-700">{ots.length}</div><div className="text-xs text-slate-400">OTs mantenimiento</div></div>
                        <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200"><div className="text-lg font-extrabold text-emerald-700">{ejec.length}</div><div className="text-xs text-slate-400">Intervenciones ejec.</div></div>
                        <div className="bg-amber-50 rounded-lg p-2 border border-amber-200"><div className="text-lg font-extrabold text-amber-700">{enEj.length}</div><div className="text-xs text-slate-400">En ejecución</div></div>
                      </div>
                    </div>
                  )}

                  {tabActivo === 'ot' && (
                    <div className="space-y-2">
                      {ots.length > 0 ? (
                        <>
                          <p className="text-xs text-slate-500 mb-3">{ots.length} órdenes de trabajo registradas</p>
                          {ots.map((ot,i) => {
                            const color = TIPO_COLOR[ot.tipo] || '#888'
                            const estColor = ESTADO_COLOR[ot.estado] || '#888'
                            return (
                              <div key={i} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                                <div className="flex items-start justify-between mb-1">
                                  <span className="font-bold text-xs text-[#1F3864]">{ot.numero}</span>
                                  <div className="flex gap-1 flex-wrap justify-end">
                                    <span style={{background:color+'20',color,border:`1px solid ${color}50`}} className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                                      {ot.tipo.replace('MANTENIMIENTO ','MNT ').replace(' PROGRAMADO',' PROG.').replace(' NO PROGRAMADO',' NO PROG.')}
                                    </span>
                                    <span style={{background:estColor+'20',color:estColor}} className="text-xs font-bold px-2 py-0.5 rounded-full">{ot.estado||'—'}</span>
                                  </div>
                                </div>
                                <div className="text-xs text-slate-700 mt-1 leading-relaxed">{ot.titulo}</div>
                                <div className="flex gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                                  <span>📅 {ot.fecha||'—'}</span>
                                  {ot.entidad && <span>🏢 {ot.entidad}</span>}
                                  {ot.area && ot.area !== 'null' && <span>📁 {ot.area}</span>}
                                </div>
                              </div>
                            )
                          })}
                        </>
                      ) : (
                        <div className="text-center py-8 text-slate-400">
                          <div className="text-3xl mb-2">📋</div>
                          <p className="text-sm">Sin órdenes de trabajo registradas</p>
                          <p className="text-xs mt-1 text-slate-300">Carga el Excel de Ordenes de Trabajo del MAIN</p>
                        </div>
                      )}
                    </div>
                  )}

                  {tabActivo === 'costos' && (
                    <div className="space-y-4">
                      {costos.contratado > 0 ? (
                        <>
                          <div className="bg-[#1F3864] rounded-xl p-4 text-white text-center">
                            <div className="text-xs text-blue-300 uppercase mb-1">Monto Total Contratado</div>
                            <div className="text-3xl font-extrabold">S/ {costos.contratado.toLocaleString('es-PE',{maximumFractionDigits:0})}</div>
                            <div className="text-xs text-blue-300 mt-1">{costos.intervenciones} intervención{costos.intervenciones>1?'es':''}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              {l:'Personal Contratado',  ap:costos.pers_ap,  mv:costos.pers_mv,  icon:'👷', c:'blue'},
                              {l:'Intervención Ejec.',   ap:costos.ejecutado,mv:0,               icon:'📊', c:'emerald'},
                              {l:'Combustible',          ap:costos.comb_ap,  mv:costos.comb_mv,  icon:'⛽', c:'amber'},
                              {l:'Mantenimiento',        ap:costos.mto_ap,   mv:costos.mto_mv,   icon:'🔧', c:'orange'},
                            ].map(({l,ap,mv,icon,c}) => {
                              const total = (ap||0)+(mv||0)
                              return total > 0 ? (
                                <div key={l} className={`bg-${c}-50 border border-${c}-200 rounded-xl p-3`}>
                                  <div className="text-lg mb-1">{icon}</div>
                                  <div className={`text-base font-extrabold text-${c}-700`}>S/ {total.toLocaleString('es-PE',{maximumFractionDigits:0})}</div>
                                  <div className="text-xs text-slate-500 mt-1">{l}</div>
                                  {ap>0&&mv>0&&<div className="text-xs text-slate-400 mt-1">Aportes: S/{ap.toLocaleString('es-PE',{maximumFractionDigits:0})} · MVCS: S/{mv.toLocaleString('es-PE',{maximumFractionDigits:0})}</div>}
                                </div>
                              ) : null
                            })}
                          </div>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Detalle por Intervención</div>
                            {hist.filter(r=>(r.monto_contratado||0)>0).map((r,i) => (
                              <div key={i} className="flex items-start justify-between py-2 border-b border-slate-200 last:border-0">
                                <div>
                                  <div className="text-xs font-bold text-[#1F3864]">N°{r.num} · {r.ficha}</div>
                                  <div className="text-xs text-slate-400">{r.dep} · {r.tipo}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-bold text-[#1F3864]">S/ {r.monto_contratado.toLocaleString('es-PE',{maximumFractionDigits:0})}</div>
                                  {(r.pers_ap||0)+(r.monto_pers_mv||0)>0&&<div className="text-xs text-blue-600">👷 S/{((r.monto_pers_ap||0)+(r.monto_pers_mv||0)).toLocaleString('es-PE',{maximumFractionDigits:0})}</div>}
                                  {(r.monto_comb_ap||0)+(r.monto_comb_mv||0)>0&&<div className="text-xs text-amber-600">⛽ S/{((r.monto_comb_ap||0)+(r.monto_comb_mv||0)).toLocaleString('es-PE',{maximumFractionDigits:0})}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-slate-400">
                          <div className="text-3xl mb-2">💰</div>
                          <p className="text-sm">Sin costos registrados</p>
                          <p className="text-xs mt-1 text-slate-300">Los montos se registran cuando hay convenio activo</p>
                        </div>
                      )}
                    </div>
                  )}

                  {tabActivo === 'intervenciones' && (
                    <div className="space-y-2">
                      {hist.length > 0 ? hist.map((r,i) => {
                        const isEj=r.estado==='EJECUTADA',isEn=r.estado?.normalize('NFC')==='EN EJECUCIÓN',isPr=r.estado_g==='PROGRAMADA'
                        const bg=isEj?'bg-emerald-50 border-emerald-200':isEn?'bg-amber-50 border-amber-200':isPr?'bg-blue-50 border-blue-200':'bg-slate-50 border-slate-200'
                        const tc=isEj?'bg-emerald-200 text-emerald-800':isEn?'bg-amber-200 text-amber-800':isPr?'bg-blue-200 text-blue-800':'bg-slate-200 text-slate-700'
                        return (
                          <div key={i} className={`border ${bg} rounded-xl p-3`}>
                            <div className="flex items-start justify-between mb-1">
                              <span className="font-bold text-xs text-[#1F3864]">N°{r.num} · {r.ficha}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tc}`}>{r.estado}</span>
                            </div>
                            <div className="text-xs text-slate-600">{r.ubo} · {r.dep} · {r.prov}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{r.tipo}</div>
                            <div className="flex gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                              <span>📅 {r.f_ini||'—'} → {r.f_fin||'—'}</span>
                              {r.porc_vol!=null&&<span>📊 {r.porc_vol.toFixed(1)}%</span>}
                              {r.m3>0&&<span>📦 {r.m3.toLocaleString('es-PE',{maximumFractionDigits:0})} m³</span>}
                              {r.monto_contratado>0&&<span>💰 S/{r.monto_contratado.toLocaleString('es-PE',{maximumFractionDigits:0})}</span>}
                            </div>
                          </div>
                        )
                      }) : <div className="text-center py-8 text-slate-400"><div className="text-3xl mb-2">📭</div><p className="text-sm">Sin intervenciones</p></div>}
                    </div>
                  )}

                  {tabActivo === 'programacion' && (
                    <div className="space-y-4">
                      {enEj.length>0&&<div>
                        <div className="text-xs font-bold text-amber-700 uppercase mb-2">🔄 En Ejecución ({enEj.length})</div>
                        {enEj.map((r,i)=>(
                          <div key={i} className="border border-amber-200 bg-amber-50 rounded-xl p-3 mb-2">
                            <div className="font-bold text-xs text-[#1F3864]">N°{r.num} · {r.ficha}</div>
                            <div className="text-xs text-slate-600 mt-1">{r.dep} · {r.prov} · {r.tipo}</div>
                            <div className="text-xs text-slate-400 mt-1">📅 {r.f_ini||'—'} → {r.f_fin||'—'}</div>
                            {r.porc_vol!=null&&<div className="text-xs text-amber-700 font-bold mt-1">Avance: {r.porc_vol.toFixed(1)}%</div>}
                          </div>
                        ))}
                      </div>}
                      {progr.length>0?<div>
                        <div className="text-xs font-bold text-blue-700 uppercase mb-2">📅 Programadas ({progr.length})</div>
                        {progr.map((r,i)=>(
                          <div key={i} className="border border-blue-200 bg-blue-50 rounded-xl p-3 mb-2">
                            <div className="font-bold text-xs text-[#1F3864]">N°{r.num} · {r.ficha}</div>
                            <div className="text-xs text-slate-600 mt-1">{r.dep} · {r.prov} · {r.tipo}</div>
                            <div className="text-xs text-slate-500 font-semibold mt-0.5">{r.estado}</div>
                            <div className="text-xs text-slate-400 mt-1">📅 {r.f_ini||'—'} → {r.f_fin||'—'}</div>
                            {r.meta_vol>0&&<div className="text-xs text-blue-600 mt-1">Meta: {r.meta_vol.toLocaleString('es-PE',{maximumFractionDigits:0})} m³</div>}
                          </div>
                        ))}
                      </div>:enEj.length===0&&<div className="text-center py-8 text-slate-400"><div className="text-3xl mb-2">📅</div><p className="text-sm">Sin intervenciones programadas</p><p className="text-xs mt-1">Equipo disponible</p></div>}
                    </div>
                  )}

                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
