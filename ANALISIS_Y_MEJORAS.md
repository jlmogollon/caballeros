# Análisis general de la app Caballeros · Hombres de Verdad

## 1. Estado general

La app es una **SPA (Single Page Application)** para el ministerio de Caballeros: gestión de caballeros, grupos, clases, calificaciones, cumpleaños, peticiones de oración, eventos, finanzas e informes PDF. Tiene **dos modos de entrada** (Admin y Caballero), **sincronización con Firebase** (Firestore) y **fallback a localStorage**. El código está repartido en:

- **index.html** — estructura, pantallas y mucho JS inline (lógica duplicada en parte con los `.js`)
- **app.js** — DB, login, cálculos, seed, informes PDF, finanzas (gran parte de la lógica)
- **app.css** — estilos centralizados, variables CSS, componentes
- **app.peticiones.js** — peticiones de oración
- **app.eventos.js** — eventos, cultos, estudios
- **app.finanzas.js** — resumen y listas de finanzas (admin y vista personal)

Funcionalidad rica y alineada con el uso real del ministerio; la base está bien planteada para seguir creciendo.

---

## 2. Fortalezas

- **Firebase + localStorage**: persistencia en nube con recuperación local ante fallos.
- **ensureDbShape()**: normaliza datos antiguos y evita errores por campos faltantes.
- **Caché de cálculos** (`_calcCache`, `_rankCache`) e `invalidateCache()` para no recalcular en cada render.
- **Perfil del caballero** completo (foto, datos personales, visibilidad por campo).
- **Toasts** en lugar de `alert()` para feedback no bloqueante.
- **PWA-ready**: manifest, meta de tema, iconos, vista móvil.
- **Informes PDF** por caballero y económico, con estilos de impresión.
- **Escapado** con `escAttr()` en datos mostrados en HTML para reducir XSS.
- **Documentación** de Firebase (CONFIGURAR_FIREBASE.md, REGLAS_FIREBASE_30_DIAS.md).

---

## 3. Áreas de mejora y sugerencias

### 3.1 Seguridad

| Aspecto | Situación actual | Sugerencia |
|--------|-------------------|------------|
| **Contraseñas** | Guardadas en claro en `DB.adminPw` y `c.pw`. Quien tenga acceso al JSON (export/import o Firestore) las ve. | En una versión futura: no guardar contraseñas en texto plano; usar hash (p. ej. con Web Crypto o una lib pequeña). Mientras tanto, dejar claro en la doc que el export/import y el acceso a Firestore son sensibles. |
| **Firebase** | Config en el HTML (apiKey visible). Es habitual en front; la seguridad real está en reglas de Firestore. | Revisar que las reglas de Firestore no permitan lectura/escritura abierta en producción (solo lectura/escritura autenticada o por app si aplica). |
| **Admin** | Quien sabe la contraseña de admin puede ver y cambiar todo. | Opcional: segunda contraseña o PIN para acciones destructivas (eliminar caballero, importar datos). |

### 3.2 UX y accesibilidad

| Aspecto | Sugerencia |
|--------|------------|
| **Toasts** | No hay contraste/estilo definido en CSS para `.toast` (solo se crea el div). | Añadir en `app.css` estilos para `.toast` (posición fija, fondo, sombra, z-index) y variantes `.toast.ok`, `.toast.err`, `.toast.info` para que se vean bien y sean legibles. |
| **Confirmaciones** | Varios `confirm()` nativos (finanzas, importar, clase duplicada). En móvil son poco amigables. | Sustituir por modales propios (reutilizando `openSheet`) con botones "Cancelar" y "Eliminar / Sí" para coherencia con el resto de la app. |
| **Accesibilidad** | Pocos `aria-*`, `role`, `tabindex`. | Ir añadiendo: `aria-label` en botones solo con icono, `role="button"` donde haga falta, y asegurar que los modales reciban foco y se cierren con Escape. |
| **Teclado** | Enter en login está bien; en otros formularios no siempre. | Revisar formularios largos (perfil, finanzas): que Enter en un input no envíe por defecto si hay varios botones, o unificar "Guardar" como acción principal. |
| **Carga inicial** | Pantalla de carga con mensaje; si Firebase tarda, el usuario no sabe si reintentar. | Si `cloudLoad()` falla o supera un timeout, mostrar un botón "Usar sin conexión" o "Reintentar" en la misma pantalla. |

### 3.3 Código y mantenibilidad

| Aspecto | Situación actual | Sugerencia |
|--------|-------------------|------------|
| **index.html** | Archivo muy grande (~2700+ líneas de JS en bloques `<script>`), difícil de navegar. | Ir sacando funciones a `app.js` (o a módulos por dominio: `app.caballeros.js`, `app.modal.js`) y dejar en el HTML solo el que sea estrictamente necesario (p. ej. config Firebase). |
| **Duplicación** | Lógica de eventos (crear/editar/borrar) existe en `app.js` y en `app.eventos.js`; finanzas repartida entre `app.js` y `app.finanzas.js`. | Unificar: que `app.eventos.js` y `app.finanzas.js` sean la única fuente de verdad y que `app.js` solo llame a esas funciones, sin reimplementar. |
| **IDs y selectores** | Muchos `getElementById` con strings mágicos. | Agrupar IDs en un objeto constante (p. ej. `IDS = { loginErr: 'login-err', ... }`) o usar `data-*` + un helper para reducir errores de typo. |
| **Moneda** | En informes PDF se usa `€`; en finanzas en pantalla `$` y `toLocaleString('es-CO')`. | Unificar símbolo y locale en una constante (p. ej. `MONEDA = { symbol: '$', locale: 'es-CO' }`) y usarla en listas e informes. |

### 3.4 Rendimiento

| Aspecto | Sugerencia |
|--------|------------|
| **Fotos** | Fotos en base64 en el documento de Firestore aumentan mucho el tamaño y el tiempo de carga. | Valorar Firebase Storage para fotos: guardar en Storage, guardar en cada caballero solo la URL; reducir payload de Firestore y mejorar carga. |
| **Payload Firestore** | Se avisa si el JSON supera ~900 KB. | Además de Storage para imágenes: no guardar historial de clases infinito en un solo doc; o dividir en subcolecciones (caballeros, clases, finanzas) si se supera el límite. |
| **Listas largas** | Listas de caballeros/clases renderizadas de golpe. | Si en el futuro hay muchas decenas de caballeros o clases, considerar virtualización (mostrar solo los visibles) o paginación. |

### 3.5 Pequeñas mejoras rápidas

- **Botón "Cerrar" en modales**: Asegurar que todas las sheets tengan un cierre visible (icono X o texto "Cerrar") además del tap fuera.
- **Guardar perfil**: Tras "Guardar perfil", opcionalmente cerrar el sheet o dejar un mensaje más visible (toast ya lo hace).
- **Campamento**: Si la encuesta de campamento ya pasó, ocultar o archivar el bloque en vista personal para no saturar.
- **Versión / changelog**: Un número de versión (p. ej. en el footer o en Ayuda) y un enlace a "Qué hay de nuevo" ayuda a soporte y usuarios.
- **Exportar datos**: Incluir en el JSON exportado una versión de esquema (p. ej. `schemaVersion: 2`) para que futuros `ensureDbShape` puedan migrar datos antiguos si cambias la estructura.

---

## 4. Resumen de prioridades

1. **Corto plazo (poco esfuerzo)**  
   - Estilos CSS para toasts.  
   - Sustituir `confirm()` por modales propios en 2–3 sitios críticos (eliminar gasto, importar datos).  
   - Unificar símbolo/locale de moneda.

2. **Medio plazo**  
   - Mover más JS de `index.html` a `app.js` o módulos.  
   - Quitar duplicación entre `app.js` y `app.eventos.js` / `app.finanzas.js`.  
   - Mejorar mensaje/botón cuando Firebase falla o tarda (reintentar / usar sin conexión).

3. **Largo plazo**  
   - Contraseñas hasheadas (requiere flujo de "crear/restablecer" bien pensado).  
   - Fotos en Firebase Storage.  
   - Mejoras de accesibilidad (ARIA, teclado, foco en modales).

Si indicas por dónde quieres empezar (seguridad, UX, código o rendimiento), se pueden bajar estas ideas a tareas concretas y cambios de archivos paso a paso.
