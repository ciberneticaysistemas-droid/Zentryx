import { NextResponse } from 'next/server';
import { pqrStore } from '@/lib/store';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const patch = await req.json();
    pqrStore.update(id, patch);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }
}
