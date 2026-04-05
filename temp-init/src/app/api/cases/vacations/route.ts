import { NextResponse } from 'next/server';
import { vacationStore, auditStore } from '@/lib/store';

export function GET() {
  return NextResponse.json(vacationStore.getAll());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const item = vacationStore.add(body);
    auditStore.log({
      userId: 'system', userName: body.employeeName ?? 'Empleado',
      action: 'create', entity: 'VacationRequest', entityId: item.id,
      detail: `Solicitud de ${item.type} del ${item.startDate} al ${item.endDate}`,
    });
    return NextResponse.json({ success: true, vacation: item }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }
}
