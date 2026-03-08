// PWA Service Worker — solo caché de la shell; datos siempre desde la red
const CACHE = 'hdv-caballeros-v3';
const SHELL = ['/','/index.html','/app.css','/app.js','/app.peticiones.js','/app.eventos.js','/app.finanzas.js','/app.evaluaciones.js','/app.ui.js','/manifest.json','/favicon.png'];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }).catch(function(){}));
});
self.addEventListener('activate',function(e){ e.waitUntil(caches.keys().then(function(keys){ return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener('fetch',function(e){
  var u=e.request.url;
  if(u.indexOf('firestore')!==-1||u.indexOf('firebase')!==-1||u.indexOf('googleapis')!==-1){ e.respondWith(fetch(e.request)); return; }
  e.respondWith(fetch(e.request).catch(function(){ return caches.match(e.request); }));
});
