import fs from 'fs';
import path from 'path';

export type TipoTurno = 'CO' | 'AP' | 'CM' | 'PR' | 'NE' | 'GL';
export type EstadoTurno = 'esperando' | 'en_atencion' | 'atendido' | 'cancelado';

export interface HistorialEntry {
  id: number;
  codigo: string;
  tipo: TipoTurno;
  nombre?: string;
  atendido_at: string;
}

export interface Turno {
  id: number;
  tipo: TipoTurno;
  numero: number;
  codigo: string;
  nombre?: string;
  estado: EstadoTurno;
  posicion: number;
  atendido_orden?: number;
  created_at: string;
}

interface State {
  turnos: Turno[];
  nextId: number;
  counters: Record<string, number>;
  maxAtendidoOrden: number;
  config: {
    browser_url: string;
  };
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const STORE_PATH    = path.join(DATA_DIR, 'turnos.json');
const HISTORIAL_PATH = path.join(DATA_DIR, 'historial.json');

const defaultState: State = {
  turnos: [],
  nextId: 1,
  counters: {},
  maxAtendidoOrden: 0,
  config: {
    browser_url: '',
  },
};

export function readState(): State {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, JSON.stringify(defaultState, null, 2));
      return JSON.parse(JSON.stringify(defaultState));
    }
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  } catch {
    return JSON.parse(JSON.stringify(defaultState));
  }
}

export function writeState(state: State): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2));
}

export function getHistorial(): HistorialEntry[] {
  try {
    if (fs.existsSync(HISTORIAL_PATH)) {
      return JSON.parse(fs.readFileSync(HISTORIAL_PATH, 'utf-8'));
    }
  } catch { /* */ }
  return [];
}

export function appendHistorial(entry: Omit<HistorialEntry, 'id'>): void {
  const entries = getHistorial();
  const id = entries.length > 0 ? entries[entries.length - 1].id + 1 : 1;
  entries.push({ id, ...entry });
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(HISTORIAL_PATH, JSON.stringify(entries, null, 2));
}
