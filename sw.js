// Service Worker for Hours Tracker PWA
// Provides offline functionality and caching

const CACHE_NAME = 'hours-tracker-v1';
const STATIC_CACHE_NAME = 'hours-tracker-static-v1';
const DYNAMIC_CACHE_NAME = 'hours-tracker-dynamic-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/google-sheets.js',
    '/manifest.json',
    'https://apis.google.com/js/api.js'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache static files
            caches.open(STATIC_CACHE_NAME)
                .then(cache => {
                    console.log('Caching static files');
                    return cache.addAll(STATIC_FILES.map(url => {
                        // Handle root path
                        if (url === '/') {
                            return './index.html';
                        }
                        // Handle absolute URLs
                        if (url.startsWith('http')) {
                            return url;
                        }
                        // Handle relative paths
                        return url.startsWith('/') ? `.${url}` : url;
                    }));
                })
                .catch(error => {
                    console.warn('Failed to cache some static files:', error);
                    // Cache what we can
                    return caches.open(STATIC_CACHE_NAME)
                        .then(cache => {
                            const essentialFiles = ['./index.html', './style.css', './app.js'];
                            return cache.addAll(essentialFiles);
                        });
                })
        ])
    );
    
    // Skip waiting to activate immediately
    self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Delete old caches that don't match current version
                    if (cacheName !== STATIC_CACHE_NAME && 
                        cacheName !== DYNAMIC_CACHE_NAME &&
                        cacheName.startsWith('hours-tracker-')) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Take control of all pages immediately
            return self.clients.claim();
        })
    );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
    const { request } = event;
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip Google APIs requests - handle them specially
    if (request.url.includes('googleapis.com') || 
        request.url.includes('accounts.google.com') ||
        request.url.includes('gstatic.com')) {
        
        event.respondWith(
            fetch(request)
                .catch(() => {
                    // If Google APIs fail, the app will handle it gracefully
                    console.log('Google API request failed offline');
                    return new Response('Google API unavailable offline', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                })
        );
        return;
    }
    
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                // Return cached version if available
                if (cachedResponse) {
                    console.log('Serving from cache:', request.url);
                    return cachedResponse;
                }
                
                // Otherwise fetch from network and cache dynamically
                return fetch(request)
                    .then(response => {
                        // Don't cache if response is not OK
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone response for caching
                        const responseClone = response.clone();
                        
                        // Cache non-API requests
                        if (!request.url.includes('googleapis.com')) {
                            caches.open(DYNAMIC_CACHE_NAME)
                                .then(cache => {
                                    cache.put(request, responseClone);
                                });
                        }
                        
                        return response;
                    })
                    .catch(error => {
                        console.log('Fetch failed:', error);
                        
                        // Provide offline fallback for HTML pages
                        if (request.headers.get('accept').includes('text/html')) {
                            return caches.match('./index.html');
                        }
                        
                        // For other resources, throw error
                        throw error;
                    });
            })
    );
});

// Background sync for data synchronization
self.addEventListener('sync', event => {
    console.log('Background sync triggered:', event.tag);
    
    if (event.tag === 'sync-hours-data') {
        event.waitUntil(
            syncHoursData()
        );
    }
});

// Function to sync hours data when online
async function syncHoursData() {
    try {
        // Get all clients (app instances)
        const clients = await self.clients.matchAll();
        
        // Post message to app to trigger sync
        clients.forEach(client => {
            client.postMessage({
                type: 'BACKGROUND_SYNC',
                action: 'SYNC_DATA'
            });
        });
        
        console.log('Background sync completed');
    } catch (error) {
        console.error('Background sync failed:', error);
        throw error;
    }
}

// Push notification handler (for future use)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body || 'Don\'t forget to log your hours!',
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiM0Mjg1ZjQiLz4KPHN2ZyB4PSI0OCIgeT0iNDgiIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAyQzYuNSAyIDIgNi41IDIgMTJzNC41IDEwIDEwIDEwIDEwLTQuNSAxMC0xMFMxNy41IDIgMTIgMnptNCAxMWgtNFY2aDJ2NWgydjJ6Ii8+Cjwvc3ZnPgo8L3N2Zz4K',
            badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDgiIGN5PSI0OCIgcj0iNDgiIGZpbGw9IiM0Mjg1ZjQiLz4KPHN2ZyB4PSIyNCIgeT0iMjQiIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAyQzYuNSAyIDIgNi41IDIgMTJzNC41IDEwIDEwIDEwIDEwLTQuNSAxMC0xMFMxNy41IDIgMTIgMnptNCAxMWgtNFY2aDJ2NWgydjJ6Ii8+Cjwvc3ZnPgo8L3N2Zz4K',
            tag: 'hours-reminder',
            requireInteraction: false,
            actions: [
                {
                    action: 'log-hours',
                    title: 'Log Hours'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification('Hours Tracker', options)
        );
    }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'log-hours') {
        // Open the app
        event.waitUntil(
            clients.matchAll().then(clientList => {
                if (clientList.length > 0) {
                    return clientList[0].focus();
                }
                return clients.openWindow('/');
            })
        );
    }
});

// Message handler for communication with main app
self.addEventListener('message', event => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'REGISTER_SYNC':
            // Register for background sync
            if (self.registration.sync) {
                self.registration.sync.register('sync-hours-data');
            }
            break;
            
        case 'CACHE_UPDATE':
            // Update cache with new data
            event.waitUntil(
                caches.open(DYNAMIC_CACHE_NAME)
                    .then(cache => cache.put(data.url, new Response(data.content)))
            );
            break;
    }
});

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', event => {
        if (event.tag === 'daily-sync') {
            event.waitUntil(syncHoursData());
        }
    });
}

console.log('Service Worker loaded');
