// ═══════════════════════════════════════════════════════════════
// PROXY SERVERLESS — Hombres de Verdad
// Las credenciales de JSONBin viven SOLO aquí, en el servidor.
// El navegador nunca las ve.
// ═══════════════════════════════════════════════════════════════

const JSONBIN_ID  = process.env.JSONBIN_ID;
const JSONBIN_KEY = process.env.JSONBIN_KEY;
// Token secreto que tu app envía para confirmar que es legítima
const APP_TOKEN   = process.env.APP_TOKEN;

const BASE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;

exports.handler = async (event) => {

  // ── CORS: solo permite solicitudes de tu propio dominio ──
  const origin = event.headers.origin || event.headers.Origin || '';
  const allowedOrigins = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  const originOk = allowedOrigins.length === 0 || allowedOrigins.some(o => origin.startsWith(o));

  const corsHeaders = {
    'Access-Control-Allow-Origin':  originOk ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-app-token',
  };

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  // ── Verificar variables de entorno configuradas ──
  if (!JSONBIN_ID || !JSONBIN_KEY) {
    console.error('Faltan variables de entorno: JSONBIN_ID y/o JSONBIN_KEY');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Servidor no configurado correctamente.' }),
    };
  }

  // ── Verificar token de la app ──
  if (APP_TOKEN) {
    const clientToken = event.headers['x-app-token'] || event.headers['X-App-Token'] || '';
    if (clientToken !== APP_TOKEN) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No autorizado.' }),
      };
    }
  }

  // ── GET — Leer datos ──
  if (event.httpMethod === 'GET') {
    try {
      const res = await fetch(`${BASE_URL}/latest`, {
        headers: {
          'X-Master-Key': JSONBIN_KEY,
          'X-Bin-Meta': 'false',
        },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`JSONBin GET ${res.status}: ${text}`);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: text,
      };
    } catch (err) {
      console.error('GET error:', err.message);
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Error al leer datos: ' + err.message }),
      };
    }
  }

  // ── PUT — Guardar datos ──
  if (event.httpMethod === 'PUT') {
    try {
      // Validación básica: debe ser JSON válido con campo 'caballeros'
      let body;
      try {
        body = JSON.parse(event.body);
      } catch {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Cuerpo no es JSON válido.' }),
        };
      }
      if (!body || !Array.isArray(body.caballeros)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Estructura de datos inválida.' }),
        };
      }

      const res = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_KEY,
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`JSONBin PUT ${res.status}: ${text}`);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: text,
      };
    } catch (err) {
      console.error('PUT error:', err.message);
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Error al guardar datos: ' + err.message }),
      };
    }
  }

  // Método no permitido
  return {
    statusCode: 405,
    headers: corsHeaders,
    body: JSON.stringify({ error: 'Método no permitido.' }),
  };
};
