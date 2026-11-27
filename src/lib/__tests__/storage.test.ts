import { localizeDefaultPresets, parseAppData, type Preset } from '../storage';

const fallback: Preset[] = [{ id: 'p', label: 'Example', durationMs: 60_000 }];

describe('parseAppData', () => {
  it('returns defaults for empty or invalid JSON', () => {
    expect(parseAppData(null, fallback).presets).toBe(fallback);
    expect(parseAppData('{not json', fallback).timers).toEqual([]);
  });

  it('drops malformed timers and running timers without an end', () => {
    const json = JSON.stringify({
      timers: [
        { id: 'a', label: 'ok', durationMs: 1000, status: 'running', endAt: 5, remainingMs: 1000, createdAt: 1 },
        { id: 'b', label: 'no end', durationMs: 1000, status: 'running', endAt: null },
        { label: 'no id' },
      ],
      presets: [{ id: 'x', label: 'zero', durationMs: 0 }],
      settings: { keepAwake: true },
    });
    const data = parseAppData(json, fallback);
    expect(data.timers.map((t) => t.id)).toEqual(['a']);
    expect(data.presets).toEqual([]);
    expect(data.settings.keepAwake).toBe(true);
  });
});

describe('localizeDefaultPresets', () => {
  const defaults: Preset[] = [
    { id: 'default-1', label: 'Pâtes', durationMs: 540_000 },
    { id: 'default-2', label: 'Thé', durationMs: 240_000 },
  ];
  const translations = { 'default-1': ['Pâtes', 'Pasta'], 'default-2': ['Thé', 'Tea'] };

  it('translates built-in presets saved in another language', () => {
    const saved: Preset[] = [
      { id: 'default-1', label: 'Pasta', durationMs: 540_000 },
      { id: 'default-2', label: 'Tea', durationMs: 300_000 },
    ];
    expect(localizeDefaultPresets(saved, defaults, translations)).toEqual([
      { id: 'default-1', label: 'Pâtes', durationMs: 540_000 },
      // The duration the user saved is kept.
      { id: 'default-2', label: 'Thé', durationMs: 300_000 },
    ]);
  });

  it('keeps renamed built-in presets and user presets as they are', () => {
    const saved: Preset[] = [
      { id: 'default-1', label: 'Spaghetti', durationMs: 540_000 },
      { id: 'abc', label: 'Pasta', durationMs: 60_000 },
    ];
    expect(localizeDefaultPresets(saved, defaults, translations)).toEqual(saved);
  });
});
