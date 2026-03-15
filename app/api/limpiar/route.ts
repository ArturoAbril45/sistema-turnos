import { NextResponse } from 'next/server';
import { limpiarCola } from '@/lib/queue';

export async function POST() {
  limpiarCola();
  return NextResponse.json({ ok: true });
}
