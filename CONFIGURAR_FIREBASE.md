# Firebase para Caballeros — Paso a paso

Sigue estos pasos en orden. Al terminar, la app guardará y sincronizará los datos en Firebase (igual que Escuela Dominical).

---

## Paso 1 — Entrar a Firebase

1. Abre el navegador y ve a: **https://console.firebase.google.com/**
2. Inicia sesión con tu cuenta de Google si te lo pide.

---

## Paso 2 — Crear el proyecto

1. Pulsa **“Añadir proyecto”** (o “Create a project”).
2. **Nombre del proyecto:** escribe algo como `Caballeros` o `Hombres de Verdad`.
3. Si te pregunta por Google Analytics, puedes desactivarlo (no es necesario para la app).
4. Pulsa **“Crear proyecto”** y espera a que termine.

---

## Paso 3 — Activar Firestore

1. En el menú izquierdo, entra en **“Build”** (Construir).
2. Pulsa **“Firestore Database”**.
3. Pulsa **“Create database”** (Crear base de datos).
4. Elige **“Start in test mode”** (empezar en modo prueba) para que funcione de inmediato. Luego podrás cambiar las reglas.
5. Elige una **región** (por ejemplo **southamerica-east1**).
6. Pulsa **“Enable”** (Habilitar) y espera a que se cree la base de datos.

---

## Paso 4 — Registrar la app web y copiar la config

1. En la página principal del proyecto, pulsa el **icono de engranaje** junto a “Project overview” y elige **“Project settings”** (Configuración del proyecto).
2. Baja hasta la sección **“Your apps”** (Tus apps).
3. Pulsa el icono **`</>`** (para una app web).
4. En **“App nickname”** escribe: `Caballeros Web`.
5. No marques “Firebase Hosting” (no hace falta).
6. Pulsa **“Register app”** (Registrar app).
7. En la pantalla que sigue verás un bloque de código con **`firebaseConfig`**. Copia **solo el objeto** que está entre llaves, algo así:

   ```javascript
   {
     apiKey: "AIza...",
     authDomain: "tu-proyecto.firebaseapp.com",
     projectId: "tu-proyecto",
     storageBucket: "tu-proyecto.firebasestorage.app",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc..."
   }
   ```

8. Pulsa **“Continue”** o **“Next”** hasta cerrar el asistente (no hace falta copiar el código de `firebase.initializeApp` que te muestre).

---

## Paso 5 — Pegar la config en `index.html`

1. Abre el archivo **`index.html`** del proyecto Caballeros en el editor.
2. Busca (Ctrl+F) el texto: **`FIREBASE_CONFIG`**.
3. Verás un bloque parecido a:

   ```javascript
   var FIREBASE_CONFIG = {
     apiKey: "PEGA_TU_API_KEY",
     authDomain: "tu-proyecto-caballeros.firebaseapp.com",
     projectId: "tu-proyecto-caballeros",
     ...
   };
   ```

4. **Sustituye todo ese objeto** por el que copiaste en el Paso 4. Debe quedar con tus valores reales (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
5. Guarda el archivo.

---

## Paso 6 — Reglas de Firestore (si usaste “test mode”)

Si en el Paso 3 elegiste **“Start in test mode”**, Firestore ya permite leer y escribir durante un tiempo. Si no, o si después quieres reglas fijas:

1. En Firebase Console: **Build** → **Firestore Database**.
2. Pestaña **“Rules”** (Reglas).
3. Sustituye el contenido por:

   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /caballeros_data/{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

4. Pulsa **“Publish”** (Publicar).

---

## Paso 7 — Probar que funciona

1. Abre la app en el navegador (por ejemplo con **Live Server** o abriendo el `index.html`).
2. Inicia sesión con la contraseña de admin (por defecto **1234**).
3. Si todo está bien:
   - Los datos se cargan desde la nube (no solo del dispositivo).
   - Al guardar cambios no debería salir “Sin conexión a la nube”.
4. Abre la **misma URL en otro navegador o en el móvil**: deberías ver los mismos datos.

Si algo falla, abre la **consola del navegador** (F12 → pestaña “Console”) y revisa si aparece algún error de Firebase (por ejemplo `permission-denied`).

---

## Resumen rápido

| Paso | Qué haces |
|------|------------|
| 1 | Entras en console.firebase.google.com |
| 2 | Creas un proyecto nuevo (ej. “Caballeros”) |
| 3 | Activas Firestore (Create database, test mode, elegir región) |
| 4 | En Project settings añades app web y copias el objeto `firebaseConfig` |
| 5 | En `index.html` reemplazas `FIREBASE_CONFIG` por ese objeto |
| 6 | Si hace falta, publicas las reglas de Firestore para `caballeros_data` |
| 7 | Abres la app, inicias sesión y compruebas que carga y guarda en la nube |

Cuando el `projectId` en `index.html` sea el de tu proyecto real (no `tu-proyecto-caballeros`), la app usará Firebase automáticamente.
