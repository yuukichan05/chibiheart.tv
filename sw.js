const CACHE_NAME = 'chibiheart-v2';

// Arquivos para guardar em cache estático alinhados com a estrutura real do projeto
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  
  // Estilos CSS
  './css/main.css',
  './css/info.css',
  './css/player.css',
  
  // Scripts JS (Principal e Módulos)
  './js/main.js',
  './js/modules/db.js',
  './js/modules/info.js',
  './js/modules/inicio.js',
  './js/modules/pesquisa.js',
  './js/modules/playerView.js',
  './js/modules/repository.js',
  './js/modules/splash.js',
  
  // Dados JSON
  './dados/add_recent.json',
  './dados/destaque_principal_card.json',
  './dados/hero_banner.json',
  './dados/info.json',
  './dados/novos_episodios.json',
  
  // Imagens e Ícones PWA
  './imagem/icon_solid_192.png',
  './imagem/icon_solid_512.png',
  './imagem/icon_transparent_192.png',
  './imagem/icon_transparent_512.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Guardando ficheiros na cache...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] A apagar cache antiga:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceção de requisições (Estratégia: Network First com Fallback para Cache)
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não sejam GET (como POST/PUT se houver)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for válida, atualiza a cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Se estiver offline ou a rede falhar, busca na cache
        return caches.match(event.request);
      })
  );
});
