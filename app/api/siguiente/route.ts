import { NextResponse } from 'next/server';
import { nextTurn } from '@/lib/queue';

export async function POST() {
  const result = nextTurn();
  return NextResponse.json(result);
}
