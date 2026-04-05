import { NextResponse } from 'next/server';
import { vacationStore, auditStore } from '@/lib/store';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const patch = await req.json();
    vacationStore.update(id, patch);
    auditStore.log({
      userId: 'admin', userName: 'Valentina Ríos',
      action: patch.status === 'approved' ? 'approve' : 'reject',
      entity: 'VacationRequest', entityId: id,
      detail: `Estado actualizado a: ${patch.status}`,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }
}
