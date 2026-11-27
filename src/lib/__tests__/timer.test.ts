import {
  addMinute,
  createTimer,
  formatDuration,
  formatShort,
  hmsToMs,
  MAX_DURATION_MS,
  msToHms,
  pause,
  progress,
  remainingMs,
  reset,
  settle,
  sortTimers,
  start,
} from '../timer';

const T0 = 1_700_000_000_000;
const min = (n: number) => n * 60_000;

describe('remaining time from absolute end timestamp', () => {
  it('counts down from endAt, not from ticks', () => {
    const t = start(createTimer('a', 'Pasta', min(9), T0), T0);
    expect(t.endAt).toBe(T0 + min(9));
    expect(remainingMs(t, T0 + min(4))).toBe(min(5));
  });

  it('is still correct after a long gap (app in background or restarted)', () => {
    const t = start(createTimer('a', 'Laundry', min(45), T0), T0);
    expect(remainingMs(t, T0 + min(44))).toBe(min(1));
    expect(remainingMs(t, T0 + min(90))).toBe(0);
  });

  it('never returns a negative value', () => {
    const t = start(createTimer('a', 'x', 1000, T0), T0);
    expect(remainingMs(t, T0 + 10_000)).toBe(0);
  });
});

describe('pause and resume', () => {
  it('keeps the remaining time while paused', () => {
    let t = start(createTimer('a', 'x', min(10), T0), T0);
    t = pause(t, T0 + min(3));
    expect(t.status).toBe('paused');
    expect(t.endAt).toBeNull();
    expect(remainingMs(t, T0 + min(60))).toBe(min(7));
  });

  it('sets a new end timestamp on resume', () => {
    let t = start(createTimer('a', 'x', min(10), T0), T0);
    t = pause(t, T0 + min(3));
    t = start(t, T0 + min(20));
    expect(t.status).toBe('running');
    expect(t.endAt).toBe(T0 + min(27));
  });

  it('pausing a timer that already ended marks it done', () => {
    const t = start(createTimer('a', 'x', 1000, T0), T0);
    expect(pause(t, T0 + 5000).status).toBe('done');
  });

  it('starting a finished timer restarts the full duration', () => {
    const [done] = settle([start(createTimer('a', 'x', min(2), T0), T0)], T0 + min(3)).timers;
    expect(done.status).toBe('done');
    const again = start(done, T0 + min(4));
    expect(again.endAt).toBe(T0 + min(6));
  });
});

describe('+1 min', () => {
  it('moves the end timestamp of a running timer', () => {
    const t = addMinute(start(createTimer('a', 'x', min(5), T0), T0), T0 + min(1));
    expect(remainingMs(t, T0 + min(1))).toBe(min(5));
  });

  it('adds to the remaining time of a paused timer', () => {
    const t = addMinute(pause(start(createTimer('a', 'x', min(5), T0), T0), T0 + min(2)), T0 + min(2));
    expect(t.remainingMs).toBe(min(4));
  });

  it('restarts a finished timer with one minute', () => {
    const [done] = settle([start(createTimer('a', 'x', 1000, T0), T0)], T0 + 2000).timers;
    const t = addMinute(done, T0 + 3000);
    expect(t.status).toBe('running');
    expect(t.endAt).toBe(T0 + 3000 + min(1));
  });

  it('counts from now if the end has already passed', () => {
    const t = start(createTimer('a', 'x', 1000, T0), T0);
    expect(addMinute(t, T0 + 10_000).endAt).toBe(T0 + 10_000 + min(1));
  });
});

describe('reset and settle', () => {
  it('reset restores the chosen duration', () => {
    const t = reset(pause(start(createTimer('a', 'x', min(5), T0), T0), T0 + min(2)));
    expect(t.status).toBe('idle');
    expect(t.remainingMs).toBe(min(5));
  });

  it('settle reports only timers that just ended', () => {
    const a = start(createTimer('a', 'A', min(1), T0), T0);
    const b = start(createTimer('b', 'B', min(5), T0), T0);
    const r = settle([a, b], T0 + min(2));
    expect(r.ended.map((t) => t.id)).toEqual(['a']);
    expect(r.timers.find((t) => t.id === 'a')?.status).toBe('done');
    expect(settle(r.timers, T0 + min(2)).ended).toHaveLength(0);
  });

  it('settle returns the same array when nothing ended', () => {
    const list = [start(createTimer('a', 'A', min(1), T0), T0)];
    expect(settle(list, T0).timers).toBe(list);
  });
});

describe('sorting', () => {
  it('puts finished first, then running by time remaining, then paused and idle', () => {
    const idle = createTimer('idle', 'idle', min(1), T0);
    const long = start(createTimer('long', 'long', min(30), T0), T0);
    const short = start(createTimer('short', 'short', min(3), T0), T0);
    const paused = pause(start(createTimer('paused', 'paused', min(2), T0), T0), T0);
    const done = settle([start(createTimer('done', 'done', 1000, T0), T0)], T0 + 2000).timers[0];
    const ids = sortTimers([idle, long, paused, short, done], T0 + 2000).map((t) => t.id);
    expect(ids).toEqual(['done', 'short', 'long', 'paused', 'idle']);
  });
});

describe('formatting and parsing', () => {
  it('formats m:ss under one hour and h:mm:ss above', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(9 * 60_000)).toBe('9:00');
    expect(formatDuration(3_909_000)).toBe('1:05:09');
  });

  it('rounds seconds up so a timer never shows 0:00 while running', () => {
    expect(formatDuration(1)).toBe('0:01');
    expect(formatDuration(59_001)).toBe('1:00');
  });

  it('formats short preset labels', () => {
    expect(formatShort(min(9))).toBe('9 min');
    expect(formatShort(min(90))).toBe('1 h 30 min');
    expect(formatShort(45_000)).toBe('45 s');
  });

  it('converts h/m/s and clamps bad input', () => {
    expect(hmsToMs(1, 2, 3)).toBe(3_723_000);
    expect(hmsToMs(-1, NaN, 5)).toBe(5_000);
    expect(hmsToMs(500, 0, 0)).toBe(MAX_DURATION_MS);
    expect(msToHms(3_723_000)).toEqual({ h: 1, m: 2, s: 3 });
  });

  it('computes progress between 0 and 1', () => {
    const t = start(createTimer('a', 'x', min(10), T0), T0);
    expect(progress(t, T0)).toBe(0);
    expect(progress(t, T0 + min(5))).toBeCloseTo(0.5);
    expect(progress(t, T0 + min(20))).toBe(1);
  });
});
