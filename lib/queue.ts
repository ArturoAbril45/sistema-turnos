import { readState, writeState, TipoTurno, Turno } from './store';

export type { TipoTurno, Turno };

// ─── Helpers ────────────────────────────────────────────────────────────────

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
 * Calcula la posición de inserción para un nuevo turno AP:
 * - Si ya hay ≥1 AP en espera → pasa al frente de la cola inmediatamente
 * - Si no hay AP en espera → se intercala después del primer CO en espera
 */
function calcAPPosition(turnos: Turno[]): number {
  const waiting = getWaiting(turnos);
  const apWaiting = waiting.filter((t) => t.tipo === 'AP');

  if (apWaiting.length >= 1) {
    // Insertar al frente
    return waiting.length > 0 ? waiting[0].posicion - 5 : 10;
  }

  // Insertar después del primer CO
  const firstCO = waiting.find((t) => t.tipo === 'CO');
  if (!firstCO) {
    return waiting.length > 0 ? waiting[waiting.length - 1].posicion + 10 : 10;
  }
  const idx = waiting.indexOf(firstCO);
  const next = waiting[idx + 1];
  return next ? (firstCO.posicion + next.posicion) / 2 : firstCO.posicion + 5;
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
    config: state.config,
  };
}

// ─── Mutaciones ──────────────────────────────────────────────────────────────

export function createTurno(tipo: TipoTurno): Turno {
  const state = readState();
  const numero = (state.counters[tipo] ?? 0) + 1;
  const codigo = `${tipo}${String(numero).padStart(2, '0')}`;

  let posicion: number;
  if (tipo === 'AP') {
    posicion = calcAPPosition(state.turnos);
  } else {
    const waiting = state.turnos.filter((t) => t.estado === 'esperando');
    const maxPos = waiting.length > 0 ? Math.max(...waiting.map((t) => t.posicion)) : 0;
    posicion = maxPos + 10;
  }

  const turno: Turno = {
    id: state.nextId,
    tipo,
    numero,
    codigo,
    estado: 'esperando',
    posicion,
    created_at: new Date().toISOString(),
  };

  state.turnos.push(turno);
  state.counters[tipo] = numero;
  state.nextId++;
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
