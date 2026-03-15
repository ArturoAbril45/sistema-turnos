'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Turno } from '@/lib/queue';
import { ArrowLeftIcon, PlayIcon, ArrowRightIcon, UsersIcon } from '@/components/icons';

interface Estado { current: Turno | null; waitingCount: number }

export default function Consultorio() {
  const [estado, setEstado]   = useState<Estado>({ current: null, waitingCount: 0 });
  const [loading, setLoading] = useState<string | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const prevCodeRef = useRef<string | null>(null);

  async function fetchEstado() {
    const res  = await fetch('/api/estado');
    const data = await res.json();
    const nuevo = data.current?.codigo ?? null;
    if (nuevo !== prevCodeRef.current) {
      prevCodeRef.current = nuevo;
      setAnimKey((k) => k + 1);
    }
    setEstado({ current: data.current, waitingCount: data.waitingCount });
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

  return (
    <div
      className="h-screen flex flex-col select-none overflow-hidden"
      style={{ background: 'linear-gradient(155deg, #0c1445 0%, #1e3a8a 40%, #1d4ed8 75%, #0369a1 100%)' }}
    >
      {/* Ruido de fondo sutil */}
      <div className="absolute inset-0 opacity-[.03] pointer-events-none"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      {/* ── Header label ── */}
      <div className="relative z-10 px-6 pt-6 pb-2 flex items-center justify-between">
        <div>
          <Link href="/"
            className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition text-[10px] font-semibold mb-1 w-fit">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              width={11} height={11}>
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Menú
          </Link>
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Módulo</p>
          <p className="text-white/80 text-sm font-bold tracking-wide">Consultorio</p>
        </div>
        {/* Indicador de estado */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${hayTurno ? 'bg-green-500/20 text-green-300 ring-1 ring-green-400/30' : 'bg-white/10 text-white/40'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${hayTurno ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
          {hayTurno ? 'En atención' : 'En espera'}
        </div>
      </div>

      {/* ── Turno central ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 px-6">

        {/* Label */}
        <p className="text-white/40 text-xs uppercase tracking-[.2em] font-semibold">
          Turno en atención
        </p>

        {/* Número principal — animado al cambiar */}
        <div
          key={animKey}
          className="anim-fade-in relative"
        >
          {/* Halo difuso detrás del número */}
          <div className="absolute inset-0 rounded-full blur-3xl opacity-20 bg-blue-400 scale-150 pointer-events-none" />
          <p
            className="relative text-white font-extrabold tracking-tighter leading-none text-center"
            style={{ fontSize: 'clamp(5.5rem, 28vw, 11rem)', letterSpacing: '-0.04em' }}
          >
            {estado.current?.codigo ?? (
              <span className="text-white/20">—</span>
            )}
          </p>
        </div>

        {/* Badge pacientes en espera */}
        <div
          className="flex items-center gap-4 rounded-2xl px-6 py-4"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.12)' }}>
            <UsersIcon size={20} className="text-white/80" />
          </div>
          <div>
            <p className="text-white/50 text-xs uppercase tracking-widest font-medium leading-tight">
              Pacientes restantes
            </p>
            <p className="text-white font-extrabold text-3xl leading-tight tabular-nums">
              {estado.waitingCount}
            </p>
          </div>
        </div>
      </div>

      {/* ── Botones de acción ── */}
      <div
        className="relative z-10 px-4 pb-6 pt-4 grid grid-cols-3 gap-3"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Atrás */}
        <button
          onClick={() => accion('/api/anterior', 'anterior')}
          disabled={!!loading}
          className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl font-bold text-white transition-all active:scale-95 disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 2px 12px rgba(0,0,0,.2)',
          }}
        >
          {loading === 'anterior'
            ? <Spinner />
            : <ArrowLeftIcon size={22} />
          }
          <span className="text-sm text-white/80">Atrás</span>
        </button>

        {/* Iniciar / Siguiente — botón principal */}
        <button
          onClick={() => accion('/api/siguiente', 'siguiente')}
          disabled={!!loading}
          className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl font-bold text-white transition-all active:scale-95 disabled:opacity-50 col-span-1"
          style={{
            background: hayTurno
              ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
              : 'linear-gradient(135deg, #059669, #047857)',
            boxShadow: hayTurno
              ? '0 4px 20px rgba(37,99,235,.5)'
              : '0 4px 20px rgba(5,150,105,.5)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {loading === 'siguiente'
            ? <Spinner />
            : <PlayIcon size={26} />
          }
          <span className="text-base">{hayTurno ? 'Siguiente' : 'Iniciar'}</span>
        </button>

        {/* Adelante */}
        <button
          onClick={() => accion('/api/siguiente', 'adelante')}
          disabled={!!loading}
          className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl font-bold text-white transition-all active:scale-95 disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 2px 12px rgba(0,0,0,.2)',
          }}
        >
          {loading === 'adelante'
            ? <Spinner />
            : <ArrowRightIcon size={22} />
          }
          <span className="text-sm text-white/80">Adelante</span>
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" width={22} height={22}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="3" />
      <path className="opacity-75" fill="white"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
