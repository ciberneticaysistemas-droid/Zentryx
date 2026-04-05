import { NextResponse } from 'next/server';
import { auditStore } from '@/lib/store';

// In-memory employee list (extends the mock data at runtime)
import { employees as seedEmployees } from '@/lib/data';
import type { Employee } from '@/types';

declare global {
  // eslint-disable-next-line no-var
  var __zx_employees: Employee[] | undefined;
}
const employees: Employee[] = (globalThis.__zx_employees ??= [...seedEmployees]);

export function GET() {
  return NextResponse.json(employees);
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Omit<Employee, 'id' | 'initials'>;
    if (!body.name || !body.email) {
      return NextResponse.json({ success: false, error: 'name and email required' }, { status: 400 });
    }
    const initials = body.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
    const id = `E${String(employees.length + 1).padStart(3, '0')}`;
    const emp: Employee = { ...body, id, initials, salary: Number(body.salary) };
    employees.unshift(emp);
    auditStore.log({
      userId: 'admin', userName: 'Valentina Ríos',
      action: 'create', entity: 'Employee', entityId: id,
      detail: `Empleado ${emp.name} creado en ${emp.department}`,
    });
    return NextResponse.json({ success: true, employee: emp }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }
}
