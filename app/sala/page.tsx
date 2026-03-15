'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Turno } from '@/lib/queue';


interface WebviewElement extends HTMLElement {
  src: string;
  loadURL(url: string): void;
  goBack(): void;
  goForward(): void;
  reload(): void;
  stop(): void;
  canGoBack(): boolean;
  canGoForward(): boolean;
  getURL(): string;
  getTitle(): string;
  isLoading(): boolean;
}

interface Config { browser_url: string }
interface Estado {
  current: Turno | null;
  nextTres: Turno[];
  waitingCount: number;
  config: Config;
}

/* ── Chime + TTS ─────────────────────────────────────────────────────────── */
function playChime() {
  try {
    const ctx = new AudioContext();
    [{ freq: 523.25, t: 0 }, { freq: 659.25, t: 0.2 }, { freq: 783.99, t: 0.4 }, { freq: 1046.5, t: 0.65 }]
      .forEach(({ freq, t }) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + t);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4);
        osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.45);
      });
  } catch { /* noop */ }
}
function speakTurno(codigo: string) {
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(`Turno ${codigo.replace(/(\D+)(\d+)/, '$1 $2')}`);
    utter.lang = 'es-ES'; utter.rate = 0.82;
    setTimeout(() => window.speechSynthesis.speak(utter), 900);
  } catch { /* noop */ }
}

/* ── Shortcuts rápidos ────────────────────────────────────────────────────── */
const SHORTCUTS = [
  { label: 'YouTube', url: 'https://www.youtube.com', color: '#ff0000' },
  { label: 'Netflix', url: 'https://www.netflix.com', color: '#e50914' },
  { label: 'Google',  url: 'https://www.google.com',  color: '#4285f4' },
];

/* ── Componente principal ─────────────────────────────────────────────────── */
export default function Sala() {
  const [estado, setEstado] = useState<Estado>({
    current: null, nextTres: [], waitingCount: 0,
    config: { browser_url: '' },
  });
  const [animKey, setAnimKey]     = useState(0);
  const [urlBar, setUrlBar]       = useState('https://www.youtube.com');
  const [frameUrl, setFrameUrl]   = useState('https://www.youtube.com');
  const [loading, setLoading]     = useState(false);
  const [canBack, setCanBack]     = useState(false);
  const [canFwd, setCanFwd]       = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  const prevCodeRef  = useRef<string | null>(null);
  const webviewRef   = useRef<WebviewElement | null>(null);

  /* Polling turnos */
  async function fetchEstado() {
    try {
      const data = await fetch('/api/estado').then(r => r.json());
      const nuevo = data.current?.codigo ?? null;
      if (nuevo && nuevo !== prevCodeRef.current) {
        playChime(); speakTurno(nuevo);
        setAnimKey(k => k + 1);
        prevCodeRef.current = nuevo;
      }
      setEstado(data);
    } catch { /* retry */ }
  }

  useEffect(() => {
    setIsElectron(navigator.userAgent.includes('Electron'));
  }, []);

  useEffect(() => {
    fetchEstado();
    const iv = setInterval(fetchEstado, 3000);
    return () => clearInterval(iv);
  }, []);

  /* Inicializar URL bar con config del mostrador */
  useEffect(() => {
    const url = estado.config?.browser_url;
    if (url) { setUrlBar(url); setFrameUrl(url); }
  }, [estado.config?.browser_url]);

  /* Conectar eventos del webview */
  useEffect(() => {
    if (!isElectron) return;
    const wv = webviewRef.current;
    if (!wv) return;

    const onStart: EventListener = () => setLoading(true);
    const onStop: EventListener  = () => {
      setLoading(false);
      setCanBack(wv.canGoBack());
      setCanFwd(wv.canGoForward());
      setUrlBar(wv.getURL());
    };
    const onNav: EventListener = (e: Event) => {
      const url = (e as Event & { url?: string }).url;
      if (url) setUrlBar(url);
    };

    wv.addEventListener('did-start-loading',    onStart);
    wv.addEventListener('did-stop-loading',     onStop);
    wv.addEventListener('did-navigate',         onNav);
    wv.addEventListener('did-navigate-in-page', onNav);

    return () => {
      try {
        wv.removeEventListener('did-start-loading',    onStart);
        wv.removeEventListener('did-stop-loading',     onStop);
        wv.removeEventListener('did-navigate',         onNav);
        wv.removeEventListener('did-navigate-in-page', onNav);
      } catch { /* webview ya desmontado */ }
    };
  }, [isElectron]);

  function navigate(raw: string) {
    let url = raw.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      url = url.includes('.') ? `https://${url}` : `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }
    setUrlBar(url);
    setFrameUrl(url);
    if (isElectron && webviewRef.current) {
      webviewRef.current.loadURL(url);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') navigate(urlBar);
  }

  return (
    <div className="h-screen flex overflow-hidden select-none">

      {/* ── Panel izquierdo — turnos ─────────────────────────────────────── */}
      <aside
        className="w-52 lg:w-60 h-full flex flex-col shrink-0 z-10"
        style={{ background: 'linear-gradient(180deg, #0c2461 0%, #1a3a8a 60%, #0369a1 100%)' }}
      >
        {/* Botón volver al menú */}
        <div className="px-4 pt-4 pb-2">
          <Link href="/"
            className="flex items-center gap-1.5 text-white/35 hover:text-white/70 transition text-[10px] font-semibold w-fit">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              width={11} height={11}>
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Menú
          </Link>
        </div>

        <div className="px-5 pt-3 pb-5 border-b border-white/10">
          <p className="text-sky-300 text-[10px] font-semibold uppercase tracking-widest mb-2 leading-tight">
            Atendiendo turno
          </p>
          <div
            key={animKey}
            className="text-white font-extrabold tracking-tighter leading-none"
            style={{
              fontSize: 'clamp(3rem, 7vw, 4.5rem)',
              animation: animKey > 0 ? 'fadeIn .4s ease-out' : undefined,
            }}
          >
            {estado.current?.codigo ?? '—'}
          </div>
        </div>

        <div className="px-5 pt-5 flex-1">
          <p className="text-sky-300 text-[10px] font-semibold uppercase tracking-widest mb-4">
            Próximos turnos
          </p>
          <div className="flex flex-col gap-3">
            {estado.nextTres.length === 0 && <span className="text-white/25 text-sm">—</span>}
            {estado.nextTres.map((t, i) => (
              <span key={t.id} className="font-bold tracking-tight leading-none"
                style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.1rem)', color: i === 0 ? 'rgba(255,255,255,.90)' : 'rgba(255,255,255,.50)' }}>
                {t.codigo}
              </span>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-white/35 text-[10px] uppercase tracking-widest">En espera</p>
          <p className="text-white text-2xl font-extrabold">{estado.waitingCount}</p>
        </div>
      </aside>

      {/* ── Panel derecho — navegador ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#1a1a2e' }}>

        {/* Barra de navegación */}
        <div
          className="flex items-center gap-2 px-3 py-2 shrink-0"
          style={{ background: '#12122a', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Atrás / Adelante / Recargar */}
          <button
            onClick={() => isElectron && webviewRef.current?.goBack()}
            disabled={!canBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 disabled:opacity-20 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={15} height={15}>
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <button
            onClick={() => isElectron && webviewRef.current?.goForward()}
            disabled={!canFwd}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 disabled:opacity-20 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={15} height={15}>
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
          <button
            onClick={() => isElectron ? webviewRef.current?.reload() : navigate(urlBar)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition"
          >
            {loading
              ? <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width={14} height={14}>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="3"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}>
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M8 16H3v5"/>
                </svg>
            }
          </button>

          {/* Barra de URL */}
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 h-8"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)"
              strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={13} height={13} className="shrink-0">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <input
              className="flex-1 bg-transparent text-white/80 text-xs outline-none placeholder-white/25 min-w-0"
              value={urlBar}
              onChange={e => setUrlBar(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={e => e.target.select()}
              placeholder="Escribe una URL o búsqueda..."
            />
          </div>

          {/* Shortcuts */}
          {SHORTCUTS.map(({ label, url, color }) => (
            <button key={label}
              onClick={() => navigate(url)}
              className="px-2.5 h-8 rounded-lg text-xs font-bold text-white/70 hover:text-white transition shrink-0"
              style={{ background: `${color}22`, border: `1px solid ${color}44` }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Webview (Electron) o iframe (navegador web) — siempre carga aquí */}
        <div className="flex-1 relative overflow-hidden">
          {isElectron ? (
            React.createElement('webview', {
              ref: webviewRef,
              src: frameUrl,
              allowpopups: 'true',
              style: { width: '100%', height: '100%', display: 'flex' },
            })
          ) : (
            /* En navegador normal YouTube/Netflix bloquean iframes.
               Usar "npm run electron" para el navegador embebido real. */
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8"
              style={{ background: 'linear-gradient(160deg,#0a0a18 0%,#0f172a 100%)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="#f87171" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
                  width={28} height={28}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-white/80 font-bold text-sm mb-1">
                  YouTube y Netflix bloquean la conexión en el navegador
                </p>
                <p className="text-white/35 text-xs max-w-xs leading-relaxed">
                  Para usar el navegador embebido completo, abrí la sala con:
                </p>
                <code className="mt-3 block bg-white/10 text-green-400 text-xs font-mono px-4 py-2 rounded-lg">
                  npm run electron
                </code>
              </div>
              <div className="flex gap-3 mt-2">
                {SHORTCUTS.map(({ label, url, color }) => (
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl text-white text-xs font-bold transition hover:scale-105"
                    style={{ background: color }}>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
