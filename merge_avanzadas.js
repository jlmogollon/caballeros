/**
 * Añade las preguntas avanzadas (del JSON que pegaste) a preguntas_biblicas.json.
 * Uso: guarda tu JSON en preguntas_avanzadas_raw.json (con "metadata" y "preguntas")
 * y ejecuta: node merge_avanzadas.js
 * Las preguntas con id 1-200 se añadirán con ids 306-500 (las 301-305 ya están en el JSON).
 */
const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, 'preguntas_biblicas.json');
const rawPath = path.join(__dirname, 'preguntas_avanzadas_raw.json');

if (!fs.existsSync(rawPath)) {
  console.log('Crea el archivo preguntas_avanzadas_raw.json con el JSON que pegaste (el que tiene 200 preguntas con metadata y preguntas).');
  process.exit(1);
}

const main = JSON.parse(fs.readFileSync(mainPath, 'utf8'));
const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
const preguntasRaw = raw.preguntas || raw;
if (!Array.isArray(preguntasRaw) || preguntasRaw.length < 6) {
  console.log('preguntas_avanzadas_raw.json debe tener un array "preguntas" con al menos 6 preguntas.');
  process.exit(1);
}

// Ya tenemos 301-305 en el JSON; añadimos desde la 6ª pregunta del usuario como 306, 307, ... 500
const toAdd = preguntasRaw.slice(5, 200).map((q, i) => {
  const id = 306 + i;
  return { ...q, id };
});

main.preguntas = main.preguntas.concat(toAdd);

main.metadata.total = main.preguntas.length;
if (!main.metadata.niveles) main.metadata.niveles = [];
if (!main.metadata.niveles.includes('avanzado')) main.metadata.niveles.push('avanzado');

fs.writeFileSync(mainPath, JSON.stringify(main, null, 2), 'utf8');
console.log('Merge listo. Total preguntas:', main.preguntas.length);
console.log('Añadidas:', toAdd.length);
