import { useState, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Badge, MaqChips, SidePanel } from '../components'
import { ACT_LABELS_DIST, EST_FICHA_LBL, EST_FICHA_COLS, fmt } from '../utils/data'

export default function Distribucion({ filtered, inventario, raw }) {
  const [uboSel, setUboSel] = useState('TODOS')
  const [estSel, setEstSel] = useState('EN EJECUCIÓN')
  const [panel, setPanel] = useState(null)
  const [vistaActiva, setVistaActiva] = useState('INTERVENCIONES') 
  // Vistas: INTERVENCIONES | TOTAL_USO | MP | VP | DISPONIBLES

  const ubosDisp = useMemo(() => {
    return [...new Set([
      ...filtered.map(r => r.ubo),
      ...inventario.map(e => e.ubo)
    ].filter(Boolean))].sort()
  }, [filtered, inventario])

  // Intervenciones activas con maquinaria
  const interv = useMemo(() => {
    return filtered.filter(r => {
      const enEjec = r.estado.normalize('NFC') === 'EN EJECUCIÓN'
      const estOk = estSel === 'EN EJECUCIÓN' ? enEjec : (enEjec || r.estado_g === 'PROGRAMADA')
      if (!estOk || !r.maquinas || r.maquinas.length === 0) return false
      if (uboSel !== 'TODOS' && r.ubo !== uboSel) return false
      return true
    })
  }, [filtered, estSel, uboSel])

  // Códigos en uso
  const codEnUso = useMemo(() => {
    const s = new Set()
    filtered
      .filter(r => r.estado.normalize('NFC') === 'EN EJECUCIÓN' || r.estado_g === 'PROGRAMADA')
      .forEach(r => r.maquinas.forEach(m => s.add(m.cod)))
    return s
  }, [filtered])

  // Inventario disponible
  const invDisp = useMemo(() => {
    return inventario.filter(e => {
      if (codEnUso.has(e.codigo)) return false
      const uboEfectivo = uboSel !== 'TODOS' ? uboSel : 'TODOS'
      if (uboEfectivo !== 'TODOS' && e.ubo !== uboEfectivo) return false
      return true
    })
  }, [inventario, codEnUso, uboSel])

  // KPIs
  const totalEnUso = interv.reduce((a, r) => a + r.maquinas.length, 0)
  const mpUso = interv.reduce((a, r) => a + r.maquinas.filter(m => /EXCAVADORA|TRACTOR|CARGADOR|RETROEXCAVADORA|MOTONIVELADORA|RODILLO/i.test(m.tipo)).length, 0)
  const vpUso = totalEnUso - mpUso
  const totalMP = invDisp.filter(e => e.clasificacion === 'MP').length
  const totalVP = invDisp.filter(e => e.clasificacion === 'VP').length

  // Datos expandidos para cada vista de KPI
  // Total unidades en uso — lista de todos los equipos asignados en intervenciones
  const unidadesEnUso = useMemo(() => {
    const lista = []
    interv.forEach(r => {
      r.maquinas.forEach(m => {
        const eqInv = inventario.find(e => e.codigo === m.cod)
        lista.push({
          cod: m.cod, tipo: m.tipo,
          ubo: r.ubo, dep: r.dep, prov: r.prov, dist: r.dist,
          ficha: r.ficha, estado: r.estado, f_ini: r.f_ini, f_fin: r.f_fin,
          clasificacion: eqInv?.clasificacion || (/EXCAVADORA|TRACTOR|CARGADOR|RETROEXCAVADORA|MOTONIVELADORA|RODILLO/i.test(m.tipo) ? 'MP' : 'VP'),
          marca: eqInv?.marca || '', modelo: eqInv?.modelo || '',
          estado_maq: eqInv?.estado_maq || 'OPERATIVO',
          comentario: eqInv?.comentario || '',
          intervencion: r,
        })
      })
    })
    return lista
  }, [interv, inventario])

  const unidadesMP = useMemo(() => unidadesEnUso.filter(u => u.clasificacion === 'MP'), [unidadesEnUso])
  const unidadesVP = useMemo(() => unidadesEnUso.filter(u => u.clasificacion === 'VP'), [unidadesEnUso])

  const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

  // Export Excel
  const exportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new()
    const allUBOs = uboSel !== 'TODOS' ? [uboSel] : ubosDisp

    const buildSheet = (uboName, intervRows, invRows) => {
      const headers1 = ['LUGAR_INTERVENCION', 'ACTIVIDAD', 'MAQUINA_VEHICULO', 'FECHA_INICIO', 'FECHA_FIN', 'CONDICION', 'OBSERVACION']
      const rows1 = intervRows.map(r => [
        [r.dep, r.prov, r.dist].filter(Boolean).join(', '),
        ACT_LABELS_DIST[r.cod_act] || r.cod_act || '',
        r.maquinas.map(m => `${m.tipo} ( ${m.cod} )`).join(', '),
        r.f_ini, r.f_fin, 'OPERATIVO', r.obs || ''
      ])
      // Sección 2: recursos disponibles con observación del excel
      const rows2 = invRows.map(e => ['Ubicados en la UBO', `${e.tipo_unidad}(${e.codigo})`, e.estado_maq||'OPERATIVO', e.comentario||''])
      const mpD = invRows.filter(e => e.clasificacion === 'MP').length
      const vpD = invRows.filter(e => e.clasificacion === 'VP').length
      return [
        [`DISTRIBUCIÓN DE MAQUINARIA EN ${uboName} - ${fecha} ${hora}`], [[]],
        headers1, ...rows1, [[]],
        ['Recursos para atención en intervenciones:'],
        ['Ubicados en la UBO', 'MAQUINA_VEHICULO', 'CONDICION', 'OBSERVACION'],
        ...rows2,
        ['Total de máquinas y vehículos', invRows.length, `${mpD} Máquinas`, `${vpD} Vehículos`]
      ]
    }

    // ── HOJA GENERAL — Resumen de cantidades (como imagen) ─────────────
    const buildGeneralSheet = () => {
      const timestamp = `${fecha} ${hora}`
      const rows = []
      rows.push([`INTERVENCIONES EN EJECUCION PNC MAQUINARIAS`])
      rows.push([timestamp])
      rows.push([])
      rows.push(['NÚMERO DE INTERVENCIONES:', interv.length])
      // Total maquinaria comprometida
      const totalMaq = interv.reduce((a,r) => a + r.maquinas.length, 0)
      rows.push(['MÁQUINA COMPROMETIDA:', totalMaq])
      rows.push([])

      // Máquina comprometida por tipo
      rows.push(['MÁQUINA COMPROMETIDA POR TIPO', ''])
      const tiposCnt = {}
      interv.forEach(r => r.maquinas.forEach(m => { tiposCnt[m.tipo] = (tiposCnt[m.tipo]||0)+1 }))
      Object.entries(tiposCnt).sort((a,b) => b[1]-a[1]).forEach(([tipo,cnt]) => {
        rows.push([tipo, cnt])
      })
      rows.push([])

      // Máquina comprometida por UBO
      rows.push(['MÁQUINA COMPROMETIDA POR UBO', ''])
      const uboMaqCnt = {}
      interv.forEach(r => { uboMaqCnt[r.ubo] = (uboMaqCnt[r.ubo]||0) + r.maquinas.length })
      Object.entries(uboMaqCnt).sort((a,b) => a[0].localeCompare(b[0])).forEach(([ubo,cnt]) => {
        rows.push([ubo, cnt])
      })
      rows.push([])

      // Circunscripción territorial
      rows.push(['NÚMERO DE INTERVENCIONES POR CIRCUNSCRIPCIÓN TERRITORIAL'])
      rows.push(['DEPARTAMENTO', 'PROVINCIA', 'DISTRITO'])
      const deps = new Set(interv.map(r=>r.dep))
      const provs = new Set(interv.map(r=>r.prov))
      const dists = new Set(interv.map(r=>r.dist))
      rows.push([deps.size, provs.size, dists.size])
      return rows
    }

    // Hoja GENERAL con resumen
    const genData = buildGeneralSheet()
    const wsGen = XLSX.utils.aoa_to_sheet(genData)
    wsGen['!cols'] = [{wch:40},{wch:14},{wch:14}]
    XLSX.utils.book_append_sheet(wb, wsGen, 'General')

    // Hoja por UBO (con intervenciones + disponibles)
    allUBOs.forEach(ubo => {
      const uboInterv = interv.filter(r => r.ubo === ubo)
      const uboInv = invDisp.filter(e => e.ubo === ubo)
      if (!uboInterv.length && !uboInv.length) return
      const ws = XLSX.utils.aoa_to_sheet(buildSheet(ubo, uboInterv, uboInv))
      ws['!cols'] = [{wch:30},{wch:32},{wch:45},{wch:14},{wch:14},{wch:12},{wch:45}]
      XLSX.utils.book_append_sheet(wb, ws, ubo.slice(0, 28))
    })

    XLSX.writeFile(wb, `PNC_Distribucion_${new Date().toISOString().slice(0,10)}.xlsx`)
  }, [interv, invDisp, uboSel, ubosDisp, fecha, hora])

  // ── EXPORT AYUDA MEMORIA ─────────────────────────────
  const exportAyudaMemoria = useCallback(async () => {
    const uboNombre = uboSel !== 'TODOS' ? uboSel : 'NACIONAL'
    const fechaDoc = new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'})
    const CR='CC0000', CN='1F3864', LG='F1F5F9', WH='FFFFFF'
    const fmtN=(n)=>n==null||isNaN(n)?'0':Number(n).toLocaleString('es-PE',{maximumFractionDigits:0})

    // Intervenciones del UBO seleccionado — usa raw para no depender del FilterBar global
    const base = (raw && raw.length > 0) ? raw : filtered
    const allUBO = uboSel!=='TODOS' ? base.filter(r=>r.ubo===uboSel) : base
    const ejecutadas = allUBO.filter(r=>r.estado==='EJECUTADA')
    const enEjecucion = allUBO.filter(r=>r.estado.normalize('NFC')==='EN EJECUCIÓN')
    // TODAS las programadas — todos los meses
    const programadas = allUBO.filter(r=>r.estado_g==='PROGRAMADA')
    const paralizadas = allUBO.filter(r=>r.estado==='PARALIZADA')

    const ejec_act={}, ejec_en_act={}
    ejecutadas.forEach(r=>{const k=r.act_label||r.cod_act;if(!ejec_act[k])ejec_act[k]=[];ejec_act[k].push(r)})
    enEjecucion.forEach(r=>{const k=r.act_label||r.cod_act;if(!ejec_en_act[k])ejec_en_act[k]=[];ejec_en_act[k].push(r)})

    const m3Total=ejecutadas.reduce((a,r)=>a+(r.m3||0),0)
    const pobTotal=ejecutadas.reduce((a,r)=>a+(r.pob||0),0)

    const buildActRows=(actObj)=>Object.entries(actObj).map(([lbl,ints])=>{
      const provs=[...new Set(ints.map(r=>r.prov).filter(Boolean))].sort()
      const m3=ints.reduce((a,r)=>a+(r.m3||0),0)
      const pob=ints.reduce((a,r)=>a+(r.pob||0),0)
      let txt=`${ints.length} intervención${ints.length>1?'es':''} de ${lbl}`
      if(provs.length)txt+=`, en la${provs.length>1?'s':''} provincia${provs.length>1?'s':''} de ${provs.join(', ')}`
      if(m3>0)txt+=`, removiendo ${fmtN(m3)} m³ de material sedimentado`
      if(pob>0)txt+=`, beneficiando a ${fmtN(pob)} habitantes`
      return `<li>${txt}.</li>`
    }).join('')

    // TABLA: TODAS las programadas ordenadas por fecha inicio
    const progOrdenadas = [...programadas].sort((a,b)=>{
      const pa=(d)=>{if(!d)return new Date(0);const m=d.match(/(\d{2})\/(\d{2})\/(\d{4})/);return m?new Date(+m[3],+m[2]-1,+m[1]):new Date(0)}
      return pa(a.f_ini)-pa(b.f_ini)
    })

    const tablaProg = programadas.length>0 ? `
      <table>
        <thead><tr>
          <th>#</th><th>DEPART.</th><th>PROVINCIA</th><th>DISTRITO</th>
          <th>FICHA TEC.</th><th>TIPO</th><th>SECTOR</th>
          <th>FECHA INICIO</th><th>FECHA FIN</th>
          <th>META VOL (m³)</th><th>META KM</th><th>POB. BENEF.</th>
        </tr></thead>
        <tbody>${progOrdenadas.map((r,i)=>`
          <tr class="${i%2===0?'even':''}">
            <td style="text-align:center">${i+1}</td>
            <td>${r.dep}</td><td>${r.prov}</td><td>${r.dist}</td>
            <td style="font-weight:bold;color:#1F3864">${r.ficha}</td>
            <td>${r.tipo||''}</td>
            <td>${r.sector||''}</td>
            <td>${r.f_ini||''}</td><td>${r.f_fin||''}</td>
            <td style="text-align:right">${r.meta_vol!=null?fmtN(r.meta_vol):''}</td>
            <td style="text-align:right">${r.meta_km!=null?r.meta_km.toFixed(3):''}</td>
            <td style="text-align:right">${r.pob!=null?fmtN(r.pob):''}</td>
          </tr>`).join('')}
          <tr style="background:#1F3864;color:#fff;font-weight:bold">
            <td colspan="9" style="text-align:right;color:#fff">TOTALES:</td>
            <td style="text-align:right">${fmtN(programadas.reduce((a,r)=>a+(r.meta_vol||0),0))}</td>
            <td style="text-align:right">${programadas.reduce((a,r)=>a+(r.meta_km||0),0).toFixed(3)}</td>
            <td style="text-align:right">${fmtN(programadas.reduce((a,r)=>a+(r.pob||0),0))}</td>
          </tr>
        </tbody>
      </table>` : ''

    const html=`<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='UTF-8'>
<meta name=ProgId content=Word.Document>
<style>
@page{margin:2.54cm 2.54cm 2.54cm 2.0cm}
body{font-family:Arial,sans-serif;font-size:11pt;color:#000;line-height:1.4}
.hdr{font-size:7.5pt;color:#555;border-bottom:2pt solid #CC0000;padding-bottom:3pt;margin-bottom:14pt;display:flex;align-items:center;gap:8pt}
.hdr-escudo{display:inline-block;width:40pt;height:50pt;background:#CC0000;border-radius:2pt;text-align:center;line-height:50pt;color:#fff;font-weight:bold;font-size:8pt}
.hdr-txt{flex:1}
.hdr-prog{color:#1F3864;font-weight:bold;font-size:8pt}
.fecha{color:#CC0000;font-size:10pt;margin-bottom:6pt}
.titulo{font-size:14pt;font-weight:bold;color:#CC0000;text-align:center;margin:10pt 0 16pt 0}
.sec{font-size:11pt;font-weight:bold;color:#CC0000;margin:14pt 0 6pt 0}
.sec-reg{font-size:12pt;font-weight:bold;color:#CC0000;margin:14pt 0 6pt 0}
p{margin:3pt 0 5pt 0;text-align:justify}
ul{margin:3pt 0;padding-left:18pt}
li{margin:2pt 0;text-align:justify}
table{width:100%;border-collapse:collapse;margin:6pt 0;font-size:7.5pt}
th{background:#1F3864;color:#fff;padding:3pt 4pt;font-size:7pt;font-weight:bold;text-align:left}
td{padding:3pt 4pt;border-bottom:0.5pt solid #E2E8F0;vertical-align:top}
tr.even td{background:#F1F5F9}
.resumen-tbl{width:55%}
.resumen-tbl td:last-child{text-align:right;font-weight:bold;color:#1F3864}
</style></head>
<body>
<!-- ENCABEZADO INSTITUCIONAL -->
<div class="hdr">
  <span style="font-weight:bold;color:#CC0000;font-size:9pt">PERÚ</span>
  &nbsp;|&nbsp; Ministerio de Vivienda, Construcción y Saneamiento
  &nbsp;|&nbsp; Viceministerio de Vivienda y Urbanismo
  &nbsp;|&nbsp; <span class="hdr-prog">Programa Nuestras Ciudades</span>
</div>

<div class="fecha">${fechaDoc}</div>
<div class="titulo">PNC MAQUINARIAS EN EL DEPARTAMENTO DE ${uboNombre}</div>

<div class="sec">Antecedentes.</div>
<p><b>PNC-MAQUINARIAS</b> del Programa Nuestras Ciudades realiza trabajos de prevención y mitigación de riesgos a nivel nacional para proteger a las poblaciones más vulnerables del país. Este pool de maquinaria está a disposición para realizar trabajos de prevención y atender emergencias causadas por fenómenos naturales o climatológicos como huaicos, desbordes de ríos, sismos y terremotos.</p>
<p><b>PNC-MAQUINARIAS</b> realiza intervenciones de PREVENCIÓN, URGENCIA (Intervenciones que se realizan por un acuerdo de concejo) e intervenciones de EMERGENCIA (Requiere Decreto de Emergencia PCM). Las intervenciones se realizan en zonas donde existen viviendas, para protección de equipamiento e infraestructura urbana.</p>
<p><b>Principales Actividades.</b></p>
<ul>
  <li>Limpieza y descolmatación de drenes, quebradas, canales y ríos y conformación de diques de protección, hasta garantizar la escorrentía y desfogue de las aguas.</li>
  <li>Limpieza de escombros por desastres y nivelación de terrenos para damnificados.</li>
  <li>Mejoramiento de la transitabilidad de calles y vías de acceso dentro de centros poblados urbanos y rurales.</li>
  <li>Abastecimiento y distribución de agua potable.</li>
</ul>
<p>Las intervenciones del programa se realizan a solicitud de las autoridades distritales, provinciales y regionales, con el fin de salvaguardar la vida de las personas, proteger sus bienes y reducir el impacto de los desastres naturales.</p>
<p>Actualmente, el PNC Maquinarias cuenta con <b>19 UBOs</b> ubicadas en los departamentos de Lima, Ayacucho, Cusco, Ancash, Ica, Piura, La Libertad, Lambayeque, Cajamarca, San Martín, Loreto, Amazonas, Huánuco, Puno, Apurímac, Arequipa, Junín, Tacna y Tumbes.</p>

<div class="sec-reg">Intervenciones de PNC Maquinarias en la región ${uboNombre}.</div>

${ejecutadas.length>0?`
  <p>Durante el 2026, el PNC Maquinarias en la región <b>${uboNombre}</b> ha ejecutado <b>${ejecutadas.length}</b> intervenciones.</p>
  <ul>${buildActRows(ejec_act)}</ul>
`:''}

${enEjecucion.length>0?`
  <p>Asimismo, se vienen ejecutando <b>${enEjecucion.length}</b> intervenciones:</p>
  <ul>${buildActRows(ejec_en_act)}</ul>
`:''}

${programadas.length>0?`
  <p>En adición, se tiene <b>${programadas.length}</b> intervenciones programadas para el presente período, de acuerdo al siguiente detalle:</p>
  ${tablaProg}
  <p><i>Las fechas de inicio programadas están sujetas a variaciones por condiciones climáticas, gestiones administrativas, situaciones de emergencia y otros factores que puedan afectar su ejecución.</i></p>
`:''}

${paralizadas.length>0?`
  <p><b style="color:#CC0000">Intervenciones paralizadas:</b> ${paralizadas.length} intervenciones se encuentran paralizadas en la región ${uboNombre}, requiriendo gestión inmediata para su reactivación.</p>
`:''}

<div class="sec">Resumen de intervenciones 2026.</div>
<table class="resumen-tbl">
  <tr><td>Total de intervenciones</td><td>${allUBO.length}</td></tr>
  <tr class="even"><td>Ejecutadas</td><td>${ejecutadas.length} (${allUBO.length?(ejecutadas.length/allUBO.length*100).toFixed(1):0}%)</td></tr>
  <tr><td>En ejecución</td><td>${enEjecucion.length}</td></tr>
  <tr class="even"><td>Programadas</td><td>${programadas.length}</td></tr>
  <tr><td>Paralizadas</td><td>${paralizadas.length}</td></tr>
  <tr class="even"><td>M³ ejecutado</td><td>${fmtN(m3Total)} m³</td></tr>
  <tr><td>Población beneficiada</td><td>${fmtN(pobTotal)} habitantes</td></tr>
</table>
</body></html>`

    const blob = new Blob([html], {type:'application/msword'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Ayuda_Memoria_${uboNombre}_${new Date().toISOString().slice(0,10)}.doc`
    a.click()
    URL.revokeObjectURL(url)
  }, [filtered, uboSel])

    const sel = 'text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-white bg-white dark:border-slate-600'

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1F3864] text-blue-700">
            Distribución de Maquinaria {uboSel !== 'TODOS' ? `— ${uboSel}` : ''} · {fecha}
          </h2>
          <p className="text-xs text-slate-500">
            {estSel === 'EN EJECUCIÓN' ? 'Solo intervenciones en ejecución' : 'En ejecución + Programadas'} + Recursos disponibles por UBO
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select className={sel} value={uboSel} onChange={e => setUboSel(e.target.value)}>
            <option value="TODOS">Todos los UBOs</option>
            {ubosDisp.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select className={sel} value={estSel} onChange={e => setEstSel(e.target.value)}>
            <option value="EN EJECUCIÓN">Solo En ejecución</option>
            <option value="ACTIVAS">En ejecución + Programadas</option>
          </select>
          <button onClick={exportExcel} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 whitespace-nowrap">
            ↓ Excel (General + por UBO)
          </button>
          <button onClick={exportAyudaMemoria} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-700 bg-blue-50 text-blue-800 hover:bg-blue-100 whitespace-nowrap">
            📄 Ayuda Memoria Word
          </button>
        </div>
      </div>

      {/* KPIs */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-3">📂</div>
          <div className="text-sm font-semibold">Carga tu archivo Excel para ver la distribución</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              {id:'INTERVENCIONES', l:'Intervenciones activas', v:interv.length,     s:'click para ver lista',  bord:'border-t-amber-500',   actBg:'bg-amber-50',   actBord:'border-amber-500'},
              {id:'TOTAL_USO',      l:'Total unidades en uso',  v:totalEnUso,         s:'click para ver equipos', bord:'border-t-purple-500',  actBg:'bg-purple-50',  actBord:'border-purple-500'},
              {id:'MP',             l:'MP en operación',         v:mpUso,              s:'maquinaria pesada',      bord:'border-t-amber-600',   actBg:'bg-amber-50',   actBord:'border-amber-600'},
              {id:'VP',             l:'VP en operación',         v:vpUso,              s:'vehículos pesados',      bord:'border-t-blue-600',    actBg:'bg-blue-50',    actBord:'border-blue-600'},
              {id:'DISPONIBLES',    l:'Disponibles en UBO',      v:invDisp.length,     s:`${totalMP} MP · ${totalVP} VP`, bord:'border-t-emerald-500', actBg:'bg-emerald-50', actBord:'border-emerald-500'},
            ].map(({id,l,v,s,bord,actBg,actBord})=>{
              const isActive = vistaActiva === id
              return (
                <button key={id} onClick={()=>setVistaActiva(id)}
                  className={`w-full text-left rounded-xl p-3 border-t-4 transition-all ${bord} ${isActive ? `${actBg} border-2 ${actBord} shadow-md` : 'bg-white border border-slate-200 hover:shadow-sm hover:border-slate-300'}`}>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{l}</div>
                  <div className={`text-2xl font-extrabold ${isActive?'text-[#1F3864]':'text-slate-800'}`}>{v}</div>
                  <div className={`text-xs mt-0.5 ${isActive?'text-slate-600 font-semibold':'text-slate-400'}`}>
                    {isActive ? '▼ vista activa' : s}
                  </div>
                </button>
              )
            })}
          </div>
          {/* Indicador de vista activa */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Mostrando:</span>
            <span className="bg-[#1F3864] text-white px-3 py-0.5 rounded-full font-semibold">
              {vistaActiva === 'INTERVENCIONES' ? `${interv.length} Intervenciones activas` :
               vistaActiva === 'TOTAL_USO'      ? `${unidadesEnUso.length} Unidades en uso` :
               vistaActiva === 'MP'             ? `${unidadesMP.length} MP en operación` :
               vistaActiva === 'VP'             ? `${unidadesVP.length} VP en operación` :
                                                 `${invDisp.length} Disponibles en UBO`}
            </span>
            <span className="text-slate-400">— haz clic en otro KPI para cambiar la vista</span>
          </div>

          {/* VISTA DINÁMICA según KPI seleccionado */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-[#1F3864] flex items-center gap-3">
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                {vistaActiva === 'INTERVENCIONES' ? (estSel === 'EN EJECUCIÓN' ? 'Intervenciones en ejecución con maquinaria' : 'Intervenciones activas con maquinaria') :
                 vistaActiva === 'TOTAL_USO'      ? 'Total de unidades en uso — todos los equipos asignados' :
                 vistaActiva === 'MP'             ? 'MP en operación — Maquinaria Pesada asignada' :
                 vistaActiva === 'VP'             ? 'VP en operación — Vehículo Pesado asignado' :
                                                   'Recursos disponibles en la UBO'}
              </span>
              <span className="text-xs text-blue-200 ml-auto">
                {vistaActiva === 'INTERVENCIONES' ? interv.length :
                 vistaActiva === 'TOTAL_USO'      ? unidadesEnUso.length :
                 vistaActiva === 'MP'             ? unidadesMP.length :
                 vistaActiva === 'VP'             ? unidadesVP.length :
                                                   invDisp.length} registros
              </span>
            </div>
            <div className="overflow-x-auto">
              {/* VISTA: Intervenciones */}
              {vistaActiva === 'INTERVENCIONES' && (
                <table className="w-full text-xs min-w-[800px]">
                  <thead><tr className="bg-slate-50">{['UBO','Lugar de intervención','Actividad','Máquina / Vehículo','F. Inicio','F. Fin','Estado','Condición','Observación'].map(h=>(
                    <th key={h} className="px-2 py-2 text-left font-bold text-slate-500 uppercase border-b border-slate-200 whitespace-nowrap">{h}</th>
                  ))}</tr></thead>
                  <tbody>
                    {interv.slice(0,300).map((r,i)=>(
                      <tr key={i} onClick={()=>setPanel(r)} className={`hover:bg-amber-50 cursor-pointer border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50'}`}>
                        <td className="px-2 py-2 font-semibold text-[#1F3864]">{r.ubo}</td>
                        <td className="px-2 py-2 uppercase text-slate-600 text-xs">{[r.dep,r.prov,r.dist].filter(Boolean).join(', ')}</td>
                        <td className="px-2 py-2 font-semibold text-xs">{ACT_LABELS_DIST[r.cod_act]||r.cod_act||'—'}</td>
                        <td className="px-2 py-2"><MaqChips maquinas={r.maquinas}/></td>
                        <td className="px-2 py-2 whitespace-nowrap">{r.f_ini||'—'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{r.f_fin||'—'}</td>
                        <td className="px-2 py-2"><Badge estado={r.estado}/></td>
                        <td className="px-2 py-2"><span className="inline-block bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">OPERATIVO</span></td>
                        <td className="px-2 py-2 text-slate-400 max-w-[140px] truncate text-xs">{r.obs||''}</td>
                      </tr>
                    ))}
                    {!interv.length && <tr><td colSpan={9} className="text-center py-8 text-slate-400">Sin intervenciones activas</td></tr>}
                  </tbody>
                </table>
              )}

              {/* VISTA: Total unidades en uso / MP / VP */}
              {(vistaActiva === 'TOTAL_USO' || vistaActiva === 'MP' || vistaActiva === 'VP') && (() => {
                const lista = vistaActiva === 'MP' ? unidadesMP : vistaActiva === 'VP' ? unidadesVP : unidadesEnUso
                const bgHover = vistaActiva === 'MP' ? 'hover:bg-amber-50' : vistaActiva === 'VP' ? 'hover:bg-blue-50' : 'hover:bg-purple-50'
                return (
                  <table className="w-full text-xs min-w-[700px]">
                    <thead><tr className="bg-slate-50">{['Código','Tipo','Clase','UBO','Ficha intervención','F. Inicio','F. Fin','Estado equipo','Marca'].map(h=>(
                      <th key={h} className="px-2 py-2 text-left font-bold text-slate-500 uppercase border-b border-slate-200 whitespace-nowrap">{h}</th>
                    ))}</tr></thead>
                    <tbody>
                      {lista.slice(0,300).map((u,i)=>(
                        <tr key={i} onClick={()=>setPanel(u.intervencion)} className={`${bgHover} cursor-pointer border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50'}`}>
                          <td className="px-2 py-1.5 font-mono font-bold text-slate-700">{u.cod}</td>
                          <td className="px-2 py-1.5">{u.tipo}</td>
                          <td className="px-2 py-1.5">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${u.clasificacion==='MP'?'bg-amber-100 text-amber-800':'bg-blue-100 text-blue-800'}`}>{u.clasificacion}</span>
                          </td>
                          <td className="px-2 py-1.5 font-semibold text-[#1F3864]">{u.ubo}</td>
                          <td className="px-2 py-1.5">
                            <span className="inline-block bg-purple-50 border border-purple-200 text-purple-800 rounded px-2 py-0.5 text-xs font-medium">{u.ficha}</span>
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-slate-500">{u.f_ini||'—'}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-slate-500">{u.f_fin||'—'}</td>
                          <td className="px-2 py-1.5">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${(u.estado_maq||'OPERATIVO')==='INOPERATIVO'?'bg-red-100 text-red-700':'bg-emerald-100 text-emerald-800'}`}>
                              {u.estado_maq||'OPERATIVO'}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-slate-400">{u.marca}</td>
                        </tr>
                      ))}
                      {!lista.length && <tr><td colSpan={9} className="text-center py-8 text-slate-400">Sin equipos en este filtro</td></tr>}
                    </tbody>
                  </table>
                )
              })()}
            </div>
          </div>

          {/* Sección 2 */}
          <div className="bg-white bg-white border border-slate-200 border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Recursos ubicados en la UBO (disponibles)</span>
              <span className="text-xs text-slate-400 ml-auto">{invDisp.length} unidades · {totalMP} MP · {totalVP} VP</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[600px]">
                <thead className="bg-slate-50 bg-white">
                  <tr>{['UBO','Máquina / Vehículo','Clasificación','Marca','Condición','Observación'].map(h=>(
                    <th key={h} className="px-2 py-2 text-left font-bold text-slate-500 text-xs uppercase border-b border-slate-200">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {invDisp.slice(0,300).map((e,i)=>(
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-2 py-2 font-semibold">{e.ubo}</td>
                      <td className="px-2 py-2"><span className="inline-block bg-purple-50 border border-purple-200 text-purple-800 rounded text-xs px-2 py-0.5 font-medium">{e.tipo_unidad} <span className="text-purple-400">{e.codigo}</span></span></td>
                      <td className="px-2 py-2"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${e.clasificacion==='MP'?'bg-amber-100 text-amber-800':'bg-blue-100 text-blue-800'}`}>{e.clasificacion}</span></td>
                      <td className="px-2 py-2 text-slate-500">{e.marca}</td>
                      <td className="px-2 py-2">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-bold ${(e.estado_maq||'OPERATIVO')==='INOPERATIVO'?'bg-red-100 text-red-700':'bg-emerald-100 text-emerald-800'}`}>
                          {e.estado_maq||'OPERATIVO'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-xs text-slate-500" style={{whiteSpace:'normal',lineHeight:'1.4',maxWidth:'200px'}}>
                        {e.comentario||''}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 bg-slate-100">
                    <td colSpan={2} className="px-3 py-2 font-bold text-slate-700 text-slate-800">Total de máquinas y vehículos</td>
                    <td className="px-3 py-2 font-bold text-center">{invDisp.length}</td>
                    <td className="px-3 py-2 font-bold text-amber-700">{totalMP} Máquinas (MP)</td>
                    <td className="px-3 py-2 font-bold text-blue-700">{totalVP} Vehículos (VP)</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
      {panel && <SidePanel row={panel} onClose={()=>setPanel(null)} EST_FICHA_LBL={EST_FICHA_LBL} EST_FICHA_COLS={EST_FICHA_COLS}/>}
    </div>
  )
}
