// ═══════════════════════════════════════════════════════════════
// PROXY CLOUDFLARE PAGES FUNCTION — Hombres de Verdad
// Las credenciales de JSONBin viven SOLO aquí, en el servidor.
// ═══════════════════════════════════════════════════════════════

const BASE_URL = (id) => `https://api.jsonbin.io/v3/b/${id}`;

function corsHeaders(origin, allowed) {
  const ok = !allowed || allowed.split(',').map(s => s.trim()).some(o => origin.startsWith(o));
  return {
    'Access-Control-Allow-Origin':  ok ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-app-token',
  };
}

export async function onRequest(ctx) {
  const { request, env } = ctx;
  const origin = request.headers.get('origin') || '';
  const cors   = corsHeaders(origin, env.ALLOWED_ORIGIN);

  // Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  // Variables de entorno requeridas
  if (!env.JSONBIN_ID || !env.JSONBIN_KEY) {
    return new Response(
      JSON.stringify({ error: 'Servidor no configurado.' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }

  // Verificar APP_TOKEN
  if (env.APP_TOKEN) {
    const clientToken = request.headers.get('x-app-token') || '';
    if (clientToken !== env.APP_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'No autorizado.' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }
  }

  // ── GET — Leer datos ──
  if (request.method === 'GET') {
    try {
      const res  = await fetch(`${BASE_URL(env.JSONBIN_ID)}/latest`, {
        headers: { 'X-Master-Key': env.JSONBIN_KEY, 'X-Bin-Meta': 'false' },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`JSONBin GET ${res.status}`);
      return new Response(text, {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Error al leer: ' + e.message }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }
  }

  // ── PUT — Guardar datos ──
  if (request.method === 'PUT') {
    try {
      let body;
      try { body = await request.json(); }
      catch { return new Response(JSON.stringify({ error: 'JSON inválido.' }), { status: 400, headers: cors }); }

      if (!body || !Array.isArray(body.caballeros)) {
        return new Response(
          JSON.stringify({ error: 'Estructura de datos inválida.' }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      const res  = await fetch(BASE_URL(env.JSONBIN_ID), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': env.JSONBIN_KEY },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`JSONBin PUT ${res.status}`);
      return new Response(text, {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Error al guardar: ' + e.message }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Método no permitido.' }),
    { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } }
  );
}
