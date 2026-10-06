// Service worker do web app do JARVIS: recebe o push vindo do Mac, mostra a
// notificação com o ícone do JARVIS e guarda no histórico (IndexedDB).
const VERSAO = 'jarvis-app-v3'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

function banco() {
  return new Promise((ok, falha) => {
    const r = indexedDB.open('jarvis', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('avisos', { keyPath: 'id', autoIncrement: true })
    r.onsuccess = () => ok(r.result)
    r.onerror = () => falha(r.error)
  })
}

async function guardar(aviso) {
  try {
    const db = await banco()
    await new Promise((ok) => {
      const tx = db.transaction('avisos', 'readwrite')
      tx.objectStore('avisos').add(aviso)
      tx.oncomplete = ok
      tx.onerror = ok
    })
  } catch { /* histórico é um extra */ }
}

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { corpo: e.data ? e.data.text() : '' } }
  const titulo = d.titulo || 'JARVIS'
  const corpo = d.corpo || ''
  e.waitUntil(Promise.all([
    guardar({ titulo, corpo, em: Date.now(), tema: d.tema || null }),
    self.registration.showNotification(titulo, {
      body: corpo,
      icon: 'icone-v2-192.png',
      badge: 'icone-v2-192.png',
      tag: d.tag || undefined,
      timestamp: d.quando || Date.now(),
      data: { url: './' },
    }),
    self.clients.matchAll({ type: 'window' }).then((cs) => cs.forEach((c) => c.postMessage({ tipo: 'aviso' }))),
  ]))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    const aberta = cs.find((c) => 'focus' in c)
    return aberta ? aberta.focus() : self.clients.openWindow('./')
  }))
})
