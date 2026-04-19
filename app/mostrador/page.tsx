'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import PinModal from '@/components/PinModal';
import type { Turno } from '@/lib/queue';
import {
  StethoscopeIcon, SyringeIcon, FileCheckIcon,
  ScissorsIcon, WindIcon, DropletIcon,
  PencilIcon, XMarkIcon, CheckIcon, TrashIcon,
  ChevronUpIcon, ChevronDownIcon, Cog6ToothIcon,
  PlayIcon, ArrowLeftIcon,
} from '@/components/icons';

const TIPOS = [
  { tipo: 'CO', label: 'Consulta Médica',       short: 'Consulta',       Icon: StethoscopeIcon, hex: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  { tipo: 'AP', label: 'Aplicación / T. Presión',short: 'Aplicación',    Icon: SyringeIcon,     hex: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  { tipo: 'CM', label: 'Certificado Médico',     short: 'Certificado',   Icon: FileCheckIcon,   hex: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' },
  { tipo: 'PR', label: 'Procedimiento',          short: 'Procedimiento', Icon: ScissorsIcon,    hex: '#d97706', bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
  { tipo: 'NE', label: 'Nebulización',           short: 'Nebulización',  Icon: WindIcon,        hex: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', text: '#0e7490' },
  { tipo: 'GL', label: 'Glucosa',                short: 'Glucosa',       Icon: DropletIcon,     hex: '#e11d48', bg: '#fff1f2', border: '#fecdd3', text: '#be123c' },
] as const;

interface Estado  { current: Turno | null; waiting: Turno[]; waitingCount: number }
interface EditMod { id: number; codigo: string }

function getFichasDisponibles(tipo: string) {
  if (['AP', 'GL', 'NE'].includes(tipo)) {
    return TIPOS.filter(t => ['AP', 'GL', 'NE'].includes(t.tipo));
  }
  return [...TIPOS];
}

function getLetraFicha(tipo: string): string {
  const prefixes: Record<string, string> = {
    CO: 'C', AP: 'A', CM: 'CM', PR: 'P', NE: 'N', GL: 'G',
  };
  return prefixes[tipo] ?? tipo;
}

const TIPO_LABEL: Record<string, string> = {
  CO: 'Consulta', AP: 'Aplicación', CM: 'Certificado',
  PR: 'Procedimiento', NE: 'Nebulización', GL: 'Glucosa',
};
const TIPO_COLOR: Record<string, string> = {
  CO: '#2563eb', AP: '#16a34a', CM: '#7c3aed',
  PR: '#d97706', NE: '#0891b2', GL: '#e11d48',
};

interface HistEntry { id: number; codigo: string; tipo: string; nombre?: string; atendido_at: string }

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
  const [busyAdherir, setBusyAdherir]       = useState<string | null>(null);
  const [showHistorial, setShowHistorial]   = useState(false);
  const [historial, setHistorial]           = useState<HistEntry[]>([]);
  const [nombre, setNombre]                 = useState('');
  const [pinOk, setPinOk]                   = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const fetchEstado = useCallback(async () => {
    const r = await fetch('/api/estado');
    setEstado(await r.json());
  }, []);

  useEffect(() => {
    fetchEstado();
    fetch('/api/config').then(r => r.json()).then(d => setBrowserUrl(d.browser_url ?? ''));
    const iv = setInterval(fetchEstado, 3000);
    return () => clearInterval(iv);
  }, [fetchEstado]);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    await fn();
    await fetchEstado();
    setBusy(null);
  }

  const generarTurno   = (tipo: string) => run(tipo, async () => {
    await fetch('/api/turnos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo, nombre: nombre.trim() || undefined }) });
    setNombre('');
  });
  const siguiente      = () => run('sig',  () => fetch('/api/siguiente', { method: 'POST' }).then(() => {}));
  const cancelar       = (id: number) => run(`del-${id}`, () => fetch(`/api/turnos/${id}`, { method: 'DELETE' }).then(() => {}));
  const adherir        = async (turnoId: number, tipo: string) => {
    const key = `adh-${turnoId}-${tipo}`;
    setBusyAdherir(key);
    await fetch(`/api/turnos/${turnoId}/adherir`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo }) });
    await fetchEstado();
    setBusyAdherir(null);
  };
  const guardarEdicion = () => run('edit', async () => {
    if (!editModal) return;
    await fetch(`/api/turnos/${editModal.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: editModal.codigo }) });
    setEditModal(null);
  });

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

  const limpiar = () => run('limpiar', async () => {
    await fetch('/api/limpiar', { method: 'POST' });
    setConfirmLimpiar(false);
  });
  const guardarConfig = async () => {
    await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: 'browser_url', valor: browserUrl }) });
    setShowConfig(false);
  };

  const abrirHistorial = async () => {
    const r = await fetch('/api/historial');
    setHistorial(await r.json());
    setShowHistorial(true);
  };

  const lista      = reordenando ? ordenTemp : estado.waiting;
  const tipoCounts = Object.fromEntries(TIPOS.map(({ tipo }) => [tipo, estado.waiting.filter(t => t.tipo === tipo).length]));
  const hayTurno   = !!estado.current;

  if (!pinOk) return (
    <PinModal
      titulo="Acceso — Mostrador"
      subtitulo="Ingrese la clave de 4 dígitos"
      pin="2006"
      onSuccess={() => setPinOk(true)}
    />
  );

  return (
    <div className="h-screen flex flex-col bg-[#f4f6f9]">

      {/* ══ HEADER ══ */}
      <header className="shrink-0 bg-white border-b border-slate-200 z-20">
        <div className="flex items-center gap-3 px-5 h-14">

          {/* Back */}
          <Link href="/"
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition text-xs font-semibold shrink-0">
            <ArrowLeftIcon size={15} />
            Menú
          </Link>

          <div className="h-5 w-px bg-slate-200 shrink-0" />

          {/* Title */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width={15} height={15} viewBox="0 0 24 24"
                fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-tight">Mostrador</p>
              <p className="text-slate-400 text-[10px] leading-tight">Gestión de turnos</p>
            </div>
          </div>

          {/* Turno activo */}
          {hayTurno && (
            <div className="hidden sm:flex items-center gap-2 bg-green-50 border border-green-200 rounded px-3 py-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] text-green-600 font-semibold">En atención</span>
              <span className="font-extrabold text-green-800 text-sm tracking-wide">{estado.current!.codigo}</span>
            </div>
          )}

          {/* Contador espera */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24"
              fill="none" stroke="#64748b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span className="text-xs text-slate-500 font-semibold">{estado.waitingCount} en espera</span>
          </div>

          {/* Siguiente */}
          <button onClick={siguiente} disabled={!!busy || estado.waitingCount === 0}
            className="hidden sm:flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white font-bold text-sm px-4 py-2 rounded transition active:scale-95 shrink-0">
            {busy === 'sig' ? <Spinner white /> : <PlayIcon size={14} />}
            Llamar siguiente
          </button>

          {/* Historial */}
          <button onClick={abrirHistorial} title="Historial de atenciones"
            className="p-2 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width={17} height={17} viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
              <path d="M12 7v5l4 2"/>
            </svg>
          </button>

          {/* Config */}
          <button onClick={() => setShowConfig(true)}
            className="p-2 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0">
            <Cog6ToothIcon size={17} />
          </button>
        </div>

        {/* Tabs mobile */}
        <div className="flex sm:hidden border-t border-slate-100">
          {[{ key: 'nuevo', label: 'Nuevo turno' }, { key: 'cola', label: `Cola (${estado.waitingCount})` }].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key as 'cola' | 'nuevo')}
              className={`flex-1 py-2.5 text-sm font-bold transition border-b-2 ${
                tab === key ? 'text-blue-700 border-blue-700' : 'text-slate-400 border-transparent'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ══ CUERPO ══ */}
      <div className="flex-1 overflow-hidden flex min-h-0">

        {/* ── Cola ── */}
        <section className={`flex-1 flex flex-col overflow-hidden ${tab !== 'cola' ? 'hidden sm:flex' : 'flex'}`}>

          {/* Subheader */}
          <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 bg-blue-600 rounded-full" />
              <span className="font-bold text-slate-800 text-sm">Cola de espera</span>
              {lista.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded tabular-nums">
                  {lista.length}
                </span>
              )}
            </div>
            {!reordenando
              ? <div className="flex items-center gap-1">
                  <a href="/api/exportar" download
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-green-700 hover:bg-green-50 px-3 py-1.5 rounded transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width={12} height={12} viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Exportar CSV
                  </a>
                  <div className="w-px h-4 bg-slate-200" />
                  <button onClick={iniciarReorden}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width={12} height={12} viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                    Reordenar
                  </button>
                </div>
              : <div className="flex gap-2">
                  <button onClick={guardarReorden}
                    className="flex items-center gap-1 text-xs font-bold bg-blue-700 text-white px-3 py-1.5 rounded hover:bg-blue-800 transition">
                    <CheckIcon size={11} /> Guardar orden
                  </button>
                  <button onClick={cancelarReorden}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 border border-slate-200 bg-white px-3 py-1.5 rounded hover:bg-slate-50 transition">
                    <XMarkIcon size={11} /> Cancelar
                  </button>
                </div>
            }
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1.5">

            {/* Turno en atención — fijo arriba con verde */}
            {estado.current && (
              <div className="bg-green-50 border border-green-300 flex flex-col overflow-hidden"
                style={{ borderLeftWidth: 3, borderLeftColor: '#16a34a' }}>
                <div className="flex items-center">
                  <span className="w-9 text-center shrink-0">
                    <span className="text-[9px] font-bold text-green-600 uppercase">✓</span>
                  </span>
                  <div className="flex-1 flex items-center gap-3 py-2.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-2xl tracking-tight leading-none text-green-700">
                        {estado.current.codigo}
                      </span>
                      {(estado.current.fichasAdicionales ?? []).map(fa => (
                        <span key={fa} className="font-bold text-lg tracking-tight text-green-600">
                          + {fa}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded border bg-green-100 text-green-700 border-green-300">
                      En atención
                    </span>
                    {estado.current.nombre && (
                      <span className="text-[11px] text-green-600 font-medium truncate max-w-[120px]" title={estado.current.nombre}>
                        {estado.current.nombre}
                      </span>
                    )}
                  </div>
                  {/* Botones adherir al turno actual */}
                  {!reordenando && (
                    <div className="flex items-center gap-1.5 pr-3 shrink-0 flex-wrap justify-end max-w-[180px]">
                      {getFichasDisponibles(estado.current.tipo).map(fi => {
                        const key = `adh-${estado.current!.id}-${fi.tipo}`;
                        return (
                          <button key={fi.tipo}
                            onClick={() => adherir(estado.current!.id, fi.tipo)}
                            disabled={!!busyAdherir}
                            title={`Adherir ${fi.short}`}
                            className="text-[11px] font-extrabold px-2.5 py-1 rounded-md border transition active:scale-95 disabled:opacity-40 shadow-sm"
                            style={{ background: fi.bg, borderColor: fi.border, color: fi.text }}>
                            {busyAdherir === key ? '…' : `+${getLetraFicha(fi.tipo)}`}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {lista.length === 0 && !estado.current && <EmptyQueue />}
            {lista.length === 0 && estado.current && (
              <div className="flex-1 flex items-center justify-center py-10">
                <p className="text-sm text-slate-300 font-semibold">Sin más turnos en espera</p>
              </div>
            )}

            {lista.map((t, i) => {
              const ti = TIPOS.find(tp => tp.tipo === t.tipo)!;
              const fichasExtra = t.fichasAdicionales ?? [];
              return (
                <div key={t.id}
                  draggable={reordenando}
                  onDragStart={() => onDragStart(i)} onDragEnter={() => onDragEnter(i)}
                  onDragEnd={onDragEnd} onDragOver={e => e.preventDefault()}
                  className={`bg-white border border-slate-200 flex flex-col overflow-hidden transition ${
                    reordenando ? 'cursor-grab hover:border-blue-300 hover:shadow-sm' : 'hover:border-slate-300'
                  }`}
                  style={{ borderLeftWidth: 3, borderLeftColor: ti.hex }}
                >
                  <div className="flex items-center">
                    {/* Posición */}
                    <span className="w-9 text-center text-xs font-bold text-slate-300 shrink-0">{i + 1}</span>

                    {/* Info */}
                    <div className="flex-1 flex items-center gap-3 py-2.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-2xl tracking-tight leading-none shrink-0"
                          style={{ color: ti.hex }}>
                          {t.codigo}
                        </span>
                        {fichasExtra.map(fa => (
                          <span key={fa} className="font-bold text-lg tracking-tight" style={{ color: ti.hex }}>
                            + {fa}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-col min-w-0 gap-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold w-fit px-2 py-0.5 rounded border"
                          style={{ background: ti.bg, color: ti.text, borderColor: ti.border }}>
                          <ti.Icon size={10} />
                          {ti.short}
                        </span>
                        {t.nombre && (
                          <span className="text-[11px] text-slate-500 font-medium truncate max-w-[150px]" title={t.nombre}>
                            {t.nombre}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-0.5 pr-2 shrink-0">
                      {reordenando && (
                        <div className="flex flex-col gap-0.5 mr-1">
                          <button onClick={() => mover(i, -1)} disabled={i === 0}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-25 transition">
                            <ChevronUpIcon size={11} />
                          </button>
                          <button onClick={() => mover(i, 1)} disabled={i === lista.length - 1}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-25 transition">
                            <ChevronDownIcon size={11} />
                          </button>
                        </div>
                      )}
                      {!reordenando && (
                        <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-[180px]">
                          {getFichasDisponibles(t.tipo).map(fi => {
                            const key = `adh-${t.id}-${fi.tipo}`;
                            return (
                              <button key={fi.tipo}
                                onClick={() => adherir(t.id, fi.tipo)}
                                disabled={!!busyAdherir || !!busy}
                                title={`Adherir ${fi.short}`}
                                className="text-[11px] font-extrabold px-2.5 py-1 rounded-md border transition active:scale-95 disabled:opacity-40 shadow-sm"
                                style={{ background: fi.bg, borderColor: fi.border, color: fi.text }}>
                                {busyAdherir === key ? '…' : `+${getLetraFicha(fi.tipo)}`}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <button onClick={() => setEditModal({ id: t.id, codigo: t.codigo })}
                        className="p-2 rounded text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition active:scale-95">
                        <PencilIcon size={14} />
                      </button>
                      <button onClick={() => cancelar(t.id)}
                        className="p-2 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition active:scale-95">
                        <XMarkIcon size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Panel Nuevo Turno ── */}
        <section className={`w-full sm:w-72 xl:w-80 shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden ${
          tab !== 'nuevo' ? 'hidden sm:flex' : 'flex'
        }`}>

          {/* Subheader */}
          <div className="shrink-0 px-5 py-3 border-b border-slate-100 flex items-center gap-2.5">
            <div className="w-1 h-5 bg-green-500 rounded-full" />
            <span className="font-bold text-slate-800 text-sm">Generar turno</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

            {/* Nombre paciente */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Paciente <span className="font-normal normal-case text-slate-300">— interno / bitácora</span>
              </label>
              <input
                className="w-full border border-slate-200 rounded px-3 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition placeholder:text-slate-300"
                placeholder="Nombre del paciente (opcional)"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setNombre('')}
                maxLength={60}
              />
            </div>

            {/* Botones de tipo */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Tipo de atención
              </label>
              <div className="flex flex-col gap-1.5">
                {TIPOS.map(({ tipo, label, Icon: TipoIcon, hex, bg, border, text }) => {
                  const count   = tipoCounts[tipo] ?? 0;
                  const loading = busy === tipo;
                  return (
                    <button key={tipo} onClick={() => generarTurno(tipo)} disabled={!!busy}
                      className="relative flex items-center gap-3 px-3.5 py-3 rounded border text-left transition active:scale-[.98] disabled:opacity-60 hover:shadow-sm group"
                      style={{ background: bg, borderColor: border }}
                    >
                      {/* Icon */}
                      <div className="w-9 h-9 rounded border flex items-center justify-center shrink-0 bg-white"
                        style={{ borderColor: border }}>
                        {loading ? <Spinner color={hex} /> : <TipoIcon size={18} style={{ color: hex }} />}
                      </div>

                      {/* Código + label */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm leading-none" style={{ color: hex }}>{tipo}</span>
                          <span className="text-xs font-semibold leading-none" style={{ color: text }}>{label}</span>
                        </div>
                      </div>

                      {/* Badge contador */}
                      {count > 0 && (
                        <span className="shrink-0 min-w-[22px] h-[22px] px-1.5 rounded text-[11px] font-extrabold flex items-center justify-center text-white"
                          style={{ background: hex }}>
                          {count}
                        </span>
                      )}

                      {/* Flecha */}
                      <svg className="shrink-0 text-slate-300 group-hover:translate-x-0.5 transition-transform"
                        xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── FAB mobile ── */}
      <div className="sm:hidden fixed bottom-5 right-4 z-30">
        <button onClick={siguiente} disabled={!!busy || estado.waitingCount === 0}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white font-bold text-sm px-5 py-3 rounded shadow-lg transition active:scale-95"
          style={{ boxShadow: '0 4px 16px rgba(29,78,216,.4)' }}>
          {busy === 'sig' ? <Spinner white /> : <PlayIcon size={15} />}
          Siguiente
        </button>
      </div>

      {/* ══ MODAL CONFIG ══ */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-xl sm:rounded-xl shadow-xl border border-slate-200">
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-8 h-1 rounded-full bg-slate-200" />
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-extrabold text-slate-900 text-base">Configuración</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Sala de espera y sistema</p>
                </div>
                <button onClick={() => setShowConfig(false)}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-400 transition">
                  <XMarkIcon size={16} />
                </button>
              </div>

              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                URL Sala de Espera
              </label>
              <input
                className="w-full border border-slate-200 rounded px-3 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition mb-1"
                value={browserUrl} onChange={e => setBrowserUrl(e.target.value)}
                placeholder="https://www.netflix.com  |  https://www.youtube.com  |  ..."
              />
              <p className="text-[11px] text-slate-400 mb-5">
                URL que se muestra en la sala de espera.
              </p>

              <div className="flex flex-col gap-2">
                <button onClick={guardarConfig}
                  className="flex items-center justify-center gap-2 py-2.5 rounded font-bold text-sm text-white bg-blue-700 hover:bg-blue-800 transition active:scale-95">
                  <CheckIcon size={14} /> Guardar configuración
                </button>
                <button onClick={() => { setShowConfig(false); setConfirmLimpiar(true); }}
                  className="flex items-center justify-center gap-2 py-2.5 rounded font-semibold text-sm text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition active:scale-95">
                  <TrashIcon size={13} /> Limpiar toda la cola
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL EDITAR ══ */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-xs shadow-xl border border-slate-200">
            <h2 className="font-extrabold text-slate-900 mb-1">Editar código</h2>
            <p className="text-slate-400 text-xs mb-4">Modifique el código del turno</p>
            <input autoFocus maxLength={8}
              className="w-full border-2 border-slate-200 focus:border-blue-500 rounded px-4 py-3 text-3xl font-extrabold text-center tracking-widest bg-slate-50 focus:bg-white focus:outline-none transition mb-5"
              value={editModal.codigo}
              onChange={e => setEditModal({ ...editModal, codigo: e.target.value.toUpperCase() })}
            />
            <div className="flex gap-2">
              <button onClick={guardarEdicion}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded font-bold text-sm text-white bg-blue-700 hover:bg-blue-800 transition active:scale-95">
                <CheckIcon size={13} /> Guardar
              </button>
              <button onClick={() => setEditModal(null)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95">
                <XMarkIcon size={13} /> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL HISTORIAL ══ */}
      {showHistorial && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg h-[85vh] sm:h-[75vh] rounded-t-xl sm:rounded-xl shadow-xl border border-slate-200 flex flex-col">
            {/* Handle móvil */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-8 h-1 rounded-full bg-slate-200" />
            </div>
            {/* Header */}
            <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">Historial de atenciones</h2>
                <p className="text-slate-400 text-xs mt-0.5">Registro permanente — no se borra al limpiar la cola</p>
              </div>
              <button onClick={() => setShowHistorial(false)}
                className="p-1.5 rounded hover:bg-slate-100 text-slate-400 transition">
                <XMarkIcon size={16} />
              </button>
            </div>
            {/* Lista */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1.5">
              {historial.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-16">
                  <svg xmlns="http://www.w3.org/2000/svg" width={32} height={32} viewBox="0 0 24 24"
                    fill="none" stroke="#cbd5e1" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
                    <path d="M12 7v5l4 2"/>
                  </svg>
                  <p className="text-sm font-semibold text-slate-400">Sin registros aún</p>
                  <p className="text-xs text-slate-300">Los turnos atendidos aparecerán aquí</p>
                </div>
              )}
              {historial.map((h, i) => {
                const color = TIPO_COLOR[h.tipo] ?? '#64748b';
                const label = TIPO_LABEL[h.tipo] ?? h.tipo;
                const fecha = new Date(h.atendido_at);
                const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                const fechaStr = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
                return (
                  <div key={h.id}
                    className="bg-white border border-slate-100 rounded-lg flex items-center gap-3 px-4 py-2.5"
                    style={{ borderLeftWidth: 3, borderLeftColor: color }}>
                    <span className="w-6 text-center text-xs font-bold text-slate-300 shrink-0 tabular-nums">{historial.length - i}</span>
                    <span className="font-extrabold text-lg tracking-tight leading-none shrink-0 w-14"
                      style={{ color }}>{h.codigo}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded border"
                        style={{ color, borderColor: color + '40', background: color + '12' }}>
                        {label}
                      </span>
                      {h.nombre && (
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{h.nombre}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-600 tabular-nums">{horaStr}</p>
                      <p className="text-[10px] text-slate-400 tabular-nums">{fechaStr}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL LIMPIAR ══ */}
      {confirmLimpiar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-xs shadow-xl border border-slate-200 text-center">
            <div className="mx-auto w-12 h-12 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center mb-4">
              <TrashIcon size={22} className="text-red-500" />
            </div>
            <h2 className="font-extrabold text-slate-900 text-base mb-1">¿Limpiar cola?</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Se eliminarán todos los turnos. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button onClick={limpiar}
                className="flex-1 py-2.5 rounded font-bold text-sm text-white bg-red-600 hover:bg-red-700 transition active:scale-95">
                Confirmar
              </button>
              <button onClick={() => setConfirmLimpiar(false)}
                className="flex-1 py-2.5 rounded font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition active:scale-95">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyQueue() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="w-12 h-12 rounded bg-slate-100 border border-slate-200 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1"
          strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={24} height={24}>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <path d="M9 12h6M9 16h4"/>
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-400">Cola vacía</p>
        <p className="text-xs text-slate-300 mt-0.5">Genere turnos desde el panel derecho</p>
      </div>
    </div>
  );
}

function Spinner({ color, white }: { color?: string; white?: boolean }) {
  const c = white ? 'white' : color ?? '#94a3b8';
  return (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" width={18} height={18}>
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke={c} strokeWidth="3" />
      <path className="opacity-80" fill={c} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
