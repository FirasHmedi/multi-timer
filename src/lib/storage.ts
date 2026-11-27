import { clampDuration, type Timer, type TimerStatus } from './timer';

export interface Preset {
  id: string;
  label: string;
  durationMs: number;
}

export interface Settings {
  keepAwake: boolean;
}

export interface AppData {
  version: 1;
  timers: Timer[];
  presets: Preset[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = { keepAwake: false };

const STATUSES: TimerStatus[] = ['idle', 'running', 'paused', 'done'];

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function parseTimer(v: unknown): Timer | null {
  if (!isObj(v) || typeof v.id !== 'string' || typeof v.label !== 'string') return null;
  const status = STATUSES.includes(v.status as TimerStatus) ? (v.status as TimerStatus) : 'idle';
  const durationMs = clampDuration(Number(v.durationMs));
  const endAt = typeof v.endAt === 'number' && Number.isFinite(v.endAt) ? v.endAt : null;
  if (status === 'running' && endAt === null) return null;
  return {
    id: v.id,
    label: v.label,
    durationMs,
    status,
    endAt: status === 'running' ? endAt : null,
    remainingMs: clampDuration(Number(v.remainingMs ?? durationMs)),
    createdAt: Number.isFinite(Number(v.createdAt)) ? Number(v.createdAt) : 0,
  };
}

function parsePreset(v: unknown): Preset | null {
  if (!isObj(v) || typeof v.id !== 'string' || typeof v.label !== 'string') return null;
  const durationMs = clampDuration(Number(v.durationMs));
  if (durationMs <= 0) return null;
  return { id: v.id, label: v.label, durationMs };
}

/** Parse stored JSON defensively: bad entries are dropped, never thrown. */
export function parseAppData(json: string | null, fallbackPresets: Preset[]): AppData {
  const empty: AppData = { version: 1, timers: [], presets: fallbackPresets, settings: DEFAULT_SETTINGS };
  if (!json) return empty;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return empty;
  }
  if (!isObj(raw)) return empty;
  const timers = Array.isArray(raw.timers) ? raw.timers.map(parseTimer).filter((t): t is Timer => t !== null) : [];
  const presets = Array.isArray(raw.presets)
    ? raw.presets.map(parsePreset).filter((p): p is Preset => p !== null)
    : fallbackPresets;
  const s = isObj(raw.settings) ? raw.settings : {};
  return { version: 1, timers, presets, settings: { keepAwake: s.keepAwake === true } };
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Built-in presets are saved with their label in the language of the first
 * launch. Show them in the current language, unless the user renamed them:
 * a built-in preset (same id) whose label is still one of its known
 * translations takes the current label.
 */
export function localizeDefaultPresets(
  presets: Preset[],
  defaults: Preset[],
  translations: Record<string, string[]>,
): Preset[] {
  return presets.map((p) => {
    const current = defaults.find((d) => d.id === p.id);
    if (!current || p.label === current.label) return p;
    return translations[p.id]?.includes(p.label) ? { ...p, label: current.label } : p;
  });
}
