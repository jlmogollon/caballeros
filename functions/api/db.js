export async function onRequest(context) {
  const { request, env } = context;

  // Verificar token de la app
  const token = request.headers.get('x-app-token');
  if (!token || token !== env.APP_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${env.JSONBIN_ID}`;
  const method = request.method;

  const headers = {
    'X-Master-Key': env.JSONBIN_KEY,
    'Content-Type': 'application/json'
  };

  let response;

  if (method === 'GET') {
    response = await fetch(JSONBIN_URL + '/latest', { headers });
    const data = await response.json();
    return new Response(JSON.stringify(data.record), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  if (method === 'PUT') {
    const body = await request.text();
    response = await fetch(JSONBIN_URL, {
      method: 'PUT',
      headers,
      body
    });
    const data = await response.json();
    return new Response(JSON.stringify(data.record), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // OPTIONS para CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-app-token'
      }
    });
  }

  return new Response('Method not allowed', { status: 405 });
}
