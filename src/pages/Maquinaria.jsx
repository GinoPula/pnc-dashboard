import { useState, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts'

// Colores institucionales MVCS
const COL_MP = '#B45309'   // Ámbar oscuro MP
const COL_VP = '#1D4ED8'   // Azul VP
const COL_DISP = '#15803D' // Verde disponible
const COL_USO  = '#DC2626' // Rojo en uso

export default function Maquinaria({ inventario, curUBO, raw }) {
  const [filtro, setFiltro] = useState('TODOS')
  const [busq, setBusq]   = useState('')
  const [uboSel, setUboSel] = useState('TODOS')

  // Cuando el filtro global de UBO cambia, sincronizar selector local
  const uboEfectivo = uboSel !== 'TODOS' ? uboSel : (curUBO !== 'TODOS' ? curUBO : 'TODOS')

  // Inventario filtrado por UBO efectivo
  const invFiltrado = useMemo(() =>
    uboEfectivo === 'TODOS' ? inventario : inventario.filter(e => e.ubo === uboEfectivo)
  , [inventario, uboEfectivo])

  // VP operacional = solo Volquete y Cisterna de Agua
  const VP_OPERACION = ["VOLQUETE", "CAMION CISTERNA DE AGUA"]
  const mp     = invFiltrado.filter(e => e.clasificacion === "MP")
  const vp     = invFiltrado.filter(e => e.clasificacion === "VP" && VP_OPERACION.includes(e.tipo_unidad))
  const totalOp = mp.length + vp.length
  const mpOp   = mp.filter(e => e.estado_maq === "OPERATIVO").length
  const mpInop = mp.filter(e => e.estado_maq === "INOPERATIVO").length
  const vpOp   = vp.filter(e => e.estado_maq === "OPERATIVO").length
  const vpInop = vp.filter(e => e.estado_maq === "INOPERATIVO").length
  // Disponible = OPERATIVO sin ficha activa (NO incluye INOPERATIVO)
  const mpDisp = mp.filter(e => e.estado_maq === "OPERATIVO" && e.disponible).length
  const vpDisp = vp.filter(e => e.estado_maq === "OPERATIVO" && e.disponible).length
  const total  = invFiltrado.length
  const enUso  = invFiltrado.filter(e => e.en_uso).length

  const ubos = useMemo(() => [...new Set(inventario.map(e => e.ubo).filter(Boolean))].sort(), [inventario])

  // Tabla por UBO
  const uboData = useMemo(() => {
    const lista = uboEfectivo === 'TODOS' ? ubos : [uboEfectivo]
    return lista.map(ubo => {
      const ub = inventario.filter(e => e.ubo === ubo)
      const mpU = ub.filter(e => e.clasificacion === 'MP')
      const vpU = ub.filter(e => e.clasificacion === 'VP' && ['VOLQUETE','CAMION CISTERNA DE AGUA'].includes(e.tipo_unidad))
      const mpOp = mpU.filter(e=>e.estado_maq==='OPERATIVO').length
      const vpOp = vpU.filter(e=>e.estado_maq==='OPERATIVO').length
      const mpIn = mpU.filter(e=>e.estado_maq==='INOPERATIVO').length
      const vpIn = vpU.filter(e=>e.estado_maq==='INOPERATIVO').length
      return {
        ubo,
        total: mpU.length + vpU.length,
        mp: mpU.length, mpOp, mpInop: mpIn, mpDisp: mpU.filter(e=>e.estado_maq==='OPERATIVO'&&e.disponible).length, mpUso: mpU.filter(e=>e.en_uso).length,
        vp: vpU.length, vpOp, vpInop: vpIn, vpDisp: vpU.filter(e=>e.estado_maq==='OPERATIVO'&&e.disponible).length, vpUso: vpU.filter(e=>e.en_uso).length,
      }
    })
  }, [inventario, ubos, uboEfectivo])

  // Gráfico MP — todos los tipos
  const mpTipos = useMemo(() => {
    const c = {}
    mp.forEach(e => { c[e.tipo_unidad] = (c[e.tipo_unidad]||0)+1 })
    return Object.entries(c).sort((a,b)=>b[1]-a[1])
      .map(([n,v]) => ({ n: n.replace('HIDRAULICA','HID.').replace('SOBRE ORUGA','S/ORUGA').slice(0,16), v }))
  }, [mp])

  // Gráfico VP — SOLO Volquete y Cisterna de Agua
  const vpTipos = useMemo(() => {
    const PERMITIDOS = ['VOLQUETE','CAMION CISTERNA DE AGUA']
    const c = {}
    vp.filter(e => PERMITIDOS.includes(e.tipo_unidad))
      .forEach(e => { c[e.tipo_unidad] = (c[e.tipo_unidad]||0)+1 })
    return Object.entries(c).map(([n,v]) => ({
      n: n === 'CAMION CISTERNA DE AGUA' ? 'CISTERNA AGUA' : n,
      v
    }))
  }, [vp])

  // Lista filtrada
  const lista = useMemo(() => {
    let r = invFiltrado
    if (filtro === 'DISPONIBLE') r = r.filter(e => e.disponible)
    else if (filtro === 'EN USO')    r = r.filter(e => e.en_uso)
    else if (filtro === 'MP')        r = r.filter(e => e.clasificacion === 'MP')
    else if (filtro === 'VP')        r = r.filter(e => e.clasificacion === 'VP')
    if (busq) {
      const q = busq.toLowerCase()
      r = r.filter(e => [e.codigo,e.tipo_unidad,e.ubo,e.marca].join(' ').toLowerCase().includes(q))
    }
    return r
  }, [invFiltrado, filtro, busq])

  // Cruzar con intervenciones para obtener ficha
  const getFicha = useCallback((codigo) => {
    if (!raw?.length) return null
    const inter = raw.find(r => r.maquinas?.some(m => m.cod === codigo))
    return inter ? inter.ficha : null
  }, [raw])

  // Export Excel
  const exportExcel = useCallback(() => {
    const headers = ['Código','Clasificación','Tipo de Unidad','Marca','Modelo','UBO','Estado','Ficha Intervención']
    const data = lista.map(e => [e.codigo, e.clasificacion, e.tipo_unidad, e.marca, e.modelo, e.ubo, e.estado_uso, getFicha(e.codigo)||'Sin ficha'])
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['INVENTARIO MAQUINARIAS PNC'],
      [`UBO: ${uboEfectivo} · Total: ${lista.length} · MP: ${lista.filter(e=>e.clasificacion==='MP').length} · VP: ${lista.filter(e=>e.clasificacion==='VP').length}`],
      [`Disponibles: ${lista.filter(e=>e.disponible).length} · En uso: ${lista.filter(e=>e.en_uso).length}`],
      [`Generado: ${new Date().toLocaleDateString('es-PE')}`],
      [],
      headers,
      ...data
    ])
    ws['!cols'] = [{wch:14},{wch:14},{wch:28},{wch:18},{wch:14},{wch:14},{wch:12},{wch:28}]
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
    XLSX.writeFile(wb, `PNC_Inventario_${uboEfectivo}_${new Date().toISOString().slice(0,10)}.xlsx`)
  }, [lista, uboEfectivo, getFicha])

  // Export PDF
  const exportPDF = useCallback(() => {
    const fecha = new Date().toLocaleDateString('es-PE')
    const rows = lista.map((e,i) => {
      const ficha = getFicha(e.codigo)
      const estColor = e.disponible ? '#15803D' : '#DC2626'
      return `<tr><td style="text-align:center">${i+1}</td><td style="font-family:monospace;font-weight:600">${e.codigo}</td><td><span style="padding:1px 6px;border-radius:10px;font-size:8px;font-weight:700;background:${e.clasificacion==='MP'?'#FEF3C7':'#DBEAFE'};color:${e.clasificacion==='MP'?'#92400E':'#1E40AF'}">${e.clasificacion}</span></td><td>${e.tipo_unidad}</td><td>${e.marca}</td><td>${e.ubo}</td><td style="color:${estColor};font-weight:700">${e.estado_uso}</td><td style="color:#7C3AED;font-size:8px">${ficha||'—'}</td></tr>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;font-size:9px;padding:14px;color:#1E293B}
    .header{background:#1F3864;padding:10px 16px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:10px}
    .red-line{background:#CC1C2C;height:4px;margin-bottom:10px}
    .escudo{width:28px;height:36px;flex-shrink:0}
    h1{color:#fff;font-size:13px;font-weight:800;flex:1}.sub{color:#B5D4F4;font-size:8px;margin-top:2px}
    .inst{color:#93C5FD;font-size:8px;text-align:right}
    .kpis{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap}
    .kp{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:5px 10px;text-align:center;flex:1}
    .kp-v{font-size:16px;font-weight:800;color:#1F3864}.kp-l{font-size:7px;color:#64748B;text-transform:uppercase}
    table{width:100%;border-collapse:collapse}
    th{background:#1F3864;color:#fff;padding:4px 5px;text-align:left;font-size:7px;font-weight:700;text-transform:uppercase}
    td{padding:4px 5px;border-bottom:1px solid #F1F5F9;font-size:8px;vertical-align:middle}
    tr:nth-child(even) td{background:#F8FAFC}
    .footer{margin-top:10px;padding-top:6px;border-top:2px solid #CC1C2C;display:flex;justify-content:space-between;font-size:7px;color:#94A3B8}
    @media print{@page{margin:1cm;size:A4 landscape}}
    </style></head><body>
    <div class="header">
      <svg class="escudo" viewBox="0 0 44 56" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="28" rx="21" ry="27" fill="#8B0000"/><ellipse cx="22" cy="28" rx="18" ry="23" fill="white"/><path d="M4 12 Q4 6 10 5 L16 5 L16 51 L10 51 Q4 50 4 44 Z" fill="#CC1C2C"/><path d="M40 12 Q40 6 34 5 L28 5 L28 51 L34 51 Q40 50 40 44 Z" fill="#CC1C2C"/><ellipse cx="22" cy="26" rx="8" ry="10" fill="#1E3A8A"/><path d="M20 28 Q22 24 24 28 L23 28 L23 32 L21 32 L21 28Z" fill="#16A34A"/></svg>
      <div style="flex:1"><h1>Inventario de Maquinaria — ${uboEfectivo}</h1><div class="sub">Ministerio de Vivienda, Construcción y Saneamiento · Programa Nuestras Ciudades</div></div>
      <div class="inst">Coord. Nacional de Maquinarias<br/>${fecha}</div>
    </div>
    <div class="red-line"></div>
    <div class="kpis">
      <div class="kp"><div class="kp-v">${lista.length}</div><div class="kp-l">Total</div></div>
      <div class="kp"><div class="kp-v" style="color:#92400E">${lista.filter(e=>e.clasificacion==='MP').length}</div><div class="kp-l">MP</div></div>
      <div class="kp"><div class="kp-v" style="color:#1E40AF">${lista.filter(e=>e.clasificacion==='VP').length}</div><div class="kp-l">VP</div></div>
      <div class="kp"><div class="kp-v" style="color:#15803D">${lista.filter(e=>e.disponible).length}</div><div class="kp-l">Disponibles</div></div>
      <div class="kp"><div class="kp-v" style="color:#DC2626">${lista.filter(e=>e.en_uso).length}</div><div class="kp-l">En uso</div></div>
    </div>
    <table><thead><tr><th>#</th><th>Código</th><th>Clase</th><th>Tipo de unidad</th><th>Marca</th><th>UBO</th><th>Estado</th><th>Ficha intervención</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="footer">
      <span>Ministerio de Vivienda, Construcción y Saneamiento · MVCS · PNC Maquinarias</span>
      <span>Elaborado por: Ing. Gino Pulache · Dashboard PNC Maquinarias v1.0</span>
      <span>${fecha} · ${lista.length} equipos</span>
    </div>
    </body></html>`
    const w = window.open('','_blank','width=1200,height=750')
    w.document.write(html); w.document.close(); w.onload=()=>{w.focus();w.print()}
  }, [lista, uboEfectivo, getFicha])

  // ── ESTILOS ─────────────────────────────────────────
  const sel = 'text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-white cursor-pointer text-slate-700 focus:border-blue-500 focus:outline-none'
  const cardBase = 'bg-white border border-slate-200 rounded-xl overflow-hidden'

  return (
    <div className="p-3 sm:p-4 space-y-4 bg-slate-50 min-h-screen">

      {/* FILTRO UBO */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">UBO:</span>
          <select className={sel} value={uboSel} onChange={e => setUboSel(e.target.value)}>
            <option value="TODOS">Todos los UBOs</option>
            {ubos.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        {uboEfectivo !== 'TODOS' && (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
            📍 {uboEfectivo}
            <button onClick={()=>setUboSel('TODOS')} className="ml-1 hover:text-red-600">✕</button>
          </span>
        )}
        <span className="text-xs text-slate-400 ml-auto">{total} equipos encontrados</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {l:'Total Operacional', v:totalOp, s:'MP + VP en operación', c:'border-t-blue-600', vc:'text-blue-700'},
          {l:'MP — Maq. Pesada', v:mp.length, s:`Op:${mpOp} · Inop:${mpInop}`, c:'border-t-amber-600', vc:'text-amber-700'},
          {l:'VP — Veh. Pesado', v:vp.length, s:`Op:${vpOp} · Inop:${vpInop}`, c:'border-t-blue-500', vc:'text-blue-700'},
          {l:'MP Disponibles', v:mpDisp, s:'operativos sin ficha', c:'border-t-green-600', vc:'text-green-700'},
          {l:'VP Disponibles', v:vpDisp, s:'operativos sin ficha', c:'border-t-green-500', vc:'text-green-600'},
        ].map(({l,v,s,c,vc}) => (
          <div key={l} className={`${cardBase} border-t-4 ${c} p-3`}>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{l}</div>
            <div className={`text-2xl font-extrabold ${vc}`}>{v}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s}</div>
          </div>
        ))}
      </div>

      {/* MP/VP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* MP Card */}
        <div className={`${cardBase} border-t-4 border-t-amber-500`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div>
              <span className="font-bold text-slate-700 text-sm">MP — Maquinaria Pesada</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">{mp.length} equipos</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            {[{l:'Total',v:mp.length,c:'text-slate-700'},{l:'Disponibles',v:mpDisp,c:'text-green-700 font-bold'},{l:'En uso',v:mp.length-mpDisp,c:'text-red-600 font-bold'}].map(({l,v,c})=>(
              <div key={l} className="text-center bg-slate-50 rounded-lg p-2">
                <div className={`text-xl font-extrabold ${c}`}>{v}</div>
                <div className="text-xs text-slate-400 uppercase">{l}</div>
              </div>
            ))}
          </div>
          {/* Barra uso */}
          <div className="px-4 pb-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Uso: {mp.length?(((mp.length-mpDisp)/mp.length)*100).toFixed(0):0}%</span>
              <span>{mp.length-mpDisp} en uso · {mpDisp} disponibles</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all"
                style={{width:`${mp.length?(((mp.length-mpDisp)/mp.length)*100).toFixed(0):0}%`}}/>
            </div>
          </div>
          {/* Gráfico con cantidades visibles */}
          <div className="px-3 pb-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">Tipos de equipo</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={mpTipos} layout="vertical" margin={{left:0,right:35,top:2,bottom:2}}>
                <XAxis type="number" tick={{fontSize:8}} hide/>
                <YAxis type="category" dataKey="n" tick={{fontSize:9,fill:'#475569'}} width={100}/>
                <Tooltip cursor={{fill:'#FEF3C7'}} formatter={(v)=>[v,'Equipos']}/>
                <Bar dataKey="v" fill={COL_MP} radius={[0,4,4,0]} maxBarSize={18}>
                  <LabelList dataKey="v" position="right" style={{fontSize:10,fontWeight:700,fill:'#92400E'}}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* VP Card — solo Volquete y Cisterna Agua */}
        <div className={`${cardBase} border-t-4 border-t-blue-600`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div>
              <span className="font-bold text-slate-700 text-sm">VP — Vehículo Pesado</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">{vp.length} equipos</span>
            </div>
            <span className="text-xs text-slate-400 italic">Volquete + Cisterna Agua</span>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            {[{l:'Total VP',v:vp.length,c:'text-slate-700'},{l:'Disponibles',v:vpDisp,c:'text-green-700 font-bold'},{l:'En uso',v:vp.length-vpDisp,c:'text-blue-700 font-bold'}].map(({l,v,c})=>(
              <div key={l} className="text-center bg-slate-50 rounded-lg p-2">
                <div className={`text-xl font-extrabold ${c}`}>{v}</div>
                <div className="text-xs text-slate-400 uppercase">{l}</div>
              </div>
            ))}
          </div>
          {/* Barra uso */}
          <div className="px-4 pb-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Uso: {vp.length?(((vp.length-vpDisp)/vp.length)*100).toFixed(0):0}%</span>
              <span>{vp.length-vpDisp} en uso · {vpDisp} disponibles</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all"
                style={{width:`${vp.length?(((vp.length-vpDisp)/vp.length)*100).toFixed(0):0}%`}}/>
            </div>
          </div>
          {/* Gráfico solo Volquete y Cisterna */}
          <div className="px-3 pb-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">Volquete y Cisterna de Agua</div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={vpTipos} layout="vertical" margin={{left:0,right:35,top:2,bottom:2}}>
                <XAxis type="number" tick={{fontSize:8}} hide/>
                <YAxis type="category" dataKey="n" tick={{fontSize:10,fill:'#475569'}} width={110}/>
                <Tooltip cursor={{fill:'#DBEAFE'}} formatter={(v)=>[v,'Equipos']}/>
                <Bar dataKey="v" fill={COL_VP} radius={[0,4,4,0]} maxBarSize={22}>
                  <LabelList dataKey="v" position="right" style={{fontSize:11,fontWeight:700,fill:'#1E40AF'}}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TABLA UBO MP/VP */}
      <div className={cardBase}>
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3 flex-wrap bg-slate-50">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            Unidades por UBO — MP | VP
            {uboEfectivo !== 'TODOS' && <span className="ml-2 text-blue-600">· {uboEfectivo}</span>}
          </span>
          <button onClick={exportExcel} className="ml-auto text-xs font-semibold border border-green-600 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1 rounded-lg transition-colors">↓ Excel</button>
          <button onClick={exportPDF}   className="text-xs font-semibold border border-red-500 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors">↓ PDF</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1F3864]">
                {['UBO','MP Total','MP Op.','MP Inop.','MP Disp.','VP Total','VP Op.','VP Inop.','VP Disp.','Total'].map(h=>(
                  <th key={h} className="px-3 py-2 text-left font-bold text-white uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uboData.map((u,i)=>(
                <tr key={i} className={`border-b border-slate-100 hover:bg-blue-50 transition-colors ${i%2===0?'bg-white':'bg-slate-50'}`}>
                  <td className="px-3 py-2 font-semibold text-slate-700">{u.ubo}</td>
                  <td className="px-3 py-2 text-center font-medium">{u.mp}</td>
                  <td className="px-3 py-2 text-center text-green-700 font-semibold">{u.mpOp}</td>
                  <td className="px-3 py-2 text-center text-red-600 font-semibold">{u.mpInop}</td>
                  <td className="px-3 py-2 text-center text-blue-700 font-bold">{u.mpDisp}</td>
                  <td className="px-3 py-2 text-center font-medium">{u.vp}</td>
                  <td className="px-3 py-2 text-center text-green-700 font-semibold">{u.vpOp}</td>
                  <td className="px-3 py-2 text-center text-red-600 font-semibold">{u.vpInop}</td>
                  <td className="px-3 py-2 text-center text-blue-700 font-bold">{u.vpDisp}</td>
                  <td className="px-3 py-2 text-center font-bold text-slate-700">{u.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* LISTADO DE UNIDADES */}
      <div className={cardBase}>
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap gap-2 items-center bg-slate-50">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Listado de unidades</span>
          <input className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:border-blue-500 focus:outline-none"
            placeholder="Buscar código, tipo, UBO..." value={busq} onChange={e=>setBusq(e.target.value)} style={{width:180}}/>
          <select className={sel} value={filtro} onChange={e=>setFiltro(e.target.value)}>
            <option value="TODOS">Todos</option>
            <option value="DISPONIBLE">Disponibles</option>
            <option value="EN USO">En uso</option>
            <option value="MP">Solo MP</option>
            <option value="VP">Solo VP</option>
          </select>
          <span className="text-xs text-slate-400">{lista.length} unidades</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1F3864]">
                {['Ficha Intervención','Código','Clase','Tipo de unidad','Marca','Modelo','UBO','Estado'].map(h=>(
                  <th key={h} className="px-3 py-2 text-left font-bold text-white uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.slice(0,300).map((e,i)=>{
                const ficha = getFicha(e.codigo)
                return (
                  <tr key={i} className={`border-b border-slate-100 hover:bg-blue-50 transition-colors ${i%2===0?'bg-white':'bg-slate-50'}`}>
                    <td className="px-3 py-1.5">
                      {ficha
                        ? <span className="inline-block bg-purple-50 border border-purple-200 text-purple-800 rounded px-2 py-0.5 font-semibold">{ficha}</span>
                        : <span className="text-slate-300 italic">Sin ficha</span>
                      }
                    </td>
                    <td className="px-3 py-1.5 font-mono font-bold text-slate-700">{e.codigo}</td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${e.clasificacion==='MP'?'bg-amber-100 text-amber-800':'bg-blue-100 text-blue-800'}`}>
                        {e.clasificacion}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-slate-700">{e.tipo_unidad}</td>
                    <td className="px-3 py-1.5 text-slate-500">{e.marca}</td>
                    <td className="px-3 py-1.5 text-slate-400">{e.modelo}</td>
                    <td className="px-3 py-1.5 font-medium text-slate-600">{e.ubo}</td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${e.disponible?'bg-green-100 text-green-800':'bg-red-100 text-red-700'}`}>
                        {e.disponible?'Disponible':'En uso'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-3 py-2 bg-slate-50 text-xs text-slate-400 border-t border-slate-100">
            {lista.length > 300 ? `Mostrando 300 de ${lista.length} · Aplica filtros para acotar` : `Total: ${lista.length} unidades`}
          </div>
        </div>
      </div>
    </div>
  )
}
