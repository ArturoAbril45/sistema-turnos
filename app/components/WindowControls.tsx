'use client';

import { useEffect, useState, useRef } from 'react';

export default function WindowControls() {
  const [isTauri, setIsTauri] = useState(false);
  const winRef = useRef<any>(null);

  useEffect(() => {
    const is = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    setIsTauri(is);
    if (is) {
      // Pre-cargar la API para que startDragging() sea inmediato en mousedown
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        winRef.current = getCurrentWindow();
      });
    }
  }, []);

  function startDrag(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    // Llamar sin await — solo necesitamos ENVIAR el mensaje IPC, no esperar respuesta
    winRef.current?.startDragging();
  }

  async function minimize() {
    try { await winRef.current?.minimize(); } catch { /* noop */ }
  }

  async function closeApp() {
    try { await winRef.current?.close(); } catch { /* noop */ }
  }

  if (!isTauri) return null;

  return (
    <>
      {/* Franja draggable — tope del sidebar */}
      <div
        onMouseDown={startDrag}
        className="fixed top-0 left-0 right-0 h-8 z-99999 cursor-move select-none"
      />

      {/* Botones minimize / cerrar — encima de la franja */}
      <div className="fixed top-0 right-0 z-100000 flex items-center">
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={minimize}
          className="w-11 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
          title="Minimizar"
        >
          <svg width="11" height="2" viewBox="0 0 11 2" fill="currentColor">
            <rect width="11" height="2" rx="1"/>
          </svg>
        </button>

        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={closeApp}
          className="w-11 h-8 flex items-center justify-center text-slate-500 hover:bg-red-500 hover:text-white transition"
          title="Cerrar"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M1 1l9 9M10 1l-9 9"/>
          </svg>
        </button>
      </div>
    </>
  );
}
