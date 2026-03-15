import { NextRequest, NextResponse } from 'next/server';
import { cancelTurno, editCodigo } from '@/lib/queue';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = cancelTurno(Number(id));
  return NextResponse.json({ ok });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { codigo } = await request.json();
  const ok = editCodigo(Number(id), codigo);
  return NextResponse.json({ ok });
}
