import { NextResponse } from 'next/server';
import { auditStore } from '@/lib/store';

export function GET() {
  return NextResponse.json(auditStore.getAll());
}
