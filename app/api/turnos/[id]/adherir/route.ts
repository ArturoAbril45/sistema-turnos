import { NextRequest, NextResponse } from 'next/server';
import { adherirFicha } from '@/lib/queue';
import type { TipoTurno } from '@/lib/queue';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { tipo } = await request.json();
  const codigo = adherirFicha(Number(id), tipo as TipoTurno);
  if (!codigo) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true, codigo });
}
