/**
 * Pure timer logic. A running timer stores the absolute time it ends at
 * (`endAt`, ms since epoch), never a tick counter, so the remaining time is
 * always correct after the app was in the background or restarted.
 */

export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

export interface Timer {
  id: string;
  label: string;
  /** Duration chosen by the user, used by reset. */
  durationMs: number;
  status: TimerStatus;
  /** Absolute end time, set only while running. */
  endAt: number | null;
  /** Remaining time while idle or paused. */
  remainingMs: number;
  createdAt: number;
}

export const MINUTE_MS = 60_000;
export const MAX_DURATION_MS = 100 * 3_600_000 - 1_000; // 99:59:59

export function clampDuration(ms: number): number {
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.min(Math.round(ms), MAX_DURATION_MS);
}

export function hmsToMs(h: number, m: number, s: number): number {
  const safe = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
  return clampDuration(safe(h) * 3_600_000 + safe(m) * 60_000 + safe(s) * 1_000);
}

export function msToHms(ms: number): { h: number; m: number; s: number } {
  const total = Math.ceil(Math.max(0, ms) / 1_000);
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

/** Remaining time in ms, never negative. */
export function remainingMs(timer: Timer, now: number): number {
  switch (timer.status) {
    case 'running':
      return Math.max(0, (timer.endAt ?? now) - now);
    case 'done':
      return 0;
    default:
      return Math.max(0, timer.remainingMs);
  }
}

/** A running timer whose end time has passed. */
export function hasEnded(timer: Timer, now: number): boolean {
  return timer.status === 'running' && timer.endAt !== null && timer.endAt <= now;
}

export function createTimer(id: string, label: string, durationMs: number, now: number): Timer {
  const d = clampDuration(durationMs);
  return { id, label: label.trim(), durationMs: d, status: 'idle', endAt: null, remainingMs: d, createdAt: now };
}

/** Start an idle timer, or resume a paused one. */
export function start(timer: Timer, now: number): Timer {
  if (timer.status === 'running') return timer;
  const left = timer.status === 'done' ? timer.durationMs : timer.remainingMs;
  if (left <= 0) return timer;
  return { ...timer, status: 'running', endAt: now + left, remainingMs: left };
}

export function pause(timer: Timer, now: number): Timer {
  if (timer.status !== 'running') return timer;
  const left = remainingMs(timer, now);
  if (left <= 0) return markDone(timer);
  return { ...timer, status: 'paused', endAt: null, remainingMs: left };
}

/** Add one minute. A finished timer restarts with one minute left. */
export function addMinute(timer: Timer, now: number): Timer {
  switch (timer.status) {
    case 'running': {
      const base = Math.max(timer.endAt ?? now, now);
      const endAt = Math.min(base + MINUTE_MS, now + MAX_DURATION_MS);
      return { ...timer, endAt };
    }
    case 'done':
      return { ...timer, status: 'running', endAt: now + MINUTE_MS, remainingMs: MINUTE_MS };
    default:
      return { ...timer, remainingMs: clampDuration(timer.remainingMs + MINUTE_MS) };
  }
}

export function reset(timer: Timer): Timer {
  return { ...timer, status: 'idle', endAt: null, remainingMs: timer.durationMs };
}

export function markDone(timer: Timer): Timer {
  return { ...timer, status: 'done', endAt: null, remainingMs: 0 };
}

/**
 * Mark every running timer whose end has passed as done.
 * Returns the new list and the timers that just ended.
 */
export function settle(timers: Timer[], now: number): { timers: Timer[]; ended: Timer[] } {
  const ended: Timer[] = [];
  const next = timers.map((t) => {
    if (!hasEnded(t, now)) return t;
    ended.push(t);
    return markDone(t);
  });
  return { timers: ended.length ? next : timers, ended };
}

const STATUS_RANK: Record<TimerStatus, number> = { done: 0, running: 1, paused: 2, idle: 3 };

/**
 * Finished timers first (they need attention), then running timers by time
 * remaining, then paused and idle ones by time remaining.
 */
export function sortTimers(timers: Timer[], now: number): Timer[] {
  return [...timers].sort((a, b) => {
    const r = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (r !== 0) return r;
    const d = remainingMs(a, now) - remainingMs(b, now);
    if (d !== 0) return d;
    return a.createdAt - b.createdAt;
  });
}

/** "1:05:09" above one hour, "5:09" below. Seconds are rounded up. */
export function formatDuration(ms: number): string {
  const { h, m, s } = msToHms(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Short label for a preset duration: "9 min", "1 h 30 min", "45 s". */
export function formatShort(ms: number): string {
  const { h, m, s } = msToHms(ms);
  const parts: string[] = [];
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} min`);
  if (s || parts.length === 0) parts.push(`${s} s`);
  return parts.join(' ');
}

/** Fraction elapsed (0..1) for a progress bar. */
export function progress(timer: Timer, now: number): number {
  if (timer.status === 'done') return 1;
  const total = Math.max(timer.durationMs, remainingMs(timer, now));
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - remainingMs(timer, now) / total));
}
