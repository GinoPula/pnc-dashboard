// Pie de página institucional
export function Footer() {
  return (
    <footer className="bg-[#1F3864] border-t-2 border-red-700 mt-6 py-3 px-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3">
          {/* Línea decorativa */}
          <div className="w-1 h-8 bg-red-600 rounded hidden sm:block"/>
          <div>
            <div className="text-xs text-blue-200 font-semibold uppercase tracking-wide">
              Programa Nuestras Ciudades
            </div>
            <div className="text-xs text-blue-300">
              Coordinación Nacional de Maquinarias · MVCS
            </div>
          </div>
        </div>

        {/* Centro - nombre del autor */}
        <div className="text-center">
          <div className="text-xs text-slate-400">Desarrollado por</div>
          <div className="text-sm font-bold text-white">
            Ing. Gino Pulache
          </div>
          <div className="text-xs text-blue-300">
            Plataforma Web PNC Maquinarias · v1.0 · {new Date().getFullYear()}
          </div>
        </div>

        {/* Derecha */}
        <div className="text-right">
          <div className="text-xs text-slate-400">Sistema</div>
          <div className="text-xs font-semibold text-blue-200">Dashboard PNC Maquinarias</div>
          <div className="text-xs text-blue-300">
            github.io/GinoPula/pnc-dashboard
          </div>
        </div>
      </div>
    </footer>
  )
}
