import { useState, useCallback, useRef, useMemo } from 'react'
import { useData } from './hooks/useData'
import { FilterBar, KpiCard } from './components'
import Gerencial from './pages/Gerencial'
import Detalle from './pages/Detalle'
import Distribucion from './pages/Distribucion'
import Maquinaria from './pages/Maquinaria'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { fmt, pct } from './utils/data'
import './index.css'
import { MvcsLogo } from './components/MvcsLogo'
import { Footer } from './components/Footer'

const TABS = [
  {id:'gerencial', label:'🏛', full:'Gerencial'},
  {id:'resumen',   label:'📊', full:'Resumen'},
  {id:'detalle',   label:'📋', full:'Detalle'},
  {id:'maquinaria',label:'🚜', full:'Maquinaria'},
  {id:'distribucion',label:'📦', full:'Distribución'},
]
const COLS=['#10B981','#F59E0B','#3B82F6','#EF4444','#8B5CF6','#888780']

// ── RESUMEN ──────────────────────────────────────────
function Resumen({ filtered, stats }) {
  const depData = useMemo(()=>{const c={};filtered.forEach(r=>{c[r.dep]=(c[r.dep]||0)+1});return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([dep,v])=>({dep,v}))}, [filtered])
  const estData = [{name:'Ejecutada',v:stats.ej},{name:'En ejec.',v:stats.en},{name:'Programada',v:stats.pr},{name:'Paralizada',v:stats.pa}]
  const actData = useMemo(()=>{const c={};filtered.forEach(r=>{const k=r.act_label||'Otro';c[k]=(c[k]||0)+1});return Object.entries(c).map(([name,v])=>({name,v}))}, [filtered])
  const codData = useMemo(()=>{const c={};filtered.forEach(r=>{if(r.cod_act)c[r.cod_act]=(c[r.cod_act]||0)+1});return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([n,v])=>({n,v}))}, [filtered])
  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
      {/* KPIs — 2 cols mobile, 3 tablet, 9 desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
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
      {/* Charts — 1 col mobile, 2 desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Por departamento</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={depData} layout="vertical" margin={{left:0,right:10}}>
              <XAxis type="number" tick={{fontSize:9}}/><YAxis type="category" dataKey="dep" tick={{fontSize:9}} width={85}/><Tooltip/><Bar dataKey="v" fill="#3B82F6" radius={[0,3,3,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Por estado</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart><Pie data={estData} dataKey="v" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65}>{estData.map((_,i)=><Cell key={i} fill={COLS[i]}/>)}</Pie><Legend iconSize={9} formatter={v=><span className="text-xs">{v}</span>}/><Tooltip/></PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Por tipo de actividad</div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart><Pie data={actData} dataKey="v" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55}>{actData.map((_,i)=><Cell key={i} fill={COLS[i%COLS.length]}/>)}</Pie><Legend iconSize={9} formatter={v=><span className="text-xs">{v}</span>}/><Tooltip/></PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Detalle COD_ACTIVIDAD</div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={codData}><XAxis dataKey="n" tick={{fontSize:9}}/><YAxis tick={{fontSize:9}}/><Tooltip/><Bar dataKey="v" radius={[3,3,0,0]}>{codData.map((_,i)=><Cell key={i} fill={COLS[i%COLS.length]}/>)}</Bar></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── APP ───────────────────────────────────────────────
export default function App() {
  const data = useData()
  const [tab, setTab] = useState('gerencial')
  // Modo claro fijo — identidad visual MVCS
  const [menuOpen, setMenuOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstall, setShowInstall] = useState(false)

  // PWA install prompt
  useState(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstall(true)
    })
  })

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    setShowInstall(false)
    setInstallPrompt(null)
  }
  const dropRef = useRef()

  const handleFiles = useCallback((files) => { if(files&&files.length>0) data.loadFiles(files) }, [data])
  const onDrop = useCallback((e)=>{ e.preventDefault(); dropRef.current?.classList.remove('border-blue-500'); handleFiles(e.dataTransfer.files) }, [handleFiles])

  // ── UPLOAD ──────────────────────────────────────────
  if (!data.raw.length && !data.loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-100">
        {/* Header en pantalla de carga */}
        <header>
          <div className="bg-red-700 h-1 w-full"/>
          <div className="bg-[#1F3864] px-4 py-2 flex items-center gap-3">
            <MvcsLogo size="sm"/>
            <div className="w-px h-8 bg-blue-600 hidden sm:block"/>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-white">Dashboard PNC Maquinarias</div>
              <div className="text-xs text-blue-300">Programa Nuestras Ciudades</div>
            </div>
            <div className="flex-1"/>

          </div>
          <div className="bg-gradient-to-r from-red-700 via-blue-800 to-red-700 h-0.5 w-full"/>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 gap-4">
        <div ref={dropRef}
          className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-8 sm:p-12 text-center max-w-lg w-full cursor-pointer hover:border-blue-400 transition-all"
          onClick={()=>document.getElementById('fi').click()}
          onDragOver={e=>{e.preventDefault();dropRef.current?.classList.add('border-blue-500')}}
          onDragLeave={()=>dropRef.current?.classList.remove('border-blue-500')}
          onDrop={onDrop}>
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📊</div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-700 dark:text-slate-200 mb-2">Dashboard PNC · Maquinarias</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 sm:mb-6 leading-relaxed">
            Carga el Excel exportado del sistema Main Maquinarias<br/>
            <span className="text-xs">Puedes cargar varios archivos · También el inventario de maquinarias</span>
          </p>
          <button className="bg-[#1F3864] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-800 transition-colors w-full sm:w-auto"
            onClick={e=>{e.stopPropagation();document.getElementById('fi').click()}}>
            Seleccionar archivo(s) Excel
          </button>
          <p className="text-xs text-slate-400 mt-3">Arrastra y suelta aquí · .xlsx · .xls</p>
        </div>
        <div className="bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-600 rounded-xl p-3 max-w-lg w-full text-xs text-slate-600 dark:text-slate-400">
          <strong>💡 Multi-archivo:</strong> Selecciona el Excel de intervenciones + el inventario de maquinarias juntos. El sistema detecta automáticamente cuál es cuál.
        </div>
          <input id="fi" type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={e=>handleFiles(e.target.files)}/>
        </div>
        <Footer/>
      </div>
    )
  }

  // ── LOADING ─────────────────────────────────────────
  if (data.loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-100">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"/>
        <p className="text-sm text-slate-500 text-center px-4">{data.loadingTxt}</p>
      </div>
    )
  }

  // ── DASHBOARD ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">

      {/* HEADER INSTITUCIONAL MVCS */}
      <header className="sticky top-0 z-40">
        {/* Franja roja superior - igual al sistema MVCS */}
        <div className="bg-red-700 h-1 w-full"/>
        {/* Barra principal azul marino */}
        <div className="bg-[#1F3864] px-3 sm:px-5 py-2 flex items-center gap-3">
          {/* Logo MVCS */}
          <MvcsLogo size="sm"/>
          {/* Separador vertical */}
          <div className="w-px h-8 bg-blue-600 hidden sm:block flex-shrink-0"/>
          {/* Título del sistema */}
          <div className="hidden sm:block flex-shrink-0">
            <div className="text-xs font-bold text-white leading-none">Dashboard PNC Maquinarias</div>
            <div className="text-xs text-blue-300 leading-none mt-0.5 truncate max-w-[200px]">{data.fileName || 'Carga tu Excel para comenzar'}</div>
          </div>
          {/* Spacer */}
          <div className="flex-1"/>
          {/* Registros */}
          {data.raw.length > 0 && (
            <span className="text-xs text-blue-300 hidden sm:block flex-shrink-0">
              {data.raw.length.toLocaleString()} registros
            </span>
          )}
          {/* Acciones */}

          <button onClick={data.reset}
            className="text-blue-200 hover:text-white text-xs border border-blue-600 px-2 py-1 rounded flex-shrink-0 transition-colors">
            📂 Nuevo
          </button>
        </div>
        {/* Línea inferior decorativa */}
        <div className="bg-gradient-to-r from-red-700 via-blue-800 to-red-700 h-0.5 w-full"/>
      </header>

      {/* FILTER BAR — scrollable on mobile */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 sm:px-4 py-2 overflow-x-auto sticky top-10 z-30">
        <FilterBar
          ubos={data.ubos} deps={data.deps} anios={data.anios}
          curAnio={data.curAnio} curMes={data.curMes} curUBO={data.curUBO}
          curDep={data.curDep} curTipo={data.curTipo}
          setCurAnio={data.setCurAnio} setCurMes={data.setCurMes}
          setCurUBO={data.setCurUBO} setCurDep={data.setCurDep} setCurTipo={data.setCurTipo}
          count={data.filtered.length} total={data.raw.length}
        />
      </div>

      {/* TABS — scroll horizontal en mobile, iconos en pantallas pequeñas */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-[76px] z-30">
        <div className="flex overflow-x-auto px-2 sm:px-4 scrollbar-hide">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`flex items-center gap-1 px-2 sm:px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all flex-shrink-0 ${tab===t.id?'border-[#CC1C2C] text-[#CC1C2C] font-bold':'border-transparent text-slate-500 hover:text-slate-700 hover:text-slate-600'}`}>
              <span>{t.label}</span>
              {/* Texto completo en sm+, solo icono en mobile */}
              <span className="hidden sm:inline">{t.full}</span>
            </button>
          ))}
        </div>
      </div>

      {/* PAGES */}
      <div className="min-h-[60vh]">
        {tab==='gerencial'    && <Gerencial    filtered={data.filtered} stats={data.stats}/>}
        {tab==='resumen'      && <Resumen      filtered={data.filtered} stats={data.stats}/>}
        {tab==='detalle'      && <Detalle      filtered={data.filtered} raw={data.raw}/>}
        {tab==='maquinaria'   && <Maquinaria   inventario={data.inventario} raw={data.raw} curUBO={data.curUBO}/>}
        {tab==='distribucion' && <Distribucion filtered={data.filtered} inventario={data.inventario} raw={data.raw}/>}
      </div>

      {/* BOTTOM NAV — solo en mobile (fijo abajo) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex sm:hidden z-40 shadow-lg">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-all ${tab===t.id?'text-blue-600 dark:text-blue-400':'text-slate-400'}`}>
            <span className="text-lg leading-none">{t.label}</span>
            <span className="text-[9px] font-medium">{t.full}</span>
          </button>
        ))}
      </div>

      {/* PWA Install Banner */}
      {showInstall && (
        <div className="pwa-banner">
          <span>📱</span>
          <span style={{flex:1}}>Instalar <strong>Dashboard PNC</strong> en tu dispositivo</span>
          <button className="install" onClick={handleInstall}>Instalar</button>
          <button className="close" onClick={()=>setShowInstall(false)}>✕</button>
        </div>
      )}

      {/* Footer institucional */}
      <Footer/>
      {/* Espaciado inferior en mobile para el nav */}
      <div className="h-14 sm:hidden"/>
    </div>
  )
}
