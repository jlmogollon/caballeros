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

// Notificaciones push: mostrar cuando llegue un mensaje push
self.addEventListener('push',function(e){
  var data={};
  try{
    if(e.data)data=e.data.json();
  }catch(err){}
  var title=data.title||'Hombres de Verdad';
  var options={
    body:data.body||'',
    icon:data.icon||'favicon.png',
    badge:data.badge||'favicon.png',
    data:data.data||{}
  };
  e.waitUntil(self.registration.showNotification(title,options));
});

// Al hacer clic en la notificación, enfocar o abrir la app
self.addEventListener('notificationclick',function(e){
  e.notification.close();
  var target=(e.notification.data&&e.notification.data.url)||'/';
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
      for(var i=0;i<list.length;i++){
        var c=list[i];
        if(c.url.indexOf(target)!==-1){ c.focus(); return; }
      }
      return clients.openWindow(target);
    })
  );
});
