import { NextRequest, NextResponse } from 'next/server';
import { reordenarTurnos } from '@/lib/queue';

export async function POST(request: NextRequest) {
  const { ids } = await request.json();
  reordenarTurnos(ids as number[]);
  return NextResponse.json({ ok: true });
}
