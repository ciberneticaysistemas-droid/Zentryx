import { NextResponse } from 'next/server';
import { absenceStore } from '@/lib/store';

export function GET() {
  return NextResponse.json(absenceStore.getAll());
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    console.log('[API/cases/absences] RECIBIDO POST:', rawBody.slice(0, 500));
    const body = JSON.parse(rawBody);
    const item = absenceStore.add(body);
    console.log('[API/cases/absences] GUARDADO EXITOSO:', item.id);
    return NextResponse.json({ success: true, case: item }, { status: 201 });
  } catch (err) {
    console.error('[API/cases/absences] ERROR GUARDANDO:', err);
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }
}
