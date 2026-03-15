'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  titulo: string;
  subtitulo?: string;
  pin: string;
  onSuccess: () => void;
}

export default function PinModal({ titulo, subtitulo, pin, onSuccess }: Props) {
  const [value, setValue]       = useState('');
  const [error, setError]       = useState(false);
  const [shake, setShake]       = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  function submit(next: string) {
    if (next === pin) {
      setUnlocked(true);
      setTimeout(onSuccess, 350);
    } else {
      setShake(true);
      setError(true);
      setTimeout(() => { setValue(''); setShake(false); setError(false); }, 600);
    }
  }

  function handleDigit(d: string) {
    if (value.length >= 4 || unlocked) return;
    const next = value + d;
    setValue(next);
    if (next.length === 4) submit(next);
  }

  function handleDelete() {
    setValue(v => v.slice(0, -1));
    setError(false);
  }

  const KEYS = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['', '0','⌫'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-100 p-4">
      <div className={`bg-white w-full max-w-[320px] border border-slate-200 shadow-2xl overflow-hidden ${shake ? 'animate-shake' : ''}`}
        style={{ borderRadius: 12 }}>

        {/* Franja top */}
        <div className="h-1 w-full bg-blue-700" />

        {/* Encabezado */}
        <div className="px-7 pt-6 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 transition-colors duration-300 ${
              unlocked ? 'bg-green-100 border border-green-200' : 'bg-slate-100 border border-slate-200'
            }`}>
              {unlocked ? (
                <svg xmlns="http://www.w3.org/2000/svg" width={17} height={17} viewBox="0 0 24 24"
                  fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24"
                  fill="none" stroke="#475569" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="1"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              )}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-tight">{titulo}</p>
              {subtitulo && <p className="text-slate-400 text-xs mt-0.5">{subtitulo}</p>}
            </div>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="px-7 py-5">

          {/* Indicadores */}
          <div className="flex items-center justify-center gap-3 mb-1">
            {[0,1,2,3].map(i => (
              <div key={i}
                className="w-3 h-3 rounded-full border-2 transition-all duration-150"
                style={{
                  borderColor: error ? '#f87171' : i < value.length ? '#1d4ed8' : '#cbd5e1',
                  background:  error ? '#f87171' : i < value.length ? '#1d4ed8' : 'transparent',
                  transform:   i < value.length ? 'scale(1.1)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          {/* Error */}
          <p className={`text-center text-[11px] font-semibold text-red-500 mt-2 mb-4 transition-opacity duration-150 ${error ? 'opacity-100' : 'opacity-0'}`}>
            Clave incorrecta
          </p>

          {/* Input oculto para teclado físico */}
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={value}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 4);
              setValue(v);
              setError(false);
              if (v.length === 4) submit(v);
            }}
            className="sr-only"
          />

          {/* Teclado */}
          <div className="grid grid-cols-3 gap-2">
            {KEYS.flat().map((k, idx) => {
              if (k === '') return <div key={idx} />;
              const isDel = k === '⌫';
              return (
                <button key={idx}
                  onClick={() => isDel ? handleDelete() : handleDigit(k)}
                  className={`h-12 font-bold text-base transition active:scale-95 select-none border ${
                    isDel
                      ? 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200 text-sm'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                  style={{ borderRadius: 6 }}
                >
                  {k}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-7px); }
          40%     { transform: translateX(7px); }
          60%     { transform: translateX(-4px); }
          80%     { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.5s ease; }
      `}</style>
    </div>
  );
}
