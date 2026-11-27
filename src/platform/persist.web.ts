/**
 * Web build is only used for the README preview screenshots: data lives in
 * memory and starts with generic example timers.
 */
import { t } from '../i18n';
import { addMinute, createTimer, pause, start } from '../lib/timer';

let memory: string | null = null;

function demo(): string {
  const now = Date.now();
  const m = (n: number) => n * 60_000;
  const timers = [
    start(createTimer('d1', t('presetPasta'), m(9), now - m(2)), now - m(2) - 4_000),
    start(createTimer('d2', t('presetLaundry'), m(45), now - m(11)), now - m(11)),
    pause(start(createTimer('d3', t('presetTea'), m(4), now - m(1)), now - m(1)), now),
    addMinute(createTimer('d4', t('presetBreak'), m(4), now), now),
  ];
  const presets = [
    { id: 'p1', label: t('presetPasta'), durationMs: m(9) },
    { id: 'p2', label: t('presetEggs'), durationMs: m(10) },
    { id: 'p3', label: t('presetTea'), durationMs: m(4) },
    { id: 'p4', label: t('presetLaundry'), durationMs: m(45) },
  ];
  return JSON.stringify({ version: 1, timers, presets, settings: { keepAwake: true } });
}

export function loadRaw(): string | null {
  if (memory === null) memory = demo();
  return memory;
}

export function saveRaw(json: string): void {
  memory = json;
}

export const isDemo = true;
