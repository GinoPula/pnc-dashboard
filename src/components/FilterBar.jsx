export function FilterBar({ ubos, deps, anios, curAnio, curMes, curUBO, curDep, curTipo, setCurAnio, setCurMes, setCurUBO, setCurDep, setCurTipo, count, total }) {
  const sel = 'text-xs border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 bg-white dark:bg-slate-800 dark:text-slate-200 cursor-pointer max-w-[120px] sm:max-w-[150px]'
  const MESES_OPT = [['TODOS','Todos'],['01','Ene'],['02','Feb'],['03','Mar'],['04','Abr'],['05','May'],['06','Jun'],['07','Jul'],['08','Ago'],['09','Set'],['10','Oct'],['11','Nov'],['12','Dic']]
  const TIPOS = ['TODOS','PREVENCIÓN','EMERGENCIA','URGENTE ATENCIÓN']
  const TIPO_LABELS = {'TODOS':'Todos','PREVENCIÓN':'Prev.','EMERGENCIA':'Emerg.','URGENTE ATENCIÓN':'Urgente'}
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center min-w-max">
      <select className={sel} value={curAnio} onChange={e=>setCurAnio(e.target.value)}>
        <option value="TODOS">Año</option>
        {anios.map(a=><option key={a} value={a}>{a}</option>)}
      </select>
      <select className={sel} value={curMes} onChange={e=>setCurMes(e.target.value)}>
        {MESES_OPT.map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
      <select className={sel} value={curUBO} onChange={e=>setCurUBO(e.target.value)}>
        <option value="TODOS">UBO</option>
        {ubos.map(u=><option key={u} value={u}>{u}</option>)}
      </select>
      <select className={sel} value={curDep} onChange={e=>setCurDep(e.target.value)}>
        <option value="TODOS">Depto.</option>
        {deps.map(d=><option key={d} value={d}>{d}</option>)}
      </select>
      <div className="flex gap-1">
        {TIPOS.map(t=>(
          <button key={t} onClick={()=>setCurTipo(t)}
            className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs border transition-all whitespace-nowrap ${curTipo===t?'bg-[#1F3864] text-white border-[#1F3864] font-bold':'bg-transparent text-slate-500 border-slate-300 hover:border-blue-400'}`}>
            {TIPO_LABELS[t]}
          </button>
        ))}
      </div>
      <span className="text-xs text-slate-400 whitespace-nowrap ml-1">{count.toLocaleString()}/{total.toLocaleString()}</span>
    </div>
  )
}
