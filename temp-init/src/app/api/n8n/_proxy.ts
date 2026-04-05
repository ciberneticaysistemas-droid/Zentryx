const N8N_BASE = process.env.N8N_BASE_URL || 'https://alejandromm.app.n8n.cloud/webhook';

// In-memory rate limiting to prevent spamming n8n
declare global {
  // eslint-disable-next-line no-var
  var __zx_n8n_ratelimit: Map<string, { count: number; resetAt: number }> | undefined;
}
const rateLimiter = (globalThis.__zx_n8n_ratelimit ??= new Map());

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);
  if (!record || now > record.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + 60000 }); // 60s window
    return true;
  }
  if (record.count >= 20) { // Max 20 requests per minute per IP
    return false;
  }
  record.count++;
  return true;
}

export async function proxyToN8N(path: string, req: Request): Promise<Response> {
  // Basic rate limiting
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.text();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for AI

    let upstream;
    try {
      upstream = await fetch(`${N8N_BASE}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const raw = await upstream.text();
    
    // Check if valid JSON
    let isJson = false;
    try {
      JSON.parse(raw);
      isJson = true;
    } catch (e) {}

    return new Response(isJson ? raw : JSON.stringify({ success: false, error: 'Invalid backend response', raw }), {
      status: upstream.ok ? 200 : upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('n8n proxy error:', error);
    const isTimeout = error.name === 'AbortError';
    return new Response(JSON.stringify({
      success: false,
      error: isTimeout ? 'Timeout waiting for n8n completion' : 'Error conectando con n8n',
      detail: error.message,
    }), {
      status: isTimeout ? 504 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
