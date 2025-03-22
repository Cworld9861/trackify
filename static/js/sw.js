/**
 * Trackify - Service Worker
 * Enables offline functionality and PWA features
 */

// Cache names
const CACHE_NAME = 'trackify-v1';
const STATIC_CACHE = 'trackify-static-v1';
const DYNAMIC_CACHE = 'trackify-dynamic-v1';

// Assets to pre-cache
const STATIC_ASSETS = [
    './',
    './index.html',
    './tasks.html',
    './habits.html',
    './timer.html',
    './courses.html',
    './analytics.html',
    './settings.html',
    './static/css/style.css',
    './static/js/app.js',
    './static/js/db.js',
    './static/js/tasks.js',
    './static/js/habits.js',
    './static/js/timer.js',
    './static/js/courses.js',
    './static/js/analytics.js',
    './static/js/settings.js',
    './static/manifest.json',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js'
];

// Install event - pre-cache static assets
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing Service Worker...', event);
    
    // Skip waiting to activate immediately
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[Service Worker] Pre-caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch(error => {
                console.error('[Service Worker] Pre-caching failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating Service Worker...', event);
    
    // Claim clients to control all open pages
    self.clients.claim();
    
    event.waitUntil(
        caches.keys()
            .then(keyList => {
                return Promise.all(keyList.map(key => {
                    if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
                        console.log('[Service Worker] Removing old cache:', key);
                        return caches.delete(key);
                    }
                }));
            })
    );
    
    return self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
    // Skip non-GET requests and requests to external domains
    if (event.request.method !== 'GET') return;
    
    // Skip Chrome extension requests
    if (event.request.url.startsWith('chrome-extension://')) return;
    
    // Skip file upload requests
    if (event.request.url.includes('/upload-file')) return;
    
    // Handle API requests - network first, then cache
    if (event.request.url.includes('/api/')) {
        return event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache a clone of the response
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE)
                        .then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    return response;
                })
                .catch(() => {
                    // If network fails, try to serve from cache
                    return caches.match(event.request);
                })
        );
    }
    
    // Handle page requests - cache first, then network
    if (event.request.mode === 'navigate' || 
        (event.request.method === 'GET' && 
         event.request.headers.get('accept').includes('text/html'))) {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    // Return cached response if available
                    if (response) {
                        return response;
                    }
                    
                    // Otherwise fetch from network
                    return fetch(event.request)
                        .then(networkResponse => {
                            // Cache a clone of the response
                            const responseClone = networkResponse.clone();
                            caches.open(DYNAMIC_CACHE)
                                .then(cache => {
                                    cache.put(event.request, responseClone);
                                });
                            return networkResponse;
                        })
                        .catch(error => {
                            // If both cache and network fail, return fallback
                            console.error('[Service Worker] Fetch failed:', error);
                            return caches.match('./index.html');
                        });
                })
        );
        return;
    }
    
    // Cache-first strategy for static assets
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached response if available
                if (response) {
                    return response;
                }
                
                // Otherwise fetch from network
                return fetch(event.request)
                    .then(networkResponse => {
                        // Cache a clone of the response for static assets
                        if (event.request.url.match(/\.(css|js|html|svg)$/)) {
                            const responseClone = networkResponse.clone();
                            caches.open(DYNAMIC_CACHE)
                                .then(cache => {
                                    cache.put(event.request, responseClone);
                                });
                        }
                        return networkResponse;
                    });
            })
    );
});

// Push notification event
self.addEventListener('push', event => {
    console.log('[Service Worker] Push Notification received', event);
    
    let title = 'Trackify Notification';
    let options = {
        body: 'Something new happened!',
        icon: './generated-icon.png',
        badge: './generated-icon.png'
    };
    
    // Extract notification data if available
    if (event.data) {
        const data = event.data.json();
        title = data.title || title;
        options.body = data.content || options.body;
    }
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] Notification click', event);
    
    event.notification.close();
    
    // Open the app and focus on it
    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then(clientList => {
                // If a window is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow('./index.html');
                }
            })
    );
});

// Background sync event
self.addEventListener('sync', event => {
    console.log('[Service Worker] Background Sync', event);
    
    if (event.tag === 'sync-tasks') {
        event.waitUntil(
            // Logic to sync tasks data would go here
            Promise.resolve()
        );
    }
});
