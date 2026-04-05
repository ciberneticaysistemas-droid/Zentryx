import { NextResponse } from 'next/server';
import { auditStore } from '@/lib/store';
import type { Employee } from '@/types';

declare global {
  // eslint-disable-next-line no-var
  var __zx_employees: Employee[] | undefined;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const employees: Employee[] = globalThis.__zx_employees ?? [];
  try {
    const patch = await req.json();
    const idx = employees.findIndex(e => e.id === id);
    if (idx === -1) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    Object.assign(employees[idx], patch);
    auditStore.log({
      userId: 'admin', userName: 'Valentina Ríos',
      action: 'update', entity: 'Employee', entityId: id,
      detail: `Empleado actualizado: ${JSON.stringify(patch)}`,
    });
    return NextResponse.json({ success: true, employee: employees[idx] });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const employees: Employee[] = globalThis.__zx_employees ?? [];
  const idx = employees.findIndex(e => e.id === id);
  if (idx === -1) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  // Soft delete — set status to inactive
  employees[idx].status = 'inactive';
  auditStore.log({
    userId: 'admin', userName: 'Valentina Ríos',
    action: 'delete', entity: 'Employee', entityId: id,
    detail: `Empleado ${employees[idx].name} desactivado (soft delete)`,
  });
  return NextResponse.json({ success: true });
}
