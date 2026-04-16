import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList } from 'recharts'
import { KpiCard } from '../components'
import { fmt, pct } from '../utils/data'

const COLORS_EST = ['#10B981','#F59E0B','#3B82F6','#EF4444','#888780']
const COLORS_ACT = ['#1F4E79','#CC1C2C','#375623','#BA7517','#8B5CF6','#0F6E56']

export default function Gerencial({ filtered, stats }) {
  const depData = useMemo(() => {
    const cnt = {}
    filtered.forEach(r => { cnt[r.dep] = (cnt[r.dep]||0)+1 })
    return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([dep,v])=>({dep,v}))
  }, [filtered])

  const estData = [
    {name:'Ejecutada',   v:stats.ej, color:'#10B981'},
    {name:'En ejec.',    v:stats.en, color:'#F59E0B'},
    {name:'Programada',  v:stats.pr, color:'#3B82F6'},
    {name:'Paralizada',  v:stats.pa, color:'#EF4444'},
    {name:'Desestimada', v:stats.de, color:'#888780'},
  ].filter(d=>d.v>0)

  const actData = useMemo(()=>{
    const cnt={}
    filtered.forEach(r=>{const k=r.act_label||'Otro';cnt[k]=(cnt[k]||0)+1})
    return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(([name,v])=>({name,v}))
  },[filtered])

  const pctEjec = (stats.pctEjec*100).toFixed(1)
  const gaugeColor = stats.pctEjec>=0.8?'#10B981':stats.pctEjec>=0.5?'#F59E0B':'#EF4444'
  const angle = Math.min(stats.pctEjec * 180, 180)
  const r=80,cx=110,cy=110
  const rad=a=>a*Math.PI/180
  const x2=cx+r*Math.cos(rad(180+angle)), y2=cy+r*Math.sin(rad(180+angle))

  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-[#1F3864]">Estado de Intervenciones General</h1>
        <p className="text-xs text-slate-500">Programa Nuestras Ciudades · MVCS · {new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'long',year:'numeric'})}</p>
      </div>

      {/* KPIs principales — sin M3 ni KM */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <KpiCard label="Total Intervenciones" value={stats.tot.toLocaleString()} sub="registros" color="blue"/>
        <KpiCard label="Ejecutadas"   value={stats.ej.toLocaleString()} sub={pct(stats.pctEjec*100)} color="teal"/>
        <KpiCard label="En Ejecución" value={stats.en.toLocaleString()} sub="activas" color="amber"/>
        <KpiCard label="Programadas"  value={stats.pr.toLocaleString()} sub="pendientes" color="blue"/>
        <KpiCard label="Paralizadas"  value={stats.pa.toLocaleString()} sub="requieren atención" color="red"/>
      </div>

      {/* Semáforo */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {v:`${pctEjec}%`, l:'% Ejecutado',   bg:'bg-emerald-50', bc:'border-emerald-300', tc:'text-emerald-800', sub:'text-emerald-600'},
          {v:stats.pa,      l:'Paralizadas',    bg:stats.pa>5?'bg-red-50':'bg-amber-50', bc:stats.pa>5?'border-red-300':'border-amber-300', tc:stats.pa>5?'text-red-800':'text-amber-800', sub:stats.pa>5?'text-red-600':'text-amber-600'},
          {v:`${stats.av.toFixed(1)}%`, l:'Avance prom.', bg:stats.av>=80?'bg-emerald-50':stats.av>=50?'bg-amber-50':'bg-red-50', bc:stats.av>=80?'border-emerald-300':stats.av>=50?'border-amber-300':'border-red-300', tc:stats.av>=80?'text-emerald-800':stats.av>=50?'text-amber-800':'text-red-800', sub:stats.av>=80?'text-emerald-600':stats.av>=50?'text-amber-600':'text-red-600'},
        ].map(({v,l,bg,bc,tc,sub})=>(
          <div key={l} className={`rounded-xl border p-4 text-center ${bg} ${bc}`}>
            <div className={`text-3xl font-extrabold ${tc}`}>{v}</div>
            <div className={`text-xs font-bold uppercase tracking-wide ${sub} mt-1`}>{l}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Gauge ejecución */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
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
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Por estado</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={estData} dataKey="v" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85}>
                {estData.map((d,i)=><Cell key={i} fill={d.color}/>)}
              </Pie>
              <Legend iconSize={10} iconType="circle" formatter={v=><span className="text-xs">{v}</span>}/>
              <Tooltip formatter={(v,n)=>[v.toLocaleString('es-PE'),n]}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Top departamentos */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Top departamentos</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={depData} margin={{left:0,right:30,top:4,bottom:40}}>
              <XAxis dataKey="dep" tick={{fontSize:9}} angle={-35} textAnchor="end" height={55}/>
              <YAxis tick={{fontSize:9}}/>
              <Tooltip formatter={v=>[v.toLocaleString('es-PE'),'Intervenciones']}/>
              <Bar dataKey="v" fill="#1F3864" radius={[3,3,0,0]}>
                <LabelList dataKey="v" position="top" style={{fontSize:9,fontWeight:700,fill:'#1F3864'}}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tipo actividad con cantidades */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Por tipo de actividad</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={actData} layout="vertical" margin={{left:0,right:40,top:4,bottom:4}}>
              <XAxis type="number" tick={{fontSize:9}} hide/>
              <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:'#475569'}} width={160}/>
              <Tooltip formatter={v=>[v.toLocaleString('es-PE'),'Intervenciones']}/>
              <Bar dataKey="v" radius={[0,4,4,0]}>
                {actData.map((_,i)=><Cell key={i} fill={COLORS_ACT[i%COLORS_ACT.length]}/>)}
                <LabelList dataKey="v" position="right" style={{fontSize:10,fontWeight:700,fill:'#1F3864'}}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
