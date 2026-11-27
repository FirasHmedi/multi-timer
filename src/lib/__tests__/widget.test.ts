import { createTimer, pause, start, type Timer } from '../timer';
import { selectWidgetTimers } from '../widget';

const NOW = 1_000_000;
const min = (n: number) => n * 60_000;

function running(id: string, label: string, ms: number, createdAt = 0): Timer {
  return start(createTimer(id, label, ms, createdAt), NOW);
}

describe('selectWidgetTimers', () => {
  it('lists running timers, the soonest end first', () => {
    const data = selectWidgetTimers(
      [running('a', 'Laundry', min(45)), running('b', 'Pasta', min(9)), running('c', 'Tea', min(4))],
      NOW,
      'Timer',
    );
    expect(data.rows.map((r) => r.label)).toEqual(['Tea', 'Pasta', 'Laundry']);
    expect(data.rows[0].endAt).toBe(NOW + min(4));
    expect(data.more).toBe(0);
  });

  it('leaves out paused, idle and finished timers', () => {
    const paused = pause(running('p', 'Paused', min(5)), NOW + 1000);
    const idle = createTimer('i', 'Idle', min(5), 0);
    const done = { ...running('d', 'Done', min(1)), status: 'done' as const, endAt: null };
    const data = selectWidgetTimers([paused, idle, done, running('r', 'Run', min(2))], NOW, 'Timer');
    expect(data.rows.map((r) => r.id)).toEqual(['r']);
  });

  it('leaves out running timers whose end has passed', () => {
    const data = selectWidgetTimers([running('a', 'A', min(1))], NOW + min(1), 'Timer');
    expect(data.rows).toEqual([]);
  });

  it('keeps at most three rows and counts the rest', () => {
    const timers = [1, 2, 3, 4, 5].map((n) => running(`t${n}`, `T${n}`, min(n)));
    const data = selectWidgetTimers(timers, NOW, 'Timer');
    expect(data.rows.map((r) => r.id)).toEqual(['t1', 't2', 't3']);
    expect(data.more).toBe(2);
  });

  it('uses the fallback name for a timer without a name', () => {
    const data = selectWidgetTimers([running('a', '  ', min(1))], NOW, 'Minuteur');
    expect(data.rows[0].label).toBe('Minuteur');
  });

  it('breaks ties on the same end time by creation order', () => {
    const data = selectWidgetTimers([running('b', 'B', min(3), 2), running('a', 'A', min(3), 1)], NOW, 'Timer');
    expect(data.rows.map((r) => r.id)).toEqual(['a', 'b']);
  });
});
