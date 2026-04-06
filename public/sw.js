const CACHE_NAME = 'pnc-dashboard-v1'
const ASSETS = [
  './',
  './index.html',
]

// Instalar - cachear assets principales
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  )
  self.skipWaiting()
})

// Activar - limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch - network first, fallback a cache
self.addEventListener('fetch', e => {
  // Solo cachear requests GET del mismo origen
  if (e.request.method !== 'GET') return
  
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cachear respuesta exitosa
        if (res && res.status === 200) {
          const resClone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone))
        }
        return res
      })
      .catch(() => {
        // Sin internet - usar cache
        return caches.match(e.request).then(cached => {
          if (cached) return cached
          // Fallback al index.html para rutas SPA
          return caches.match('./index.html')
        })
      })
  )
})
