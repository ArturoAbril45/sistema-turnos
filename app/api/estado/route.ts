import { NextResponse } from 'next/server';
import { getEstado } from '@/lib/queue';

export async function GET() {
  return NextResponse.json(getEstado());
}
