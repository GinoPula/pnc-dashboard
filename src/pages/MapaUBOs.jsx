import { useEffect, useRef, useMemo, useState } from 'react'

const UBO_COORDS = {
  'AMAZONAS':    { lat:-5.568,  lng:-78.665 },
  'ANCASH':      { lat:-9.637,  lng:-77.457 },
  'APURIMAC':    { lat:-13.972, lng:-73.110 },
  'AREQUIPA':    { lat:-16.409, lng:-71.537 },
  'AYACUCHO':    { lat:-13.004, lng:-74.086 },
  'CAJAMARCA':   { lat:-7.180,  lng:-78.350 },
  'CUSCO':       { lat:-13.532, lng:-71.967 },
  'HUANUCO':     { lat:-9.789,  lng:-76.106 },
  'ICA':         { lat:-14.067, lng:-75.728 },
  'JUNIN':       { lat:-11.298, lng:-75.305 },
  'LA LIBERTAD': { lat:-8.112,  lng:-79.028 },
  'LAMBAYEQUE':  { lat:-6.689,  lng:-79.907 },
  'LIMA':        { lat:-12.046, lng:-77.042 },
  'LORETO':      { lat:-3.749,  lng:-73.253 },
  'PIURA':       { lat:-5.194,  lng:-80.628 },
  'PUNO':        { lat:-15.840, lng:-70.021 },
  'SAN MARTIN':  { lat:-6.485,  lng:-76.361 },
  'TACNA':       { lat:-18.006, lng:-70.248 },
  'TUMBES':      { lat:-3.566,  lng:-80.451 },
}

const getColor = (estado) => {
  if (!estado) return '#6B7280'
  if (estado === 'EJECUTADA') return '#10B981'
  if (estado?.normalize('NFC') === 'EN EJECUCIÓN') return '#EAB308'
  if (estado === 'PARALIZADA') return '#EF4444'
  if (estado?.startsWith('PROGRAMADA')) return '#3B82F6'
  return '#6B7280'
}

export default function MapaUBOs({ filtered, inventario, raw }) {
  const mapRef     = useRef(null)
  const mapObj     = useRef(null)
  const markersRef = useRef([])
  const [uboSel, setUboSel] = useState('TODOS')
  const [estSel, setEstSel] = useState('TODOS')
  const [ready, setReady]   = useState(false)

  const base = useMemo(() => (raw?.length > 0 ? raw : filtered), [raw, filtered])
  const ubos = useMemo(() => [...new Set(base.map(r => r.ubo).filter(Boolean))].sort(), [base])

  const intsMostrar = useMemo(() => {
    let r = uboSel === 'TODOS' ? base : base.filter(r => r.ubo === uboSel)
    if (estSel !== 'TODOS') {
      r = r.filter(x => {
        if (estSel === 'EN EJECUCIÓN') return x.estado?.normalize('NFC') === 'EN EJECUCIÓN'
        if (estSel === 'PROGRAMADA')   return x.estado_g === 'PROGRAMADA'
        return x.estado === estSel
      })
    }
    return r.filter(x => x.lat && x.lng && Math.abs(x.lat) > 0 && Math.abs(x.lng) > 0)
  }, [base, uboSel, estSel])

  const stats = useMemo(() => {
    const data = uboSel === 'TODOS' ? base : base.filter(r => r.ubo === uboSel)
    return {
      total: data.length,
      ejec:  data.filter(r => r.estado === 'EJECUTADA').length,
      enEj:  data.filter(r => r.estado?.normalize('NFC') === 'EN EJECUCIÓN').length,
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
  }, [ready])

  useEffect(() => {
    if (!ready || !mapObj.current) return
    const L = window.L
    const map = mapObj.current

    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []

    if (uboSel !== 'TODOS' && UBO_COORDS[uboSel]) {
      map.setView([UBO_COORDS[uboSel].lat, UBO_COORDS[uboSel].lng], 9)
    } else {
      map.setView([-9.5, -75.5], 5)
    }

    intsMostrar.forEach(r => {
      const color   = getColor(r.estado)
      const isActiva = r.estado?.normalize('NFC') === 'EN EJECUCIÓN'
      const size     = isActiva ? 14 : 10
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)${isActiva?';animation:pnc-pulse 1.5s infinite':''}" ></div>`,
        iconSize:[size,size], iconAnchor:[size/2,size/2]
      })

      const maqStr = r.maquinas?.length > 0
        ? r.maquinas.map(m => `<span style="background:#EDE9FE;color:#5B21B6;padding:1px 5px;border-radius:4px;margin:1px;display:inline-block;font-size:10px">${m.tipo} (${m.cod})</span>`).join('')
        : '<span style="color:#aaa">Sin maquinaria asignada</span>'

      const popup = `
        <div style="font-family:Arial,sans-serif;font-size:11px;min-width:240px">
          <div style="background:#1F3864;color:#fff;padding:7px 10px;margin:-8px -8px 8px;font-weight:bold;font-size:12px">
            N°${r.num} &nbsp;·&nbsp; ${r.ubo}
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <tr style="background:#f8fafc"><td style="padding:3px 5px;color:#888;width:90px">Ficha técnica</td><td style="padding:3px 5px;font-weight:bold;color:#1F3864">${r.ficha||'—'}</td></tr>
            <tr><td style="padding:3px 5px;color:#888">Estado</td><td style="padding:3px 5px"><span style="background:${color};color:white;padding:1px 7px;border-radius:8px;font-size:10px;font-weight:bold">${r.estado}</span></td></tr>
            <tr style="background:#f8fafc"><td style="padding:3px 5px;color:#888">Tipo</td><td style="padding:3px 5px">${r.tipo||'—'}</td></tr>
            <tr><td style="padding:3px 5px;color:#888">Provincia</td><td style="padding:3px 5px">${r.prov||'—'} · ${r.dist||'—'}</td></tr>
            <tr style="background:#f8fafc"><td style="padding:3px 5px;color:#888">Sector</td><td style="padding:3px 5px;font-size:10px">${r.sector||'—'}</td></tr>
            <tr><td style="padding:3px 5px;color:#888">Avance</td><td style="padding:3px 5px;font-weight:bold">${r.porc_vol!=null?r.porc_vol.toFixed(1)+'%':'—'}</td></tr>
            <tr style="background:#f8fafc"><td style="padding:3px 5px;color:#888">M³ ejecutado</td><td style="padding:3px 5px">${r.m3!=null?r.m3.toLocaleString('es-PE',{maximumFractionDigits:0})+' m³':'—'}</td></tr>
            <tr><td style="padding:3px 5px;color:#888">Período</td><td style="padding:3px 5px">${r.f_ini||'—'} → ${r.f_fin||'—'}</td></tr>
          </table>
          <div style="margin-top:6px;padding:5px;background:#faf5ff;border-top:1px solid #ede9fe">
            <div style="color:#888;font-size:10px;margin-bottom:3px">Unidades asignadas:</div>
            <div>${maqStr}</div>
          </div>
          ${r.descripcion?`<div style="margin-top:4px;padding:5px;background:#f0f9ff;border-top:1px solid #e0f2fe;font-size:10px;color:#555;line-height:1.4">${r.descripcion.slice(0,120)}${r.descripcion.length>120?'...':''}</div>`:''}
        </div>
      `
      const marker = L.marker([r.lat, r.lng], { icon })
      marker.bindTooltip(popup, { 
        permanent: false, 
        direction: 'top', 
        offset: [0, -8],
        opacity: 0.97,
        className: 'pnc-tooltip'
      })
      marker.addTo(map)
      markersRef.current.push(marker)
    })

    if (uboSel === 'TODOS') {
      Object.entries(UBO_COORDS).forEach(([ubo, coords]) => {
        const cnt   = base.filter(r=>r.ubo===ubo).length
        if (!cnt) return
        const enEjCnt = base.filter(r=>r.ubo===ubo&&r.estado?.normalize('NFC')==='EN EJECUCIÓN').length
        const icon = L.divIcon({
          className:'',
          html:`<div style="background:#1F3864;color:white;padding:3px 8px;border-radius:10px;font-size:10px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer">
            ${ubo.split(' ')[0]}
            <span style="background:#CC1C2C;padding:1px 5px;border-radius:6px;margin-left:3px">${cnt}</span>
            ${enEjCnt>0?`<span style="background:#EAB308;color:#000;padding:1px 4px;border-radius:6px;margin-left:2px">${enEjCnt}</span>`:''}
          </div>`,
          iconSize:[120,22], iconAnchor:[60,11]
        })
        const marker = L.marker([coords.lat, coords.lng], { icon })
        marker.on('click', () => setUboSel(ubo))
        marker.addTo(map)
        markersRef.current.push(marker)
      })
    }

    if (!document.getElementById('pnc-map-style')) {
      const style = document.createElement('style')
      style.id = 'pnc-map-style'
      style.textContent = `
        @keyframes pnc-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:0.7}}
        .pnc-tooltip {
          background: white !important;
          border: 1px solid #E2E8F0 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
          padding: 0 !important;
          max-width: 320px !important;
        }
        .pnc-tooltip::before { display: none !important; }
        .leaflet-tooltip-top.pnc-tooltip::before { display: none !important; }
      `
      document.head.appendChild(style)
    }
  }, [ready, intsMostrar, uboSel, base])

  const fmtN = n => n==null?'—':Number(n).toLocaleString('es-PE',{maximumFractionDigits:0})
  const sel = 'text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-[#1F3864] font-semibold focus:outline-none focus:border-[#1F3864]'

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
        <div className="font-bold text-sm text-[#1F3864]">🗺️ Mapa de Intervenciones PNC</div>
        <select value={uboSel} onChange={e=>setUboSel(e.target.value)} className={sel}>
          <option value="TODOS">🌍 Todas las UBOs</option>
          {ubos.map(u=><option key={u} value={u}>{u}</option>)}
        </select>
        <select value={estSel} onChange={e=>setEstSel(e.target.value)} className={sel}>
          <option value="TODOS">Todos los estados</option>
          <option value="EN EJECUCIÓN">En Ejecución</option>
          <option value="EJECUTADA">Ejecutadas</option>
          <option value="PROGRAMADA">Programadas</option>
          <option value="PARALIZADA">Paralizadas</option>
        </select>
        {uboSel !== 'TODOS' && (
          <button onClick={()=>setUboSel('TODOS')} className="text-xs text-slate-500 hover:text-red-600 border border-slate-300 px-2 py-1.5 rounded-lg">✕ Ver todo</button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{intsMostrar.length} puntos en mapa</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          {l:'Total',        v:stats.total, c:'text-[#1F3864]', b:'border-t-[#1F3864]'},
          {l:'Ejecutadas',   v:stats.ejec,  c:'text-emerald-700', b:'border-t-emerald-500'},
          {l:'En Ejecución', v:stats.enEj,  c:'text-yellow-600', b:'border-t-yellow-400'},
          {l:'Programadas',  v:stats.prog,  c:'text-blue-700', b:'border-t-blue-500'},
          {l:'Paralizadas',  v:stats.para,  c:'text-red-700', b:'border-t-red-500'},
          {l:'M³ ejecutado', v:fmtN(stats.m3), c:'text-purple-700', b:'border-t-purple-500'},
        ].map(({l,v,c}) => (
          <div key={l} className={`bg-white border border-slate-200 border-t-4 ${b} rounded-xl p-2 text-center shadow-sm`}>
            <div className={`text-xl font-extrabold ${c}`}>{v}</div>
            <div className="text-xs text-slate-400 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-white border border-slate-200 rounded-xl px-4 py-2">
        <span className="text-xs font-bold text-slate-500 uppercase">Leyenda:</span>
        {[{c:'#10B981',l:'Ejecutada'},{c:'#EAB308',l:'En Ejecución (parpadea)'},{c:'#3B82F6',l:'Programada'},{c:'#EF4444',l:'Paralizada'},{c:'#6B7280',l:'Otro'}].map(({c,l}) => (
          <div key={l} className="flex items-center gap-1.5">
            <div style={{background:c}} className="w-3 h-3 rounded-full border border-white shadow-sm"/>
            <span className="text-xs text-slate-600">{l}</span>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {!ready && (
          <div className="flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"/>
              <p className="text-sm">Cargando mapa...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} style={{height:'520px', display:ready?'block':'none'}}/>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wide">
          Resumen por UBO — clic para filtrar en mapa
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1F3864]">
                {['UBO','Total','Ejecutadas','En Ejec.','Programadas','Paralizadas','M³ Ejec.'].map(h=>(
                  <th key={h} className="px-3 py-2 text-left font-bold text-white uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ubos.map((ubo,i) => {
                const data = base.filter(r=>r.ubo===ubo)
                const ejec = data.filter(r=>r.estado==='EJECUTADA').length
                const enEj = data.filter(r=>r.estado?.normalize('NFC')==='EN EJECUCIÓN').length
                const prog = data.filter(r=>r.estado_g==='PROGRAMADA').length
                const para = data.filter(r=>r.estado==='PARALIZADA').length
                const m3   = data.reduce((a,r)=>a+(r.m3||0),0)
                return (
                  <tr key={ubo} onClick={()=>setUboSel(ubo)}
                    className={`border-b border-slate-100 cursor-pointer transition-colors hover:bg-blue-50 ${uboSel===ubo?'bg-blue-100':'i%2===0?bg-white:bg-slate-50'} ${i%2===0?'bg-white':'bg-slate-50'}`}>
                    <td className="px-3 py-2 font-bold text-[#1F3864]">{ubo}</td>
                    <td className="px-3 py-2 text-center font-bold">{data.length}</td>
                    <td className="px-3 py-2 text-center text-emerald-700 font-semibold">{ejec}</td>
                    <td className="px-3 py-2 text-center text-yellow-600 font-semibold">{enEj}</td>
                    <td className="px-3 py-2 text-center text-blue-700">{prog}</td>
                    <td className="px-3 py-2 text-center text-red-600">{para}</td>
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
