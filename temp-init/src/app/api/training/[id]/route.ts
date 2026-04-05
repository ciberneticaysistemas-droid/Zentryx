import { NextResponse } from 'next/server';
import { trainingStore, auditStore } from '@/lib/store';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const patch = await req.json();
    trainingStore.update(id, patch);
    auditStore.log({
      userId: 'admin', userName: 'Valentina Ríos',
      action: 'update', entity: 'TrainingRecord', entityId: id,
      detail: `Estado actualizado a: ${patch.status ?? 'modificado'}`,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }
}
