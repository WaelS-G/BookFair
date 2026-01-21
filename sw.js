const CACHE_NAME = 'cibf-wizard-v4';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './data.js',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@300;500;700;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn-icons-png.flaticon.com/512/3389/3389081.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
