/**
 * Service Worker for Disaster Management PWA
 * 
 * Features:
 * - App Shell caching for offline use
 * - Map tile caching with LRU cleanup
 * - API request network-first with IndexedDB fallback
 * - Offline queue sync coordination
 * - Background sync support
 * - Cache management and updates
 * 
 * @version 1.0.0
 */

// Cache names - increment version to force update
const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  shell: `pwa-shell-${CACHE_VERSION}`,
  tiles: `pwa-tiles-${CACHE_VERSION}`,
  api: `pwa-api-${CACHE_VERSION}`
};

// Maximum number of cached tiles (LRU limit)
const MAX_TILE_CACHE = 500;

// App shell resources to cache on install
const SHELL_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  // CSS files will be added dynamically during install
  // JS files will be added dynamically during install
];

// Static assets patterns
const STATIC_ASSET_PATTERNS = [
  /\.css$/,
  /\.js$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.eot$/,
  /\.svg$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.webp$/,
  /\.ico$/
];

// Tile server patterns
const TILE_PATTERNS = [
  /\/tile\//,
  /tile\.openstreetmap\.org/,
  /tiles\.openstreetmap\.org/,
  /[a-c]\.tile\.openstreetmap\.org/,
  /tile-[a-z]\.openstreetmap\.org/,
  /basemap\.*/,
  /cartodb\.*/
];

// API endpoint pattern
const API_PATTERN = /\/api\//;


/**
 * Log with timestamp and context
 */
function log(...args) {
  console.log(`[SW ${new Date().toISOString().substr(11, 8)}]`, ...args);
}

/**
 * Install event - cache app shell
 */
self.addEventListener('install', (event) => {
  log('Installing service worker...');
  
  event.waitUntil(
    (async () => {
      try {
        // Open shell cache
        const cache = await caches.open(CACHE_NAMES.shell);
        
        // Cache shell resources
        log('Caching app shell resources');
        await cache.addAll(SHELL_RESOURCES);
        
        log('Service worker installed successfully');
        
        // Skip waiting to activate immediately
        // Uncomment this to auto-update without user refresh
        // self.skipWaiting();
        
      } catch (error) {
        console.error('Failed to install service worker:', error);
      }
    })()
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  log('Activating service worker...');
  
  event.waitUntil(
    (async () => {
      try {
        // Get all cache names
        const cacheNames = await caches.keys();
        
        // Delete old caches
        const validCacheNames = Object.values(CACHE_NAMES);
        const deletionPromises = cacheNames
          .filter(cacheName => !validCacheNames.includes(cacheName))
          .map(cacheName => {
            log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          });
        
        await Promise.all(deletionPromises);
        
        log('Old caches cleaned up');
        
        // Take control of all clients immediately
        await self.clients.claim();
        
        log('Service worker activated successfully');
        
      } catch (error) {
        console.error('Failed to activate service worker:', error);
      }
    })()
  );
});


/**
 * Fetch event - handle all network requests
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different request types
  if (isTileRequest(url)) {
    // Map tiles - cache first, network fallback
    event.respondWith(handleTileRequest(request));
  } else if (isAPIRequest(url)) {
    // API requests - network first, IndexedDB fallback
    event.respondWith(handleAPIRequest(request));
  } else if (isStaticAsset(url)) {
    // Static assets - cache first, network fallback
    event.respondWith(handleStaticRequest(request));
  } else {
    // Default - network first, cache fallback
    event.respondWith(handleDefaultRequest(request));
  }
});

/**
 * Check if request is for map tiles
 */
function isTileRequest(url) {
  return TILE_PATTERNS.some(pattern => pattern.test(url.href));
}

/**
 * Check if request is for API endpoint
 */
function isAPIRequest(url) {
  return API_PATTERN.test(url.pathname);
}

/**
 * Check if request is for static asset
 */
function isStaticAsset(url) {
  return STATIC_ASSET_PATTERNS.some(pattern => pattern.test(url.pathname));
}

/**
 * Handle tile requests with cache-first strategy
 */
async function handleTileRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.tiles);
      cache.put(request, networkResponse.clone());
      
      // Cleanup old tiles (LRU)
      cleanupTileCache();
    }
    
    return networkResponse;
    
  } catch (error) {
    log('Tile request failed:', error.message);
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline tile placeholder
    return new Response(
      '<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" fill="#f0f0f0"/><text x="128" y="128" text-anchor="middle" font-family="Arial" font-size="14" fill="#999">Offline</text></svg>',
      { 
        headers: { 'Content-Type': 'image/svg+xml' },
        status: 200 
      }
    );
  }
}

/**
 * Handle API requests with network-first strategy
 */
async function handleAPIRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful GET responses
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAMES.api);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    log('API request failed, checking cache and IndexedDB:', error.message);
    
    // Try cache fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      log('Serving from cache:', request.url);
      return cachedResponse;
    }
    
    // Try IndexedDB fallback for known endpoints
    const idbResponse = await tryIndexedDBFallback(request);
    if (idbResponse) {
      return idbResponse;
    }
    
    // Return error response
    return new Response(
      JSON.stringify({
        error: 'Network request failed and no cached data available',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle static asset requests with cache-first strategy
 */
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.shell);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    log('Static request failed:', error.message);
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Handle default requests with network-first strategy
 */
async function handleDefaultRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Try cache fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Try to get data from IndexedDB as fallback
 * Maps API endpoints to IndexedDB stores
 */
async function tryIndexedDBFallback(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Map API endpoints to IndexedDB store names
  let storeName = null;
  
  if (pathname.includes('/api/requests')) {
    storeName = 'requests';
  } else if (pathname.includes('/api/volunteers')) {
    storeName = 'volunteers';
  } else if (pathname.includes('/api/shelters')) {
    storeName = 'shelters';
  } else if (pathname.includes('/api/routes')) {
    storeName = 'routes';
  }
  
  if (!storeName) {
    return null;
  }
  
  try {
    // Open IndexedDB
    const db = await openIndexedDB();
    
    // Get data from store
    const data = await getAllFromStore(db, storeName);
    
    if (data && data.length > 0) {
      log(`Serving ${data.length} items from IndexedDB store: ${storeName}`);
      
      return new Response(
        JSON.stringify({
          data,
          source: 'indexeddb',
          offline: true,
          timestamp: Date.now()
        }),
        {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'X-Data-Source': 'indexeddb'
          }
        }
      );
    }
    
  } catch (error) {
    console.error('IndexedDB fallback failed:', error);
  }
  
  return null;
}

/**
 * Open IndexedDB connection
 */
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('rescue-pwa', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get all records from IndexedDB store
 */
function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    } catch (error) {
      // Store might not exist
      resolve([]);
    }
  });
}

/**
 * Cleanup tile cache using LRU strategy
 */
async function cleanupTileCache() {
  try {
    const cache = await caches.open(CACHE_NAMES.tiles);
    const keys = await cache.keys();
    
    if (keys.length > MAX_TILE_CACHE) {
      // Delete oldest tiles (first ones in the list)
      const deleteCount = keys.length - MAX_TILE_CACHE;
      log(`Cleaning up ${deleteCount} old tiles`);
      
      for (let i = 0; i < deleteCount; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup tile cache:', error);
  }
}


/**
 * Message event - handle messages from the page
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  log('Received message:', type);
  
  switch (type) {
    case 'SKIP_WAITING':
      // Force service worker to activate immediately
      self.skipWaiting();
      break;
      
    case 'CACHE_TILES':
      // Precache specific tiles
      if (data && data.urls) {
        cacheTiles(data.urls);
      } else if (data && data.tiles) {
        cacheTiles(data.tiles);
      }
      break;
      
    case 'CACHE_ROUTES':
      // Cache specific routes/URLs
      if (data && data.urls) {
        cacheURLs(data.urls, CACHE_NAMES.shell);
      }
      break;
      
    case 'CLEAR_CACHE':
      // Clear specific cache
      if (data && data.cacheName) {
        caches.delete(data.cacheName);
      }
      break;
      
    case 'CLEAR_TILE_CACHE':
      // Clear tile cache
      caches.delete(CACHE_NAMES.tiles).then(() => {
        log('Tile cache cleared');
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      });
      break;
      
    case 'SYNC_QUEUE':
      // Trigger offline queue sync
      syncOfflineQueue();
      break;
      
    case 'GET_CACHE_STATS':
      // Return cache statistics
      getCacheStats().then(stats => {
        if (event.ports[0]) {
          event.ports[0].postMessage({ type: 'CACHE_STATS', data: stats });
        }
      });
      break;
      
    default:
      log('Unknown message type:', type);
  }
});

/**
 * Cache specific tile URLs
 */
async function cacheTiles(urls) {
  try {
    const cache = await caches.open(CACHE_NAMES.tiles);
    log(`Caching ${urls.length} tiles`);
    
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.error('Failed to cache tile:', url, error);
      }
    }
    
    // Cleanup after adding
    await cleanupTileCache();
    
  } catch (error) {
    console.error('Failed to cache tiles:', error);
  }
}

/**
 * Cache specific URLs to a cache
 */
async function cacheURLs(urls, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    log(`Caching ${urls.length} URLs to ${cacheName}`);
    
    await cache.addAll(urls);
    
  } catch (error) {
    console.error('Failed to cache URLs:', error);
  }
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  try {
    const cacheNames = await caches.keys();
    const stats = {};
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      stats[cacheName] = {
        count: keys.length,
        urls: keys.slice(0, 10).map(req => req.url) // Sample URLs
      };
    }
    
    return stats;
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return {};
  }
}

/**
 * Sync offline queue with server
 * Messages all clients to trigger flush
 */
async function syncOfflineQueue() {
  try {
    log('Triggering offline queue sync');
    
    // Get all window clients
    const clients = await self.clients.matchAll({ type: 'window' });
    
    // Message each client to flush their queue
    for (const client of clients) {
      client.postMessage({
        type: 'FLUSH_OFFLINE_QUEUE',
        timestamp: Date.now()
      });
    }
    
    log(`Notified ${clients.length} clients to flush queue`);
    
  } catch (error) {
    console.error('Failed to sync offline queue:', error);
  }
}

/**
 * Background Sync event
 * Triggers when connection is restored
 * 
 * To register sync in your page:
 * navigator.serviceWorker.ready.then(reg => {
 *   reg.sync.register('sync-queue');
 * });
 */
self.addEventListener('sync', (event) => {
  log('Background sync event:', event.tag);
  
  if (event.tag === 'sync-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

/**
 * Push notification event
 * 
 * To use push notifications:
 * 1. Get push subscription from client
 * 2. Send subscription to backend
 * 3. Backend sends push messages
 * 4. This handler displays notifications
 */
self.addEventListener('push', (event) => {
  log('Push notification received');
  
  let data = { title: 'Disaster Alert', body: 'New update available' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'disaster-alert',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Notification click event
 */
self.addEventListener('notificationclick', (event) => {
  log('Notification clicked');
  
  event.notification.close();
  
  // Open or focus the app window
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      // Check if app is already open
      for (const client of clients) {
        if (client.url === self.registration.scope && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

/**
 * CSP (Content Security Policy) Integration
 * 
 * Add this to your index.html <head>:
 * 
 * <meta http-equiv="Content-Security-Policy" content="
 *   default-src 'self';
 *   script-src 'self' 'unsafe-eval' 'unsafe-inline';
 *   style-src 'self' 'unsafe-inline' https://unpkg.com;
 *   img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.openstreetmap.org;
 *   connect-src 'self' https://*.openstreetmap.org https://router.project-osrm.org wss://localhost:8080;
 *   font-src 'self' data:;
 *   worker-src 'self' blob:;
 *   manifest-src 'self';
 * ">
 */

/**
 * Install Prompt Integration
 * 
 * Add this to your main app code:
 * 
 * let deferredPrompt;
 * 
 * window.addEventListener('beforeinstallprompt', (e) => {
 *   // Prevent the mini-infobar from appearing
 *   e.preventDefault();
 *   // Save the event for later
 *   deferredPrompt = e;
 *   // Show your custom install button
 *   showInstallButton();
 * });
 * 
 * function showInstallPrompt() {
 *   if (deferredPrompt) {
 *     deferredPrompt.prompt();
 *     deferredPrompt.userChoice.then((choiceResult) => {
 *       if (choiceResult.outcome === 'accepted') {
 *         console.log('User accepted the install prompt');
 *       }
 *       deferredPrompt = null;
 *     });
 *   }
 * }
 * 
 * window.addEventListener('appinstalled', () => {
 *   console.log('PWA was installed');
 *   hideInstallButton();
 * });
 */

log('Service worker loaded');
