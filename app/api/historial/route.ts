import { NextResponse } from 'next/server';
import { getHistorial } from '@/lib/store';

export async function GET() {
  const entries = getHistorial();
  return NextResponse.json(entries.slice().reverse()); // más reciente primero
}
