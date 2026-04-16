import { useEffect, useRef, useMemo, useState } from 'react'

// Coordenadas centro de cada UBO
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

const EST_COLOR = {
  'EJECUTADA':    '#10B981',
  'EN EJECUCIÓN': '#F59E0B',
  'PARALIZADA':   '#EF4444',
  'PROGRAMADA':   '#3B82F6',
}
const getColor = (estado) => {
  if (estado === 'EJECUTADA') return '#10B981'
  if (estado?.normalize('NFC') === 'EN EJECUCIÓN') return '#F59E0B'
  if (estado === 'PARALIZADA') return '#EF4444'
  if (estado?.startsWith('PROGRAMADA')) return '#3B82F6'
  return '#888780'
}

export default function MapaUBOs({ filtered, inventario, raw }) {
  const mapRef     = useRef(null)
  const mapObj     = useRef(null)
  const markersRef = useRef([])
  const [uboSel, setUboSel]   = useState('TODOS')
  const [ready, setReady]     = useState(false)
  const [selInt, setSelInt]   = useState(null)

  const base = useMemo(() => (raw && raw.length > 0 ? raw : filtered), [raw, filtered])

  const ubos = useMemo(() => [...new Set(base.map(r => r.ubo).filter(Boolean))].sort(), [base])

  // Intervenciones a mostrar según UBO seleccionada
  const intsMostrar = useMemo(() => {
    const r = uboSel === 'TODOS' ? base : base.filter(r => r.ubo === uboSel)
    return r.filter(r => r.lat && r.lng && Math.abs(r.lat) > 0 && Math.abs(r.lng) > 0)
  }, [base, uboSel])

  // Stats de la UBO seleccionada
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

  // Cargar Leaflet
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

  // Inicializar mapa
  useEffect(() => {
    if (!ready || !mapRef.current || mapObj.current) return
    const map = window.L.map(mapRef.current, { center:[-9.5,-75.5], zoom:5 })
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:'© OpenStreetMap'
    }).addTo(map)
    mapObj.current = map
  }, [ready])

  // Actualizar marcadores
  useEffect(() => {
    if (!ready || !mapObj.current) return
    const L = window.L
    const map = mapObj.current

    // Limpiar
    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []

    // Zoom al UBO seleccionado
    if (uboSel !== 'TODOS' && UBO_COORDS[uboSel]) {
      map.setView([UBO_COORDS[uboSel].lat, UBO_COORDS[uboSel].lng], 9)
    } else {
      map.setView([-9.5, -75.5], 5)
    }

    // Agregar marcadores de intervenciones
    intsMostrar.forEach(r => {
      const color = getColor(r.estado)
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
        iconSize:[12,12], iconAnchor:[6,6]
      })
      const m = L.marker([r.lat, r.lng], { icon })
      m.bindPopup(`
        <div style="font-family:Arial,sans-serif;font-size:11px;min-width:200px">
          <div style="background:#1F3864;color:#fff;padding:6px 8px;margin:-8px -8px 8px;font-weight:bold">
            N°${r.num} · ${r.ubo}
          </div>
          <div style="margin-bottom:4px"><b>Ficha:</b> ${r.ficha||'—'}</div>
          <div style="margin-bottom:4px"><b>Tipo:</b> ${r.tipo||'—'}</div>
          <div style="margin-bottom:4px"><b>Provincia:</b> ${r.prov} · ${r.dist||''}</div>
          <div style="margin-bottom:4px"><b>Sector:</b> ${r.sector||'—'}</div>
          <div style="margin-bottom:4px">
            <span style="background:${color};color:white;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:bold">
              ${r.estado}
            </span>
          </div>
          <div style="margin-bottom:4px"><b>Avance:</b> ${r.porc_vol!=null?r.porc_vol.toFixed(1)+'%':'—'}</div>
          <div style="margin-bottom:4px"><b>M³:</b> ${r.m3!=null?r.m3.toLocaleString('es-PE'):'—'}</div>
          <div style="margin-bottom:4px"><b>Inicio:</b> ${r.f_ini||'—'} · <b>Fin:</b> ${r.f_fin||'—'}</div>
          <div style="font-size:10px;color:#555"><b>Maquinaria:</b> ${r.maq_str?.slice(0,80)||'—'}</div>
        </div>
      `, { maxWidth: 260 })
      m.addTo(map)
      markersRef.current.push(m)
    })

    // Marcadores de UBOs (cuando está en vista nacional)
    if (uboSel === 'TODOS') {
      Object.entries(UBO_COORDS).forEach(([ubo, coords]) => {
        const s = { total: base.filter(r=>r.ubo===ubo).length }
        if (!s.total) return
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:#1F3864;color:white;padding:3px 7px;border-radius:10px;font-size:10px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3)">${ubo.split(' ')[0]} <span style="background:#CC1C2C;padding:1px 4px;border-radius:6px">${s.total}</span></div>`,
          iconSize:[100,20], iconAnchor:[50,10]
        })
        const m = L.marker([coords.lat, coords.lng], { icon })
        m.on('click', () => setUboSel(ubo))
        m.addTo(map)
        markersRef.current.push(m)
      })
    }
  }, [ready, intsMostrar, uboSel, base])

  const fmtN = n => n==null?'—':Number(n).toLocaleString('es-PE',{maximumFractionDigits:0})

  return (
    <div className="p-3 sm:p-4 space-y-3">

      {/* Header + selector UBO */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-[#1F3864]">🗺️ Mapa de Intervenciones PNC</h2>
          <p className="text-xs text-slate-500">Selecciona una UBO para ver sus intervenciones en el mapa</p>
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <select
            value={uboSel}
            onChange={e => setUboSel(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-[#1F3864] font-semibold focus:outline-none focus:border-[#1F3864]">
            <option value="TODOS">🌍 Todas las UBOs</option>
            {ubos.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          {uboSel !== 'TODOS' && (
            <button onClick={() => setUboSel('TODOS')}
              className="text-xs text-slate-500 hover:text-red-600 border border-slate-300 px-2 py-1.5 rounded-lg">
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      {/* KPIs de la UBO seleccionada */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          {l:'Total',        v:stats.total, c:'text-[#1F3864]'},
          {l:'Ejecutadas',   v:stats.ejec,  c:'text-emerald-700'},
          {l:'En Ejecución', v:stats.enEj,  c:'text-amber-700'},
          {l:'Programadas',  v:stats.prog,  c:'text-blue-700'},
          {l:'Paralizadas',  v:stats.para,  c:'text-red-700'},
          {l:'M³ ejecutado', v:fmtN(stats.m3), c:'text-purple-700'},
        ].map(({l,v,c}) => (
          <div key={l} className="bg-white border border-slate-200 rounded-xl p-2 text-center shadow-sm">
            <div className={`text-xl font-extrabold ${c}`}>{v}</div>
            <div className="text-xs text-slate-400 mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 items-center bg-white border border-slate-200 rounded-xl px-4 py-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Leyenda:</span>
        {[
          {c:'#10B981',l:'Ejecutada'},
          {c:'#F59E0B',l:'En Ejecución'},
          {c:'#3B82F6',l:'Programada'},
          {c:'#EF4444',l:'Paralizada'},
        ].map(({c,l}) => (
          <div key={l} className="flex items-center gap-1.5">
            <div style={{background:c}} className="w-3 h-3 rounded-full border border-white shadow-sm"/>
            <span className="text-xs text-slate-600">{l}</span>
          </div>
        ))}
        <span className="text-xs text-slate-400 ml-auto">{intsMostrar.length} puntos en mapa</span>
      </div>

      {/* Mapa */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {!ready && (
          <div className="flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"/>
              <p className="text-sm">Cargando mapa...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} style={{ height:'500px', display: ready ? 'block' : 'none' }}/>
      </div>

      {/* Tabla resumen por UBO */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Resumen por UBO</span>
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
                const ejec  = data.filter(r => r.estado === 'EJECUTADA').length
                const enEj  = data.filter(r => r.estado?.normalize('NFC') === 'EN EJECUCIÓN').length
                const prog  = data.filter(r => r.estado_g === 'PROGRAMADA').length
                const para  = data.filter(r => r.estado === 'PARALIZADA').length
                const m3    = data.reduce((a,r) => a+(r.m3||0), 0)
                return (
                  <tr key={ubo}
                    onClick={() => setUboSel(ubo)}
                    className={`border-b border-slate-100 cursor-pointer transition-colors hover:bg-blue-50 ${uboSel===ubo?'bg-blue-100':'i%2===0?bg-white:bg-slate-50'} ${i%2===0?'bg-white':'bg-slate-50'}`}>
                    <td className="px-3 py-2 font-bold text-[#1F3864]">{ubo}</td>
                    <td className="px-3 py-2 font-bold text-center">{data.length}</td>
                    <td className="px-3 py-2 text-center text-emerald-700 font-semibold">{ejec}</td>
                    <td className="px-3 py-2 text-center text-amber-700 font-semibold">{enEj}</td>
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
