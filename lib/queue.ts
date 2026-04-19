import { readState, writeState, TipoTurno, Turno, appendHistorial } from './store';

const CODIGO_PREFIX: Record<TipoTurno, string> = {
  CO: 'C', AP: 'A', CM: 'CM', PR: 'P', NE: 'N', GL: 'G',
};

export type { TipoTurno, Turno };

// ─── Helpers ────────────────────────────────────────────────────────────────

// Tipos que se intercalan con los turnos normales
const INTERCALADOS: TipoTurno[] = ['AP', 'GL', 'NE'];

function esIntercalado(tipo: TipoTurno): boolean {
  return INTERCALADOS.includes(tipo);
}

function getWaiting(turnos: Turno[]): Turno[] {
  return turnos
    .filter((t) => t.estado === 'esperando')
    .sort((a, b) => a.posicion - b.posicion);
}

function renormalize(turnos: Turno[]): void {
  const waiting = getWaiting(turnos);
  waiting.forEach((t, i) => {
    t.posicion = (i + 1) * 10;
  });
}

/**
 * Redistribuye los turnos intercalados (AP, GL) dentro de la cola:
 * - Si hay exactamente 1 intercalado → va después del primer turno normal
 * - Si hay ≥2 intercalados (saturación) → se distribuyen 1:1 con los normales,
 *   el intercalado siempre primero en cada par: INTER, CO, INTER, CO, ...
 */
function rebalanceIntercalados(turnos: Turno[]): void {
  const waiting = getWaiting(turnos);
  const interTurnos = waiting.filter((t) => esIntercalado(t.tipo));
  const normalTurnos = waiting.filter((t) => !esIntercalado(t.tipo));

  if (interTurnos.length === 0) return;

  if (interTurnos.length === 1) {
    // Un solo intercalado: va después del primer turno normal
    if (normalTurnos.length === 0) {
      interTurnos[0].posicion = 5;
      return;
    }
    const firstNormal = normalTurnos[0];
    const secondNormal = normalTurnos[1];
    interTurnos[0].posicion = secondNormal
      ? (firstNormal.posicion + secondNormal.posicion) / 2
      : firstNormal.posicion + 5;
    return;
  }

  // ≥2 intercalados (saturación): INTER, CO, INTER, CO, ...
  const newOrder: Turno[] = [];
  for (let i = 0; i < interTurnos.length; i++) {
    newOrder.push(interTurnos[i]);
    if (i < normalTurnos.length) newOrder.push(normalTurnos[i]);
  }
  normalTurnos.slice(interTurnos.length).forEach((t) => newOrder.push(t));
  newOrder.forEach((t, i) => { t.posicion = (i + 1) * 10; });
}

// ─── Lecturas ────────────────────────────────────────────────────────────────

export function getEstado() {
  const state = readState();
  const current = state.turnos.find((t) => t.estado === 'en_atencion') ?? null;
  const waiting = getWaiting(state.turnos);
  return {
    current,
    waiting,
    nextTres: waiting.slice(0, 3),
    waitingCount: waiting.length,
    waitingNormal:      waiting.filter((t) => !esIntercalado(t.tipo)).length,
    waitingIntercalado: waiting.filter((t) =>  esIntercalado(t.tipo)).length,
    config: state.config,
  };
}

// ─── Mutaciones ──────────────────────────────────────────────────────────────

export function createTurno(tipo: TipoTurno, nombre?: string): Turno {
  const state = readState();
  const numero = (state.counters[tipo] ?? 0) + 1;
  const codigo = `${CODIGO_PREFIX[tipo]}${numero}`;

  // Posición temporal al final — rebalanceIntercalados la reubica si es intercalado
  const waiting = state.turnos.filter((t) => t.estado === 'esperando');
  const maxPos = waiting.length > 0 ? Math.max(...waiting.map((t) => t.posicion)) : 0;
  const posicion = maxPos + 10;

  const turno: Turno = {
    id: state.nextId,
    tipo,
    numero,
    codigo,
    ...(nombre?.trim() ? { nombre: nombre.trim() } : {}),
    estado: 'esperando',
    posicion,
    created_at: new Date().toISOString(),
  };

  state.turnos.push(turno);
  state.counters[tipo] = numero;
  state.nextId++;

  if (esIntercalado(tipo)) {
    rebalanceIntercalados(state.turnos);
  }

  renormalize(state.turnos);
  writeState(state);
  return turno;
}

export function nextTurn(): { prev: Turno | null; next: Turno | null } {
  const state = readState();
  const current = state.turnos.find((t) => t.estado === 'en_atencion') ?? null;
  const waiting = getWaiting(state.turnos);
  const nextInLine = waiting[0] ?? null;

  if (current) {
    current.estado = 'atendido';
    state.maxAtendidoOrden++;
    current.atendido_orden = state.maxAtendidoOrden;
    current.posicion = 0;
    appendHistorial({
      codigo: current.codigo,
      tipo: current.tipo,
      ...(current.nombre ? { nombre: current.nombre } : {}),
      atendido_at: new Date().toISOString(),
    });
  }

  if (nextInLine) {
    nextInLine.estado = 'en_atencion';
    nextInLine.posicion = 0;
  }

  writeState(state);
  return { prev: current, next: nextInLine };
}

export function prevTurn(): { restored: Turno | null } {
  const state = readState();
  const current = state.turnos.find((t) => t.estado === 'en_atencion') ?? null;

  const lastAttended =
    state.turnos
      .filter((t) => t.estado === 'atendido' && t.atendido_orden != null)
      .sort((a, b) => (b.atendido_orden ?? 0) - (a.atendido_orden ?? 0))[0] ?? null;

  if (!lastAttended) return { restored: null };

  // Devolver el turno actual al frente de la espera
  if (current) {
    const waiting = getWaiting(state.turnos);
    current.estado = 'esperando';
    current.posicion = waiting.length > 0 ? waiting[0].posicion - 5 : 10;
    renormalize(state.turnos);
  }

  // Restaurar el último atendido
  lastAttended.estado = 'en_atencion';
  delete lastAttended.atendido_orden;
  lastAttended.posicion = 0;

  writeState(state);
  return { restored: lastAttended };
}

export function cancelTurno(id: number): boolean {
  const state = readState();
  const turno = state.turnos.find((t) => t.id === id);
  if (!turno || !['esperando', 'en_atencion'].includes(turno.estado)) return false;

  turno.estado = 'cancelado';
  turno.posicion = 0;
  renormalize(state.turnos);
  writeState(state);
  return true;
}

export function editCodigo(id: number, codigo: string): boolean {
  const state = readState();
  const turno = state.turnos.find((t) => t.id === id);
  if (!turno) return false;
  turno.codigo = codigo.toUpperCase().trim();
  writeState(state);
  return true;
}

export function reordenarTurnos(ids: number[]): void {
  const state = readState();
  ids.forEach((id, i) => {
    const turno = state.turnos.find((t) => t.id === id);
    if (turno) turno.posicion = (i + 1) * 10;
  });
  writeState(state);
}

export function limpiarCola(): void {
  const state = readState();
  state.turnos = [];
  state.nextId = 1;
  state.counters = {};
  state.maxAtendidoOrden = 0;
  writeState(state);
}

export function getConfig(clave: string): string | null {
  const state = readState();
  return String((state.config as Record<string, unknown>)[clave] ?? '') || null;
}

export function setConfig(clave: string, valor: string): void {
  const state  = readState();
  const parsed = Number(valor);
  // Si el valor es numérico (ej. volume) lo guarda como número, si no como string
  (state.config as Record<string, unknown>)[clave] = isNaN(parsed) ? valor : parsed;
  writeState(state);
}

export function adherirFicha(turnoId: number, tipo: TipoTurno): string | null {
  const state = readState();
  const turno = state.turnos.find(t => t.id === turnoId);
  if (!turno || !['esperando', 'en_atencion'].includes(turno.estado)) return null;

  const numero = (state.counters[tipo] ?? 0) + 1;
  const codigo = `${CODIGO_PREFIX[tipo]}${numero}`;
  state.counters[tipo] = numero;

  if (!turno.fichasAdicionales) turno.fichasAdicionales = [];
  turno.fichasAdicionales.push(codigo);

  writeState(state);
  return codigo;
}
