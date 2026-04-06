export const ACT_LABELS = {
  'LD-P':'Limpieza/Descolmatación','LD-PI':'Limpieza/Descolmatación',
  'LD-E':'Limpieza/Descolmatación','LD-U':'Limpieza/Descolmatación',
  'LDOA-PI':'Limpieza/Descolmatación','LETV-E':'Remoción Escombros',
  'RLE-U':'Remoción Escombros','AA-U':'Abastecimiento Agua',
  'MTV-U':'Mejoramiento Transitabilidad','CTMP-U':'Carguío y Traslado',
}
export const ACT_LABELS_DIST = {
  'LD-P':'LIMPIEZA Y DESCOLMATACIÓN','LD-PI':'LIMPIEZA Y DESCOLMATACIÓN',
  'LD-E':'LIMPIEZA Y DESCOLMATACIÓN','LD-U':'LIMPIEZA Y DESCOLMATACIÓN',
  'LDOA-PI':'LIMPIEZA Y DESCOLMATACIÓN','LETV-E':'REMOCIÓN DE ESCOMBROS',
  'RLE-U':'REMOCIÓN DE ESCOMBROS','AA-U':'ABASTECIMIENTO Y/O PROCESAMIENTO',
  'MTV-U':'MEJORAMIENTO DE TRANSITABILIDAD','CTMP-U':'CARGUÍO Y TRASLADO',
}
export const EST_FICHA_LBL = {
  'INDENTIFICADA':'Identificada','EN ELABORACION':'En elaboración',
  'REVISION POR UBO':'Revisión UBO',
  'APROBADA Y/O EN REQUERIMIENTO DE PERSONAL Y/O COMBUSTIBLE':'Aprobada',
  'DESESTIMADA':'Desestimada',
}
export const EST_FICHA_COLS = {
  'INDENTIFICADA':'#3B82F6','EN ELABORACION':'#F59E0B','REVISION POR UBO':'#8B5CF6',
  'APROBADA Y/O EN REQUERIMIENTO DE PERSONAL Y/O COMBUSTIBLE':'#10B981',
  'DESESTIMADA':'#EF4444','SIN ESTADO':'#888780',
}
export const MESES = {
  '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun',
  '07':'Jul','08':'Ago','09':'Set','10':'Oct','11':'Nov','12':'Dic'
}

const sv = (v,d='') => v!=null&&String(v)!=='null'&&String(v)!=='nan'?String(v).trim():d
const sf = v => { try { return v!=null&&String(v)!=='nan'?parseFloat(v):null }catch{return null} }

export function parseMaquinas(raw) {
  if (!raw||raw==='nan') return []
  return raw.split(',').flatMap(item => {
    const m = item.trim().match(/^(.*?)\s*\(\s*([A-Z0-9\-]+)\s*\)\s*$/i)
    if (!m) return []
    let tipo=m[1].trim(), cod=m[2].trim()
    if (!cod||cod.toUpperCase()==='CAMA BAJA') return []
    if (/VOLQUETE/i.test(tipo)) tipo='VOLQUETE'
    else if (/EXCAVADORA/i.test(tipo)) tipo='EXCAVADORA HID.'
    else if (/REMOLCADOR/i.test(tipo)) tipo='REMOLCADOR'
    else if (/CAMIONETA/i.test(tipo)) tipo='CAMIONETA'
    else if (/CARGADOR FRONTAL/i.test(tipo)) tipo='CARGADOR FRONTAL'
    else if (/MINI CARGADOR/i.test(tipo)) tipo='MINI CARGADOR'
    else if (/PLATAFORMA/i.test(tipo)) tipo='PLATAFORMA (CAMA BAJA)'
    else if (/TRACTOR/i.test(tipo)) tipo='TRACTOR ORUGA'
    else if (/CISTERNA DE AGUA/i.test(tipo)) tipo='CAMION CISTERNA AGUA'
    else if (/CISTERNA/i.test(tipo)) tipo='CAMION CISTERNA'
    else if (/RETROEXCAVADORA/i.test(tipo)) tipo='RETROEXCAVADORA'
    else if (/RODILLO/i.test(tipo)) tipo='RODILLO COMPACTADOR'
    else if (/MOTONIVELADORA/i.test(tipo)) tipo='MOTONIVELADORA'
    else if (/GRUA/i.test(tipo)) tipo='CAMION GRUA'
    return [{tipo,cod}]
  })
}

export function procesarIntervenciones(rows) {
  const seen = new Set()
  return rows.map(r => {
    const est = sv(r.ESTADO||r.Estado||r.estado).normalize('NFC')
    const fi = sv(r.FECHA_INICIO||r.Fecha_Inicio), ff = sv(r.FECHA_FIN||r.Fecha_Fin)
    let anio='', mes=''
    const per = sv(r.PERIODO||r.Periodo)
    if (per&&!isNaN(+per)) anio=String(+per)
    const dm = fi.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (dm) { anio=anio||dm[3]; mes=dm[2] }
    const maq_str=sv(r.MAQUINARIA||r.Maquinaria), cod_act=sv(r.COD_ACTIVIDAD)
    const numCierre=sv(r.NUM_INFO_CIERRE), sup=sv(r.SUPERVISOR)
    return {
      id:r.ID_INTERVENCION||0, num:sv(r.NUMERO||r.Numero),
      ubo:sv(r.UBO||r.Ubo).toUpperCase(), dep:sv(r.DEPARTAMENTO||r.Departamento).toUpperCase(),
      prov:sv(r.PROVINCIA||r.Provincia), dist:sv(r.DISTRITO||r.Distrito),
      sector:sv(r.SECTOR), tipo:sv(r.TIPO||r.Tipo),
      estado:est, estado_g:est.startsWith('PROGRAMADA')?'PROGRAMADA':est,
      conv:sv(r.ESTADO_CONVENIO), ficha:sv(r.FICHA_TEC||r.Ficha_Tec),
      enlace_ficha:sv(r.ENLACE_FICHA_TECNICA), descripcion:sv(r.DESCRIPCION),
      cod_act, act_label:ACT_LABELS[cod_act]||cod_act||'Otro', marco:sv(r.MARCO_LEGAL),
      porc_vol:sf(r.PORC_VOL), m3:sf(r.M3EJECUTADO),
      meta_vol:sf(r.META_VOL), acum_vol:sf(r.ACUMULADO_VOL),
      meta_km:sf(r.META_KM), acum_km:sf(r.ACUMULADO_KM),
      pob:sf(r.POB_BENEFICIADA), plazo:sf(r.PLAZO),
      mto_ap:sf(r.MONTO_MANTENIMIENTO_APORTES), mto_mv:sf(r.MONTO_MANTENIMIENTO_MVCS),
      combus:sf(r.COMBUS_FICHA_TEC), est_ficha:sv(r.ESTADO_FICHA_TEC),
      obs:sv(r.OBSERVACION),
      supervisor:['0','nan','---',"'---",'null'].includes(sup)?'':sup,
      primer_av:sv(r.PRIMER_AVANCE).slice(0,10), ultimo_av:sv(r.ULTIMO_AVANCE).slice(0,10),
      f_ini:fi.slice(0,10), f_fin:ff.slice(0,10), anio, mes,
      maquinas:parseMaquinas(maq_str), maq_str,
      tiene_cierre:!!(numCierre&&numCierre!=='nan'),
      num_cierre:numCierre!=='nan'?numCierre:'', enlace_cierre:sv(r.ENLACE_INFO_CIERRE),
    }
  }).filter(r=>{
    if (!r.dep) return false
    const key=`${r.id}-${r.ficha}-${r.f_ini}`
    if (seen.has(key)) return false
    seen.add(key); return true
  })
}

export function procesarInventario(rows, codigosEnUso=new Set()) {
  return rows.map(r=>{
    const cod=sv(r.CODIGO||r.Codigo), flota=sv(r.FLOTA||r.Flota).toUpperCase()
    return {
      codigo:cod, ubo:sv(r.UBO||r.Ubo).toUpperCase(),
      dep:sv(r.DEPARTAMENTO||r.Departamento).toUpperCase(), flota,
      clasificacion:flota==='MAQUINARIA'?'MP':'VP',
      tipo_unidad:sv(r.TIPO_UNIDAD||r.Tipo_Unidad),
      marca:sv(r.MARCA||r.Marca), modelo:sv(r.MODELO||r.Modelo),
      en_uso:codigosEnUso.has(cod), disponible:!codigosEnUso.has(cod),
      estado_uso:codigosEnUso.has(cod)?'EN USO':'DISPONIBLE',
    }
  }).filter(e=>e.codigo)
}

export function calcStats(rows) {
  let tot=0,ej=0,en=0,pr=0,de=0,pa=0,m3=0,pob=0,mkm=0,akm=0
  rows.forEach(r=>{
    tot++
    if (r.estado==='EJECUTADA') ej++
    else if (r.estado.normalize('NFC')==='EN EJECUCIÓN') en++
    else if (r.estado_g==='PROGRAMADA') pr++
    else if (r.estado==='DESESTIMADA') de++
    else if (r.estado==='PARALIZADA') pa++
    if (r.m3) m3+=r.m3; if (r.pob) pob+=r.pob
    if (r.meta_km) mkm+=r.meta_km; if (r.acum_km) akm+=r.acum_km
  })
  const avRows=rows.filter(r=>r.porc_vol!=null)
  const av=avRows.length?avRows.reduce((a,r)=>a+r.porc_vol,0)/avRows.length:0
  return {tot,ej,en,pr,de,pa,m3,pob,mkm,akm,av,pctEjec:tot?ej/tot:0}
}

export const fmt=(n,d=0)=>n==null||isNaN(n)?'—':Number(n).toLocaleString('es-PE',{minimumFractionDigits:d,maximumFractionDigits:d})
export const pct=(n,d=1)=>n==null||isNaN(n)?'—':Number(n).toFixed(d)+'%'
export const badgeCls=e=>{
  if(!e)return'badge-de'; if(e==='EJECUTADA')return'badge-ej'
  if(e.normalize('NFC')==='EN EJECUCIÓN')return'badge-en'
  if(e.startsWith('PROGRAMADA'))return'badge-pr'
  if(e==='DESESTIMADA')return'badge-de'; if(e==='PARALIZADA')return'badge-pa'
  return 'badge-de'
}
