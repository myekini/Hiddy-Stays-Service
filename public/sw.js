const CACHE_NAME = 'bookdirect-v2';
const STATIC_CACHE = 'bookdirect-static-v2';
const DYNAMIC_CACHE = 'bookdirect-dynamic-v2';

const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/light_pwa_192x192.png',
  '/icons/light_pwa_512x512.png',
  '/icons/light_favicon.ico',
  '/src/assets/hero-property.jpg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Cal+Sans:wght@400;600&display=swap'
];

// Assets to cache on first visit
const DYNAMIC_CACHE_PATHS = [
  '/search',
  '/auth',
  '/host/auth'
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(urlsToCache)),
      caches.open(DYNAMIC_CACHE)
    ])
  );
  self.skipWaiting();
});

// Fetch events
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;
  if (url.includes('/_next/') || url.includes('hot-update') || url.includes('__nextjs')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            const url = event.request.url;

            // Cache assets but NOT API responses (to ensure fresh data)
            if (url.includes('.js') || url.includes('.css') || url.includes('.jpg') || url.includes('.png')) {
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            // Don't cache /api/ routes to ensure fresh data

            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/') || new Response('Offline', { status: 503 });
            }
            // Return cached asset or empty response
            return caches.match(event.request) || new Response('', { status: 503 });
          });
      })
  );
});

// Activate service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![STATIC_CACHE, DYNAMIC_CACHE].includes(cacheName)) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim clients immediately
      self.clients.claim()
    ])
  );
});

// Background sync for bookings
self.addEventListener('sync', (event) => {
  if (event.tag === 'booking-sync') {
    event.waitUntil(syncBookings());
  }
});

async function syncBookings() {
  try {
    // Get pending bookings from IndexedDB
    const db = await openIndexedDB();
    const pendingBookings = await getPendingBookings(db);
    
    for (const booking of pendingBookings) {
      try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(booking.data)
        });
        
        if (response.ok) {
          await removePendingBooking(db, booking.id);
          // Show success notification
          self.registration.showNotification('Booking Confirmed', {
            body: 'Your booking has been successfully processed!',
            icon: '/icons/light_pwa_192x192.png',
            tag: 'booking-success'
          });
        }
      } catch (error) {
        console.error('Failed to sync booking:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BookDirectDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingBookings')) {
        db.createObjectStore('pendingBookings', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getPendingBookings(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingBookings'], 'readonly');
    const store = transaction.objectStore('pendingBookings');
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removePendingBooking(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingBookings'], 'readwrite');
    const store = transaction.objectStore('pendingBookings');
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification from HiddyStays',
    icon: '/icons/light_pwa_192x192.png',
    badge: '/icons/light_pwa_96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore', 
        title: 'View Details',
        icon: '/icons/light_pwa_96x96.png'
      },
      {
        action: 'close', 
        title: 'Close',
        icon: '/icons/light_pwa_96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('HiddyStays', options)
  );
});