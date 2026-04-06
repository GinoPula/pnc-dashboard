import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { KpiCard } from '../components'
import { fmt, pct, ACT_LABELS } from '../utils/data'

const COLORS_EST = ['#10B981','#F59E0B','#3B82F6','#EF4444']
const COLORS_ACT = ['#10B981','#EF4444','#3B82F6','#F59E0B','#8B5CF6']

export default function Gerencial({ filtered, stats }) {
  const depData = useMemo(() => {
    const cnt = {}
    filtered.forEach(r => { cnt[r.dep] = (cnt[r.dep]||0)+1 })
    return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([dep,v])=>({dep,v}))
  }, [filtered])

  const estData = [
    {name:'Ejecutada',v:stats.ej},{name:'En ejec.',v:stats.en},
    {name:'Programada',v:stats.pr},{name:'Paralizada',v:stats.pa}
  ]

  const actData = useMemo(()=>{
    const cnt={}
    filtered.forEach(r=>{const k=r.act_label||'Otro';cnt[k]=(cnt[k]||0)+1})
    return Object.entries(cnt).map(([name,v])=>({name,v}))
  },[filtered])

  const pctEjec = (stats.pctEjec*100).toFixed(1)
  const gaugeColor = stats.pctEjec>=0.8?'#10B981':stats.pctEjec>=0.5?'#F59E0B':'#EF4444'
  const angle = stats.pctEjec * 180
  const r=80,cx=110,cy=110
  const rad=a=>a*Math.PI/180
  const x2=cx+r*Math.cos(rad(180+angle)), y2=cy+r*Math.sin(rad(180+angle))

  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-[#1F3864] text-blue-700">Estado de Maquinarias</h1>
        <p className="text-xs text-slate-500">Programa Nuestras Ciudades · MVCS</p>
      </div>

      {/* Big KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3">
        <KpiCard label="Total" value={stats.tot.toLocaleString()} sub="intervenciones" color="blue" />
        <KpiCard label="Ejecutadas" value={stats.ej.toLocaleString()} sub={pct(stats.pctEjec*100)} color="teal" />
        <KpiCard label="En ejecución" value={stats.en.toLocaleString()} sub="activas" color="amber" />
        <KpiCard label="Programadas" value={stats.pr.toLocaleString()} sub="pendientes" color="blue" />
        <KpiCard label="Paralizadas" value={stats.pa.toLocaleString()} sub="atención" color="red" />
        <KpiCard label="M³ ejecutado" value={fmt(stats.m3)} sub="volumen" color="purple" />
        <KpiCard label="KM ejecutado" value={fmt(stats.akm,1)} sub={`de ${fmt(stats.mkm,1)} meta`} color="teal" />
      </div>

      {/* Semáforo */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {v:`${pctEjec}%`,l:'Ejecutado',c:stats.pctEjec>=0.8?'emerald':stats.pctEjec>=0.5?'amber':'red'},
          {v:stats.pa,l:'Paralizadas',c:stats.pa>5?'red':'amber'},
          {v:`${stats.av.toFixed(1)}%`,l:'Avance prom.',c:stats.av>=80?'emerald':stats.av>=50?'amber':'red'},
        ].map(({v,l,c})=>(
          <div key={l} className={`rounded-xl border p-4 text-center bg-${c}-50 border-${c}-300`}>
            <div className={`text-3xl font-extrabold text-${c}-800`}>{v}</div>
            <div className={`text-xs font-bold uppercase tracking-wide text-${c}-700 mt-1`}>{l}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Gauge */}
        <div className="bg-white bg-white border border-slate-200 border-slate-200 rounded-xl p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">% Ejecución global</div>
          <div className="flex flex-col items-center">
            <svg width="220" height="130" viewBox="0 0 220 130">
              <path d={`M${cx-r} ${cy} A${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke="#E2E8F0" strokeWidth="18" strokeLinecap="round"/>
              {stats.pctEjec > 0 && <path d={`M${cx-r} ${cy} A${r} ${r} 0 ${angle>180?1:0} 1 ${x2} ${y2}`} fill="none" stroke={gaugeColor} strokeWidth="18" strokeLinecap="round"/>}
            </svg>
            <div className="text-3xl font-extrabold -mt-6" style={{color:gaugeColor}}>{pctEjec}%</div>
            <div className="text-xs text-slate-400 mt-1">Intervenciones ejecutadas</div>
          </div>
        </div>

        {/* Por estado */}
        <div className="bg-white bg-white border border-slate-200 border-slate-200 rounded-xl p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Por estado</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={estData} dataKey="v" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85}>
              {estData.map((_,i)=><Cell key={i} fill={COLORS_EST[i]} />)}
            </Pie><Legend iconSize={10} iconType="circle" formatter={v=><span className="text-xs">{v}</span>}/><Tooltip formatter={(v,n)=>[v,n]}/></PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Top departamentos */}
        <div className="bg-white bg-white border border-slate-200 border-slate-200 rounded-xl p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Top departamentos</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={depData} margin={{left:0,right:10}}>
              <XAxis dataKey="dep" tick={{fontSize:9}} angle={-30} textAnchor="end" height={50}/>
              <YAxis tick={{fontSize:9}}/>
              <Tooltip/>
              <Bar dataKey="v" fill="#3B82F6" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tipo actividad */}
        <div className="bg-white bg-white border border-slate-200 border-slate-200 rounded-xl p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Por tipo de actividad</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={actData} dataKey="v" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80}>
              {actData.map((_,i)=><Cell key={i} fill={COLORS_ACT[i%COLORS_ACT.length]}/>)}
            </Pie><Legend iconSize={10} iconType="circle" formatter={v=><span className="text-xs">{v}</span>}/><Tooltip/></PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
