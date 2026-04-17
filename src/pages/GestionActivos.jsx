import { useState, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'

const VP_OPERACION = ['VOLQUETE', 'CAMION CISTERNA DE AGUA']
const MESES_LABEL = {'01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio','07':'Julio','08':'Agosto','09':'Setiembre','10':'Octubre','11':'Noviembre','12':'Diciembre'}
const TIPO_OT_COLOR = {
  'MANTENIMIENTO PREVENTIVO':              '#10B981',
  'MANTENIMIENTO  CORRECTIVO PROGRAMADO':  '#3B82F6',
  'MANTENIMIENTO CORRECTIVO NO PROGRAMADO':'#F59E0B',
  'GARANTIA':              '#8B5CF6',
  'ACCIDENTE O SINIESTRO': '#EF4444',
  'REPARACION GENERAL':    '#EC4899',
}
const ESTADO_OT_COLOR = {
  'CERRADO':        '#10B981',
  'GENERADA':       '#3B82F6',
  'EN PROCESO':     '#F59E0B',
  'EN ADQUISICION': '#8B5CF6',
}
const fmtS = n => n > 0 ? 'S/ ' + Number(n).toLocaleString('es-PE',{maximumFractionDigits:0}) : '—'

export default function GestionActivos({ inventario, raw, ordenesOT = [] }) {
  // ── Filtros lista ─────────────────────────────────────
  const [busq,      setBusq]      = useState('')
  const [uboSel,    setUboSel]    = useState('TODOS')
  const [flotaSel,  setFlotaSel]  = useState('TODOS')
  const [estOpSel,  setEstOpSel]  = useState('TODOS')
  // ── Detalle equipo ────────────────────────────────────
  const [activoSel, setActivoSel] = useState(null)
  const [tabActivo, setTabActivo] = useState('mantenimiento')
  // ── Filtros tab OT ───────────────────────────────────
  const [otMesSel,  setOtMesSel]  = useState('TODOS')
  const [otTipoSel, setOtTipoSel] = useState('TODOS')
  // ── Filtros tab Costos ───────────────────────────────
  const [costoAnio, setCostoAnio] = useState('TODOS')
  const [costoMes,  setCostoMes]  = useState('TODOS')
  // ── Modal costos nacionales ──────────────────────────
  const [modalCosto, setModalCosto] = useState(null)

  const ubos = useMemo(() => [...new Set(inventario.map(e=>e.ubo).filter(Boolean))].sort(), [inventario])

  // Solo los 353
  const activos353 = useMemo(() =>
    inventario.filter(e =>
      e.clasificacion === 'MP' ||
      (e.clasificacion === 'VP' && VP_OPERACION.includes(e.tipo_unidad))
    )
  , [inventario])

  // OT por código de equipo
  const otPorCodigo = useMemo(() => {
    const m = {}
    ordenesOT.forEach(ot => {
      if (!m[ot.codigo]) m[ot.codigo] = []
      m[ot.codigo].push(ot)
    })
    Object.keys(m).forEach(k => {
      m[k].sort((a,b) => {
        const pd = d => { if(!d||d==='null')return 0; const p=d.split('/'); return p.length===3?new Date(+p[2],+p[1]-1,+p[0]).getTime():0 }
        return pd(b.fecha)-pd(a.fecha)
      })
    })
    return m
  }, [ordenesOT])

  // Costos de INTERVENCIONES por código de equipo
  const costosInt = useMemo(() => {
    const c = {}
    if (!raw?.length) return c
    raw.forEach(r => {
      r.maquinas?.forEach(m => {
        if (!c[m.cod]) c[m.cod] = {contratado:0,ejecutado:0,comb:0,mto:0,personal:0,n:0,items:[]}
        c[m.cod].contratado += r.monto_contratado||0
        c[m.cod].ejecutado  += r.monto_ejecutado ||0
        c[m.cod].comb       += (r.monto_comb_ap||0)+(r.monto_comb_mv||0)
        c[m.cod].mto        += (r.mto_ap||0)+(r.mto_mv||0)
        c[m.cod].personal   += (r.monto_pers_ap||0)+(r.monto_pers_mv||0)
        c[m.cod].n++
        c[m.cod].items.push(r)
      })
    })
    return c
  }, [raw])

  // Costos de INTERVENCIONES agrupados por UBO (para modal)
  const costosUBO = useMemo(() => {
    const m = {}
    if (!raw?.length) return m
    raw.forEach(r => {
      const ubo = r.ubo || 'SIN UBO'
      if (!m[ubo]) m[ubo] = {contratado:0,ejecutado:0,comb:0,mto:0,personal:0,n:0}
      m[ubo].contratado += r.monto_contratado||0
      m[ubo].ejecutado  += r.monto_ejecutado ||0
      m[ubo].comb       += (r.monto_comb_ap||0)+(r.monto_comb_mv||0)
      m[ubo].mto        += (r.mto_ap||0)+(r.mto_mv||0)
      m[ubo].personal   += (r.monto_pers_ap||0)+(r.monto_pers_mv||0)
      const hasCost = (r.monto_contratado||0)+(r.monto_ejecutado||0)+(r.monto_comb_ap||0)+(r.monto_comb_mv||0)+(r.mto_ap||0)+(r.mto_mv||0)+(r.monto_pers_ap||0)+(r.monto_pers_mv||0)
      if (hasCost > 0) m[ubo].n++
    })
    return m
  }, [raw])

  // Totales nacionales
  const totales = useMemo(() => {
    const v = Object.values(costosUBO)
    return {
      contratado: v.reduce((a,c)=>a+c.contratado,0),
      ejecutado:  v.reduce((a,c)=>a+c.ejecutado,0),
      comb:       v.reduce((a,c)=>a+c.comb,0),
      mto:        v.reduce((a,c)=>a+c.mto,0),
      personal:   v.reduce((a,c)=>a+c.personal,0),
    }
  }, [costosUBO])

  // Lista filtrada
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

  const getHistInt = useCallback((cod) => {
    if (!raw?.length) return []
    return raw.filter(r => r.maquinas?.some(m => m.cod === cod))
      .sort((a,b) => {
        const pd = d => { if(!d)return 0; const m=d.match(/(\d{2})\/(\d{2})\/(\d{4})/); return m?new Date(+m[3],+m[2]-1,+m[1]).getTime():0 }
        return pd(b.f_ini)-pd(a.f_ini)
      })
  }, [raw])

  const exportLista = useCallback(() => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['GESTIÓN DE ACTIVOS — PNC MAQUINARIAS'],
      ['UBO: '+uboSel+' | Total: '+lista.length],
      ['Generado: '+new Date().toLocaleDateString('es-PE')],[],
      ['Código','Clasificación','Tipo','Marca','Modelo','Año','UBO','Operatividad','Horómetro','Kilometraje','N° OTs','Costo Contratado','Personal','Combustible','Observación'],
      ...lista.map(e => {
        const c = costosInt[e.codigo]||{}
        const ots = otPorCodigo[e.codigo]||[]
        return [e.codigo,e.clasificacion,e.tipo_unidad,e.marca,e.modelo,e.anio_fab,e.ubo,e.estado_maq,e.horometro,e.kilometraje,ots.length,c.contratado||0,c.personal||0,c.comb||0,e.comentario]
      })
    ])
    ws['!cols']=[{wch:12},{wch:10},{wch:24},{wch:14},{wch:14},{wch:6},{wch:14},{wch:12},{wch:12},{wch:14},{wch:8},{wch:16},{wch:14},{wch:12},{wch:40}]
    XLSX.utils.book_append_sheet(wb,ws,'Activos')
    XLSX.writeFile(wb,'PNC_GestionActivos_'+new Date().toISOString().slice(0,10)+'.xlsx')
  }, [lista, uboSel, costosInt, otPorCodigo])

  const sel = 'text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-[#1F3864]'
  const tabBtn = id => 'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ' + (tabActivo===id?'bg-[#1F3864] text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200')
  const opCount   = activos353.filter(e=>e.estado_maq==='OPERATIVO').length
  const inopCount = activos353.filter(e=>e.estado_maq==='INOPERATIVO').length

  // ── RENDER ─────────────────────────────────────────────
  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-[#1F3864]">⚙️ Gestión de Activos</h2>
        <p className="text-xs text-slate-500">353 equipos operacionales · {ordenesOT.length} OTs de mantenimiento{ordenesOT.length===0?' (carga el Excel de OT para ver historial)':''}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {l:'Total Operacional',v:activos353.length,c:'text-[#1F3864]',   b:'border-t-blue-600'},
          {l:'Operativos',       v:opCount,          c:'text-emerald-700', b:'border-t-emerald-500'},
          {l:'Inoperativos',     v:inopCount,        c:'text-red-700',     b:'border-t-red-500'},
          {l:'OTs registradas',  v:ordenesOT.length, c:'text-purple-700',  b:'border-t-purple-500'},
          {l:'Costo Contratado', v:totales.contratado>0?'S/ '+(totales.contratado/1000000).toFixed(2)+'M':'—', c:'text-amber-700', b:'border-t-amber-500'},
        ].map(({l,v,c,b}) => (
          <div key={l} className={'bg-white border border-slate-200 border-t-4 '+b+' rounded-xl p-3 shadow-sm'}>
            <div className={'text-2xl font-extrabold '+c}>{v}</div>
            <div className="text-xs text-slate-400 mt-1">{l}</div>
          </div>
        ))}
      </div>

      {/* Costos nacionales — tarjetas clicables */}
      {totales.contratado > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">💰 Costos por Intervención — Nacional (clic para ver detalle por UBO)</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              {l:'Personal Contratado', v:totales.personal,    c:'text-blue-700',   icon:'👷', key:'personal'},
              {l:'Intervención Ejec.',  v:totales.ejecutado,   c:'text-emerald-700',icon:'📊', key:'ejecutado'},
              {l:'Combustible',         v:totales.comb,        c:'text-amber-700',  icon:'⛽', key:'comb'},
              {l:'Mantenimiento',       v:totales.mto,         c:'text-orange-700', icon:'🔧', key:'mto'},
              {l:'Total Contratado',    v:totales.contratado,  c:'text-[#1F3864]',  icon:'💼', key:'contratado'},
            ].map(({l,v,c,icon,key}) => (
              <div key={l} onClick={()=>v>0&&setModalCosto(key)}
                className={'bg-slate-50 rounded-xl p-3 text-center border border-slate-200 transition-all '+(v>0?'cursor-pointer hover:border-blue-400 hover:shadow-md hover:bg-blue-50':'')}>
                <div className="text-lg mb-1">{icon}</div>
                <div className={'text-sm font-extrabold '+c}>{v>0?fmtS(v):'—'}</div>
                <div className="text-xs text-slate-400 mt-1">{l}</div>
                {v>0&&<div className="text-xs text-blue-500 mt-1">Ver detalle →</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros lista */}
      <div className="flex flex-wrap gap-2 items-center bg-white border border-slate-200 rounded-xl p-3">
        <input className="flex-1 min-w-[180px] text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-[#1F3864]"
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
        <button onClick={exportLista} className="ml-auto px-3 py-1.5 text-xs font-semibold border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg">↓ Excel</button>
      </div>

      {/* Lista + Detalle */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Lista equipos */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wide">Equipos ({lista.length})</div>
          <div className="overflow-y-auto" style={{maxHeight:'580px'}}>
            {lista.map((e,i) => {
              const esOp  = e.estado_maq==='OPERATIVO'
              const c     = costosInt[e.codigo]||{}
              const ots   = otPorCodigo[e.codigo]||[]
              const isSel = activoSel?.codigo===e.codigo
              return (
                <div key={i} onClick={()=>{setActivoSel(e);setTabActivo('mantenimiento');setOtMesSel('TODOS');setOtTipoSel('TODOS');setCostoAnio('TODOS');setCostoMes('TODOS')}}
                  className={'px-3 py-2.5 border-b border-slate-100 cursor-pointer transition-colors '+(isSel?'bg-blue-50 border-l-4 border-l-[#1F3864]':'hover:bg-slate-50')}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-mono font-bold text-xs text-[#1F3864]">{e.codigo}</span>
                    <span className={'text-xs font-bold px-1.5 py-0.5 rounded-full '+(esOp?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700')}>{esOp?'✓ OP':'✗ INOP'}</span>
                  </div>
                  <div className="text-xs text-slate-600 truncate">{e.tipo_unidad}</div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-slate-400">{e.ubo}</span>
                    <div className="flex gap-1">
                      {ots.length>0&&<span className="text-xs bg-purple-100 text-purple-700 px-1.5 rounded-full">{ots.length} OT</span>}
                      {c.contratado>0&&<span className="text-xs text-amber-600 font-semibold">S/{(c.contratado/1000).toFixed(0)}K</span>}
                    </div>
                  </div>
                </div>
              )
            })}
            {lista.length===0&&<div className="p-8 text-center text-slate-400 text-xs">Sin resultados</div>}
          </div>
        </div>

        {/* Panel detalle */}
        <div className="lg:col-span-2">
          {!activoSel ? (
            <div className="bg-white border border-slate-200 rounded-xl h-full flex items-center justify-center">
              <div className="text-center p-8 text-slate-400"><div className="text-4xl mb-2">🚜</div><p className="text-sm">Selecciona un equipo</p></div>
            </div>
          ) : (() => {
            const hist   = getHistInt(activoSel.codigo)
            const ots    = otPorCodigo[activoSel.codigo]||[]
            const c      = costosInt[activoSel.codigo]||{}
            const esOp   = activoSel.estado_maq==='OPERATIVO'
            const enEj   = hist.filter(r=>r.estado?.normalize('NFC').toUpperCase()==='EN EJECUCIÓN')
            const progr  = hist.filter(r=>r.estado_g==='PROGRAMADA')

            // OT filtradas
            const otAnios = [...new Set(ots.map(o=>o.fecha?.split('/')[2]).filter(Boolean))].sort()
            const otMeses = [...new Set(ots.map(o=>{ const p=o.fecha?.split('/'); return p?.length===3?p[1]:null }).filter(Boolean))].sort()
            const otsTipos = [...new Set(ots.map(o=>o.tipo).filter(Boolean))]
            const otsFilt = ots.filter(o => {
              if (otMesSel!=='TODOS') { const p=o.fecha?.split('/'); if(!p||p[1]!==otMesSel) return false }
              if (otTipoSel!=='TODOS' && o.tipo!==otTipoSel) return false
              return true
            })

            // Costos filtrados por año/mes
            const aniosCosto = [...new Set(hist.map(r=>r.anio).filter(Boolean))].sort()
            const histCostoFilt = hist.filter(r => {
              if (costoAnio!=='TODOS' && r.anio!==costoAnio) return false
              if (costoMes !=='TODOS' && r.mes !==costoMes)  return false
              const total=(r.monto_contratado||0)+(r.monto_ejecutado||0)+(r.monto_comb_ap||0)+(r.monto_comb_mv||0)+(r.mto_ap||0)+(r.mto_mv||0)+(r.monto_pers_ap||0)+(r.monto_pers_mv||0)
              return total>0
            })
            const totCostoFilt = {
              contratado: histCostoFilt.reduce((a,r)=>a+(r.monto_contratado||0),0),
              personal:   histCostoFilt.reduce((a,r)=>a+(r.monto_pers_ap||0)+(r.monto_pers_mv||0),0),
              comb:       histCostoFilt.reduce((a,r)=>a+(r.monto_comb_ap||0)+(r.monto_comb_mv||0),0),
              mto:        histCostoFilt.reduce((a,r)=>a+(r.mto_ap||0)+(r.mto_mv||0),0),
            }

            return (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="bg-[#1F3864] px-4 py-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-white font-extrabold text-base">{activoSel.codigo}</div>
                      <div className="text-blue-300 text-xs mt-0.5">{activoSel.tipo_unidad} · {activoSel.marca} {activoSel.modelo} ({activoSel.anio_fab})</div>
                      <div className="text-blue-200 text-xs mt-0.5">UBO: {activoSel.ubo} · {activoSel.clasificacion}</div>
                    </div>
                    <span className={'text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 '+(esOp?'bg-emerald-500 text-white':'bg-red-500 text-white')}>{esOp?'✓ OPERATIVO':'✗ INOPERATIVO'}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[{l:'Horómetro',v:activoSel.horometro||'—'},{l:'Kilometraje',v:activoSel.kilometraje||'—'},{l:'OTs Mant.',v:ots.length},{l:'Intervenc.',v:hist.length}].map(({l,v})=>(
                      <div key={l} className="bg-white/10 rounded-lg px-2 py-1.5 text-center">
                        <div className="text-white font-bold text-xs">{v}</div>
                        <div className="text-blue-300 text-xs">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-3 border-b border-slate-200 bg-slate-50 overflow-x-auto">
                  <button className={tabBtn('mantenimiento')} onClick={()=>setTabActivo('mantenimiento')}>🔧 Estado</button>
                  <button className={tabBtn('ot')}            onClick={()=>setTabActivo('ot')}>📋 Historial OT ({ots.length})</button>
                  <button className={tabBtn('costos')}        onClick={()=>setTabActivo('costos')}>💰 Costos Intervención</button>
                  <button className={tabBtn('intervenciones')}onClick={()=>setTabActivo('intervenciones')}>🚜 Intervenciones ({hist.length})</button>
                  <button className={tabBtn('programacion')}  onClick={()=>setTabActivo('programacion')}>📅 Prog. ({progr.length+enEj.length})</button>
                </div>

                <div className="p-4 overflow-y-auto" style={{maxHeight:'440px'}}>

                  {/* TAB: ESTADO/MANTENIMIENTO */}
                  {tabActivo==='mantenimiento' && (
                    <div className="space-y-4">
                      <div className={'rounded-xl p-4 '+(esOp?'bg-emerald-50 border border-emerald-200':'bg-red-50 border border-red-200')}>
                        <div className={'text-base font-extrabold mb-1 '+(esOp?'text-emerald-700':'text-red-700')}>
                          {esOp?'✓ OPERATIVO — Equipo en condiciones de operar':'✗ INOPERATIVO — Requiere atención de mantenimiento'}
                        </div>
                        <div className="text-xs text-slate-500">Última actualización: {activoSel.fecha_registro||'—'}</div>
                      </div>
                      {activoSel.comentario&&(
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <div className="text-xs font-bold text-amber-700 uppercase mb-2">💬 Observación del Área de Mantenimiento</div>
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
                          <div className="text-xs text-blue-500 mt-1">Km recorridos</div>
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="text-xs font-bold text-slate-500 uppercase mb-3">Ficha Técnica</div>
                        <div className="grid grid-cols-2 gap-2">
                          {[['Código',activoSel.codigo],['Clasificación',activoSel.clasificacion],['Tipo',activoSel.tipo_unidad],['Marca',activoSel.marca],['Modelo',activoSel.modelo],['Año',activoSel.anio_fab||'—'],['UBO',activoSel.ubo],['Últ. registro',activoSel.fecha_registro||'—']].map(([l,v])=>(
                            <div key={l}><div className="text-xs text-slate-400">{l}</div><div className="text-xs text-slate-700 font-semibold">{v}</div></div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-purple-50 rounded-lg p-2 border border-purple-200"><div className="text-lg font-extrabold text-purple-700">{ots.length}</div><div className="text-xs text-slate-400">OTs mantenimiento</div></div>
                        <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200"><div className="text-lg font-extrabold text-emerald-700">{hist.filter(r=>r.estado==='EJECUTADA').length}</div><div className="text-xs text-slate-400">Intervenc. ejec.</div></div>
                        <div className="bg-amber-50 rounded-lg p-2 border border-amber-200"><div className="text-lg font-extrabold text-amber-700">{enEj.length}</div><div className="text-xs text-slate-400">En ejecución</div></div>
                      </div>
                    </div>
                  )}

                  {/* TAB: HISTORIAL OT — Área de Mantenimiento */}
                  {tabActivo==='ot' && (
                    <div className="space-y-3">
                      {ots.length>0 ? (
                        <>
                          {/* Filtros OT */}
                          <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <select className={sel} value={otMesSel} onChange={e=>setOtMesSel(e.target.value)}>
                              <option value="TODOS">Todos los meses</option>
                              {otMeses.map(m=><option key={m} value={m}>{MESES_LABEL[m]||m}</option>)}
                            </select>
                            <select className={sel} value={otTipoSel} onChange={e=>setOtTipoSel(e.target.value)}>
                              <option value="TODOS">Todos los tipos</option>
                              {otsTipos.map(t=><option key={t} value={t}>{t.replace('MANTENIMIENTO ','MNT ')}</option>)}
                            </select>
                            <span className="text-xs text-slate-500 self-center">{otsFilt.length} OTs · {otsFilt.filter(o=>o.estado==='CERRADO').length} cerradas</span>
                          </div>
                          <p className="text-xs text-slate-400 italic">Órdenes de trabajo emitidas por el Área de Mantenimiento — no incluyen montos (no registrados en el Excel)</p>
                          {otsFilt.map((ot,i) => {
                            const tColor = TIPO_OT_COLOR[ot.tipo]||'#888'
                            const eColor = ESTADO_OT_COLOR[ot.estado]||'#888'
                            return (
                              <div key={i} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                                <div className="flex items-start justify-between mb-1 gap-2">
                                  <span className="font-bold text-xs text-[#1F3864]">{ot.numero}</span>
                                  <div className="flex gap-1 flex-wrap justify-end">
                                    <span style={{background:tColor+'20',color:tColor,border:'1px solid '+tColor+'50'}} className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                                      {ot.tipo.replace('MANTENIMIENTO ','MNT ').replace(' PROGRAMADO',' PROG.').replace(' NO PROGRAMADO',' NO PROG.')}
                                    </span>
                                    <span style={{background:eColor+'20',color:eColor}} className="text-xs font-bold px-2 py-0.5 rounded-full">{ot.estado||'—'}</span>
                                  </div>
                                </div>
                                <div className="text-xs text-slate-700 mt-1 leading-relaxed">{ot.titulo}</div>
                                <div className="flex gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                                  <span>📅 {ot.fecha||'—'}</span>
                                  {ot.entidad&&ot.entidad!=='null'&&<span>🏢 {ot.entidad}</span>}
                                  {ot.area&&ot.area!=='null'&&<span>📁 {ot.area}</span>}
                                </div>
                              </div>
                            )
                          })}
                          {otsFilt.length===0&&<div className="text-center py-6 text-slate-400 text-xs">Sin OTs para el filtro seleccionado</div>}
                        </>
                      ) : (
                        <div className="text-center py-8 text-slate-400">
                          <div className="text-3xl mb-2">📋</div>
                          <p className="text-sm">Sin órdenes de trabajo</p>
                          <p className="text-xs mt-1 text-slate-300">Carga el Excel de Ordenes de Trabajo del MAIN</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: COSTOS DE INTERVENCIÓN */}
                  {tabActivo==='costos' && (
                    <div className="space-y-4">
                      {c.contratado>0 ? (
                        <>
                          <div className="text-xs text-slate-400 italic bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                            💡 Estos costos corresponden a las <strong>intervenciones de campo</strong>, registrados en el Excel de Intervenciones del MAIN. No incluyen costos del área de mantenimiento (OT).
                          </div>
                          {/* Filtros año/mes */}
                          <div className="flex gap-2 flex-wrap items-center bg-slate-50 rounded-lg p-2 border border-slate-200">
                            <select className={sel} value={costoAnio} onChange={e=>setCostoAnio(e.target.value)}>
                              <option value="TODOS">Todos los años</option>
                              {aniosCosto.map(a=><option key={a} value={a}>{a}</option>)}
                            </select>
                            <select className={sel} value={costoMes} onChange={e=>setCostoMes(e.target.value)}>
                              <option value="TODOS">Todos los meses</option>
                              {Object.entries(MESES_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                            </select>
                            <span className="text-xs text-slate-500">{histCostoFilt.length} intervenciones con costos</span>
                          </div>
                          {/* Resumen filtrado */}
                          <div className="bg-[#1F3864] rounded-xl p-4 text-white text-center">
                            <div className="text-xs text-blue-300 uppercase mb-1">
                              Total Contratado{costoAnio!=='TODOS'?' — '+costoAnio:''}{costoMes!=='TODOS'?' / '+MESES_LABEL[costoMes]:''}
                            </div>
                            <div className="text-3xl font-extrabold">S/ {totCostoFilt.contratado.toLocaleString('es-PE',{maximumFractionDigits:0})}</div>
                            <div className="text-xs text-blue-300 mt-1">{histCostoFilt.length} intervención{histCostoFilt.length!==1?'es':''}</div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              {l:'Personal',     v:totCostoFilt.personal, icon:'👷', c:'blue'},
                              {l:'Combustible',  v:totCostoFilt.comb,     icon:'⛽', c:'amber'},
                              {l:'Mantenimiento',v:totCostoFilt.mto,      icon:'🔧', c:'orange'},
                              {l:'Ejecutado',    v:histCostoFilt.reduce((a,r)=>a+(r.monto_ejecutado||0),0), icon:'📊', c:'emerald'},
                            ].filter(d=>d.v>0).map(({l,v,icon,c})=>(
                              <div key={l} className={'bg-'+c+'-50 border border-'+c+'-200 rounded-xl p-3 text-center'}>
                                <div className="text-lg">{icon}</div>
                                <div className={'text-sm font-extrabold text-'+c+'-700 mt-1'}>S/ {v.toLocaleString('es-PE',{maximumFractionDigits:0})}</div>
                                <div className="text-xs text-slate-400 mt-1">{l}</div>
                              </div>
                            ))}
                          </div>
                          {/* Detalle por intervención */}
                          {histCostoFilt.length>0&&(
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                              <div className="text-xs font-bold text-slate-500 uppercase mb-3">Detalle por Intervención</div>
                              {histCostoFilt.map((r,i)=>(
                                <div key={i} className="flex items-start justify-between py-2 border-b border-slate-200 last:border-0">
                                  <div>
                                    <div className="text-xs font-bold text-[#1F3864]">N°{r.num} · {r.ficha}</div>
                                    <div className="text-xs text-slate-400">{r.dep} · {r.tipo} · {r.f_ini||'—'}</div>
                                  </div>
                                  <div className="text-right">
                                    {(r.monto_contratado||0)>0&&<div className="text-xs font-bold text-[#1F3864]">S/ {r.monto_contratado.toLocaleString('es-PE',{maximumFractionDigits:0})}</div>}
                                    {(r.monto_pers_ap||0)+(r.monto_pers_mv||0)>0&&<div className="text-xs text-blue-600">👷 S/ {((r.monto_pers_ap||0)+(r.monto_pers_mv||0)).toLocaleString('es-PE',{maximumFractionDigits:0})}</div>}
                                    {(r.monto_comb_ap||0)+(r.monto_comb_mv||0)>0&&<div className="text-xs text-amber-600">⛽ S/ {((r.monto_comb_ap||0)+(r.monto_comb_mv||0)).toLocaleString('es-PE',{maximumFractionDigits:0})}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 text-slate-400">
                          <div className="text-3xl mb-2">💰</div>
                          <p className="text-sm">Sin costos de intervención registrados</p>
                          <p className="text-xs mt-1 text-slate-300">Los montos se registran cuando hay convenio activo</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: INTERVENCIONES */}
                  {tabActivo==='intervenciones' && (
                    <div className="space-y-2">
                      {hist.length>0?hist.map((r,i)=>{
                        const isEj=r.estado==='EJECUTADA',isEn=r.estado?.normalize('NFC').toUpperCase()==='EN EJECUCIÓN',isPr=r.estado_g==='PROGRAMADA'
                        const bg=isEj?'bg-emerald-50 border-emerald-200':isEn?'bg-amber-50 border-amber-200':isPr?'bg-blue-50 border-blue-200':'bg-slate-50 border-slate-200'
                        const tc=isEj?'bg-emerald-200 text-emerald-800':isEn?'bg-amber-200 text-amber-800':isPr?'bg-blue-200 text-blue-800':'bg-slate-200 text-slate-700'
                        return (
                          <div key={i} className={'border '+bg+' rounded-xl p-3'}>
                            <div className="flex items-start justify-between mb-1">
                              <span className="font-bold text-xs text-[#1F3864]">N°{r.num} · {r.ficha}</span>
                              <span className={'text-xs font-bold px-2 py-0.5 rounded-full '+tc}>{r.estado}</span>
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
                      }):<div className="text-center py-8 text-slate-400"><div className="text-3xl mb-2">📭</div><p className="text-sm">Sin intervenciones</p></div>}
                    </div>
                  )}

                  {/* TAB: PROGRAMACIÓN */}
                  {tabActivo==='programacion' && (
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
                            <div className="text-xs text-slate-600 mt-1">{r.dep} · {r.prov}</div>
                            <div className="text-xs text-slate-400 mt-1">📅 {r.f_ini||'—'} → {r.f_fin||'—'}</div>
                          </div>
                        ))}
                      </div>:enEj.length===0&&<div className="text-center py-8 text-slate-400"><div className="text-3xl mb-2">📅</div><p className="text-sm">Sin programación activa</p></div>}
                    </div>
                  )}

                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Modal costos por UBO */}
      {modalCosto&&(()=>{
        const LABELS = {personal:'👷 Personal Contratado',ejecutado:'📊 Intervención Ejecutada',comb:'⛽ Combustible',mto:'🔧 Mantenimiento',contratado:'💼 Total Contratado'}
        const rows = Object.entries(costosUBO)
          .map(([ubo,d])=>({ubo,valor:d[modalCosto]||0,n:d.n}))
          .filter(r=>r.valor>0)
          .sort((a,b)=>b.valor-a.valor)
        const total = rows.reduce((a,r)=>a+r.valor,0)

        const exportModal = () => {
          const wb = XLSX.utils.book_new()
          const ws = XLSX.utils.aoa_to_sheet([
            [LABELS[modalCosto]+' — Por UBO'],['Generado: '+new Date().toLocaleDateString('es-PE')],[],
            ['UBO','Intervenciones con costo','Monto (S/)','% del Total'],
            ...rows.map(r=>[r.ubo,r.n,r.valor,total>0?+(r.valor/total*100).toFixed(1):0]),
            [],['TOTAL',rows.reduce((a,r)=>a+r.n,0),total,100]
          ])
          ws['!cols']=[{wch:16},{wch:22},{wch:18},{wch:12}]
          XLSX.utils.book_append_sheet(wb,ws,'Por UBO')
          XLSX.writeFile(wb,'PNC_Costos_'+modalCosto+'_'+new Date().toISOString().slice(0,10)+'.xlsx')
        }

        const exportPDF = () => {
          const fecha = new Date().toLocaleDateString('es-PE')
          const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Segoe UI,sans-serif;font-size:11px;padding:20px}h1{background:#1F3864;color:#fff;padding:12px;border-radius:6px;font-size:14px}table{width:100%;border-collapse:collapse}th{background:#1F3864;color:#fff;padding:6px 8px;text-align:left;font-size:10px}td{padding:5px 8px;border-bottom:1px solid #E2E8F0}.tot{background:#1F3864;color:#fff;font-weight:bold}tr:nth-child(even) td{background:#F8FAFC}@media print{@page{margin:1cm}}</style></head><body>'
            +'<h1>'+LABELS[modalCosto]+' — Detalle por UBO</h1>'
            +'<p style="color:#64748B;font-size:10px;margin-bottom:12px">Total: S/ '+total.toLocaleString('es-PE',{maximumFractionDigits:0})+' · Generado: '+fecha+'</p>'
            +'<table><thead><tr><th>UBO</th><th>Intervenciones</th><th>Monto (S/)</th><th>% Total</th></tr></thead><tbody>'
            +rows.map((r,i)=>'<tr'+(i%2?' style="background:#F8FAFC"':'')+"><td><b>"+r.ubo+"</b></td><td style='text-align:center'>"+r.n+"</td><td style='text-align:right;font-weight:bold'>S/ "+r.valor.toLocaleString('es-PE',{maximumFractionDigits:0})+"</td><td style='text-align:right'>"+(total>0?(r.valor/total*100).toFixed(1):0)+"%</td></tr>").join('')
            +'<tr class="tot"><td>TOTAL</td><td style="text-align:center">'+rows.reduce((a,r)=>a+r.n,0)+'</td><td style="text-align:right">S/ '+total.toLocaleString('es-PE',{maximumFractionDigits:0})+'</td><td style="text-align:right">100%</td></tr>'
            +'</tbody></table></body></html>'
          const w=window.open('','_blank','width=900,height=600')
          if(w){w.document.write(html);w.document.close();w.onload=()=>{w.focus();w.print()}}
        }

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setModalCosto(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e=>e.stopPropagation()}>
              <div className="bg-[#1F3864] px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
                <div>
                  <div className="text-white font-extrabold text-base">{LABELS[modalCosto]}</div>
                  <div className="text-blue-300 text-xs mt-0.5">Total: S/ {total.toLocaleString('es-PE',{maximumFractionDigits:0})} · {rows.length} UBOs</div>
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={exportModal} className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold">↓ Excel</button>
                  <button onClick={exportPDF}   className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-semibold">↓ PDF</button>
                  <button onClick={()=>setModalCosto(null)} className="text-white hover:text-red-300 text-xl font-bold ml-2">✕</button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {rows.length>0?(
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">UBO</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase">Intervenc.</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase">Monto (S/)</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase">% Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r,i)=>(
                        <tr key={r.ubo} className={i%2===0?'bg-white':'bg-slate-50'}>
                          <td className="px-4 py-3 font-bold text-[#1F3864]">{r.ubo}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{r.n}</td>
                          <td className="px-4 py-3 text-right font-extrabold text-[#1F3864]">S/ {r.valor.toLocaleString('es-PE',{maximumFractionDigits:0})}</td>
                          <td className="px-4 py-3 text-right"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{total>0?(r.valor/total*100).toFixed(1):0}%</span></td>
                        </tr>
                      ))}
                      <tr className="bg-[#1F3864]">
                        <td className="px-4 py-3 text-white font-extrabold">TOTAL</td>
                        <td className="px-4 py-3 text-center text-white font-bold">{rows.reduce((a,r)=>a+r.n,0)}</td>
                        <td className="px-4 py-3 text-right text-white font-extrabold">S/ {total.toLocaleString('es-PE',{maximumFractionDigits:0})}</td>
                        <td className="px-4 py-3 text-right text-white font-bold">100%</td>
                      </tr>
                    </tbody>
                  </table>
                ):(
                  <div className="text-center py-12 text-slate-400">
                    <div className="text-4xl mb-2">💰</div>
                    <p>Sin datos de {LABELS[modalCosto]} registrados</p>
                    <p className="text-xs mt-1 text-slate-300">Solo existen datos para: ANCASH, LORETO, SAN MARTIN, TACNA</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
