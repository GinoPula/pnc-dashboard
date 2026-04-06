import { useState, useCallback, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { procesarIntervenciones, procesarInventario, calcStats } from '../utils/data'

export function useData() {
  const [raw, setRaw] = useState([])
  const [inventario, setInventario] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingTxt, setLoadingTxt] = useState('')
  const [fileName, setFileName] = useState('')

  // Filtros
  const [curAnio, setCurAnio] = useState('TODOS')
  const [curMes, setCurMes] = useState('TODOS')
  const [curUBO, setCurUBO] = useState('TODOS')
  const [curDep, setCurDep] = useState('TODOS')
  const [curTipo, setCurTipo] = useState('TODOS')

  // Cargar archivos
  const loadFiles = useCallback(async (files) => {
    setLoading(true)
    let allData = [], invData = [], loaded = 0
    const total = files.length

    for (const file of files) {
      setLoadingTxt(`Leyendo ${file.name} (${loaded + 1}/${total})...`)
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const sn = wb.SheetNames[0]
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: null })
      const cols = Object.keys(rows[0] || {}).map(k => k.toUpperCase())
      const esInventario = cols.includes('CODIGO') && cols.includes('TIPO_UNIDAD') && cols.includes('FLOTA')
      if (esInventario) invData = invData.concat(rows)
      else allData = allData.concat(rows)
      loaded++
    }

    setLoadingTxt(`Procesando ${allData.length} registros...`)
    await new Promise(r => setTimeout(r, 50))

    const intervenciones = procesarIntervenciones(allData)
    const codigosEnUso = new Set(intervenciones.flatMap(r => r.maquinas.map(m => m.cod)))
    const inv = invData.length > 0
      ? procesarInventario(invData, codigosEnUso)
      : inventario.map(e => ({ ...e, en_uso: codigosEnUso.has(e.codigo), disponible: !codigosEnUso.has(e.codigo), estado_uso: codigosEnUso.has(e.codigo) ? 'EN USO' : 'DISPONIBLE' }))

    setRaw(intervenciones)
    if (inv.length > 0) setInventario(inv)
    setFileName(files.length > 1 ? `${files.length} archivos` : files[0].name)
    setLoading(false)
  }, [inventario])

  const reset = useCallback(() => {
    setRaw([]); setInventario([]); setFileName('')
    setCurAnio('TODOS'); setCurMes('TODOS'); setCurUBO('TODOS'); setCurDep('TODOS'); setCurTipo('TODOS')
  }, [])

  // Filtrado
  const filtered = useMemo(() => raw.filter(r => {
    if (curAnio !== 'TODOS' && r.anio !== curAnio) return false
    if (curMes !== 'TODOS' && r.mes !== curMes) return false
    if (curUBO !== 'TODOS' && r.ubo !== curUBO) return false
    if (curDep !== 'TODOS' && r.dep !== curDep) return false
    if (curTipo !== 'TODOS' && r.tipo !== curTipo) return false
    return true
  }), [raw, curAnio, curMes, curUBO, curDep, curTipo])

  const stats = useMemo(() => calcStats(filtered), [filtered])

  // Opciones para selects
  const ubos = useMemo(() => [...new Set(raw.map(r => r.ubo).filter(Boolean))].sort(), [raw])
  const deps = useMemo(() => [...new Set(raw.map(r => r.dep).filter(Boolean))].sort(), [raw])
  const anios = useMemo(() => [...new Set(raw.map(r => r.anio).filter(Boolean))].sort(), [raw])

  return {
    raw, filtered, inventario, loading, loadingTxt, fileName, stats,
    ubos, deps, anios,
    curAnio, curMes, curUBO, curDep, curTipo,
    setCurAnio, setCurMes, setCurUBO, setCurDep, setCurTipo,
    loadFiles, reset,
  }
}
