import { NextResponse } from 'next/server';
import { prevTurn } from '@/lib/queue';

export async function POST() {
  const result = prevTurn();
  return NextResponse.json(result);
}
