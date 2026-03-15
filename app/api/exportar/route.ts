import { NextResponse } from 'next/server';
import { readState } from '@/lib/store';

const TIPO_LABEL: Record<string, string> = {
  CO: 'Consulta Médica',
  AP: 'Aplicación / T. Presión',
  CM: 'Certificado Médico',
  PR: 'Procedimiento',
  NE: 'Nebulización',
  GL: 'Glucosa',
};

const ESTADO_LABEL: Record<string, string> = {
  esperando:   'En espera',
  en_atencion: 'En atención',
  atendido:    'Atendido',
  cancelado:   'Cancelado',
};

export async function GET() {
  const state = readState();
  const turnos = state.turnos;

  const rows = [
    ['Código', 'Nombre', 'Especialidad', 'Estado', 'Fecha', 'Hora'],
    ...turnos.map(t => {
      const fecha = new Date(t.created_at);
      return [
        t.codigo,
        t.nombre ?? '',
        TIPO_LABEL[t.tipo] ?? t.tipo,
        ESTADO_LABEL[t.estado] ?? t.estado,
        fecha.toLocaleDateString('es-ES'),
        fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      ];
    }),
  ];

  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\r\n');
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bitacora-${fecha}.csv"`,
    },
  });
}
