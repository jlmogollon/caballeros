// Script Node para enviar notificaciones push WebPush
// Uso:
//   1) Instalar dependencias:
//        npm install web-push firebase-admin
//   2) Configurar variables de entorno:
//        set VAPID_PUBLIC_KEY=TU_CLAVE_PUBLICA_VAPID
//        set VAPID_PRIVATE_KEY=TU_CLAVE_PRIVADA_VAPID
//        set GOOGLE_APPLICATION_CREDENTIALS=path\a\serviceAccountKey.json
//   3) Ejecutar:
//        node send-push.js admin
//      o  node send-push.js caballero
//
// Este script:
//   - Lee las suscripciones de la colección "caballeros_push" en Firestore.
//   - Filtra por "kind" (admin, caballero, etc.).
//   - Envía una notificación de prueba a cada suscripción encontrada.

const webpush = require('web-push');
const admin = require('firebase-admin');

// ── CONFIGURACIÓN VAPID (usar las mismas claves que en la app) ──
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('ERROR: Debes definir VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en variables de entorno.');
  process.exit(1);
}

webpush.setVapidDetails(
  'mailto:tunombre@example.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// ── INICIALIZAR FIREBASE ADMIN ──
// Usa GOOGLE_APPLICATION_CREDENTIALS si está definido; si no, intenta la ruta local indicada.
try {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    || 'C:\\Users\\jlmog\\OneDrive\\Descargas\\hombres-de-verdad-firebase-adminsdk-fbsvc-f527d500eb.json';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require(credPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (e) {
  console.error('ERROR al inicializar firebase-admin:', e.message);
  process.exit(1);
}

const db = admin.firestore();

// kind se pasa como primer argumento: admin, caballero, etc.
const kindArg = process.argv[2] || 'admin';

async function main() {
  try {
    console.log(`Buscando suscripciones push con kind="${kindArg}"...`);
    const snap = await db.collection('caballeros_push')
      .where('kind', '==', kindArg)
      .get();

    if (snap.empty) {
      console.log('No se encontraron suscripciones para este kind.');
      return;
    }

    const payload = JSON.stringify({
      title: kindArg === 'admin' ? '🔔 Aviso para administrador' : '📅 Recordatorio Caballeros',
      body: kindArg === 'admin'
        ? 'Hay nueva actividad en la app de Caballeros.'
        : 'Tienes novedades en el desafío diario / estudios.',
      data: {
        url: kindArg === 'admin' ? '/#screen-admin' : '/#screen-personal',
      },
    });

    let okCount = 0;
    let errCount = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      const sub = data.subscription;
      if (!sub) {
        console.warn('Suscripción vacía en doc', doc.id);
        continue;
      }
      try {
        await webpush.sendNotification(sub, payload);
        console.log('Notificación enviada a', doc.id);
        okCount++;
      } catch (e) {
        console.error('Error enviando a', doc.id, e.statusCode || '', e.body || e.message);
        errCount++;
      }
    }

    console.log(`Hecho. Éxitos: ${okCount}, Errores: ${errCount}`);
  } catch (e) {
    console.error('ERROR general en send-push.js:', e.message);
  }
}

main().then(() => process.exit());

