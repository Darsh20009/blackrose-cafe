// QIROX Cafe Service Worker - Rich Push Notifications + Offline Caching
// Version: 4.0 - Creative Notifications with Stage Tracking

const CACHE_NAME = 'qirox-cafe-v4';

// Install: cache essential assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/logo.png', '/manifest.json']).catch(() => {});
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Build a Unicode progress bar for order stages
function buildProgressBar(orderStatus) {
  const stages = ['pending', 'payment_confirmed', 'in_progress', 'ready', 'completed'];
  const stageLabels = ['📦', '✅', '☕', '🔔', '🎉'];
  const idx = stages.indexOf(orderStatus);
  if (idx < 0) return '';
  return stageLabels.map((icon, i) => (i <= idx ? icon : '◯')).join(' ─ ');
}

// Build a clean text progress bar using dots
function buildTextProgress(stageIndex, totalStages) {
  if (stageIndex < 0 || totalStages < 1) return '';
  const filled = '●';
  const empty = '○';
  const connector = '───';
  let bar = '';
  for (let i = 0; i < totalStages; i++) {
    bar += i <= stageIndex ? filled : empty;
    if (i < totalStages - 1) bar += connector;
  }
  return bar;
}

// Get stage-specific vibration pattern
function getVibrationPattern(orderStatus) {
  const patterns = {
    'pending':           [100, 50, 100],
    'payment_confirmed': [150, 80, 150],
    'in_progress':       [200, 100, 200, 100, 200],
    'ready':             [300, 100, 300, 100, 300, 100, 300],
    'completed':         [100, 50, 100, 50, 100, 50, 100, 50, 100],
    'cancelled':         [500, 200, 500],
  };
  return patterns[orderStatus] || [200, 100, 200];
}

// Push notification handler - rich notifications with image + progress
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: 'QIROX Cafe',
      body: event.data ? event.data.text() : 'إشعار جديد',
    };
  }

  const title = data.title || 'QIROX Cafe ☕';
  const orderStatus = data.orderStatus || data.status || '';
  const isOrderNotification = data.type === 'order_status' || data.type === 'new_order';

  // Build rich body with progress indicator
  let body = data.body || 'لديك إشعار جديد';
  if (isOrderNotification && orderStatus) {
    const progressBar = buildProgressBar(orderStatus);
    const textBar = (typeof data.stageIndex === 'number' && data.totalStages)
      ? buildTextProgress(data.stageIndex, data.totalStages)
      : '';

    if (progressBar) {
      body = data.body + '\n' + progressBar;
    }
    if (data.estimatedTime && orderStatus === 'in_progress') {
      body += '\n⏱ متبقي حوالي ' + data.estimatedTime + ' دقيقة';
    }
  }

  // Build action buttons based on order status
  let actions = data.actions || [];
  if (isOrderNotification && !data.actions) {
    if (orderStatus === 'ready') {
      actions = [
        { action: 'track', title: '📍 تتبع الطلب' },
        { action: 'directions', title: '🗺️ الاتجاهات' },
      ];
    } else if (orderStatus === 'completed') {
      actions = [
        { action: 'rate', title: '⭐ قيّم تجربتك' },
        { action: 'reorder', title: '🔄 إعادة الطلب' },
      ];
    } else {
      actions = [{ action: 'track', title: '👁 عرض الطلب' }];
    }
  }

  const requireInteraction = ['ready', 'completed', 'cancelled'].includes(orderStatus)
    || data.requireInteraction !== false;

  const vibrate = getVibrationPattern(orderStatus);

  const options = {
    body,
    icon: '/logo-192.png',
    badge: '/logo-32.png',
    tag: data.tag || 'qirox-notification',
    requireInteraction,
    vibrate,
    silent: false,
    timestamp: data.timestamp || Date.now(),
    data: {
      url: data.url || '/my-orders',
      orderNumber: data.orderNumber,
      orderStatus,
      orderType: data.orderType,
      ...data,
    },
    actions: actions.slice(0, 2),
  };

  // Include rich notification image if provided (shows large banner below text)
  if (data.image) {
    options.image = data.image;
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler - smart navigation
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const action = event.action;
  const orderNumber = notifData.orderNumber;
  const orderStatus = notifData.orderStatus;

  let url = notifData.url || '/my-orders';

  if (action === 'rate') {
    url = orderNumber ? `/my-orders?rate=${orderNumber}` : '/my-orders';
  } else if (action === 'reorder') {
    url = '/menu';
  } else if (action === 'track') {
    url = '/my-orders';
  } else if (action === 'directions') {
    url = notifData.url || '/my-orders';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(url);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Notification close handler (optional analytics)
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data || {};
  // Could track dismissal analytics here
});

// Background sync — auto-sync offline POS orders when connectivity returns
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-orders') {
    event.waitUntil(
      (async () => {
        try {
          const db = await new Promise((resolve, reject) => {
            const req = indexedDB.open('qirox-offline-db', 1);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });

          const pending = await new Promise((resolve, reject) => {
            const tx = db.transaction('offline-orders', 'readonly');
            const idx = tx.objectStore('offline-orders').index('status');
            const req = idx.getAll('pending');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });

          for (const order of pending) {
            try {
              const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order.orderData),
              });
              const newStatus = res.ok ? 'synced' : 'failed';
              const tx2 = db.transaction('offline-orders', 'readwrite');
              const store = tx2.objectStore('offline-orders');
              const record = await new Promise(r => { const req = store.get(order.localId); req.onsuccess = () => r(req.result); });
              if (record) { record.status = newStatus; store.put(record); }
            } catch {}
          }

          // Notify all open clients
          const clients = await self.clients.matchAll({ type: 'window' });
          clients.forEach(c => c.postMessage({ type: 'OFFLINE_SYNC_COMPLETE' }));
        } catch {}
      })()
    );
  }
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and API requests (let them go to network)
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) {
    return;
  }

  // For static assets: cache-first
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // For HTML pages: network-first with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
