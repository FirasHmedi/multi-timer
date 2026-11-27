import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TimerCard } from '../components/TimerCard';
import { t } from '../i18n';
import type { Preset } from '../lib/storage';
import { formatShort, sortTimers } from '../lib/timer';
import { useTimers } from '../state/TimersContext';
import { usePalette } from '../theme';

export default function Home() {
  const c = usePalette();
  const api = useTimers();
  const insets = useSafeAreaInsets();
  const sorted = useMemo(() => sortTimers(api.timers, api.now), [api.timers, api.now]);

  const confirmDeletePreset = (p: Preset) => {
    if (Platform.OS === 'web') return;
    Alert.alert(t('deletePresetTitle'), `${p.label} · ${formatShort(p.durationMs)}`, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => api.deletePreset(p.id) },
    ]);
  };

  const header = (
    <View style={styles.header}>
      {api.presets.length > 0 ? (
        <>
          <Text style={[styles.section, { color: c.muted }]}>{t('presets')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chips}
          >
            {api.presets.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityHint={t('presetsHint')}
                onPress={() => api.startPreset(p)}
                onLongPress={() => confirmDeletePreset(p)}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <MaterialIcons name="play-arrow" size={18} color={c.accent} />
                <Text style={[styles.chipText, { color: c.text }]}>{p.label}</Text>
                <Text style={[styles.chipSub, { color: c.muted }]}>{formatShort(p.durationMs)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}
      {sorted.length > 0 ? <Text style={[styles.section, { color: c.muted }]}>{t('timers')}</Text> : null}
    </View>
  );

  const footer = (
    <View style={[styles.awake, { borderColor: c.border }]}>
      <View style={styles.awakeText}>
        <Text style={[styles.awakeTitle, { color: c.text }]}>{t('keepAwake')}</Text>
        <Text style={{ color: c.muted, fontSize: 13 }}>{t('keepAwakeHint')}</Text>
      </View>
      <Switch
        accessibilityLabel={t('keepAwake')}
        value={api.settings.keepAwake}
        onValueChange={api.setKeepAwake}
        trackColor={{ true: c.accent, false: c.track }}
      />
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: c.bg }]}>
      <FlatList
        data={sorted}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => <TimerCard timer={item} now={api.now} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="timer" size={40} color={c.muted} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>{t('emptyTitle')}</Text>
            <Text style={[styles.emptyBody, { color: c.muted }]}>{t('emptyBody')}</Text>
          </View>
        }
        contentContainerStyle={[styles.list, { paddingBottom: 96 + insets.bottom }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('newTimer')}
        onPress={() => router.push('/new')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: c.accent, bottom: 20 + insets.bottom, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <MaterialIcons name="add" size={30} color={c.accentText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16 },
  header: { gap: 8, marginBottom: 8 },
  section: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4 },
  // Scroll edge to edge: the chips are not cut 16 dp before the screen edge.
  chipsScroll: { marginHorizontal: -16 },
  chips: { gap: 8, paddingHorizontal: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 12,
    minHeight: 44,
  },
  chipText: { fontSize: 15, fontWeight: '600' },
  chipSub: { fontSize: 14 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyBody: { fontSize: 15, textAlign: 'center' },
  awake: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  awakeText: { flex: 1 },
  awakeTitle: { fontSize: 16, fontWeight: '500' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});
