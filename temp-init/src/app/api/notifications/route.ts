import { NextResponse } from 'next/server';
import { notificationStore } from '@/lib/store';

export function GET() {
  return NextResponse.json(notificationStore.getAll());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const item = notificationStore.add(body);
    return NextResponse.json({ success: true, notification: item }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, all } = await req.json() as { id?: string; all?: boolean };
    if (all) {
      notificationStore.markAllRead();
    } else if (id) {
      notificationStore.markRead(id);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }
}
