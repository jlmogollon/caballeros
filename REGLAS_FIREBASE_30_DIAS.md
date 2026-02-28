# Reglas de Firebase para que siga guardando después de 30 días

Si creaste la base en **test mode**, a los 30 días Firestore deja de permitir lectura y escritura. Para que la app **siga guardando sin límite**:

## Pasos

1. Entra en **https://console.firebase.google.com/** y abre tu proyecto de Caballeros.
2. Menú **Build** → **Firestore Database**.
3. Pestaña **Rules** (Reglas).
4. Sustituye todo el contenido por lo siguiente y pulsa **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /caballeros_data/{document=**} {
      allow read, write: if true;
    }
  }
}
```

Listo. La colección `caballeros_data` quedará con lectura y escritura permitidas de forma permanente (sin límite de 30 días).
