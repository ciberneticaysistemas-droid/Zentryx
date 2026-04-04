import { NextResponse } from 'next/server';
import { pqrStore } from '@/lib/store';

export function GET() {
  return NextResponse.json(pqrStore.getAll());
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    console.log('[API/cases/pqr] RECIBIDO POST:', rawBody.slice(0, 500));
    const body = JSON.parse(rawBody);
    const item = pqrStore.add(body);
    console.log('[API/cases/pqr] GUARDADO EXITOSO:', item.id);
    return NextResponse.json({ success: true, case: item }, { status: 201 });
  } catch (err) {
    console.error('[API/cases/pqr] ERROR GUARDANDO:', err);
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }
}
