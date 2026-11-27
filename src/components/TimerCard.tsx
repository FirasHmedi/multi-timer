import { StyleSheet, Text, View } from 'react-native';

import { formatClock, t } from '../i18n';
import { formatDuration, progress, remainingMs, type Timer } from '../lib/timer';
import { useTimers } from '../state/TimersContext';
import { usePalette } from '../theme';
import { IconButton } from './IconButton';

export function TimerCard({ timer, now }: { timer: Timer; now: number }) {
  const c = usePalette();
  const api = useTimers();
  const left = remainingMs(timer, now);
  const done = timer.status === 'done';
  const running = timer.status === 'running';

  const status = running && timer.endAt ? t('endsAt', { time: formatClock(timer.endAt) }) : t(timer.status);

  return (
    <View
      style={[styles.card, { backgroundColor: done ? c.doneBg : c.card, borderColor: done ? c.done : c.border }]}
      accessibilityLabel={`${timer.label}, ${formatDuration(left)}, ${t(timer.status)}`}
    >
      <View style={styles.top}>
        <Text style={[styles.label, { color: c.text }]} numberOfLines={1}>
          {timer.label}
        </Text>
        <Text style={[styles.status, { color: done ? c.done : c.muted }]} numberOfLines={1}>
          {status}
        </Text>
        <IconButton icon="delete-outline" label={t('delete')} onPress={() => api.remove(timer.id)} small />
      </View>
      <Text
        style={[styles.time, { color: done ? c.done : timer.status === 'running' ? c.text : c.muted }]}
        accessibilityRole="timer"
      >
        {formatDuration(left)}
      </Text>
      <View style={[styles.track, { backgroundColor: c.track }]}>
        <View
          style={[styles.fill, { backgroundColor: done ? c.done : c.accent, width: `${progress(timer, now) * 100}%` }]}
        />
      </View>
      <View style={styles.actions}>
        {running ? (
          <IconButton icon="pause" label={t('pause')} onPress={() => api.pause(timer.id)} primary showLabel />
        ) : (
          <IconButton
            icon={done ? 'replay' : 'play-arrow'}
            label={done ? t('restart') : timer.status === 'paused' ? t('resume') : t('start')}
            onPress={() => api.start(timer.id)}
            primary
            showLabel
          />
        )}
        <IconButton icon="more-time" label={t('addMinute')} onPress={() => api.addMinute(timer.id)} showLabel />
        <View style={styles.spacer} />
        <IconButton icon="restart-alt" label={t('reset')} onPress={() => api.reset(timer.id)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1, fontSize: 17, fontWeight: '600' },
  status: { fontSize: 13, flexShrink: 0 },
  time: { fontSize: 44, fontWeight: '300', fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  spacer: { flex: 1 },
});
