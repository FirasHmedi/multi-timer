import { parseAppData, type Preset } from '../storage';

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
