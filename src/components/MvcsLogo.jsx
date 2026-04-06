// Logo oficial MVCS - Ministerio de Vivienda, Construcción y Saneamiento
export function MvcsLogo({ size = 'md' }) {
  const h = size === 'sm' ? 28 : size === 'lg' ? 48 : 36
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* Escudo del Perú simplificado */}
      <svg height={h} viewBox="0 0 44 56" xmlns="http://www.w3.org/2000/svg">
        {/* Fondo escudo */}
        <ellipse cx="22" cy="28" rx="21" ry="27" fill="#8B0000"/>
        <ellipse cx="22" cy="28" rx="18" ry="23" fill="white"/>
        {/* Franja izquierda roja */}
        <path d="M4 12 Q4 6 10 5 L16 5 L16 51 L10 51 Q4 50 4 44 Z" fill="#CC1C2C"/>
        {/* Franja derecha roja */}
        <path d="M40 12 Q40 6 34 5 L28 5 L28 51 L34 51 Q40 50 40 44 Z" fill="#CC1C2C"/>
        {/* Escudo central azul */}
        <ellipse cx="22" cy="26" rx="8" ry="10" fill="#1E3A8A"/>
        {/* Llama */}
        <path d="M19 22 Q22 18 25 22 Q23 20 22 18 Q21 20 19 22Z" fill="#F59E0B"/>
        {/* Árbol */}
        <path d="M20 28 Q22 24 24 28 L23 28 L23 32 L21 32 L21 28Z" fill="#16A34A"/>
        {/* Vicuña simplificada */}
        <ellipse cx="22" cy="34" rx="4" ry="2.5" fill="#A16207"/>
        <path d="M20 32 Q22 30 24 32" fill="none" stroke="#A16207" strokeWidth="1"/>
      </svg>
      {/* Texto institucional */}
      <div className="flex flex-col leading-none">
        <span style={{fontSize: size==='sm'?7:size==='lg'?11:9, color:'#fff', fontWeight:700, letterSpacing:'0.02em', fontFamily:'Arial,sans-serif', textTransform:'uppercase'}}>
          PERÚ
        </span>
        <span style={{fontSize: size==='sm'?6:size==='lg'?9:7, color:'#e2e8f0', fontFamily:'Arial,sans-serif', lineHeight:1.3, maxWidth: size==='sm'?70:100}}>
          Ministerio<br/>de Vivienda, Construcción<br/>y Saneamiento
        </span>
      </div>
    </div>
  )
}
