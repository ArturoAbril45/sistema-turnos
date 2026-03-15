import { NextRequest, NextResponse } from 'next/server';
import { getConfig, setConfig } from '@/lib/queue';

export async function GET() {
  return NextResponse.json({
    video_url: getConfig('video_url') ?? '',
  });
}

export async function POST(request: NextRequest) {
  const { clave, valor } = await request.json();
  setConfig(clave, valor);
  return NextResponse.json({ ok: true });
}
