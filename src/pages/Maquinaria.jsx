import { useState, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function Maquinaria({ inventario, raw, onOpenPanel }) {
  const [filtro, setFiltro] = useState('TODOS')
  const [busq, setBusq] = useState('')
  const [uboSel, setUboSel] = useState('TODOS')
  const [panelEq, setPanelEq] = useState(null) // equipo seleccionado para panel

  const total = inventario.length
  const disp = inventario.filter(e=>e.disponible).length
  const enUso = inventario.filter(e=>e.en_uso).length
  const mp = inventario.filter(e=>e.clasificacion==='MP')
  const vp = inventario.filter(e=>e.clasificacion==='VP')
  const mpDisp = mp.filter(e=>e.disponible).length
  const vpDisp = vp.filter(e=>e.disponible).length

  const ubos = useMemo(()=>[...new Set(inventario.map(e=>e.ubo).filter(Boolean))].sort(),[inventario])
  const uboData = useMemo(()=>ubos.map(ubo=>{
    const ub=inventario.filter(e=>e.ubo===ubo)
    const mpU=ub.filter(e=>e.clasificacion==='MP'), vpU=ub.filter(e=>e.clasificacion==='VP')
    return {ubo,total:ub.length,mp:mpU.length,mpDisp:mpU.filter(e=>e.disponible).length,mpUso:mpU.filter(e=>e.en_uso).length,vp:vpU.length,vpDisp:vpU.filter(e=>e.disponible).length,vpUso:vpU.filter(e=>e.en_uso).length}
  }),[inventario,ubos])

  const mpTipos = useMemo(()=>{const c={};mp.forEach(e=>c[e.tipo_unidad]=(c[e.tipo_unidad]||0)+1);return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([n,v])=>({n:n.replace('HIDRAULICA','HID.').slice(0,14),v}))},[mp])
  const vpTipos = useMemo(()=>{const c={};vp.forEach(e=>c[e.tipo_unidad]=(c[e.tipo_unidad]||0)+1);return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([n,v])=>({n:n.replace('(CAMA BAJA)','').trim().slice(0,14),v}))},[vp])

  // Lista filtrada
  const lista = useMemo(()=>{
    let r = inventario
    if (filtro==='DISPONIBLE') r=r.filter(e=>e.disponible)
    else if (filtro==='EN USO') r=r.filter(e=>e.en_uso)
    else if (filtro==='MP') r=r.filter(e=>e.clasificacion==='MP')
    else if (filtro==='VP') r=r.filter(e=>e.clasificacion==='VP')
    if (uboSel!=='TODOS') r=r.filter(e=>e.ubo===uboSel)
    if (busq) { const q=busq.toLowerCase(); r=r.filter(e=>[e.codigo,e.tipo_unidad,e.ubo,e.marca,e.fichas_intervencion?.map(f=>f.ficha).join(' ')].join(' ').toLowerCase().includes(q)) }
    return r
  },[inventario,filtro,uboSel,busq])

  const exportExcel = useCallback(()=>{
    const headers=['Código','Clasificación','Tipo de Unidad','Marca','Modelo','UBO','Estado','Ficha de Intervención','N° Intervención','Estado Intervención','F. Inicio','F. Fin']
    const data = lista.flatMap(e=>{
      if (e.fichas_intervencion && e.fichas_intervencion.length > 0) {
        return e.fichas_intervencion.map(f=>[e.codigo,e.clasificacion,e.tipo_unidad,e.marca,e.modelo,e.ubo,e.estado_uso,f.ficha,f.num,f.estado,f.f_ini,f.f_fin])
      }
      return [[e.codigo,e.clasificacion,e.tipo_unidad,e.marca,e.modelo,e.ubo,e.estado_uso,'—','—','—','—','—']]
    })
    const wb=XLSX.utils.book_new()
    const ws=XLSX.utils.aoa_to_sheet([
      ['INVENTARIO MAQUINARIAS PNC — CON FICHAS DE INTERVENCIÓN'],
      [`Total: ${lista.length} equipos · MP: ${lista.filter(e=>e.clasificacion==='MP').length} · VP: ${lista.filter(e=>e.clasificacion==='VP').length}`],
      [`Generado: ${new Date().toLocaleDateString('es-PE')}`],[],
      headers,...data
    ])
    ws['!cols']=[{wch:16},{wch:14},{wch:28},{wch:20},{wch:16},{wch:14},{wch:14},{wch:32},{wch:10},{wch:22},{wch:12},{wch:12}]
    XLSX.utils.book_append_sheet(wb,ws,'Inventario')
    XLSX.writeFile(wb,`PNC_Inventario_${new Date().toISOString().slice(0,10)}.xlsx`)
  },[lista])

  const exportPDF = useCallback(()=>{
    const fecha = new Date().toLocaleDateString('es-PE')
    const tbody = lista.slice(0,300).map((e,i)=>{
      const fichaCell = e.fichas_intervencion && e.fichas_intervencion.length > 0
        ? e.fichas_intervencion.map(f=>`<div style="font-size:8px;color:#3C3489;font-weight:600">${f.ficha}</div><div style="font-size:7px;color:#888">N°${f.num} · ${f.estado} · ${f.f_ini}</div>`).join('')
        : '<span style="color:#94A3B8">Sin ficha</span>'
      return `<tr style="background:${i%2===0?'#F8FAFC':'white'}">
        <td style="font-family:monospace;font-weight:700;color:#1F3864">${e.codigo}</td>
        <td><span style="background:${e.clasificacion==='MP'?'#FAEEDA':'#EBF3FB'};color:${e.clasificacion==='MP'?'#633806':'#0C447C'};padding:1px 6px;border-radius:20px;font-size:8px;font-weight:700">${e.clasificacion}</span></td>
        <td>${e.tipo_unidad}</td>
        <td style="color:#64748B">${e.marca}</td>
        <td style="font-weight:600">${e.ubo}</td>
        <td><span style="background:${e.disponible?'#E1F5EE':'#FAEEDA'};color:${e.disponible?'#085041':'#633806'};padding:1px 6px;border-radius:20px;font-size:8px;font-weight:700">${e.disponible?'DISPONIBLE':'EN USO'}</span></td>
        <td>${fichaCell}</td>
      </tr>`
    }).join('')
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:'Segoe UI',sans-serif;font-size:9px;padding:14px}
      h1{background:#1F3864;color:#fff;padding:10px 14px;border-radius:6px;font-size:13px;margin-bottom:8px}
      .kpis{display:flex;gap:8px;margin-bottom:8px}
      .kp{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:6px 10px;text-align:center;flex:1}
      .kp .v{font-size:18px;font-weight:800;color:#1F3864}.kp .l{font-size:7px;color:#64748B;text-transform:uppercase}
      table{width:100%;border-collapse:collapse}
      th{background:#1F3864;color:#fff;padding:5px 6px;text-align:left;font-size:7px;font-weight:700;text-transform:uppercase}
      td{padding:5px 6px;border-bottom:1px solid #F1F5F9;vertical-align:top}
      @media print{@page{margin:1cm;size:A4 landscape}}
    </style></head><body>
    <h1>Inventario Maquinarias PNC — MP | VP con Fichas de Intervención</h1>
    <div class="kpis">
      <div class="kp"><div class="v">${total}</div><div class="l">Total</div></div>
      <div class="kp"><div class="v" style="color:#10B981">${disp}</div><div class="l">Disponibles</div></div>
      <div class="kp"><div class="v" style="color:#F59E0B">${enUso}</div><div class="l">En uso</div></div>
      <div class="kp"><div class="v" style="color:#854F0B">${mp.length}</div><div class="l">MP</div></div>
      <div class="kp"><div class="v" style="color:#0C447C">${vp.length}</div><div class="l">VP</div></div>
    </div>
    <table><thead><tr><th>Código</th><th>Clasif.</th><th>Tipo de unidad</th><th>Marca</th><th>UBO</th><th>Estado</th><th>Ficha de intervención</th></tr></thead>
    <tbody>${tbody}</tbody></table>
    <div style="margin-top:8px;font-size:7px;color:#94A3B8;text-align:center;border-top:1px solid #E2E8F0;padding-top:6px">PNC Maquinarias · ${lista.length} equipos · ${fecha}</div>
    </body></html>`
    const w=window.open('','_blank','width=1200,height=750'); w.document.write(html); w.document.close(); w.onload=()=>{w.focus();w.print()}
  },[lista,total,disp,enUso,mp,vp])

  const sel='text-xs border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 bg-white dark:bg-slate-800 dark:text-slate-200'

  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
      {/* KPIs clickeables */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        {[
          {l:'Total inventario',v:total,s:'equipos',c:'blue',f:'TODOS'},
          {l:'Disponibles',v:disp,s:`${(disp/total*100).toFixed(1)}% libre`,c:'teal',f:'DISPONIBLE'},
          {l:'En uso',v:enUso,s:`${(enUso/total*100).toFixed(1)}% asignado`,c:'amber',f:'EN USO'},
          {l:'MP — Maq. Pesada',v:mp.length,s:`${mpDisp} disponibles`,c:'amber',f:'MP'},
          {l:'VP — Veh. Pesado',v:vp.length,s:`${vpDisp} disponibles`,c:'blue',f:'VP'},
        ].map(({l,v,s,c,f})=>(
          <div key={l} onClick={()=>setFiltro(filtro===f?'TODOS':f)}
            className={`bg-white dark:bg-slate-800 border-2 rounded-xl p-3 cursor-pointer transition-all ${filtro===f?`border-${c}-500 shadow-md ring-2 ring-${c}-200`:'border-slate-200 dark:border-slate-700 hover:border-slate-300'} border-t-4 border-t-${c}-500`}>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{l}</div>
            <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{v}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s}</div>
            {filtro===f && <div className="text-xs text-blue-600 font-bold mt-1">● Filtrando</div>}
          </div>
        ))}
      </div>

      {/* MP/VP Cards con gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {[
          {label:'MP — Maquinaria Pesada',data:mp,disp:mpDisp,uso:mp.length-mpDisp,color:'amber',tipos:mpTipos,fillColor:'#F59E0B'},
          {label:'VP — Vehículo Pesado',data:vp,disp:vpDisp,uso:vp.length-vpDisp,color:'blue',tipos:vpTipos,fillColor:'#3B82F6'},
        ].map(({label,data,disp:d,uso,color,tipos,fillColor})=>(
          <div key={label} className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden border-t-4 border-t-${color}-500`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-${color}-100 text-${color}-800`}>{data.length} equipos</span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3 sm:p-4">
              {[{l:'Total',v:data.length,c:''},{l:'Disponibles',v:d,c:'text-emerald-600'},{l:'En uso',v:uso,c:`text-${color}-600`}].map(({l,v,c})=>(
                <div key={l} className="text-center bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                  <div className={`text-xl font-extrabold ${c||'text-slate-800 dark:text-slate-100'}`}>{v}</div>
                  <div className="text-xs text-slate-400 uppercase">{l}</div>
                </div>
              ))}
            </div>
            <div className="px-4 pb-3">
              <div className="text-xs text-slate-400 mb-1">{(uso/data.length*100).toFixed(1)}% en uso</div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full bg-${color}-500 rounded-full transition-all duration-500`} style={{width:`${(uso/data.length*100).toFixed(1)}%`}}/>
              </div>
            </div>
            <div className="px-3 pb-3" style={{height:160}}>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={tipos} layout="vertical" margin={{left:0,right:10}}>
                  <XAxis type="number" tick={{fontSize:9}} hide/>
                  <YAxis type="category" dataKey="n" tick={{fontSize:9}} width={95}/>
                  <Tooltip/>
                  <Bar dataKey="v" fill={fillColor} radius={[0,3,3,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla por UBO */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Unidades por UBO — MP | VP</span>
          <button onClick={()=>{const wb=XLSX.utils.book_new();const h=['UBO','MP Total','MP Uso','MP Disp.','VP Total','VP Uso','VP Disp.','Total','% Uso'];const d=uboData.map(u=>[u.ubo,u.mp,u.mpUso,u.mpDisp,u.vp,u.vpUso,u.vpDisp,u.total,u.total?((u.mpUso+u.vpUso)/u.total*100).toFixed(0)+'%':'—']);const ws=XLSX.utils.aoa_to_sheet([h,...d]);XLSX.utils.book_append_sheet(wb,ws,'Por UBO');XLSX.writeFile(wb,'PNC_Inv_UBO.xlsx')}} className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">↓ Excel UBO</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900"><tr>{['UBO','MP Total','MP Uso','MP Disp.','VP Total','VP Uso','VP Disp.','Total','% Uso'].map(h=><th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>{uboData.map((u,i)=>(
              <tr key={i} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                <td className="px-3 py-2 font-semibold">{u.ubo}</td>
                <td className="px-3 py-2 text-center">{u.mp}</td>
                <td className="px-3 py-2 text-center text-amber-700 font-semibold">{u.mpUso}</td>
                <td className="px-3 py-2 text-center text-emerald-600 font-bold">{u.mpDisp}</td>
                <td className="px-3 py-2 text-center">{u.vp}</td>
                <td className="px-3 py-2 text-center text-blue-600 font-semibold">{u.vpUso}</td>
                <td className="px-3 py-2 text-center text-emerald-600 font-bold">{u.vpDisp}</td>
                <td className="px-3 py-2 text-center font-bold">{u.total}</td>
                <td className="px-3 py-2 text-center">{u.total?(((u.mpUso+u.vpUso)/u.total)*100).toFixed(0)+'%':'—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* Listado de unidades con Ficha de Intervención */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-3 sm:px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Listado de unidades</span>
          <input className="text-xs border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 dark:bg-slate-700 dark:text-slate-200 w-40" placeholder="Buscar código, tipo, UBO..." value={busq} onChange={e=>setBusq(e.target.value)}/>
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
          <button onClick={exportExcel} className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">↓ Excel</button>
          <button onClick={exportPDF} className="px-3 py-1 rounded-lg text-xs font-semibold border border-red-600 bg-red-50 text-red-700 hover:bg-red-100">↓ PDF</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>{['Código','Clasificación','Tipo de unidad','Marca','Modelo','UBO','Estado','Ficha de intervención'].map(h=>(
                <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {lista.slice(0,300).map((e,i)=>(
                <tr key={i} onClick={()=>setPanelEq(e)} className="border-b border-slate-100 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                  <td className="px-3 py-2 font-mono font-bold text-[#1F3864] dark:text-blue-300">{e.codigo}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${e.clasificacion==='MP'?'bg-amber-100 text-amber-800':'bg-blue-100 text-blue-800'}`}>{e.clasificacion}</span>
                  </td>
                  <td className="px-3 py-2">{e.tipo_unidad}</td>
                  <td className="px-3 py-2 text-slate-500">{e.marca}</td>
                  <td className="px-3 py-2 text-slate-400 text-xs">{e.modelo}</td>
                  <td className="px-3 py-2 font-semibold">{e.ubo}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${e.disponible?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800'}`}>
                      {e.disponible?'Disponible':'En uso'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {e.fichas_intervencion && e.fichas_intervencion.length > 0
                      ? e.fichas_intervencion.map((f,fi)=>(
                          <div key={fi} className="mb-0.5">
                            {f.enlace_ficha
                              ? <a href={f.enlace_ficha} target="_blank" rel="noreferrer" onClick={ev=>ev.stopPropagation()} className="text-blue-600 hover:underline font-semibold text-xs">{f.ficha}</a>
                              : <span className="font-semibold text-xs text-[#3C3489]">{f.ficha}</span>}
                            <span className="text-xs text-slate-400 ml-1">· N°{f.num} · {f.estado}</span>
                          </div>
                        ))
                      : <span className="text-xs text-slate-300">Sin ficha activa</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs text-slate-400 border-t border-slate-200 dark:border-slate-700">
            Total: {lista.length} unidades{lista.length>300?' · Mostrando 300':''}
          </div>
        </div>
      </div>

      {/* Panel lateral equipo */}
      {panelEq && <EquipoPanel equipo={panelEq} onClose={()=>setPanelEq(null)} raw={raw}/>}
    </div>
  )
}

// ── PANEL EQUIPO ──────────────────────────────────────
function EquipoPanel({ equipo: e, onClose, raw }) {
  const exportPDF = () => {
    const fichasHTML = e.fichas_intervencion && e.fichas_intervencion.length > 0
      ? e.fichas_intervencion.map(f => {
          const inter = raw?.find(r => r.ficha === f.ficha)
          return `<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px;margin-bottom:8px">
            <div style="font-weight:700;color:#3C3489;font-size:12px">${f.ficha}</div>
            <div style="font-size:10px;color:#64748B;margin-top:4px">N°: ${f.num} · UBO: ${f.ubo} · Estado: <b>${f.estado}</b></div>
            <div style="font-size:10px;color:#64748B">Período: ${f.f_ini} → ${f.f_fin}</div>
            ${inter ? `<div style="font-size:10px;color:#64748B">Avance: <b>${inter.porc_vol!=null?inter.porc_vol.toFixed(1)+'%':'—'}</b> · M³: ${inter.m3!=null?inter.m3.toLocaleString('es-PE',{maximumFractionDigits:0}):'—'}</div>` : ''}
          </div>`
        }).join('')
      : '<p style="color:#94A3B8;font-size:11px">Sin fichas de intervención activas</p>'

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:'Segoe UI',sans-serif;font-size:10px;padding:20px;max-width:500px}
      h1{background:#1F3864;color:#fff;padding:12px 16px;border-radius:8px;font-size:14px;margin-bottom:12px}
      .badge{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700}
      .sec{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #F1F5F9}
      .sec-title{font-size:9px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
      .row{display:flex;gap:8px;margin-bottom:4px}
      .lbl{font-size:10px;color:#64748B;min-width:120px}
      .val{font-size:10px;font-weight:600;color:#1E293B}
      @media print{@page{margin:1cm;size:A4 portrait}}
    </style></head><body>
    <h1>Ficha de Equipo — ${e.codigo}</h1>
    <div class="sec">
      <div class="sec-title">Datos del equipo</div>
      <div class="row"><span class="lbl">Código</span><span class="val" style="font-family:monospace">${e.codigo}</span></div>
      <div class="row"><span class="lbl">Clasificación</span><span class="val"><span class="badge" style="background:${e.clasificacion==='MP'?'#FAEEDA':'#EBF3FB'};color:${e.clasificacion==='MP'?'#633806':'#0C447C'}">${e.clasificacion}</span></span></div>
      <div class="row"><span class="lbl">Tipo de unidad</span><span class="val">${e.tipo_unidad}</span></div>
      <div class="row"><span class="lbl">Marca / Modelo</span><span class="val">${e.marca} ${e.modelo}</span></div>
      <div class="row"><span class="lbl">UBO</span><span class="val">${e.ubo}</span></div>
      <div class="row"><span class="lbl">Departamento</span><span class="val">${e.dep}</span></div>
      <div class="row"><span class="lbl">Estado</span><span class="val"><span class="badge" style="background:${e.disponible?'#E1F5EE':'#FAEEDA'};color:${e.disponible?'#085041':'#633806'}">${e.disponible?'DISPONIBLE':'EN USO'}</span></span></div>
    </div>
    <div class="sec">
      <div class="sec-title">Fichas de intervención vinculadas</div>
      ${fichasHTML}
    </div>
    <div style="font-size:8px;color:#94A3B8;text-align:center;border-top:1px solid #E2E8F0;padding-top:8px;margin-top:12px">PNC Maquinarias · ${new Date().toLocaleDateString('es-PE')}</div>
    </body></html>`
    const w=window.open('','_blank','width=600,height=800'); w.document.write(html); w.document.close(); w.onload=()=>{w.focus();w.print()}
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}/>
      <div className="fixed top-0 right-0 w-full sm:w-[420px] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 z-50 overflow-y-auto shadow-2xl">
        <div className="bg-[#1F3864] px-4 py-3 flex items-center justify-between sticky top-0">
          <div>
            <div className="text-white font-bold text-sm font-mono">{e.codigo}</div>
            <div className="text-blue-300 text-xs">{e.tipo_unidad}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportPDF} className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1 rounded-lg font-semibold transition-colors">↓ PDF</button>
            <button onClick={onClose} className="text-blue-200 hover:text-white text-xl px-2">✕</button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {/* Datos equipo */}
          <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Datos del equipo</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                {l:'Código',v:<span className="font-mono font-bold text-[#1F3864] dark:text-blue-300">{e.codigo}</span>},
                {l:'Clasificación',v:<span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${e.clasificacion==='MP'?'bg-amber-100 text-amber-800':'bg-blue-100 text-blue-800'}`}>{e.clasificacion}</span>},
                {l:'Tipo',v:e.tipo_unidad},
                {l:'Marca',v:e.marca},
                {l:'Modelo',v:e.modelo||'—'},
                {l:'UBO',v:<span className="font-semibold">{e.ubo}</span>},
                {l:'Departamento',v:e.dep},
                {l:'Estado',v:<span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${e.disponible?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800'}`}>{e.disponible?'Disponible':'En uso'}</span>},
              ].map(({l,v})=>(
                <div key={l} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                  <div className="text-xs text-slate-400 mb-0.5">{l}</div>
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200">{v}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Fichas vinculadas */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Fichas de intervención vinculadas
              <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs normal-case">
                {e.fichas_intervencion?.length||0} ficha{e.fichas_intervencion?.length!==1?'s':''}
              </span>
            </div>
            {e.fichas_intervencion && e.fichas_intervencion.length > 0
              ? e.fichas_intervencion.map((f,i)=>{
                  const inter = raw?.find(r=>r.ficha===f.ficha)
                  return (
                    <div key={i} className="bg-purple-50 dark:bg-slate-800 border border-purple-200 dark:border-slate-600 rounded-xl p-3 mb-2">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          {f.enlace_ficha
                            ? <a href={f.enlace_ficha} target="_blank" rel="noreferrer" className="text-sm font-bold text-purple-700 hover:underline">{f.ficha}</a>
                            : <span className="text-sm font-bold text-purple-700">{f.ficha}</span>}
                          <div className="text-xs text-slate-500 mt-0.5">N° {f.num}</div>
                        </div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${f.estado==='EJECUTADA'?'bg-emerald-100 text-emerald-800':f.estado.includes('EJEC')?'bg-amber-100 text-amber-800':'bg-blue-100 text-blue-800'}`}>{f.estado}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div className="flex gap-1"><span className="text-slate-400">UBO:</span><span className="font-medium">{f.ubo}</span></div>
                        <div className="flex gap-1"><span className="text-slate-400">Depto:</span><span className="font-medium">{f.dep}</span></div>
                        <div className="flex gap-1"><span className="text-slate-400">Inicio:</span><span className="font-medium">{f.f_ini||'—'}</span></div>
                        <div className="flex gap-1"><span className="text-slate-400">Fin:</span><span className="font-medium">{f.f_fin||'—'}</span></div>
                        {inter && <>
                          <div className="flex gap-1"><span className="text-slate-400">Avance:</span><span className={`font-bold ${inter.porc_vol!=null&&inter.porc_vol>=100?'text-emerald-600':inter.porc_vol!=null&&inter.porc_vol<20?'text-red-500':''}`}>{inter.porc_vol!=null?inter.porc_vol.toFixed(1)+'%':'—'}</span></div>
                          <div className="flex gap-1"><span className="text-slate-400">M³:</span><span className="font-medium">{inter.m3!=null?inter.m3.toLocaleString('es-PE',{maximumFractionDigits:0}):'—'}</span></div>
                        </>}
                      </div>
                    </div>
                  )
                })
              : <div className="text-center py-6 text-slate-400 text-sm">Sin fichas de intervención activas</div>
            }
          </div>
        </div>
      </div>
    </>
  )
}
