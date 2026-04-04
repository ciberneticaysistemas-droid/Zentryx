import { proxyToN8N } from '../_proxy';
export async function POST(req: Request) {
  return proxyToN8N('zentryx/pqr/analyze', req);
}
