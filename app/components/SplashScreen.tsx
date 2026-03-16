'use client';

import { useState } from 'react';

export default function SplashScreen() {
  const [fading,  setFading]  = useState(false);
  const [gone,    setGone]    = useState(false);

  if (gone) return null;

  function continuar() {
    setFading(true);
    setTimeout(() => setGone(true), 450);
  }

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center transition-opacity duration-[450ms] ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(145deg, #060d1f 0%, #0d1f42 55%, #071628 100%)' }}
    >
      {/* Resplandor central */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[420px] h-[420px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
      </div>

      <div className="relative flex flex-col items-center gap-7 text-center px-8">

        {/* Logo */}
        <div className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-2xl border border-blue-500/25"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
          <span className="text-3xl font-black text-white tracking-tighter select-none">OK</span>
        </div>

        {/* Nombre empresa */}
        <div>
          <h1 className="text-4xl font-black text-white tracking-wider" style={{ letterSpacing: '0.12em' }}>
            OPENKODE
          </h1>
          <p className="text-blue-400 text-sm font-semibold mt-1 tracking-widest uppercase">
            Sistema de Turnos
          </p>
        </div>

        {/* Separador */}
        <div className="flex items-center gap-3 w-48">
          <div className="flex-1 h-px bg-blue-900" />
          <div className="w-1 h-1 rounded-full bg-blue-600" />
          <div className="flex-1 h-px bg-blue-900" />
        </div>

        {/* Crédito desarrollador */}
        <div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Desarrollador</p>
          <p className="text-slate-200 font-semibold text-base mt-1">Arturo Abril</p>
        </div>

        {/* Botón continuar */}
        <button
          onClick={continuar}
          className="mt-2 px-12 py-3 rounded-lg text-white font-bold text-sm tracking-wide transition-all active:scale-95 hover:brightness-110 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
            boxShadow: '0 4px 24px rgba(37,99,235,0.35)',
          }}
        >
          Continuar
        </button>
      </div>

      {/* Versión */}
      <p className="absolute bottom-6 text-slate-700 text-xs tracking-widest">v1.0.0</p>
    </div>
  );
}
