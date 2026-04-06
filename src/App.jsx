import { useState, useCallback, useRef, useMemo } from 'react'
import { useData } from './hooks/useData'
import { FilterBar, KpiCard } from './components'
import Gerencial from './pages/Gerencial'
import Detalle from './pages/Detalle'
import Distribucion from './pages/Distribucion'
import Maquinaria from './pages/Maquinaria'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { fmt, pct, ACT_LABELS } from './utils/data'
import './index.css'

const TABS = [
  {id:'gerencial',label:'🏛 Gerencial'},
  {id:'resumen',label:'📊 Resumen'},
  {id:'detalle',label:'📋 Detalle'},
  {id:'maquinaria',label:'🚜 Maquinaria'},
  {id:'distribucion',label:'📦 Distribución Maq.'},
]

const COLS=['#10B981','#F59E0B','#3B82F6','#EF4444','#8B5CF6','#888780']

function Resumen({ filtered, stats }) {
  const depData = useMemo(()=>{const c={};filtered.forEach(r=>{c[r.dep]=(c[r.dep]||0)+1});return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([dep,v])=>({dep,v}))}, [filtered])
  const estData = [{name:'Ejecutada',v:stats.ej},{name:'En ejec.',v:stats.en},{name:'Programada',v:stats.pr},{name:'Paralizada',v:stats.pa}]
  const actData = useMemo(()=>{const c={};filtered.forEach(r=>{const k=r.act_label||'Otro';c[k]=(c[k]||0)+1});return Object.entries(c).map(([name,v])=>({name,v}))}, [filtered])
  const codData = useMemo(()=>{const c={};filtered.forEach(r=>{if(r.cod_act)c[r.cod_act]=(c[r.cod_act]||0)+1});return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([n,v])=>({n,v}))}, [filtered])
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2">
        <KpiCard label="Total" value={stats.tot.toLocaleString()} color="blue"/>
        <KpiCard label="Ejecutadas" value={stats.ej} sub={pct(stats.pctEjec*100)} color="teal"/>
        <KpiCard label="En ejecución" value={stats.en} color="amber"/>
        <KpiCard label="Programadas" value={stats.pr} color="blue"/>
        <KpiCard label="Paralizadas" value={stats.pa} color="red"/>
        <KpiCard label="M³ ejec." value={fmt(stats.m3)} color="purple" size="sm"/>
        <KpiCard label="KM meta" value={fmt(stats.mkm,1)} color="teal" size="sm"/>
        <KpiCard label="KM ejec." value={fmt(stats.akm,1)} sub={pct(stats.mkm?stats.akm/stats.mkm*100:0)} color="teal" size="sm"/>
        <KpiCard label="Avance prom." value={pct(stats.av)} color="teal" size="sm"/>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Por departamento</div>
          <ResponsiveContainer width="100%" height={340}><BarChart data={depData} layout="vertical" margin={{left:0,right:10}}><XAxis type="number" tick={{fontSize:9}}/><YAxis type="category" dataKey="dep" tick={{fontSize:9}} width={90}/><Tooltip/><Bar dataKey="v" fill="#3B82F6" radius={[0,3,3,0]}/></BarChart></ResponsiveContainer>
        </div>
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Por estado (universo activo)</div>
            <ResponsiveContainer width="100%" height={180}><PieChart><Pie data={estData} dataKey="v" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75}>{estData.map((_,i)=><Cell key={i} fill={COLS[i]}/>)}</Pie><Legend iconSize={9} formatter={v=><span className="text-xs">{v}</span>}/><Tooltip/></PieChart></ResponsiveContainer>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Por tipo de actividad</div>
            <ResponsiveContainer width="100%" height={150}><PieChart><Pie data={actData} dataKey="v" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={65}>{actData.map((_,i)=><Cell key={i} fill={COLS[i%COLS.length]}/>)}</Pie><Legend iconSize={9} formatter={v=><span className="text-xs">{v}</span>}/><Tooltip/></PieChart></ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 rounded-xl p-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Detalle por COD_ACTIVIDAD</div>
        <ResponsiveContainer width="100%" height={160}><BarChart data={codData}><XAxis dataKey="n" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}}/><Tooltip/><Bar dataKey="v" radius={[3,3,0,0]}>{codData.map((_,i)=><Cell key={i} fill={COLS[i%COLS.length]}/>)}</Bar></BarChart></ResponsiveContainer>
      </div>
    </div>
  )
}

export default function App() {
  const data = useData()
  const [tab, setTab] = useState('gerencial')
  const [dark, setDark] = useState(false)
  const dropRef = useRef()

  const handleFiles = useCallback((files) => { if (files&&files.length>0) data.loadFiles(files) }, [data])
  const onDrop = useCallback((e)=>{ e.preventDefault(); dropRef.current?.classList.remove('border-blue-500'); handleFiles(e.dataTransfer.files) }, [handleFiles])

  if (!data.raw.length && !data.loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 gap-4 ${dark?'dark bg-slate-900':'bg-slate-50'}`}>
        <div ref={dropRef} className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center max-w-lg w-full cursor-pointer hover:border-blue-400 transition-all"
          onClick={()=>document.getElementById('fi').click()}
          onDragOver={e=>{e.preventDefault();dropRef.current?.classList.add('border-blue-500')}}
          onDragLeave={()=>dropRef.current?.classList.remove('border-blue-500')}
          onDrop={onDrop}>
          <div className="text-5xl mb-4">📊</div>
          <h1 className="text-xl font-extrabold text-slate-700 dark:text-slate-200 mb-2">Dashboard PNC · Maquinarias</h1>
          <p className="text-sm text-slate-500 mb-6">Carga el Excel exportado del sistema Main Maquinarias<br/><span className="text-xs">Puedes cargar varios archivos · También el inventario de maquinarias</span></p>
          <button className="bg-[#1F3864] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-800 transition-colors" onClick={e=>{e.stopPropagation();document.getElementById('fi').click()}}>Seleccionar archivo(s) Excel</button>
          <p className="text-xs text-slate-400 mt-3">Arrastra y suelta aquí · .xlsx · .xls</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 max-w-lg w-full text-xs text-slate-600">
          <strong>💡 Multi-archivo:</strong> Selecciona el Excel de intervenciones + el inventario de maquinarias juntos. El sistema detecta automáticamente cuál es cuál por sus columnas.
        </div>
        <input id="fi" type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={e=>handleFiles(e.target.files)}/>
      </div>
    )
  }

  if (data.loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${dark?'dark bg-slate-900':'bg-slate-50'}`}>
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"/>
        <p className="text-sm text-slate-500">{data.loadingTxt}</p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${dark?'dark bg-slate-900 text-slate-100':'bg-slate-50 text-slate-900'}`}>
      <div className="bg-[#1F3864] px-4 py-2 flex items-center gap-3 flex-wrap sticky top-0 z-40">
        <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded">PNC</span>
        <span className="text-sm font-medium text-blue-200 flex-1 truncate">Estado de Maquinarias — {data.fileName}</span>
        <span className="text-xs text-blue-300">{data.raw.length.toLocaleString()} registros</span>
        <button onClick={()=>setDark(!dark)} className="text-blue-200 hover:text-white text-xs border border-blue-400 px-2 py-1 rounded">{dark?'☀️ Claro':'🌙 Oscuro'}</button>
        <button onClick={data.reset} className="text-blue-200 hover:text-white text-xs border border-blue-400 px-2 py-1 rounded">📂 Nuevo</button>
      </div>
      <FilterBar ubos={data.ubos} deps={data.deps} anios={data.anios} curAnio={data.curAnio} curMes={data.curMes} curUBO={data.curUBO} curDep={data.curDep} curTipo={data.curTipo} setCurAnio={data.setCurAnio} setCurMes={data.setCurMes} setCurUBO={data.setCurUBO} setCurDep={data.setCurDep} setCurTipo={data.setCurTipo} count={data.filtered.length} total={data.raw.length}/>
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 flex gap-1 overflow-x-auto sticky top-[76px] z-30">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${tab===t.id?'border-blue-500 text-[#1F3864] dark:text-blue-400 font-bold':'border-transparent text-slate-500 hover:text-slate-700'}`}>{t.label}</button>
        ))}
      </div>
      <div className="min-h-[60vh]">
        {tab==='gerencial'   &&<Gerencial filtered={data.filtered} stats={data.stats}/>}
        {tab==='resumen'     &&<Resumen filtered={data.filtered} stats={data.stats}/>}
        {tab==='detalle'     &&<Detalle filtered={data.filtered} raw={data.raw}/>}
        {tab==='maquinaria'  &&<Maquinaria inventario={data.inventario}/>}
        {tab==='distribucion'&&<Distribucion filtered={data.filtered} inventario={data.inventario} raw={data.raw}/>}
      </div>
    </div>
  )
}
