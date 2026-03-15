'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { Turno } from '@/lib/queue';
import {
  StethoscopeIcon, SyringeIcon, FileCheckIcon,
  ScissorsIcon, WindIcon, DropletIcon,
  PencilIcon, XMarkIcon, CheckIcon, TrashIcon,
  ChevronUpIcon, ChevronDownIcon, Cog6ToothIcon,
  UsersIcon, PlayIcon, ArrowLeftIcon, QueueListIcon,
} from '@/components/icons';

// ─── Tipos de atención ────────────────────────────────────────────────────────

const TIPOS = [
  { tipo: 'CO', label: 'Consulta',               short: 'Consulta',      Icon: StethoscopeIcon, hex: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  { tipo: 'AP', label: 'Aplicación / T. Presión', short: 'Aplicación',   Icon: SyringeIcon,     hex: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  { tipo: 'CM', label: 'Certificado Médico',      short: 'Certificado',  Icon: FileCheckIcon,   hex: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' },
  { tipo: 'PR', label: 'Procedimiento',           short: 'Procedimiento',Icon: ScissorsIcon,    hex: '#d97706', bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
  { tipo: 'NE', label: 'Nebulización',            short: 'Nebulización', Icon: WindIcon,        hex: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', text: '#0e7490' },
  { tipo: 'GL', label: 'Glucosa',                 short: 'Glucosa',      Icon: DropletIcon,     hex: '#e11d48', bg: '#fff1f2', border: '#fecdd3', text: '#be123c' },
] as const;

// ─── Tipos TS ─────────────────────────────────────────────────────────────────

interface Estado  { current: Turno | null; waiting: Turno[]; waitingCount: number }
interface EditMod { id: number; codigo: string }

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Mostrador() {
  const [estado, setEstado]                 = useState<Estado>({ current: null, waiting: [], waitingCount: 0 });
  const [tab, setTab]                       = useState<'cola' | 'nuevo'>('nuevo');
  const [reordenando, setReordenando]       = useState(false);
  const [ordenTemp, setOrdenTemp]           = useState<Turno[]>([]);
  const [editModal, setEditModal]           = useState<EditMod | null>(null);
  const [showConfig, setShowConfig]         = useState(false);
  const [browserUrl, setBrowserUrl]         = useState('');
  const [confirmLimpiar, setConfirmLimpiar] = useState(false);
  const [busy, setBusy]                     = useState<string | null>(null);
  const [nombre, setNombre]                 = useState('');
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchEstado = useCallback(async () => {
    const r = await fetch('/api/estado');
    setEstado(await r.json());
  }, []);

  useEffect(() => {
    fetchEstado();
    fetch('/api/config').then(r => r.json()).then(d => {
      setBrowserUrl(d.browser_url ?? '');
    });
    const iv = setInterval(fetchEstado, 3000);
    return () => clearInterval(iv);
  }, [fetchEstado]);

  // ── Acciones ─────────────────────────────────────────────────────────────
  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    await fn();
    await fetchEstado();
    setBusy(null);
  }

  const generarTurno  = (tipo: string) => run(tipo, async () => {
    await fetch('/api/turnos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo, nombre: nombre.trim() || undefined }) });
    setNombre('');
  });
  const siguiente     = ()             => run('sig', () => fetch('/api/siguiente', { method: 'POST' }).then(() => {}));
  const cancelar      = (id: number)   => run(`del-${id}`, () => fetch(`/api/turnos/${id}`, { method: 'DELETE' }).then(() => {}));
  const guardarEdicion= ()             => run('edit', async () => {
    if (!editModal) return;
    await fetch(`/api/turnos/${editModal.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: editModal.codigo }) });
    setEditModal(null);
  });

  // ── Reordenar ─────────────────────────────────────────────────────────────
  const iniciarReorden  = () => { setOrdenTemp([...estado.waiting]); setReordenando(true); };
  const cancelarReorden = () => { setReordenando(false); setOrdenTemp([]); };
  const guardarReorden  = () => run('reord', async () => {
    await fetch('/api/reordenar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: ordenTemp.map(t => t.id) }) });
    setReordenando(false);
  });

  const mover = (idx: number, dir: -1 | 1) => {
    const a = [...ordenTemp];
    [a[idx], a[idx + dir]] = [a[idx + dir], a[idx]];
    setOrdenTemp(a);
  };
  const onDragStart = (i: number) => { dragItem.current = i; };
  const onDragEnter = (i: number) => { dragOver.current = i; };
  const onDragEnd   = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const a = [...ordenTemp];
    a.splice(dragOver.current, 0, a.splice(dragItem.current, 1)[0]);
    setOrdenTemp(a);
    dragItem.current = dragOver.current = null;
  };

  // ── Config ────────────────────────────────────────────────────────────────
  const limpiar = () => run('limpiar', async () => {
    await fetch('/api/limpiar', { method: 'POST' });
    setConfirmLimpiar(false);
  });
  const guardarConfig = async () => {
    await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: 'browser_url', valor: browserUrl }) });
    setShowConfig(false);
  };

  const lista       = reordenando ? ordenTemp : estado.waiting;
  const tipoCounts  = Object.fromEntries(TIPOS.map(({ tipo }) => [tipo, estado.waiting.filter(t => t.tipo === tipo).length]));

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-slate-50">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <header className="shrink-0 bg-white border-b border-slate-200 z-20">

        {/* Fila principal */}
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <ArrowLeftIcon size={18} />
          </Link>
          <div className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-700 flex items-center justify-center shrink-0">
              <QueueListIcon size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm leading-tight">Mostrador</p>
              <p className="text-slate-400 text-[10px] leading-tight hidden sm:block">Control de atención</p>
            </div>
          </div>

          {/* Turno activo */}
          {estado.current && (
            <div className="flex items-center gap-1.5 border border-green-200 bg-green-50 rounded-lg px-2.5 py-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-700 font-extrabold text-sm tracking-wide">{estado.current.codigo}</span>
            </div>
          )}

          {/* En espera */}
          <div className="flex items-center gap-1.5 border border-blue-200 bg-blue-50 rounded-lg px-2.5 py-1.5 shrink-0">
            <UsersIcon size={13} className="text-blue-500" />
            <span className="text-blue-700 font-bold text-sm tabular-nums">{estado.waitingCount}</span>
          </div>

          {/* Siguiente — visible en desktop */}
          <button onClick={siguiente} disabled={!!busy || estado.waitingCount === 0}
            className="hidden sm:flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white font-bold text-sm px-4 py-2 rounded-lg transition active:scale-95 shrink-0">
            {busy === 'sig' ? <Spinner /> : <PlayIcon size={14} />}
            Siguiente
          </button>

          <button onClick={() => setShowConfig(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0">
            <Cog6ToothIcon size={18} />
          </button>
        </div>

        {/* Tabs — solo mobile */}
        <div className="flex sm:hidden border-t border-slate-100">
          {[
            { key: 'nuevo', label: 'Nuevo turno' },
            { key: 'cola',  label: `Cola (${estado.waitingCount})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key as 'cola' | 'nuevo')}
              className={`flex-1 py-2.5 text-sm font-bold transition border-b-2 ${
                tab === key
                  ? 'text-blue-700 border-blue-700 bg-blue-50/50'
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ══ CUERPO ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-hidden flex min-h-0">

        {/* ── Panel Cola ─────────────────────────────────────────────────── */}
        <section className={`flex-1 flex flex-col overflow-hidden ${tab === 'cola' || true ? '' : 'hidden'} ${tab !== 'cola' ? 'hidden sm:flex' : 'flex'}`}>

          {/* Subheader cola */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-blue-600 inline-block" />
              <span className="font-bold text-slate-700 text-sm">Cola de espera</span>
              {lista.length > 0 && (
                <span className="text-xs font-bold text-blue-700 bg-blue-100 rounded-full px-2 py-0.5 tabular-nums">{lista.length}</span>
              )}
            </div>
            {!reordenando
              ? <div className="flex items-center gap-1">
                  <a href="/api/exportar" download
                    className="text-xs font-semibold text-slate-400 hover:text-green-700 px-2.5 py-1.5 rounded-lg hover:bg-green-50 transition flex items-center gap-1"
                    title="Exportar bitácora CSV">
                    <svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    CSV
                  </a>
                  <button onClick={iniciarReorden} className="text-xs font-semibold text-slate-500 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">
                    Reordenar
                  </button>
                </div>
              : <div className="flex gap-2">
                  <button onClick={guardarReorden} className="flex items-center gap-1 text-xs font-bold bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800 transition">
                    <CheckIcon size={12} /> Guardar
                  </button>
                  <button onClick={cancelarReorden} className="flex items-center gap-1 text-xs font-semibold text-slate-500 border border-slate-200 bg-white px-3 py-1.5 rounded-lg hover:bg-slate-50 transition">
                    <XMarkIcon size={12} /> Cancelar
                  </button>
                </div>
            }
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-2">
            {lista.length === 0 && <EmptyQueue />}

            {lista.map((t, i) => {
              const ti = TIPOS.find(tp => tp.tipo === t.tipo)!;
              return (
                <div key={t.id}
                  draggable={reordenando}
                  onDragStart={() => onDragStart(i)} onDragEnter={() => onDragEnter(i)}
                  onDragEnd={onDragEnd} onDragOver={e => e.preventDefault()}
                  className={`bg-white border border-slate-200 rounded-xl flex items-center overflow-hidden transition ${
                    reordenando ? 'cursor-grab hover:border-blue-300 hover:shadow-sm' : 'hover:border-slate-300'
                  }`}
                  style={{ borderLeftWidth: 4, borderLeftColor: ti.hex }}
                >
                  {/* Número */}
                  <span className="text-slate-300 text-xs font-bold w-8 text-center shrink-0">{i + 1}</span>

                  {/* Código + nombre */}
                  <div className="flex-1 flex items-center gap-3 py-3.5 min-w-0">
                    <span className="font-extrabold text-xl sm:text-2xl tracking-tight leading-none shrink-0" style={{ color: ti.hex }}>
                      {t.codigo}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="hidden xs:inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border w-fit"
                        style={{ background: ti.bg, color: ti.text, borderColor: ti.border }}>
                        <ti.Icon size={10} />
                        {ti.short}
                      </span>
                      {t.nombre && (
                        <span className="text-xs text-slate-500 font-medium truncate mt-0.5 max-w-[120px]" title={t.nombre}>
                          {t.nombre}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 pr-2 shrink-0">
                    {reordenando && (
                      <div className="flex flex-col gap-0.5 mr-1">
                        <button onClick={() => mover(i, -1)} disabled={i === 0}
                          className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-25 transition">
                          <ChevronUpIcon size={12} />
                        </button>
                        <button onClick={() => mover(i, 1)} disabled={i === lista.length - 1}
                          className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-25 transition">
                          <ChevronDownIcon size={12} />
                        </button>
                      </div>
                    )}
                    <button onClick={() => setEditModal({ id: t.id, codigo: t.codigo })}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition active:scale-95">
                      <PencilIcon size={15} />
                    </button>
                    <button onClick={() => cancelar(t.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition active:scale-95">
                      <XMarkIcon size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Panel Nuevo Turno ────────────────────────────────────────── */}
        <section className={`lg:w-72 xl:w-80 shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden ${
          tab !== 'nuevo' ? 'hidden sm:flex' : 'flex w-full'
        }`}>

          {/* Subheader */}
          <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <span className="w-1 h-4 rounded-full bg-green-500 inline-block" />
            <span className="font-bold text-slate-700 text-sm">Generar turno</span>
          </div>

          {/* Botones */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">

            {/* Campo nombre — bitácora interna */}
            <div className="mb-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Nombre del paciente <span className="font-normal normal-case text-slate-300">(opcional · solo interno)</span>
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition placeholder:text-slate-300"
                placeholder="Ej. Carolina Hernández"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setNombre('')}
                maxLength={60}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {TIPOS.map(({ tipo, label, Icon: TipoIcon, hex, bg, border, text }) => {
                const count   = tipoCounts[tipo] ?? 0;
                const loading = busy === tipo;
                return (
                  <button key={tipo} onClick={() => generarTurno(tipo)} disabled={loading}
                    className="relative flex flex-col items-center justify-center gap-2.5 py-5 px-2 rounded-2xl border transition active:scale-95 disabled:opacity-60 group hover:shadow-sm"
                    style={{ background: bg, borderColor: border }}
                  >
                    {/* Ícono */}
                    <div className="w-12 h-12 rounded-xl border flex items-center justify-center transition"
                      style={{ background: '#fff', borderColor: border }}>
                      {loading
                        ? <Spinner color={hex} />
                        : <TipoIcon size={22} style={{ color: hex }} />
                      }
                    </div>

                    {/* Label */}
                    <span className="text-xs font-bold text-center leading-tight" style={{ color: text }}>
                      {label}
                    </span>

                    {/* Contador en cola */}
                    {count > 0 && (
                      <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center text-white"
                        style={{ background: hex }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Leyenda */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">En cola por tipo</p>
              <div className="flex flex-col gap-2">
                {TIPOS.map(({ tipo, short, hex, bg, border, text }) => (
                  <div key={tipo} className="flex items-center gap-2 py-1.5 px-3 rounded-lg border"
                    style={{ background: bg, borderColor: border }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: hex }} />
                    <span className="text-xs font-bold" style={{ color: hex }}>{tipo}</span>
                    <span className="text-xs text-slate-500 flex-1 truncate">— {short}</span>
                    <span className="text-xs font-extrabold tabular-nums" style={{ color: tipoCounts[tipo] ? text : '#cbd5e1' }}>
                      {tipoCounts[tipo] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ══ FAB SIGUIENTE — solo mobile ══════════════════════════════════════ */}
      <div className="sm:hidden fixed bottom-5 right-4 z-30">
        <button onClick={siguiente} disabled={!!busy || estado.waitingCount === 0}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white font-bold text-sm px-5 py-3.5 rounded-2xl shadow-lg transition active:scale-95"
          style={{ boxShadow: '0 4px 16px rgba(29,78,216,.35)' }}>
          {busy === 'sig' ? <Spinner white /> : <PlayIcon size={16} />}
          Siguiente
        </button>
      </div>

      {/* ══ MODAL CONFIG ════════════════════════════════════════════════════ */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 anim-slide-up">
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-extrabold text-slate-900 text-base">Configuración</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Sala de espera y sistema</p>
                </div>
                <button onClick={() => setShowConfig(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition">
                  <XMarkIcon size={17} />
                </button>
              </div>

              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">URL del Navegador — Sala de Espera</p>
              <input
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition mb-1"
                value={browserUrl} onChange={e => setBrowserUrl(e.target.value)}
                placeholder="https://www.netflix.com  |  https://www.youtube.com  |  ..."
              />
              <p className="text-[11px] text-slate-400 mb-5">
                Ingrese cualquier URL. Si el sitio bloquea el iframe, use el botón &ldquo;Abrir en pantalla completa&rdquo; en la sala.
              </p>

              <div className="flex flex-col gap-2">
                <button onClick={guardarConfig} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-blue-700 hover:bg-blue-800 transition active:scale-95">
                  <CheckIcon size={15} /> Guardar configuración
                </button>
                <button onClick={() => { setShowConfig(false); setConfirmLimpiar(true); }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition active:scale-95">
                  <TrashIcon size={14} /> Limpiar toda la cola
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL EDITAR ════════════════════════════════════════════════════ */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl border border-slate-200 anim-fade-in">
            <h2 className="font-extrabold text-slate-900 mb-1">Editar código</h2>
            <p className="text-slate-400 text-xs mb-4">Modifique el código del turno seleccionado</p>
            <input autoFocus maxLength={8}
              className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-3xl font-extrabold text-center tracking-widest bg-slate-50 focus:bg-white focus:outline-none transition mb-5"
              value={editModal.codigo}
              onChange={e => setEditModal({ ...editModal, codigo: e.target.value.toUpperCase() })}
            />
            <div className="flex gap-2">
              <button onClick={guardarEdicion} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-sm text-white bg-blue-700 hover:bg-blue-800 transition active:scale-95">
                <CheckIcon size={14} /> Guardar
              </button>
              <button onClick={() => setEditModal(null)} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95">
                <XMarkIcon size={14} /> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL LIMPIAR ═══════════════════════════════════════════════════ */}
      {confirmLimpiar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl border border-slate-200 anim-fade-in text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
              <TrashIcon size={24} className="text-red-500" />
            </div>
            <h2 className="font-extrabold text-slate-900 text-lg mb-1">¿Limpiar cola?</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">Se eliminarán todos los turnos. Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={limpiar} className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 transition active:scale-95">
                Confirmar
              </button>
              <button onClick={() => setConfirmLimpiar(false)} className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function EmptyQueue() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1"
          strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={26} height={26}>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <path d="M9 12h6M9 16h4"/>
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-400">Cola vacía</p>
        <p className="text-xs text-slate-300 mt-0.5">Genere turnos desde la pestaña "Nuevo turno"</p>
      </div>
    </div>
  );
}

function Spinner({ color, white }: { color?: string; white?: boolean }) {
  const c = white ? 'white' : color ?? 'currentColor';
  return (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width={20} height={20}>
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke={c} strokeWidth="3" />
      <path className="opacity-80" fill={c} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
