const STATIC_CACHE = 'edulink-static-v2';
const PAGE_CACHE = 'edulink-pages-v2';
const ALLOWED_CACHES = [STATIC_CACHE, PAGE_CACHE];
const PRECACHE_URLS = ['/portal', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !ALLOWED_CACHES.includes(key))
            .map((oldKey) => caches.delete(oldKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/favicon.ico'
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignora pedidos cross-origin, APIs autenticadas, HMR e rotas administrativas
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/ops') ||
    url.pathname.startsWith('/_next/webpack-hmr')
  ) {
    return;
  }

  // 1. Assets estáticos imutáveis (JS/CSS do Next.js e ícones): Cache-First com gravação em runtime
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response && response.ok && response.type === 'basic') {
              cache.put(request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // 2. Navegação do Portal PWA (/portal): Network-First com fallback para app shell em cache
  if (request.mode === 'navigate' && url.pathname.startsWith('/portal')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put('/portal', copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/portal'))
        )
    );
  }
});