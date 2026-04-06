import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function Maquinaria({ inventario }) {
  const [filtro, setFiltro] = useState('TODOS')
  const [busq, setBusq] = useState('')
  const [uboSel, setUboSel] = useState('TODOS')

  const total = inventario.length
  const disp = inventario.filter(e => e.disponible).length
  const enUso = inventario.filter(e => e.en_uso).length
  const mp = inventario.filter(e => e.clasificacion === 'MP')
  const vp = inventario.filter(e => e.clasificacion === 'VP')
  const mpDisp = mp.filter(e => e.disponible).length
  const vpDisp = vp.filter(e => e.disponible).length

  const ubos = useMemo(() => [...new Set(inventario.map(e => e.ubo).filter(Boolean))].sort(), [inventario])

  // UBO table
  const uboData = useMemo(() => {
    return ubos.map(ubo => {
      const ub = inventario.filter(e => e.ubo === ubo)
      const mpU = ub.filter(e => e.clasificacion === 'MP')
      const vpU = ub.filter(e => e.clasificacion === 'VP')
      return { ubo, total: ub.length, mp: mpU.length, mpDisp: mpU.filter(e=>e.disponible).length, mpUso: mpU.filter(e=>e.en_uso).length, vp: vpU.length, vpDisp: vpU.filter(e=>e.disponible).length, vpUso: vpU.filter(e=>e.en_uso).length }
    })
  }, [inventario, ubos])

  // Tipos MP/VP
  const mpTipos = useMemo(() => { const c={}; mp.forEach(e=>c[e.tipo_unidad]=(c[e.tipo_unidad]||0)+1); return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([n,v])=>({n:n.replace('HIDRAULICA','HID.').slice(0,14),v})) }, [mp])
  const vpTipos = useMemo(() => { const c={}; vp.forEach(e=>c[e.tipo_unidad]=(c[e.tipo_unidad]||0)+1); return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([n,v])=>({n:n.replace('(CAMA BAJA)','').trim().slice(0,14),v})) }, [vp])

  // Lista filtrada
  const lista = useMemo(() => {
    let r = inventario
    if (filtro==='DISPONIBLE') r=r.filter(e=>e.disponible)
    else if (filtro==='EN USO') r=r.filter(e=>e.en_uso)
    else if (filtro==='MP') r=r.filter(e=>e.clasificacion==='MP')
    else if (filtro==='VP') r=r.filter(e=>e.clasificacion==='VP')
    if (uboSel!=='TODOS') r=r.filter(e=>e.ubo===uboSel)
    if (busq) { const q=busq.toLowerCase(); r=r.filter(e=>[e.codigo,e.tipo_unidad,e.ubo,e.marca].join(' ').toLowerCase().includes(q)) }
    return r
  }, [inventario, filtro, uboSel, busq])

  const exportExcel = () => {
    const headers=['Código','Clasificación','Tipo de Unidad','Marca','Modelo','UBO','Estado']
    const data=inventario.map(e=>[e.codigo,e.clasificacion,e.tipo_unidad,e.marca,e.modelo,e.ubo,e.estado_uso])
    const wb=XLSX.utils.book_new()
    const ws=XLSX.utils.aoa_to_sheet([['INVENTARIO MAQUINARIAS PNC'],[`Total: ${total} · MP: ${mp.length} · VP: ${vp.length} · Disponibles: ${disp}`],[],headers,...data])
    ws['!cols']=[{wch:16},{wch:14},{wch:28},{wch:20},{wch:16},{wch:14},{wch:14}]
    XLSX.utils.book_append_sheet(wb,ws,'Inventario')
    XLSX.writeFile(wb,`PNC_Inventario_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const sel='text-xs border border-slate-300 rounded-md px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-600'

  return (
    <div className="p-4 space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[{l:'Total inventario',v:total,s:'equipos',c:'blue'},{l:'Disponibles',v:disp,s:`${(disp/total*100).toFixed(1)}% libre`,c:'teal'},{l:'En uso',v:enUso,s:`${(enUso/total*100).toFixed(1)}% asignado`,c:'amber'},{l:'MP — Maq. Pesada',v:mp.length,s:`${mpDisp} disponibles`,c:'amber'},{l:'VP — Veh. Pesado',v:vp.length,s:`${vpDisp} disponibles`,c:'blue'}].map(({l,v,s,c})=>(
          <div key={l} className={`bg-white dark:bg-slate-800 border border-slate-200 rounded-xl p-3 border-t-4 border-t-${c}-500`}>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{l}</div>
            <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{v}</div>
            <div className="text-xs text-slate-400">{s}</div>
          </div>
        ))}
      </div>

      {/* MP/VP Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[{label:'MP — Maquinaria Pesada',clasificacion:'MP',data:mp,disp:mpDisp,uso:mp.length-mpDisp,color:'amber',tipos:mpTipos},
          {label:'VP — Vehículo Pesado',clasificacion:'VP',data:vp,disp:vpDisp,uso:vp.length-vpDisp,color:'blue',tipos:vpTipos}].map(({label,data,disp:d,uso,color,tipos})=>(
          <div key={label} className={`bg-white dark:bg-slate-800 border border-slate-200 rounded-xl overflow-hidden border-t-4 border-t-${color}-500`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="font-bold text-slate-700 dark:text-slate-200">{label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-${color}-100 text-${color}-800`}>INVENTARIO</span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4">
              {[{l:'Total',v:data.length},{l:'Disponibles',v:d,c:'text-emerald-600'},{l:'En uso',v:uso,c:`text-${color}-600`}].map(({l,v,c})=>(
                <div key={l} className="text-center bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                  <div className={`text-xl font-extrabold ${c||'text-slate-800 dark:text-slate-100'}`}>{v}</div>
                  <div className="text-xs text-slate-400 uppercase">{l}</div>
                </div>
              ))}
            </div>
            <div className="px-4 pb-3">
              <div className="text-xs text-slate-400 mb-1">{(uso/data.length*100).toFixed(1)}% en uso</div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full bg-${color}-500 rounded-full`} style={{width:`${(uso/data.length*100).toFixed(1)}%`}}/>
              </div>
            </div>
            <div className="px-4 pb-4" style={{height:160}}>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={tipos} layout="vertical" margin={{left:0,right:10}}>
                  <XAxis type="number" tick={{fontSize:9}} hide/>
                  <YAxis type="category" dataKey="n" tick={{fontSize:9}} width={95}/>
                  <Tooltip/>
                  <Bar dataKey="v" fill={color==='amber'?'#F59E0B':'#3B82F6'} radius={[0,3,3,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla por UBO */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Unidades por UBO — MP | VP</span>
          <button onClick={exportExcel} className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">↓ Excel</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50"><tr>{['UBO','MP Total','MP Uso','MP Disp.','VP Total','VP Uso','VP Disp.','Total','% Uso'].map(h=><th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase border-b border-slate-200">{h}</th>)}</tr></thead>
            <tbody>{uboData.map((u,i)=>(
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-semibold">{u.ubo}</td>
                <td className="px-3 py-2 text-center">{u.mp}</td>
                <td className="px-3 py-2 text-center text-amber-700">{u.mpUso}</td>
                <td className="px-3 py-2 text-center text-emerald-600 font-bold">{u.mpDisp}</td>
                <td className="px-3 py-2 text-center">{u.vp}</td>
                <td className="px-3 py-2 text-center text-blue-600">{u.vpUso}</td>
                <td className="px-3 py-2 text-center text-emerald-600 font-bold">{u.vpDisp}</td>
                <td className="px-3 py-2 text-center font-bold">{u.total}</td>
                <td className="px-3 py-2 text-center">{u.total?(((u.mpUso+u.vpUso)/u.total)*100).toFixed(0)+'%':'—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* Lista equipos */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Listado de unidades</span>
          <input className="text-xs border border-slate-300 rounded-lg px-2 py-1 dark:bg-slate-700 dark:border-slate-600" placeholder="Buscar código, tipo, UBO..." value={busq} onChange={e=>setBusq(e.target.value)}/>
          <select className={sel} value={uboSel} onChange={e=>setUboSel(e.target.value)}>
            <option value="TODOS">Todos los UBOs</option>
            {ubos.map(u=><option key={u} value={u}>{u}</option>)}
          </select>
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
            <thead className="bg-slate-50"><tr>{['Código','Clasificación','Tipo de unidad','Marca','Modelo','UBO','Estado'].map(h=><th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase border-b border-slate-200">{h}</th>)}</tr></thead>
            <tbody>{lista.slice(0,300).map((e,i)=>(
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-1.5 font-mono font-semibold">{e.codigo}</td>
                <td className="px-3 py-1.5"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${e.clasificacion==='MP'?'bg-amber-100 text-amber-800':'bg-blue-100 text-blue-800'}`}>{e.clasificacion}</span></td>
                <td className="px-3 py-1.5">{e.tipo_unidad}</td>
                <td className="px-3 py-1.5 text-slate-500">{e.marca}</td>
                <td className="px-3 py-1.5 text-slate-400">{e.modelo}</td>
                <td className="px-3 py-1.5">{e.ubo}</td>
                <td className="px-3 py-1.5"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${e.disponible?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800'}`}>{e.disponible?'Disponible':'En uso'}</span></td>
              </tr>
            ))}</tbody>
          </table>
          <div className="px-3 py-2 bg-slate-50 text-xs text-slate-400 border-t border-slate-200">Total: {lista.length} unidades{lista.length>300?' · Mostrando 300':''}</div>
        </div>
      </div>
    </div>
  )
}
