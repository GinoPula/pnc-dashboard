import { useState, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts'

const COL_MP   = '#B45309'
const COL_VP   = '#1D4ED8'
const COL_OP   = '#15803D'
const COL_INOP = '#DC2626'

function ModalActivo({ equipo, onClose }) {
  if (!equipo) return null
  const fichas = equipo.fichas_intervencion || []
  const esOp   = equipo.estado_maq === 'OPERATIVO'
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}/>
      <div className="fixed top-0 right-0 w-full sm:w-[500px] h-full bg-white border-l border-slate-200 z-50 overflow-y-auto shadow-2xl">
        <div className="bg-[#1F3864] px-4 py-3 sticky top-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="text-white font-bold text-sm font-mono">{equipo.codigo}</div>
              <div className="text-blue-300 text-xs mt-0.5">{equipo.tipo_unidad} · {equipo.marca} {equipo.modelo}</div>
              <div className="text-blue-400 text-xs mt-0.5">UBO: {equipo.ubo} · {equipo.clasificacion}</div>
            </div>
            <div className="flex gap-2 items-start flex-shrink-0">
              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${esOp?'bg-green-500 text-white':'bg-red-500 text-white'}`}>
                {esOp?'✓ OPERATIVO':'✗ INOPERATIVO'}
              </span>
              <button onClick={onClose} className="text-blue-200 hover:text-white text-xl leading-none">✕</button>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-4 text-sm">
          <div className="border-b border-slate-100 pb-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Datos del equipo</div>
            <div className="grid grid-cols-2 gap-2">
              {[['Código',equipo.codigo],['Clasificación',equipo.clasificacion],['Tipo',equipo.tipo_unidad],
                ['Marca',equipo.marca],['Modelo',equipo.modelo],['Año fab.',equipo.anio_fab||'—'],
                ['UBO',equipo.ubo],['Estado uso',equipo.estado_uso]].map(([l,v])=>(
                <div key={l} className="bg-slate-50 rounded-lg p-2">
                  <div className="text-xs text-slate-400 uppercase tracking-wide">{l}</div>
                  <div className="text-xs font-semibold text-slate-700 mt-0.5">{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-b border-slate-100 pb-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Métricas operativas</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <div className="text-xs text-amber-600 font-bold uppercase mb-1">Horómetro</div>
                <div className="text-xl font-extrabold text-amber-700">{equipo.horometro||'—'}</div>
                <div className="text-xs text-amber-500">horas</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <div className="text-xs text-blue-600 font-bold uppercase mb-1">Kilometraje</div>
                <div className="text-xl font-extrabold text-blue-700">{equipo.kilometraje||'—'}</div>
                <div className="text-xs text-blue-500">km</div>
              </div>
            </div>
          </div>
          <div className="border-b border-slate-100 pb-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estado de operatividad</div>
            <div className={`rounded-lg p-3 border ${esOp?'bg-green-50 border-green-200':'bg-red-50 border-red-200'}`}>
              <div className={`text-sm font-extrabold mb-1 ${esOp?'text-green-700':'text-red-700'}`}>
                {esOp?'✓ OPERATIVO':'✗ INOPERATIVO'}
              </div>
              {equipo.comentario
                ? <p className="text-xs text-slate-600 leading-relaxed">{equipo.comentario}</p>
                : <p className="text-xs text-slate-400 italic">Sin comentarios de mantenimiento</p>}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Historial de intervenciones ({fichas.length})
            </div>
            {fichas.length === 0 ? (
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <div className="text-2xl mb-1">📋</div>
                <p className="text-xs text-slate-400">Sin intervenciones registradas</p>
                <p className="text-xs text-green-600 font-semibold mt-1">Equipo disponible</p>
              </div>
            ) : (
              <div className="space-y-2">
                {fichas.map((f,i)=>(
                  <div key={i} className="border border-slate-200 rounded-lg p-2.5 bg-white hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-purple-700">{f.ficha}</div>
                        <div className="text-xs text-slate-500 mt-0.5">N° {f.num} · UBO {f.ubo}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                        f.estado==='EJECUTADA'?'bg-emerald-100 text-emerald-700':
                        f.estado?.includes('EJEC')?'bg-amber-100 text-amber-700':
                        'bg-blue-100 text-blue-700'}`}>{f.estado}</span>
                    </div>
                    <div className="flex gap-3 mt-1.5 text-xs text-slate-400">
                      {f.f_ini&&<span>Inicio: {f.f_ini}</span>}
                      {f.f_fin&&<span>Fin: {f.f_fin}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function Maquinaria({ inventario, curUBO, raw }) {
  const [filtro, setFiltro]   = useState('TODOS')
  const [busq,   setBusq]     = useState('')
  const [uboSel, setUboSel]   = useState('TODOS')
  const [tab,    setTab]      = useState('inventario')
  const [activoSel, setActivoSel] = useState(null)

  const uboEfectivo = uboSel!=='TODOS' ? uboSel : (curUBO!=='TODOS' ? curUBO : 'TODOS')

  const invFiltrado = useMemo(()=>
    uboEfectivo==='TODOS' ? inventario : inventario.filter(e=>e.ubo===uboEfectivo)
  ,[inventario,uboEfectivo])

  // VP operacional = solo Volquete y Cisterna de Agua
  const VP_OPERACION = ['VOLQUETE', 'CAMION CISTERNA DE AGUA']
  const mp         = invFiltrado.filter(e=>e.clasificacion==='MP')
  const vp         = invFiltrado.filter(e=>e.clasificacion==='VP' && VP_OPERACION.includes(e.tipo_unidad))
  const totalOp    = mp.length + vp.length
  // Operatividad solo sobre los 353 operacionales (MP + VP operacional)
  const operativo  = [...mp,...vp].filter(e=>e.estado_maq==='OPERATIVO').length
  const inoperativo= [...mp,...vp].filter(e=>e.estado_maq==='INOPERATIVO').length
  const mpOp       = mp.filter(e=>e.estado_maq==='OPERATIVO').length
  const mpInop     = mp.filter(e=>e.estado_maq==='INOPERATIVO').length
  const vpOp       = vp.filter(e=>e.estado_maq==='OPERATIVO').length
  const vpInop     = vp.filter(e=>e.estado_maq==='INOPERATIVO').length
  const mpDisp     = mp.filter(e=>e.estado_maq==='OPERATIVO'&&e.disponible).length
  const vpDisp     = vp.filter(e=>e.estado_maq==='OPERATIVO'&&e.disponible).length
  const total      = invFiltrado.length
  const disp       = invFiltrado.filter(e=>e.disponible).length
  const enUso      = invFiltrado.filter(e=>e.en_uso).length

  const ubos = useMemo(()=>[...new Set(inventario.map(e=>e.ubo).filter(Boolean))].sort(),[inventario])

  const uboData = useMemo(()=>{
    const lista = uboEfectivo==='TODOS' ? ubos : [uboEfectivo]
    return lista.map(ubo=>{
      const ub=inventario.filter(e=>e.ubo===ubo)
      const mpU=ub.filter(e=>e.clasificacion==='MP')
      const vpU=ub.filter(e=>e.clasificacion==='VP')
      return {
        ubo, total:ub.length,
        op:ub.filter(e=>e.estado_maq==='OPERATIVO').length,
        inop:ub.filter(e=>e.estado_maq==='INOPERATIVO').length,
        mp:mpU.length, mpDisp:mpU.filter(e=>e.disponible).length, mpUso:mpU.filter(e=>e.en_uso).length,
        vp:vpU.length, vpDisp:vpU.filter(e=>e.disponible).length, vpUso:vpU.filter(e=>e.en_uso).length,
      }
    })
  },[inventario,ubos,uboEfectivo])

  const mpTipos = useMemo(()=>{
    const c={}
    mp.forEach(e=>{c[e.tipo_unidad]=(c[e.tipo_unidad]||0)+1})
    return Object.entries(c).sort((a,b)=>b[1]-a[1])
      .map(([n,v])=>({n:n.replace('HIDRAULICA','HID.').replace('SOBRE ORUGA','S/ORUGA').slice(0,18),v}))
  },[mp])

  // VP — TODOS los tipos (antes solo Volquete y Cisterna)
  const vpTipos = useMemo(()=>{
    const c={}
    vp.forEach(e=>{c[e.tipo_unidad]=(c[e.tipo_unidad]||0)+1})
    return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([n,v])=>({
      n:n==='CAMION CISTERNA DE AGUA'?'CISTERNA AGUA'
       :n==='CAMION CISTERNA DE COMBUSTIBLE'?'CISTERNA COMB.'
       :n==='CAMION DE AUXILIO MECÁNICO'?'AUX. MECÁNICO'
       :n==='PLATAFORMA (CAMA BAJA)'?'PLATAFORMA'
       :n.slice(0,18), v
    }))
  },[vp])

  const opPorTipo = useMemo(()=>{
    const c={}
    invFiltrado.forEach(e=>{
      if(!c[e.tipo_unidad]) c[e.tipo_unidad]={op:0,inop:0}
      if(e.estado_maq==='OPERATIVO') c[e.tipo_unidad].op++
      else c[e.tipo_unidad].inop++
    })
    return Object.entries(c).sort((a,b)=>(b[1].op+b[1].inop)-(a[1].op+a[1].inop)).slice(0,14)
      .map(([tipo,v])=>({
        n:tipo.replace('HIDRAULICA','HID.').replace('SOBRE ORUGA','S/ORUGA')
              .replace('CAMION CISTERNA DE AGUA','CISTERNA AGUA')
              .replace('CAMION CISTERNA DE COMBUSTIBLE','CISTERNA COMB.')
              .slice(0,18),
        op:v.op, inop:v.inop
      }))
  },[invFiltrado])

  const inoperativos = useMemo(()=>
    invFiltrado.filter(e=>e.estado_maq==='INOPERATIVO').sort((a,b)=>a.ubo.localeCompare(b.ubo))
  ,[invFiltrado])

  const lista = useMemo(()=>{
    let r=invFiltrado
    if (filtro==='DISPONIBLE')   r=r.filter(e=>e.disponible)
    else if(filtro==='EN USO')   r=r.filter(e=>e.en_uso)
    else if(filtro==='MP')       r=r.filter(e=>e.clasificacion==='MP')
    else if(filtro==='VP')       r=r.filter(e=>e.clasificacion==='VP')
    else if(filtro==='OPERATIVO')  r=r.filter(e=>e.estado_maq==='OPERATIVO')
    else if(filtro==='INOPERATIVO')r=r.filter(e=>e.estado_maq==='INOPERATIVO')
    if(busq){const q=busq.toLowerCase();r=r.filter(e=>[e.codigo,e.tipo_unidad,e.ubo,e.marca,e.comentario].join(' ').toLowerCase().includes(q))}
    return r
  },[invFiltrado,filtro,busq])

  const getFicha = useCallback((codigo)=>{
    if(!raw?.length) return null
    const inter=raw.find(r=>r.maquinas?.some(m=>m.cod===codigo))
    return inter?inter.ficha:null
  },[raw])

  const exportExcel = useCallback(()=>{
    const headers=['Código','Clasificación','Tipo de Unidad','Marca','Modelo','Año','UBO','Estado Uso','Operatividad','Horómetro','Kilometraje','Comentario Mant.','Ficha Intervención']
    const data=lista.map(e=>[e.codigo,e.clasificacion,e.tipo_unidad,e.marca,e.modelo,e.anio_fab,e.ubo,e.estado_uso,e.estado_maq,e.horometro,e.kilometraje,e.comentario,getFicha(e.codigo)||'Sin ficha'])
    const wb=XLSX.utils.book_new()
    const ws=XLSX.utils.aoa_to_sheet([['INVENTARIO MAQUINARIAS PNC'],[`UBO: ${uboEfectivo} · Total: ${lista.length} · Op: ${lista.filter(e=>e.estado_maq==='OPERATIVO').length} · Inop: ${lista.filter(e=>e.estado_maq==='INOPERATIVO').length}`],[`Generado: ${new Date().toLocaleDateString('es-PE')}`],[],headers,...data])
    ws['!cols']=[{wch:14},{wch:12},{wch:28},{wch:16},{wch:14},{wch:6},{wch:14},{wch:12},{wch:14},{wch:12},{wch:14},{wch:40},{wch:28}]
    XLSX.utils.book_append_sheet(wb,ws,'Inventario')
    XLSX.writeFile(wb,`PNC_Inventario_${uboEfectivo}_${new Date().toISOString().slice(0,10)}.xlsx`)
  },[lista,uboEfectivo,getFicha])

  const sel='text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-white cursor-pointer text-slate-700 focus:border-blue-500 focus:outline-none'
  const cardBase='bg-white border border-slate-200 rounded-xl overflow-hidden'
  const tabBtn=(id)=>`px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${tab===id?'border-[#CC1C2C] text-[#CC1C2C]':'border-transparent text-slate-500 hover:text-slate-700'}`

  return (
    <div className="p-3 sm:p-4 space-y-4 bg-slate-50 min-h-screen">

      {/* FILTRO UBO */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">UBO:</span>
          <select className={sel} value={uboSel} onChange={e=>setUboSel(e.target.value)}>
            <option value="TODOS">Todos los UBOs</option>
            {ubos.map(u=><option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        {uboEfectivo!=='TODOS'&&(
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
            📍 {uboEfectivo}
            <button onClick={()=>setUboSel('TODOS')} className="ml-1 hover:text-red-600">✕</button>
          </span>
        )}
        <span className="text-xs text-slate-400 ml-auto">{total} equipos</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          {l:'Total Operacional', v:totalOp, s:'MP + VP en operación', c:'border-t-blue-600', vc:'text-blue-700'},
          {l:'MP Disponibles', v:mpDisp, s:'operativos sin ficha', c:'border-t-green-600', vc:'text-green-700'},
          {l:'VP Disponibles', v:vpDisp, s:'operativos sin ficha', c:'border-t-green-500', vc:'text-green-600'},
          {l:'MP — Maq. Pesada', v:mp.length, s:`Op:${mpOp} · Inop:${mpInop}`, c:'border-t-amber-600', vc:'text-amber-700'},
          {l:'VP — Veh. Pesado', v:vp.length, s:`Op:${vpOp} · Inop:${vpInop}`, c:'border-t-blue-500', vc:'text-blue-700'},
          {l:'Operativos',   v:operativo,   s:`${total?(operativo/total*100).toFixed(0):'0'}%`,    c:'border-t-emerald-500', vc:'text-emerald-700'},
          {l:'Inoperativos', v:inoperativo, s:`${total?(inoperativo/total*100).toFixed(0):'0'}%`,  c:'border-t-red-600',     vc:'text-red-700'},
        ].map(({l,v,s,c,vc})=>(
          <div key={l} className={`${cardBase} border-t-4 ${c} p-3`}>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{l}</div>
            <div className={`text-2xl font-extrabold ${vc}`}>{v}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className={cardBase}>
        <div className="flex border-b border-slate-200 px-2">
          <button className={tabBtn('inventario')}   onClick={()=>setTab('inventario')}>🚜 Inventario MP/VP</button>
          <button className={tabBtn('operatividad')} onClick={()=>setTab('operatividad')}>🔧 Operatividad</button>
          <button className={tabBtn('activos')}      onClick={()=>setTab('activos')}>📋 Gestión de Activos</button>
        </div>

        {/* ── INVENTARIO ── */}
        {tab==='inventario'&&(
          <div className="p-3 sm:p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* MP */}
              <div className={`${cardBase} border-t-4 border-t-amber-500`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="font-bold text-slate-700 text-sm">MP — Maquinaria Pesada</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">{mp.length} equipos</span>
                </div>
                <div className="grid grid-cols-3 gap-2 p-3">
                  {[{l:'Total',v:mp.length,c:'text-slate-700'},{l:'Disponibles',v:mpDisp,c:'text-green-700 font-bold'},{l:'En uso',v:mp.length-mpDisp,c:'text-red-600 font-bold'}].map(({l,v,c})=>(
                    <div key={l} className="text-center bg-slate-50 rounded-lg p-2">
                      <div className={`text-xl font-extrabold ${c}`}>{v}</div>
                      <div className="text-xs text-slate-400 uppercase">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-2">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{width:`${mp.length?(((mp.length-mpDisp)/mp.length)*100).toFixed(0):0}%`}}/>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">Tipos de equipo — todos</div>
                  <ResponsiveContainer width="100%" height={Math.max(160,mpTipos.length*22)}>
                    <BarChart data={mpTipos} layout="vertical" margin={{left:0,right:35,top:2,bottom:2}}>
                      <XAxis type="number" tick={{fontSize:8}} hide/>
                      <YAxis type="category" dataKey="n" tick={{fontSize:9,fill:'#475569'}} width={110}/>
                      <Tooltip cursor={{fill:'#FEF3C7'}} formatter={v=>[v,'Equipos']}/>
                      <Bar dataKey="v" fill={COL_MP} radius={[0,4,4,0]} maxBarSize={18}>
                        <LabelList dataKey="v" position="right" style={{fontSize:10,fontWeight:700,fill:'#92400E'}}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* VP — TODOS los tipos */}
              <div className={`${cardBase} border-t-4 border-t-blue-600`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="font-bold text-slate-700 text-sm">VP — Vehículo Pesado</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">{vp.length} equipos</span>
                </div>
                <div className="grid grid-cols-3 gap-2 p-3">
                  {[{l:'Total VP',v:vp.length,c:'text-slate-700'},{l:'Disponibles',v:vpDisp,c:'text-green-700 font-bold'},{l:'En uso',v:vp.length-vpDisp,c:'text-blue-700 font-bold'}].map(({l,v,c})=>(
                    <div key={l} className="text-center bg-slate-50 rounded-lg p-2">
                      <div className={`text-xl font-extrabold ${c}`}>{v}</div>
                      <div className="text-xs text-slate-400 uppercase">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-2">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{width:`${vp.length?(((vp.length-vpDisp)/vp.length)*100).toFixed(0):0}%`}}/>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">Todos los tipos de vehículo</div>
                  <ResponsiveContainer width="100%" height={Math.max(160,vpTipos.length*22)}>
                    <BarChart data={vpTipos} layout="vertical" margin={{left:0,right:35,top:2,bottom:2}}>
                      <XAxis type="number" tick={{fontSize:8}} hide/>
                      <YAxis type="category" dataKey="n" tick={{fontSize:9,fill:'#475569'}} width={110}/>
                      <Tooltip cursor={{fill:'#DBEAFE'}} formatter={v=>[v,'Equipos']}/>
                      <Bar dataKey="v" fill={COL_VP} radius={[0,4,4,0]} maxBarSize={22}>
                        <LabelList dataKey="v" position="right" style={{fontSize:11,fontWeight:700,fill:'#1E40AF'}}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Tabla UBO */}
            <div className={cardBase}>
              <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3 flex-wrap bg-slate-50">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Resumen por UBO — MP | VP | Operatividad</span>
                <button onClick={exportExcel} className="ml-auto text-xs font-semibold border border-green-600 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1 rounded-lg">↓ Excel</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#1F3864]">
                      {['UBO','MP Tot.','MP Uso','MP Disp.','VP Tot.','VP Uso','VP Disp.','✓ Oper.','✗ Inop.','Total','% Uso'].map(h=>(
                        <th key={h} className="px-3 py-2 text-left font-bold text-white uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uboData.map((u,i)=>(
                      <tr key={i} className={`border-b border-slate-100 hover:bg-blue-50 ${i%2===0?'bg-white':'bg-slate-50'}`}>
                        <td className="px-3 py-2 font-semibold text-slate-700">{u.ubo}</td>
                        <td className="px-3 py-2 text-center">{u.mp}</td>
                        <td className="px-3 py-2 text-center text-red-600 font-semibold">{u.mpUso}</td>
                        <td className="px-3 py-2 text-center text-green-700 font-bold">{u.mpDisp}</td>
                        <td className="px-3 py-2 text-center">{u.vp}</td>
                        <td className="px-3 py-2 text-center text-blue-700 font-semibold">{u.vpUso}</td>
                        <td className="px-3 py-2 text-center text-green-700 font-bold">{u.vpDisp}</td>
                        <td className="px-3 py-2 text-center text-emerald-700 font-bold">{u.op}</td>
                        <td className="px-3 py-2 text-center text-red-600 font-bold">{u.inop}</td>
                        <td className="px-3 py-2 text-center font-bold text-slate-700">{u.total}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.total&&((u.mpUso+u.vpUso)/u.total)>0.8?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}`}>
                            {u.total?(((u.mpUso+u.vpUso)/u.total)*100).toFixed(0)+'%':'—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── OPERATIVIDAD ── */}
        {tab==='operatividad'&&(
          <div className="p-3 sm:p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {l:'Operativos',    v:operativo,   pct:total?(operativo/total*100).toFixed(1):0,   c:'bg-green-50 border-green-300', vc:'text-green-700'},
                {l:'Inoperativos',  v:inoperativo, pct:total?(inoperativo/total*100).toFixed(1):0, c:'bg-red-50 border-red-300',     vc:'text-red-700'},
                {l:'Disponibles',   v:disp,        pct:total?(disp/total*100).toFixed(1):0,        c:'bg-blue-50 border-blue-300',   vc:'text-blue-700'},
                {l:'En uso activo', v:enUso,       pct:total?(enUso/total*100).toFixed(1):0,       c:'bg-amber-50 border-amber-300', vc:'text-amber-700'},
              ].map(({l,v,pct,c,vc})=>(
                <div key={l} className={`border rounded-xl p-4 ${c}`}>
                  <div className={`text-3xl font-extrabold ${vc}`}>{v}</div>
                  <div className="text-sm font-semibold text-slate-600 mt-1">{l}</div>
                  <div className="text-xs text-slate-400">{pct}% del total</div>
                </div>
              ))}
            </div>

            <div className={cardBase}>
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Operatividad por tipo de unidad (OPERATIVO vs INOPERATIVO)</span>
              </div>
              <div className="p-3">
                <div className="flex gap-4 mb-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:COL_OP}}></span> Operativo</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:COL_INOP}}></span> Inoperativo</span>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(200,opPorTipo.length*26)}>
                  <BarChart data={opPorTipo} layout="vertical" margin={{left:0,right:50,top:4,bottom:4}}>
                    <XAxis type="number" tick={{fontSize:8}} hide/>
                    <YAxis type="category" dataKey="n" tick={{fontSize:9,fill:'#475569'}} width={120}/>
                    <Tooltip formatter={(v,name)=>[v,name==='op'?'Operativo':'Inoperativo']}/>
                    <Bar dataKey="op"   name="op"   fill={COL_OP}   radius={[0,2,2,0]} maxBarSize={16}>
                      <LabelList dataKey="op"   position="right" style={{fontSize:9,fontWeight:700,fill:'#15803D'}}/>
                    </Bar>
                    <Bar dataKey="inop" name="inop" fill={COL_INOP} radius={[0,2,2,0]} maxBarSize={16}>
                      <LabelList dataKey="inop" position="right" style={{fontSize:9,fontWeight:700,fill:'#DC2626'}}/>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={cardBase}>
              <div className="px-4 py-3 border-b border-slate-200 bg-red-50">
                <span className="text-xs font-bold text-red-700 uppercase tracking-wide">
                  ✗ Unidades INOPERATIVAS ({inoperativos.length}) — Observaciones de mantenimiento
                </span>
              </div>
              {inoperativos.length===0 ? (
                <div className="p-8 text-center text-green-600">
                  <div className="text-3xl mb-2">✓</div>
                  <p className="font-semibold">Todas las unidades están operativas</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-red-700">
                        {['Código','UBO','Tipo','Marca','Horómetro','Kilometraje','Comentario / Observación'].map(h=>(
                          <th key={h} className="px-3 py-2 text-left font-bold text-white whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {inoperativos.map((e,i)=>(
                        <tr key={i} className={`border-b border-slate-100 hover:bg-red-50 cursor-pointer ${i%2===0?'bg-white':'bg-slate-50'}`}
                          onClick={()=>setActivoSel(e)}>
                          <td className="px-3 py-2 font-mono font-bold text-red-700">{e.codigo}</td>
                          <td className="px-3 py-2 font-semibold text-slate-700">{e.ubo}</td>
                          <td className="px-3 py-2 text-slate-600">{e.tipo_unidad}</td>
                          <td className="px-3 py-2 text-slate-500">{e.marca}</td>
                          <td className="px-3 py-2 text-center text-amber-700 font-semibold">{e.horometro||'—'}</td>
                          <td className="px-3 py-2 text-center text-blue-700">{e.kilometraje||'—'}</td>
                          <td className="px-3 py-2 text-slate-600 max-w-xs">{e.comentario||<span className="text-slate-300 italic">Sin comentario</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── GESTIÓN DE ACTIVOS ── */}
        {tab==='activos'&&(
          <div className="p-3 sm:p-4 space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <input className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:border-blue-500 focus:outline-none"
                placeholder="🔍 Código, tipo, marca, UBO o comentario..."
                value={busq} onChange={e=>setBusq(e.target.value)} style={{width:300}}/>
              <select className={sel} value={filtro} onChange={e=>setFiltro(e.target.value)}>
                <option value="TODOS">Todos</option>
                <option value="DISPONIBLE">Disponibles</option>
                <option value="EN USO">En uso</option>
                <option value="MP">Solo MP</option>
                <option value="VP">Solo VP</option>
                <option value="OPERATIVO">Solo Operativos</option>
                <option value="INOPERATIVO">Solo Inoperativos</option>
              </select>
              <span className="text-xs text-slate-400">{lista.length} unidades</span>
              <button onClick={exportExcel} className="ml-auto text-xs font-semibold border border-green-600 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1 rounded-lg">↓ Excel</button>
            </div>
            <div className={cardBase}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#1F3864]">
                      {['Código','UBO','Clase','Tipo de unidad','Marca','Año','Operatividad','Horómetro','Km','Estado uso','Ficha int.','Int. hist.'].map(h=>(
                        <th key={h} className="px-3 py-2 text-left font-bold text-white uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lista.slice(0,400).map((e,i)=>{
                      const ficha=getFicha(e.codigo)
                      const numInt=(e.fichas_intervencion||[]).length
                      const esOp=e.estado_maq==='OPERATIVO'
                      return (
                        <tr key={i} className={`border-b border-slate-100 hover:bg-blue-50 cursor-pointer ${i%2===0?'bg-white':'bg-slate-50'}`}
                          onClick={()=>setActivoSel(e)}>
                          <td className="px-3 py-1.5 font-mono font-bold text-slate-700">{e.codigo}</td>
                          <td className="px-3 py-1.5 font-medium text-slate-600">{e.ubo}</td>
                          <td className="px-3 py-1.5">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${e.clasificacion==='MP'?'bg-amber-100 text-amber-800':'bg-blue-100 text-blue-800'}`}>{e.clasificacion}</span>
                          </td>
                          <td className="px-3 py-1.5 text-slate-700">{e.tipo_unidad}</td>
                          <td className="px-3 py-1.5 text-slate-500">{e.marca}</td>
                          <td className="px-3 py-1.5 text-slate-400 text-center">{e.anio_fab||'—'}</td>
                          <td className="px-3 py-1.5">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${esOp?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                              {esOp?'✓ OPER.':'✗ INOP.'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-center text-amber-700 font-semibold">{e.horometro||'—'}</td>
                          <td className="px-3 py-1.5 text-center text-blue-700">{e.kilometraje||'—'}</td>
                          <td className="px-3 py-1.5">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${e.disponible?'bg-green-100 text-green-800':'bg-red-100 text-red-700'}`}>
                              {e.disponible?'Disponible':'En uso'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5">
                            {ficha?<span className="inline-block bg-purple-50 border border-purple-200 text-purple-800 rounded px-2 py-0.5 font-semibold text-xs">{ficha}</span>
                                  :<span className="text-slate-300 italic">Sin ficha</span>}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {numInt>0?<span className="inline-block bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 font-bold text-xs">{numInt}</span>
                                     :<span className="text-slate-300 text-xs">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="px-3 py-2 bg-slate-50 text-xs text-slate-400 border-t">
                  {lista.length>400?`Mostrando 400 de ${lista.length} · Aplica filtros para acotar`:`Total: ${lista.length} unidades`}
                  {' · '}<span className="text-blue-600">Clic en una fila para ver historial completo</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ModalActivo equipo={activoSel} onClose={()=>setActivoSel(null)}/>
    </div>
  )
}
