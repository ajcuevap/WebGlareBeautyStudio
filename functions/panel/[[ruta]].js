// glarebeautystudio.com/panel → servidor del panel (Render). PANEL_ORIGEN se configura en Cloudflare Pages > Variables.
// El plan gratuito de Render apaga el servidor sin uso; mientras despierta responde 502/503 y aquí se muestra una espera amable.
const DESPERTANDO = [502, 503, 504];
const REINTENTO_SEGUNDOS = 5;
const MENSAJE = 'El panel se está iniciando. Intenta de nuevo en unos segundos.';

const ESPERA = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="${REINTENTO_SEGUNDOS}"><meta name="robots" content="noindex">
<title>Iniciando el panel · Glare Beauty Studio</title>
<link rel="stylesheet" href="/assets/css/estilos.css">
<style>
  body { min-height: 100svh; display: grid; place-items: center; text-align: center; padding: 24px; }
  .anillo { width: 54px; height: 54px; margin: 0 auto 24px; border-radius: 50%; border: 3px solid var(--linea); border-top-color: var(--oro); animation: girar 1s linear infinite; }
  h1 { font-size: clamp(1.8rem, 5vw, 2.6rem); margin-bottom: 10px; }
  p { color: var(--suave); margin: 0; }
  @keyframes girar { to { transform: rotate(1turn); } }
  @media (prefers-reduced-motion: reduce) { .anillo { animation: none; } }
</style></head>
<body><main><div class="anillo" aria-hidden="true"></div><h1>Iniciando el panel…</h1>
<p>Tarda menos de un minuto. Esta página se recarga sola.</p></main></body></html>`;

function despertando(request) {
  const cabeceras = { 'Retry-After': String(REINTENTO_SEGUNDOS), 'Cache-Control': 'no-store' };
  if (request.method === 'GET' && (request.headers.get('Accept') || '').includes('text/html')) {
    return new Response(ESPERA, { status: 503, headers: { ...cabeceras, 'Content-Type': 'text/html; charset=utf-8' } });
  }
  return Response.json({ error: MENSAJE }, { status: 503, headers: cabeceras });
}

export async function onRequest({ request, env }) {
  if (!env.PANEL_ORIGEN) return new Response('Falta configurar PANEL_ORIGEN', { status: 500 });
  const url = new URL(request.url);
  const destino = new Request(`${env.PANEL_ORIGEN}${url.pathname}${url.search}`, request);
  destino.headers.set('X-Forwarded-Host', url.host);
  destino.headers.set('X-Glare-Proxy', '1'); // el servidor solo atiende el panel cuando llega por aquí
  try {
    const respuesta = await fetch(destino, { redirect: 'manual' });
    return DESPERTANDO.includes(respuesta.status) ? despertando(request) : respuesta;
  } catch {
    return despertando(request);
  }
}
