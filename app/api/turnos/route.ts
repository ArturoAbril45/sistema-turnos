import { NextRequest, NextResponse } from 'next/server';
import { createTurno, getEstado } from '@/lib/queue';
import type { TipoTurno } from '@/lib/queue';

export async function GET() {
  return NextResponse.json(getEstado());
}

export async function POST(request: NextRequest) {
  const { tipo, nombre } = await request.json();
  const turno = createTurno(tipo as TipoTurno, nombre);
  return NextResponse.json(turno);
}
