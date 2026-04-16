import { useState } from 'react'
import { MvcsLogo } from './MvcsLogo'

// Usuarios del sistema
const USERS = {
  'gpulache': { name:'Gino Franco Pulache Guerrero', pass:'Admin123', role:'admin' },
  'Percy':    { name:'Ing. Percy Barron Lopez',       pass:'123456',  role:'admin' },
  'demo':     { name:'Usuario Demo',                  pass:'demo123', role:'viewer' },
}

export default function Login({ onLogin }) {
  const [user, setUser]   = useState('')
  const [pass, setPass]   = useState('')
  const [error, setError] = useState('')
  const [show, setShow]   = useState(false)

  const handleLogin = () => {
    const u = USERS[user.trim()]
    if (!u || u.pass !== pass) {
      setError('Usuario o contraseña incorrectos')
      return
    }
    setError('')
    onLogin({ username: user.trim(), name: u.name, role: u.role })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{background:'linear-gradient(135deg,#1F3864 0%,#2E75B6 100%)'}}>
      {/* Header institucional */}
      <div className="bg-[#CC1C2C] h-1 w-full"/>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">

          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <MvcsLogo size="md"/>
            <h2 className="text-base font-extrabold text-[#1F3864] mt-3 text-center">
              Plataforma Web PNC Maquinarias
            </h2>
            <p className="text-xs text-slate-500 text-center mt-1">
              Coordinación Nacional de Maquinarias · MVCS
            </p>
          </div>

          {/* Formulario */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Usuario</label>
              <input
                type="text"
                value={user}
                onChange={e=>{setUser(e.target.value);setError('')}}
                onKeyDown={e=>e.key==='Enter'&&document.getElementById('pass-input').focus()}
                placeholder="Ingrese su usuario"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#1F3864] focus:ring-1 focus:ring-[#1F3864]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  id="pass-input"
                  type={show?'text':'password'}
                  value={pass}
                  onChange={e=>{setPass(e.target.value);setError('')}}
                  onKeyDown={e=>e.key==='Enter'&&handleLogin()}
                  placeholder="Ingrese su contraseña"
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#1F3864] focus:ring-1 focus:ring-[#1F3864] pr-10"
                />
                <button
                  type="button"
                  onClick={()=>setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
                  {show?'🙈':'👁'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              className="w-full bg-[#1F3864] hover:bg-[#2E75B6] text-white font-bold py-2.5 rounded-lg text-sm transition-colors">
              Ingresar al Sistema
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">Acceso restringido — Solo personal autorizado</p>
            <p className="text-xs text-slate-300 mt-1">Programa Nuestras Ciudades · 2026</p>
          </div>
        </div>
      </div>
      <div className="bg-[#CC1C2C] h-1 w-full"/>
    </div>
  )
}

export { USERS }
