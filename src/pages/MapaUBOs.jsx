import { useEffect, useRef, useMemo, useState } from 'react'

const UBO_COORDS = {
  'AMAZONAS':    { lat:-5.568,  lng:-78.665, zoom:8 },
  'ANCASH':      { lat:-9.637,  lng:-77.457, zoom:8 },
  'APURIMAC':    { lat:-13.972, lng:-73.110, zoom:8 },
  'AREQUIPA':    { lat:-16.409, lng:-71.537, zoom:8 },
  'AYACUCHO':    { lat:-13.004, lng:-74.086, zoom:8 },
  'CAJAMARCA':   { lat:-7.180,  lng:-78.350, zoom:8 },
  'CUSCO':       { lat:-13.532, lng:-71.967, zoom:8 },
  'HUANUCO':     { lat:-9.789,  lng:-76.106, zoom:8 },
  'ICA':         { lat:-14.067, lng:-75.728, zoom:8 },
  'JUNIN':       { lat:-11.298, lng:-75.305, zoom:8 },
  'LA LIBERTAD': { lat:-8.112,  lng:-79.028, zoom:8 },
  'LAMBAYEQUE':  { lat:-6.689,  lng:-79.907, zoom:8 },
  'LIMA':        { lat:-12.046, lng:-77.042, zoom:8 },
  'LORETO':      { lat:-3.749,  lng:-73.253, zoom:7 },
  'PIURA':       { lat:-5.194,  lng:-80.628, zoom:8 },
  'PUNO':        { lat:-15.840, lng:-70.021, zoom:8 },
  'SAN MARTIN':  { lat:-6.485,  lng:-76.361, zoom:8 },
  'TACNA':       { lat:-18.006, lng:-70.248, zoom:8 },
  'TUMBES':      { lat:-3.566,  lng:-80.451, zoom:9 },
}

const getColor = (estado) => {
  if (!estado) return '#6B7280'
  const e = estado.normalize('NFC').toUpperCase()
  if (e === 'EJECUTADA') return '#10B981'
  if (e === 'EN EJECUCIÓN' || e === 'EN EJECUCION') return '#EAB308'
  if (e === 'PARALIZADA') return '#1a1a1a'
  if (e.startsWith('PROGRAMADA')) return '#3B82F6'
  return '#6B7280'
}

export default function MapaUBOs({ filtered, inventario, raw }) {
  const mapRef     = useRef(null)
  const mapObj     = useRef(null)
  const markersRef = useRef([])
  const [uboSel, setUboSel] = useState('TODOS')
  const [estSel, setEstSel] = useState('TODOS')
  const [mesSel, setMesSel] = useState('TODOS')
  const [ready, setReady]   = useState(false)

  const base = useMemo(() => (raw?.length > 0 ? raw : filtered), [raw, filtered])
  const ubos  = useMemo(() => [...new Set(base.map(r => r.ubo).filter(Boolean))].sort(), [base])
  const meses = useMemo(() => [...new Set(base.map(r => r.mes).filter(Boolean))].sort(), [base])

  const intsMostrar = useMemo(() => {
    let r = uboSel === 'TODOS' ? base : base.filter(r => r.ubo === uboSel)
    if (estSel !== 'TODOS') {
      r = r.filter(x => {
        const e = (x.estado||'').normalize('NFC').toUpperCase()
        if (estSel === 'EN EJECUCIÓN') return e === 'EN EJECUCIÓN' || e === 'EN EJECUCION'
        if (estSel === 'PROGRAMADA')   return x.estado_g === 'PROGRAMADA'
        return x.estado === estSel
      })
    }
    if (mesSel !== 'TODOS') r = r.filter(x => x.mes === mesSel)
    return r.filter(x => x.lat && x.lng && Math.abs(parseFloat(x.lat)) > 0)
  }, [base, uboSel, estSel, mesSel])

  const stats = useMemo(() => {
    const data = uboSel === 'TODOS' ? base : base.filter(r => r.ubo === uboSel)
    return {
      total: data.length,
      ejec:  data.filter(r => r.estado === 'EJECUTADA').length,
      enEj:  data.filter(r => (r.estado||'').normalize('NFC').toUpperCase() === 'EN EJECUCIÓN').length,
      prog:  data.filter(r => r.estado_g === 'PROGRAMADA').length,
      para:  data.filter(r => r.estado === 'PARALIZADA').length,
      m3:    data.reduce((a,r) => a+(r.m3||0), 0),
    }
  }, [base, uboSel])

  useEffect(() => {
    if (window.L) { setReady(true); return }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
    document.head.appendChild(link)
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
    s.onload = () => setReady(true)
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    if (!ready || !mapRef.current || mapObj.current) return
    const map = window.L.map(mapRef.current, { center:[-9.5,-75.5], zoom:5 })
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:'© OpenStreetMap'
    }).addTo(map)
    mapObj.current = map

    if (!document.getElementById('pnc-map-style')) {
      const style = document.createElement('style')
      style.id = 'pnc-map-style'
      style.textContent = [
        '@keyframes pnc-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:0.7}}',
        '.pnc-tip{background:white!important;border:1.5px solid #CBD5E1!important;border-radius:10px!important;',
        'box-shadow:0 6px 24px rgba(0,0,0,0.18)!important;padding:0!important;max-width:300px!important;white-space:normal!important;}',
        '.pnc-tip::before,.pnc-tip::after,.leaflet-tooltip-top.pnc-tip::before{display:none!important;}'
      ].join('')
      document.head.appendChild(style)
    }
  }, [ready])

  useEffect(() => {
    if (!ready || !mapObj.current) return
    const L = window.L
    const map = mapObj.current

    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []

    if (uboSel !== 'TODOS' && UBO_COORDS[uboSel]) {
      map.flyTo([UBO_COORDS[uboSel].lat, UBO_COORDS[uboSel].lng], UBO_COORDS[uboSel].zoom, { duration:1 })
    } else {
      map.flyTo([-9.5, -75.5], 5, { duration:1 })
    }

    if (uboSel === 'TODOS') {
      Object.entries(UBO_COORDS).forEach(([ubo, coords]) => {
        const cnt  = base.filter(r => r.ubo === ubo).length
        if (!cnt) return
        const enEj = base.filter(r => (r.estado||'').normalize('NFC').toUpperCase() === 'EN EJECUCIÓN' && r.ubo === ubo).length
        const icon = L.divIcon({
          className: '',
          html: '<div style="background:#1F3864;color:white;padding:3px 8px;border-radius:10px;font-size:10px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.35);cursor:pointer">'
            + ubo.split(' ')[0]
            + '<span style="background:#CC1C2C;padding:1px 5px;border-radius:6px;margin-left:4px">' + cnt + '</span>'
            + (enEj > 0 ? '<span style="background:#EAB308;color:#000;padding:1px 4px;border-radius:6px;margin-left:3px">' + enEj + '</span>' : '')
            + '</div>',
          iconSize:[130,22], iconAnchor:[65,11]
        })
        const marker = L.marker([coords.lat, coords.lng], { icon })
        marker.on('click', () => setUboSel(ubo))
        marker.addTo(map)
        markersRef.current.push(marker)
      })
    } else {
      intsMostrar.forEach(r => {
        const color  = getColor(r.estado)
        const e      = (r.estado||'').normalize('NFC').toUpperCase()
        const isEnEj = e === 'EN EJECUCIÓN' || e === 'EN EJECUCION'
        const size   = isEnEj ? 14 : (e === 'PARALIZADA' ? 12 : 10)

        const icon = L.divIcon({
          className: '',
          html: '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;'
            + 'background:' + color + ';border:2.5px solid white;'
            + 'box-shadow:0 1px 5px rgba(0,0,0,0.5);'
            + (isEnEj ? 'animation:pnc-pulse 1.4s infinite;' : '') + '"></div>',
          iconSize:[size,size], iconAnchor:[size/2,size/2]
        })

        const maqHtml = r.maquinas?.length > 0
          ? r.maquinas.map(m =>
              '<span style="display:inline-block;background:#EDE9FE;color:#5B21B6;padding:1px 5px;border-radius:4px;margin:1px;font-size:9px">'
              + m.tipo + ' (' + m.cod + ')</span>'
            ).join('')
          : '<span style="color:#aaa;font-size:9px">Sin maquinaria</span>'

        const tip = '<div style="font-family:Arial,sans-serif;min-width:220px">'
          + '<div style="background:#1F3864;color:#fff;padding:6px 10px;border-radius:8px 8px 0 0;font-weight:bold;font-size:12px">'
          + 'N°' + (r.num||'—') + ' · ' + (r.ubo||'') + '</div>'
          + '<table style="width:100%;border-collapse:collapse;font-size:11px">'
          + '<tr style="background:#F8FAFC"><td style="padding:3px 8px;color:#64748B;width:80px">Ficha</td>'
          + '<td style="padding:3px 8px;font-weight:bold;color:#1F3864">' + (r.ficha||'—') + '</td></tr>'
          + '<tr><td style="padding:3px 8px;color:#64748B">Estado</td><td style="padding:3px 8px">'
          + '<span style="background:' + color + ';color:white;padding:1px 7px;border-radius:8px;font-size:10px;font-weight:bold">' + (r.estado||'—') + '</span></td></tr>'
          + '<tr style="background:#F8FAFC"><td style="padding:3px 8px;color:#64748B">Tipo</td><td style="padding:3px 8px">' + (r.tipo||'—') + '</td></tr>'
          + '<tr><td style="padding:3px 8px;color:#64748B">Provincia</td><td style="padding:3px 8px">' + (r.prov||'—') + (r.dist?' · '+r.dist:'') + '</td></tr>'
          + '<tr style="background:#F8FAFC"><td style="padding:3px 8px;color:#64748B">Avance</td><td style="padding:3px 8px;font-weight:bold">' + (r.porc_vol!=null?r.porc_vol.toFixed(1)+'%':'—') + '</td></tr>'
          + '<tr><td style="padding:3px 8px;color:#64748B">Período</td><td style="padding:3px 8px">' + (r.f_ini||'—') + ' → ' + (r.f_fin||'—') + '</td></tr>'
          + '</table>'
          + '<div style="padding:5px 8px;background:#FAF5FF;border-top:1px solid #EDE9FE">'
          + '<div style="color:#7C3AED;font-size:9px;font-weight:bold;margin-bottom:2px">UNIDADES</div>'
          + maqHtml + '</div>'
          + (r.descripcion ? '<div style="padding:5px 8px;background:#F0F9FF;border-top:1px solid #E0F2FE;font-size:9px;color:#0369A1;line-height:1.4">'
            + r.descripcion.slice(0,110) + (r.descripcion.length>110?'...':'') + '</div>' : '')
          + '</div>'

        const marker = L.marker([parseFloat(r.lat), parseFloat(r.lng)], { icon })
        marker.bindTooltip(tip, { permanent:false, direction:'top', offset:[0,-size], opacity:1, className:'pnc-tip' })
        marker.addTo(map)
        markersRef.current.push(marker)
      })
    }
  }, [ready, uboSel, intsMostrar, base])

  const fmtN = n => n==null ? '—' : Number(n).toLocaleString('es-PE',{maximumFractionDigits:0})
  const clsSel = 'text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-[#1F3864] font-semibold focus:outline-none focus:border-[#1F3864]'

  const KPI = [
    { l:'Total',        v:stats.total,    c:'text-[#1F3864]',   bt:'border-t-[#1F3864]' },
    { l:'Ejecutadas',   v:stats.ejec,     c:'text-emerald-700', bt:'border-t-emerald-500' },
    { l:'En Ejecución', v:stats.enEj,     c:'text-yellow-600',  bt:'border-t-yellow-400' },
    { l:'Programadas',  v:stats.prog,     c:'text-blue-700',    bt:'border-t-blue-500' },
    { l:'Paralizadas',  v:stats.para,     c:'text-red-700',     bt:'border-t-red-500' },
    { l:'M³ ejecutado', v:fmtN(stats.m3), c:'text-purple-700',  bt:'border-t-purple-500' },
  ]

  return (
    <div className="p-3 sm:p-4 space-y-3">

      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
        <div className="font-bold text-sm text-[#1F3864]">🗺️ Mapa de Intervenciones PNC</div>
        <select value={uboSel} onChange={e => setUboSel(e.target.value)} className={clsSel}>
          <option value="TODOS">🌍 Todas las UBOs</option>
          {ubos.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={mesSel} onChange={e => setMesSel(e.target.value)} className={clsSel}>
          <option value="TODOS">Todos los meses</option>
          {meses.map(m => <option key={m} value={m}>{{'01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio','07':'Julio','08':'Agosto','09':'Setiembre','10':'Octubre','11':'Noviembre','12':'Diciembre'}[m]||m}</option>)}
        </select>
        <select value={estSel} onChange={e => setEstSel(e.target.value)} className={clsSel} disabled={uboSel === 'TODOS'}>
          <option value="TODOS">Todos los estados</option>
          <option value="EN EJECUCIÓN">En Ejecución</option>
          <option value="EJECUTADA">Ejecutadas</option>
          <option value="PROGRAMADA">Programadas</option>
          <option value="PARALIZADA">Paralizadas</option>
        </select>
        {uboSel !== 'TODOS' && (
          <button onClick={() => { setUboSel('TODOS'); setEstSel('TODOS') }}
            className="text-xs text-slate-500 hover:text-red-600 border border-slate-300 px-2 py-1.5 rounded-lg">
            ✕ Ver todo
          </button>
        )}
        <span className="text-xs text-slate-400 ml-auto">
          {uboSel === 'TODOS' ? ubos.length + ' UBOs' : intsMostrar.length + ' puntos'}
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {KPI.map(({ l, v, c, bt }) => (
          <div key={l} className={'bg-white border border-slate-200 border-t-4 ' + bt + ' rounded-xl p-2 text-center shadow-sm'}>
            <div className={'text-xl font-extrabold ' + c}>{v}</div>
            <div className="text-xs text-slate-400 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-white border border-slate-200 rounded-xl px-4 py-2">
        <span className="text-xs font-bold text-slate-500 uppercase">Leyenda:</span>
        {[
          { c:'#10B981', l:'Ejecutada' },
          { c:'#EAB308', l:'En Ejecución (parpadea)' },
          { c:'#3B82F6', l:'Programada' },
          { c:'#1a1a1a', l:'Paralizada' },
        ].map(({ c, l }) => (
          <div key={l} className="flex items-center gap-1.5">
            <div style={{ background:c }} className="w-3 h-3 rounded-full border border-white shadow-sm"/>
            <span className="text-xs text-slate-600">{l}</span>
          </div>
        ))}
        <span className="text-xs text-slate-400 ml-auto">
          {uboSel === 'TODOS' ? 'Clic en etiqueta para ver UBO' : 'Pasa el mouse sobre puntos para ver detalles'}
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {!ready && (
          <div className="flex items-center justify-center" style={{height:'520px'}}>
            <div className="text-center text-slate-400">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"/>
              <p className="text-sm">Cargando mapa...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} style={{ height:'520px', display: ready ? 'block' : 'none' }}/>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wide">
          Resumen por UBO — clic para ver en mapa
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1F3864]">
                {['UBO','Total','Ejecutadas','En Ejec.','Programadas','Paralizadas','M³ Ejec.'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold text-white uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ubos.map((ubo, i) => {
                const data = base.filter(r => r.ubo === ubo)
                const ejec = data.filter(r => r.estado === 'EJECUTADA').length
                const enEj = data.filter(r => (r.estado||'').normalize('NFC').toUpperCase() === 'EN EJECUCIÓN').length
                const prog = data.filter(r => r.estado_g === 'PROGRAMADA').length
                const para = data.filter(r => r.estado === 'PARALIZADA').length
                const m3   = data.reduce((a,r) => a+(r.m3||0), 0)
                return (
                  <tr key={ubo} onClick={() => setUboSel(ubo)}
                    className={'border-b border-slate-100 cursor-pointer transition-colors hover:bg-blue-50 ' + (uboSel===ubo ? 'bg-blue-100 font-bold' : i%2===0 ? 'bg-white' : 'bg-slate-50')}>
                    <td className="px-3 py-2 font-bold text-[#1F3864]">{ubo}</td>
                    <td className="px-3 py-2 text-center font-bold">{data.length}</td>
                    <td className="px-3 py-2 text-center text-emerald-700 font-semibold">{ejec}</td>
                    <td className="px-3 py-2 text-center text-yellow-600 font-semibold">{enEj}</td>
                    <td className="px-3 py-2 text-center text-blue-700">{prog}</td>
                    <td className="px-3 py-2 text-center text-red-700 font-semibold">{para}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{fmtN(m3)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
