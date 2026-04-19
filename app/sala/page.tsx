'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Turno } from '@/lib/queue';

async function tauriInvoke(cmd: string, args?: Record<string, unknown>) {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke(cmd, args);
  } catch { /* noop */ }
}

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
  { label: 'YouTube',      url: 'https://www.youtube.com',    color: '#ff0000' },
  { label: 'Netflix',      url: 'https://www.netflix.com',    color: '#e50914' },
  { label: 'Amazon Prime', url: 'https://www.primevideo.com', color: '#00a8e0' },
];

declare global {
  interface Window {
    electronAPI?: {
      openStreaming:        (url: string) => void;
      closeStreaming:       () => void;
      openStreamingWindow: (url: string) => void;
      closeStreamingWindow:() => void;
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
        gain.gain.linearRampToValueAtTime(0.75, ctx.currentTime + t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.5);
        osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.55);
      });
  } catch { /* noop */ }
}

function buildSpeechText(codigo: string): string {
  // Deletrear CM para evitar que el TTS en español lo lea como "centímetros"
  if (/^CM/i.test(codigo)) {
    const num = codigo.slice(2);
    return `Turno, Ce, Eme, ${num}`;
  }
  return `Turno ${codigo.replace(/([A-Za-z]+)(\d+)/, '$1 $2')}`;
}

function speakTurno(codigo: string, wv: WebviewElement | null) {
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(buildSpeechText(codigo));
    utter.lang = 'es-ES';
    utter.rate = 0.82;
    utter.onstart = () => {
      tauriInvoke('set_streaming_muted', { muted: true });
      try { wv?.setAudioMuted(true);  } catch { /* noop */ }
    };
    utter.onend = () => {
      tauriInvoke('set_streaming_muted', { muted: false });
      try { wv?.setAudioMuted(false); } catch { /* noop */ }
    };
    utter.onerror = () => {
      tauriInvoke('set_streaming_muted', { muted: false });
      try { wv?.setAudioMuted(false); } catch { /* noop */ }
    };
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
  const [isTauri,    setIsTauri]    = useState(false);
  const [isElectron, setIsElectron] = useState(false);
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

  useEffect(() => {
    const _isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    const isElec   = navigator.userAgent.includes('Electron');
    setIsTauri(_isTauri);
    setIsElectron(_isTauri || isElec);
  }, []);

  // Al montar, verificar si ya hay una ventana de streaming abierta
  useEffect(() => {
    if (!isTauri) return;
    tauriInvoke('check_streaming').then(exists => {
      if (exists) setStreamingActive(true);
    });
  }, [isTauri]);

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
    if (isTauri) {
      // Tauri: child webview dentro de la misma ventana (WebView2 nativo = DRM OK)
      tauriInvoke('open_streaming', { url });
      setStreamingActive(true);
    } else if (window.electronAPI) {
      // Electron: ventana externa
      window.electronAPI.openStreamingWindow(url);
      setStreamingActive(true);
    }
  }

  function stopStreaming() {
    if (isTauri) {
      tauriInvoke('close_streaming');
    } else if (window.electronAPI) {
      window.electronAPI.closeStreamingWindow();
    }
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
      <aside className="w-72 h-full flex flex-col shrink-0 border-r border-blue-800 bg-blue-600">

        <div className="px-4 pt-4 pb-3 border-b border-blue-500">
          <Link href="/"
            className="flex items-center gap-1.5 text-blue-200 hover:text-white transition text-xs font-medium w-fit">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              width={12} height={12}><path d="m15 18-6-6 6-6"/></svg>
            Menú
          </Link>
        </div>

        {/* Turno actual */}
        <div className="px-5 pt-5 pb-5 border-b border-blue-500">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-2">
            Atendiendo
          </p>
          <div
            key={animKey}
            className="font-extrabold tracking-tight text-white leading-none"
            style={{
              fontSize: 'clamp(4rem, 7vw, 6rem)',
              animation: animKey > 0 ? 'fadeIn .4s ease-out' : undefined,
            }}
          >
            {current?.codigo ?? '—'}
          </div>
        </div>

        {/* Próximos */}
        <div className="px-5 pt-5 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-4">
            Próximos
          </p>
          <div className="flex flex-col gap-3">
            {nextTres.length === 0 && <span className="text-blue-300 text-sm">—</span>}
            {nextTres.map((t, i) => (
              <span key={t.id}
                className="font-bold tracking-tight leading-none"
                style={{
                  fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
                  color: i === 0 ? '#ffffff' : i === 1 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)',
                }}>
                {t.codigo}
              </span>
            ))}
          </div>
        </div>

        {/* ── Streaming (solo en Tauri/Electron) ── */}
        {isElectron && (
          <div className="px-3 py-3 border-t border-blue-500">
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-2">
              Streaming
            </p>
            {!streamingActive ? (
              <div className="flex flex-col gap-1.5">
                {STREAMING.map(({ label, url, color }) => (
                  <button key={label}
                    onClick={() => startStreaming(url)}
                    className="text-xs font-bold px-2 py-1.5 rounded border transition active:scale-95 text-left"
                    style={{
                      background: `${color}20`,
                      borderColor: `${color}50`,
                      color: color,
                    }}>
                    ▶ {label}
                  </button>
                ))}
              </div>
            ) : (
              <button onClick={stopStreaming}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded border border-red-300 bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 transition active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" width={10} height={10} viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
                Cerrar streaming
              </button>
            )}
          </div>
        )}

        {/* En espera */}
        <div className="px-5 py-4 border-t border-blue-500 bg-blue-700">
          <p className="text-xs text-blue-300 uppercase tracking-widest mb-0.5">En espera</p>
          <p className="text-2xl font-extrabold text-white">{waitingCount}</p>
        </div>
      </aside>

      {/* ── Panel derecho — navegador (solo Electron clásico, no Tauri) ─── */}
      {!isTauri && (
        <div className="flex-1 flex flex-col overflow-hidden">

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
      )}

      {/* ── En Tauri: el área de contenido es manejada por el child webview ── */}
      {isTauri && !streamingActive && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50">
          <p className="text-slate-400 text-sm">Seleccioná un servicio de streaming en el panel izquierdo</p>
          <div className="flex gap-2">
            {STREAMING.map(({ label, url, color }) => (
              <button key={label}
                onClick={() => startStreaming(url)}
                className="px-5 py-2.5 rounded border text-sm font-bold transition active:scale-95 hover:shadow-md"
                style={{ background: `${color}15`, borderColor: `${color}40`, color: color }}>
                ▶ {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
