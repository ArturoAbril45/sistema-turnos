'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Turno } from '@/lib/queue';
import PinModal from '@/components/PinModal';

interface Estado { current: Turno | null; waiting: Turno[]; waitingCount: number; waitingNormal: number; waitingIntercalado: number }

const TIPO_LABEL: Record<string, { label: string; accent: string; bg: string; border: string }> = {
  CO: { label: 'Consulta Médica',          accent: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  AP: { label: 'Aplicación / T. Presión',  accent: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  CM: { label: 'Certificado Médico',        accent: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  PR: { label: 'Procedimiento',             accent: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  NE: { label: 'Nebulización',              accent: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  GL: { label: 'Glucosa',                   accent: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
};

export default function Consultorio() {
  const [estado, setEstado]   = useState<Estado>({ current: null, waiting: [], waitingCount: 0, waitingNormal: 0, waitingIntercalado: 0 });
  const [loading, setLoading] = useState<string | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [pinOk, setPinOk]     = useState(false);
  const prevCodeRef = useRef<string | null>(null);

  async function fetchEstado() {
    const res  = await fetch('/api/estado');
    const data = await res.json();
    const nuevo = data.current?.codigo ?? null;
    if (nuevo !== prevCodeRef.current) {
      prevCodeRef.current = nuevo;
      setAnimKey((k) => k + 1);
    }
    setEstado({ current: data.current, waiting: data.waiting ?? [], waitingCount: data.waitingCount, waitingNormal: data.waitingNormal ?? 0, waitingIntercalado: data.waitingIntercalado ?? 0 });
  }

  useEffect(() => {
    fetchEstado();
    const iv = setInterval(fetchEstado, 3000);
    return () => clearInterval(iv);
  }, []);

  async function accion(url: string, key: string) {
    if (loading) return;
    setLoading(key);
    await fetch(url, { method: 'POST' });
    await fetchEstado();
    setLoading(null);
  }

  const hayTurno = !!estado.current;
  const tipoInfo = estado.current ? (TIPO_LABEL[estado.current.tipo] ?? null) : null;

  if (!pinOk) return (
    <PinModal
      titulo="Acceso — Consultorio"
      subtitulo="Ingrese la clave de 4 dígitos"
      pin="2008"
      onSuccess={() => setPinOk(true)}
    />
  );

  return (
    <div className="h-screen flex flex-col bg-slate-50 select-none overflow-hidden">

      {/* ── Header ── */}
      <header className="shrink-0 bg-white border-b border-slate-200 z-10">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/"
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition p-1.5 rounded-lg hover:bg-slate-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              width={16} height={16}>
              <path d="m15 18-6-6 6-6"/>
            </svg>
            <span className="text-xs font-semibold">Menú</span>
          </Link>

          <div className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 rounded-lg bg-cyan-700 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24"
                fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
                <path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4"/>
                <circle cx="20" cy="10" r="2"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm leading-tight">Consultorio</p>
              <p className="text-slate-400 text-[10px] leading-tight hidden sm:block">Control de atención</p>
            </div>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
            hayTurno
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-slate-50 border-slate-200 text-slate-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hayTurno ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
            {hayTurno ? 'En atención' : 'Sin turno activo'}
          </div>
        </div>
      </header>

      {/* ── Cuerpo ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 min-h-0">

        {/* Turno card */}
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="h-1 w-full" style={{ background: tipoInfo?.accent ?? '#e2e8f0' }} />

          <div className="px-6 py-8 flex flex-col items-center gap-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Turno en atención
            </p>

            <div key={animKey} className="anim-fade-in text-center">
              <p className="font-extrabold tracking-tighter leading-none tabular-nums"
                style={{
                  fontSize: 'clamp(4.5rem, 22vw, 8rem)',
                  letterSpacing: '-0.04em',
                  color: tipoInfo?.accent ?? '#cbd5e1',
                }}>
                {estado.current?.codigo ?? <span className="text-slate-200">—</span>}
              </p>
            </div>

            {tipoInfo && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold"
                style={{ background: tipoInfo.bg, borderColor: tipoInfo.border, color: tipoInfo.accent }}>
                {tipoInfo.label}
              </div>
            )}

            {estado.current?.nombre && (
              <p className="text-sm text-slate-500 font-medium">{estado.current.nombre}</p>
            )}
          </div>
        </div>

        {/* Pacientes en espera */}
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width={15} height={15} viewBox="0 0 24 24"
                fill="none" stroke="#64748b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                Pacientes en espera
              </p>
              <p className="text-2xl font-extrabold text-slate-800 tabular-nums leading-tight">
                {estado.waitingCount}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-tight mb-0.5">
                Consultas
              </p>
              <p className="text-xl font-extrabold text-blue-700 tabular-nums">{estado.waitingNormal}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest leading-tight mb-0.5">
                Intercalados
              </p>
              <p className="text-xl font-extrabold text-green-600 tabular-nums">{estado.waitingIntercalado}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Botones ── */}
      <div className="shrink-0 bg-white border-t border-slate-200 px-4 py-4 grid grid-cols-3 gap-3"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>

        <button onClick={() => accion('/api/anterior', 'anterior')} disabled={!!loading}
          className="flex flex-col items-center justify-center gap-2 py-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-sm transition active:scale-95 disabled:opacity-40">
          {loading === 'anterior' ? <Spinner /> : (
            <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          )}
          <span className="text-xs">Anterior</span>
        </button>

        <button onClick={() => accion('/api/siguiente', 'siguiente')} disabled={!!loading}
          className="flex flex-col items-center justify-center gap-2 py-4 rounded-lg font-bold text-sm text-white transition active:scale-95 disabled:opacity-40"
          style={{
            background: hayTurno ? '#2563eb' : '#16a34a',
            boxShadow: hayTurno ? '0 2px 12px rgba(37,99,235,.35)' : '0 2px 12px rgba(22,163,74,.35)',
          }}>
          {loading === 'siguiente' ? <Spinner white /> : (
            <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24"
              fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              {hayTurno ? <path d="m9 18 6-6-6-6"/> : <polygon points="5 3 19 12 5 21 5 3"/>}
            </svg>
          )}
          <span className="text-xs">{hayTurno ? 'Siguiente' : 'Iniciar'}</span>
        </button>

        <button onClick={() => accion('/api/siguiente', 'adelante')} disabled={!!loading}
          className="flex flex-col items-center justify-center gap-2 py-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-sm transition active:scale-95 disabled:opacity-40">
          {loading === 'adelante' ? <Spinner /> : (
            <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          )}
          <span className="text-xs">Siguiente</span>
        </button>
      </div>
    </div>
  );
}

function Spinner({ white }: { white?: boolean }) {
  const c = white ? 'white' : '#64748b';
  return (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" width={20} height={20}>
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke={c} strokeWidth="3" />
      <path className="opacity-80" fill={c} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
