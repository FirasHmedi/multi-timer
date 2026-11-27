import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert, AppState, Platform, Vibration } from 'react-native';

import { t } from '../i18n';
import { newId, parseAppData, type AppData, type Preset, type Settings } from '../lib/storage';
import * as T from '../lib/timer';
import { loadRaw, saveRaw } from '../platform/persist';
import { cancelEnd, ensurePermission, scheduleEnd, setupNotifications } from '../platform/notify';

/** A timer that ended more than this long ago is shown as done without a new alert. */
const ALERT_WINDOW_MS = 5_000;
const KEEP_AWAKE_TAG = 'multi-timer';

function defaultPresets(): Preset[] {
  const m = (n: number) => n * 60_000;
  return [
    { id: 'default-1', label: t('presetPasta'), durationMs: m(9) },
    { id: 'default-2', label: t('presetEggs'), durationMs: m(10) },
    { id: 'default-3', label: t('presetTea'), durationMs: m(4) },
    { id: 'default-4', label: t('presetBreak'), durationMs: m(5) },
  ];
}

function loadInitial(): AppData {
  const data = parseAppData(loadRaw(), defaultPresets());
  // Timers that ended while the app was closed: their notification already fired.
  return { ...data, timers: T.settle(data.timers, Date.now()).timers };
}

interface TimersApi {
  now: number;
  timers: T.Timer[];
  presets: Preset[];
  settings: Settings;
  addTimer: (label: string, durationMs: number, opts: { start: boolean; saveAsPreset: boolean }) => void;
  startPreset: (preset: Preset) => void;
  deletePreset: (id: string) => void;
  start: (id: string) => void;
  pause: (id: string) => void;
  addMinute: (id: string) => void;
  reset: (id: string) => void;
  remove: (id: string) => void;
  setKeepAwake: (on: boolean) => void;
}

const Ctx = createContext<TimersApi | null>(null);

export function useTimers(): TimersApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTimers outside TimersProvider');
  return v;
}

function alertEnded(ended: T.Timer[]) {
  Vibration.vibrate([0, 500, 300, 500, 300, 500]);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  const labels = ended.map((x) => x.label || t('defaultLabel')).join('\n');
  if (Platform.OS === 'web') return;
  Alert.alert(ended.length > 1 ? t('timersDone') : t('timerDone'), labels, [
    { text: t('ok'), onPress: () => Vibration.cancel() },
  ]);
}

export function TimersProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadInitial);
  const [now, setNow] = useState(() => Date.now());
  const permissionAsked = useRef(false);

  // Latest data, so that side effects (notifications, alerts) run outside state updaters.
  const dataRef = useRef(data);
  const commit = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  // Persist every change.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    saveRaw(JSON.stringify(data));
  }, [data]);

  // Notification channel, then make sure every running timer has its notification
  // (cheap, and repairs anything lost, e.g. after an app update).
  useEffect(() => {
    setupNotifications()
      .then(() => {
        for (const x of data.timers) if (x.status === 'running' && x.endAt) scheduleEnd(x.id, x.label, x.endAt);
      })
      .catch(() => {});
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const anyRunning = data.timers.some((x) => x.status === 'running');

  // Clock: re-render twice a second while something runs, and mark ended timers.
  useEffect(() => {
    const tick = () => {
      const n = Date.now();
      setNow(n);
      const d = dataRef.current;
      const { timers, ended } = T.settle(d.timers, n);
      if (!ended.length) return;
      commit({ ...d, timers });
      const fresh = ended.filter((x) => x.endAt !== null && n - x.endAt < ALERT_WINDOW_MS);
      if (fresh.length && AppState.currentState === 'active') alertEnded(fresh);
    };
    tick();
    if (!anyRunning) return;
    const id = setInterval(tick, 500);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [anyRunning, commit]);

  // Keep the screen on while a timer runs, if the user asked for it.
  const keepAwake = data.settings.keepAwake && anyRunning;
  useEffect(() => {
    if (!keepAwake) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [keepAwake]);

  const askPermissionOnce = useCallback(() => {
    if (permissionAsked.current) return;
    permissionAsked.current = true;
    ensurePermission()
      .then((ok) => {
        if (!ok && Platform.OS !== 'web') Alert.alert(t('appName'), t('permissionDenied'));
      })
      .catch(() => {});
  }, []);

  /** Apply a change to one timer and keep its notification in sync. */
  const update = useCallback(
    (id: string, fn: (x: T.Timer, n: number) => T.Timer) => {
      const n = Date.now();
      setNow(n);
      const d = dataRef.current;
      const x = d.timers.find((y) => y.id === id);
      if (!x) return;
      const next = fn(x, n);
      commit({ ...d, timers: d.timers.map((y) => (y.id === id ? next : y)) });
      if (next.status === 'running' && next.endAt !== null) {
        if (x.status !== 'running') askPermissionOnce();
        scheduleEnd(next.id, next.label, next.endAt).catch(() => {});
      } else if (x.status === 'running') {
        cancelEnd(id).catch(() => {});
      }
    },
    [askPermissionOnce, commit],
  );

  const addTimer = useCallback<TimersApi['addTimer']>(
    (label, durationMs, opts) => {
      const n = Date.now();
      const name = label.trim() || t('defaultLabel');
      let timer = T.createTimer(newId(), name, durationMs, n);
      if (opts.start) {
        timer = T.start(timer, n);
        askPermissionOnce();
        if (timer.endAt !== null) scheduleEnd(timer.id, timer.label, timer.endAt).catch(() => {});
      }
      setNow(n);
      const d = dataRef.current;
      commit({
        ...d,
        timers: [...d.timers, timer],
        presets: opts.saveAsPreset ? [...d.presets, { id: newId(), label: name, durationMs: timer.durationMs }] : d.presets,
      });
    },
    [askPermissionOnce, commit],
  );

  const api = useMemo<TimersApi>(
    () => ({
      now,
      timers: data.timers,
      presets: data.presets,
      settings: data.settings,
      addTimer,
      startPreset: (p) => addTimer(p.label, p.durationMs, { start: true, saveAsPreset: false }),
      deletePreset: (id) => {
        const d = dataRef.current;
        commit({ ...d, presets: d.presets.filter((p) => p.id !== id) });
      },
      start: (id) => update(id, T.start),
      pause: (id) => update(id, T.pause),
      addMinute: (id) => update(id, T.addMinute),
      reset: (id) => update(id, (x) => T.reset(x)),
      remove: (id) => {
        cancelEnd(id).catch(() => {});
        const d = dataRef.current;
        commit({ ...d, timers: d.timers.filter((x) => x.id !== id) });
      },
      setKeepAwake: (on) => {
        const d = dataRef.current;
        commit({ ...d, settings: { ...d.settings, keepAwake: on } });
      },
    }),
    [now, data, addTimer, update, commit],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
