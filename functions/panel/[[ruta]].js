// glarebeautystudio.com/panel → servidor del panel (Render). PANEL_ORIGEN se configura en Cloudflare Pages > Variables.
export async function onRequest({ request, env }) {
  if (!env.PANEL_ORIGEN) return new Response('Falta configurar PANEL_ORIGEN', { status: 500 });
  const url = new URL(request.url);
  const destino = new Request(`${env.PANEL_ORIGEN}${url.pathname}${url.search}`, request);
  destino.headers.set('X-Forwarded-Host', url.host);
  destino.headers.set('X-Glare-Proxy', '1'); // el servidor solo atiende el panel cuando llega por aquí
  return fetch(destino, { redirect: 'manual' });
}
