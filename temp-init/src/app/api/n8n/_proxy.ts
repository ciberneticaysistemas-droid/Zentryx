const N8N_BASE = 'https://alejandromm.app.n8n.cloud/webhook';

export async function proxyToN8N(path: string, req: Request): Promise<Response> {
  const body = await req.text();

  const upstream = await fetch(`${N8N_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body,
  });

  const raw = await upstream.text();

  return new Response(raw, {
    status: upstream.ok ? 200 : upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
