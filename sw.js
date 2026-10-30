/* =========================================================
   Service Worker — Vôlei do Bosque Championship Dashboard
   Estratégia: cache-first com atualização em segundo plano.
   Garante funcionamento 100% offline após a primeira visita.
   ========================================================= */

var CACHE_NAME = "volei-do-bosque-v32";

var ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon-32.png"
];

// Instala o cache com os arquivos essenciais
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // addAll falha inteiro se um arquivo falhar; usamos add individual
      return Promise.all(
        ASSETS_TO_CACHE.map(function (url) {
          return cache.add(new Request(url, { cache: "reload" })).catch(function () {
            return null;
          });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// Ativa e limpa caches antigos
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.map(function (name) {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
          return null;
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Intercepta requisicoes: cache primeiro, rede em segundo plano
self.addEventListener("fetch", function (event) {
  var request = event.request;

  // Apenas GET
  if (request.method !== "GET") return;

  var url = new URL(request.url);

  // Nao intercepta requisicoes para outros dominios
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(function (cached) {
      var networkResponse = fetch(request)
        .then(function (response) {
          // Atualiza o cache com a versao mais recente
          if (response && response.status === 200 && response.type === "basic") {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(function () {
          // Offline: devolve o que houver no cache
          if (cached) return cached;
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return new Response("", { status: 504, statusText: "Offline" });
        });

      // Responde do cache imediatamente e atualiza em segundo plano
      return cached || networkResponse;
    })
  );
});

// Permite que a pagina force a atualizacao do Service Worker
self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
