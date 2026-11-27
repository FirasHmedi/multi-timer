import type { Timer } from './timer';

export interface WidgetRow {
  id: string;
  label: string;
  endAt: number;
}

export interface WidgetData {
  rows: WidgetRow[];
  /** Running timers not shown because of the limit. */
  more: number;
}

export const WIDGET_MAX_ROWS = 3;

/**
 * What the home-screen widget shows: the running timers that have not ended
 * yet, the soonest first. A widget cannot tick every second, so each row
 * shows the clock time the timer ends at.
 */
export function selectWidgetTimers(
  timers: Timer[],
  now: number,
  fallbackLabel: string,
  max = WIDGET_MAX_ROWS,
): WidgetData {
  const running = timers
    .filter((x): x is Timer & { endAt: number } => x.status === 'running' && x.endAt !== null && x.endAt > now)
    .sort((a, b) => a.endAt - b.endAt || a.createdAt - b.createdAt);
  const rows = running.slice(0, Math.max(0, max)).map((x) => ({
    id: x.id,
    label: x.label.trim() || fallbackLabel,
    endAt: x.endAt,
  }));
  return { rows, more: running.length - rows.length };
}
