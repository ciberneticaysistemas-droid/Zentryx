import { NextResponse } from 'next/server';
import { trainingStore, auditStore } from '@/lib/store';

export function GET() {
  return NextResponse.json(trainingStore.getAll());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const item = trainingStore.add(body);
    auditStore.log({
      userId: 'admin', userName: 'Valentina Ríos',
      action: 'create', entity: 'TrainingRecord', entityId: item.id,
      detail: `Capacitación "${item.courseTitle}" asignada a ${item.employeeName}`,
    });
    return NextResponse.json({ success: true, record: item }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }
}
