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
  canGoBack(): boolean;
  canGoForward(): boolean;
  getURL(): string;
  isLoading(): boolean;
  setAudioMuted(muted: boolean): void;
}

interface Config { browser_url: string }
interface Estado {
  current: Turno | null;
  nextTres: Turno[];
  waitingCount: number;
  config: Config;
}

const SHORTCUTS = [
  { label: 'YouTube', url: 'https://www.youtube.com' },
  { label: 'Netflix', url: 'https://www.netflix.com' },
  { label: 'Google',  url: 'https://www.google.com'  },
];

const STREAMING = [
  { label: 'YouTube',      url: 'https://www.youtube.com',        color: '#ff0000' },
  { label: 'Netflix',      url: 'https://www.netflix.com',        color: '#e50914' },
  { label: 'Amazon Prime', url: 'https://www.primevideo.com',     color: '#00a8e0' },
];

declare global {
  interface Window {
    electronAPI?: {
      openStreaming:  (url: string) => void;
      closeStreaming: () => void;
    };
  }
}

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

function speakTurno(codigo: string, wv: WebviewElement | null) {
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(`Turno ${codigo.replace(/(\D+)(\d+)/, '$1 $2')}`);
    utter.lang = 'es-ES';
    utter.rate = 0.82;

    // Silenciar webview mientras habla
    utter.onstart = () => { try { wv?.setAudioMuted(true);  } catch { /* noop */ } };
    utter.onend   = () => { try { wv?.setAudioMuted(false); } catch { /* noop */ } };
    utter.onerror = () => { try { wv?.setAudioMuted(false); } catch { /* noop */ } };

    setTimeout(() => window.speechSynthesis.speak(utter), 900);
  } catch { /* noop */ }
}

export default function Sala() {
  const [estado, setEstado]   = useState<Estado>({
    current: null, nextTres: [], waitingCount: 0, config: { browser_url: '' },
  });
  const [animKey, setAnimKey] = useState(0);
  const [urlBar, setUrlBar]   = useState('https://www.youtube.com');
  const [frameUrl, setFrameUrl] = useState('https://www.youtube.com');
  const [loading, setLoading] = useState(false);
  const [canBack, setCanBack] = useState(false);
  const [canFwd,  setCanFwd]  = useState(false);
  const [isElectron, setIsElectron]       = useState(false);
  const [streamingActive, setStreamingActive] = useState(false);

  const prevCodeRef = useRef<string | null>(null);
  const webviewRef  = useRef<WebviewElement | null>(null);

  async function fetchEstado() {
    try {
      const data = await fetch('/api/estado').then(r => r.json());
      const nuevo = data.current?.codigo ?? null;
      if (nuevo && nuevo !== prevCodeRef.current) {
        playChime();
        speakTurno(nuevo, webviewRef.current);
        setAnimKey(k => k + 1);
        prevCodeRef.current = nuevo;
      }
      setEstado(data);
    } catch { /* retry */ }
  }

  useEffect(() => { setIsElectron(navigator.userAgent.includes('Electron')); }, []);

  useEffect(() => {
    fetchEstado();
    const iv = setInterval(fetchEstado, 3000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const url = estado.config?.browser_url;
    if (url) { setUrlBar(url); setFrameUrl(url); }
  }, [estado.config?.browser_url]);

  useEffect(() => {
    if (!isElectron) return;
    const wv = webviewRef.current;
    if (!wv) return;
    const onStart: EventListener = () => setLoading(true);
    const onStop:  EventListener = () => {
      setLoading(false);
      setCanBack(wv.canGoBack()); setCanFwd(wv.canGoForward()); setUrlBar(wv.getURL());
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
      } catch { /* noop */ }
    };
  }, [isElectron]);

  function startStreaming(url: string) {
    window.electronAPI?.openStreaming(url);
    setStreamingActive(true);
  }

  function stopStreaming() {
    window.electronAPI?.closeStreaming();
    setStreamingActive(false);
  }

  function navigate(raw: string) {
    let url = raw.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url))
      url = url.includes('.') ? `https://${url}` : `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    setUrlBar(url); setFrameUrl(url);
    if (isElectron && webviewRef.current) webviewRef.current.loadURL(url);
  }

  const { current, nextTres, waitingCount } = estado;

  return (
    <div className="h-screen flex overflow-hidden select-none bg-white">

      {/* ── Sidebar turnos ─────────────────────────────────────────────────── */}
      <aside className="w-56 h-full flex flex-col shrink-0 border-r border-slate-200 bg-white">

        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
          <Link href="/"
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition text-xs font-medium w-fit">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              width={12} height={12}><path d="m15 18-6-6 6-6"/></svg>
            Menú
          </Link>
        </div>

        {/* Turno actual */}
        <div className="px-5 pt-5 pb-5 border-b border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-600 mb-2">
            Atendiendo
          </p>
          <div
            key={animKey}
            className="font-extrabold tracking-tight text-slate-800 leading-none"
            style={{
              fontSize: 'clamp(2.8rem, 6vw, 4rem)',
              animation: animKey > 0 ? 'fadeIn .4s ease-out' : undefined,
            }}
          >
            {current?.codigo ?? '—'}
          </div>
        </div>

        {/* Próximos */}
        <div className="px-5 pt-5 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-600 mb-4">
            Próximos
          </p>
          <div className="flex flex-col gap-3">
            {nextTres.length === 0 && <span className="text-slate-300 text-sm">—</span>}
            {nextTres.map((t, i) => (
              <span key={t.id}
                className="font-bold tracking-tight leading-none"
                style={{
                  fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
                  color: i === 0 ? '#1e293b' : i === 1 ? '#64748b' : '#94a3b8',
                }}>
                {t.codigo}
              </span>
            ))}
          </div>
        </div>

        {/* En espera */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-0.5">En espera</p>
          <p className="text-2xl font-extrabold text-slate-800">{waitingCount}</p>
        </div>
      </aside>

      {/* ── Panel derecho — navegador ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Barra de Streaming (solo Electron) ── */}
        {isElectron && (
          <div className="flex items-center gap-2 px-3 py-2 shrink-0 bg-slate-50 border-b border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Streaming</span>
            <div className="flex items-center gap-1.5 flex-1">
              {STREAMING.map(({ label, url, color }) => (
                <button key={label} onClick={() => startStreaming(url)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold transition active:scale-95 hover:shadow-sm"
                  style={{
                    background: streamingActive ? '#f1f5f9' : `${color}15`,
                    borderColor: `${color}40`,
                    color: streamingActive ? '#94a3b8' : color,
                  }}>
                  {label}
                </button>
              ))}
            </div>
            {streamingActive && (
              <button onClick={stopStreaming}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-red-200 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition active:scale-95 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width={11} height={11} viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
                Cerrar
              </button>
            )}
          </div>
        )}

        {/* Barra de navegación */}
        <div className="flex items-center gap-2 px-3 py-2 shrink-0 bg-white border-b border-slate-200">

          <button onClick={() => isElectron && webviewRef.current?.goBack()} disabled={!canBack}
            className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-25 transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={15} height={15}><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button onClick={() => isElectron && webviewRef.current?.goForward()} disabled={!canFwd}
            className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-25 transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={15} height={15}><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button onClick={() => isElectron ? webviewRef.current?.reload() : navigate(urlBar)}
            className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            {loading
              ? <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width={14} height={14}><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
            }
          </button>

          {/* URL bar */}
          <div className="flex-1 flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 h-8 focus-within:border-sky-400 focus-within:bg-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={13} height={13} className="shrink-0">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <input
              className="flex-1 bg-transparent text-slate-700 text-xs outline-none placeholder-slate-400 min-w-0"
              value={urlBar}
              onChange={e => setUrlBar(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && navigate(urlBar)}
              onFocus={e => e.target.select()}
              placeholder="Escribe una URL o búsqueda..."
            />
          </div>

          {/* Shortcuts */}
          {SHORTCUTS.map(({ label, url }) => (
            <button key={label} onClick={() => navigate(url)}
              className="px-3 h-8 rounded border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition shrink-0 bg-white">
              {label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 relative overflow-hidden bg-white">
          {isElectron ? (
            React.createElement('webview', {
              ref: webviewRef,
              src: frameUrl,
              allowpopups: 'true',
              style: { width: '100%', height: '100%', display: 'flex' },
            })
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 bg-slate-50">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-50 border border-red-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-slate-700 font-semibold text-sm mb-1">Navegador no disponible</p>
                <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                  Abrí la sala desde la aplicación de escritorio para usar el navegador embebido.
                </p>
              </div>
              <div className="flex gap-2 mt-1">
                {SHORTCUTS.map(({ label, url }) => (
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 rounded border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition bg-white">
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
