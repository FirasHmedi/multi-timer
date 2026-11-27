import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { IconButton } from '../components/IconButton';
import { t, type StringKey } from '../i18n';
import { formatShort, hmsToMs, msToHms } from '../lib/timer';
import { useTimers } from '../state/TimersContext';
import { usePalette } from '../theme';

const QUICK_MIN = [1, 3, 5, 10, 15, 20, 30, 45, 60];

function Field({
  value,
  max,
  unit,
  onChange,
}: {
  value: number;
  max: number;
  unit: StringKey;
  onChange: (n: number) => void;
}) {
  const c = usePalette();
  const step = (d: number) => onChange((value + d + max + 1) % (max + 1));
  return (
    <View style={styles.field}>
      <IconButton icon="keyboard-arrow-up" label={`${t('increase')} ${t(unit)}`} onPress={() => step(1)} />
      <View style={styles.fieldRow}>
        <TextInput
          value={String(value).padStart(2, '0')}
          onChangeText={(s) => {
            const n = parseInt(s.replace(/\D/g, '').slice(-2), 10);
            onChange(Number.isFinite(n) ? Math.min(n, max) : 0);
          }}
          keyboardType="number-pad"
          selectTextOnFocus
          maxLength={3}
          accessibilityLabel={t(unit)}
          style={[styles.fieldInput, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
        />
        <Text style={[styles.unit, { color: c.muted }]}>{t(unit)}</Text>
      </View>
      <IconButton icon="keyboard-arrow-down" label={`${t('decrease')} ${t(unit)}`} onPress={() => step(-1)} />
    </View>
  );
}

export default function NewTimer() {
  const c = usePalette();
  const api = useTimers();
  const [label, setLabel] = useState('');
  const [h, setH] = useState(0);
  const [m, setM] = useState(5);
  const [s, setS] = useState(0);
  const [savePreset, setSavePreset] = useState(false);
  const [error, setError] = useState(false);
  const total = hmsToMs(h, m, s);

  const setTotal = (ms: number) => {
    const v = msToHms(ms);
    setH(v.h);
    setM(v.m);
    setS(v.s);
    setError(false);
  };

  const submit = () => {
    if (total <= 0) {
      setError(true);
      return;
    }
    api.addTimer(label, total, { start: true, saveAsPreset: savePreset });
    router.back();
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.section, { color: c.muted }]}>{t('label')}</Text>
      <TextInput
        value={label}
        onChangeText={setLabel}
        placeholder={t('labelPlaceholder')}
        placeholderTextColor={c.muted}
        maxLength={40}
        returnKeyType="done"
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
      />

      <Text style={[styles.section, { color: c.muted }]}>{t('quick')}</Text>
      <View style={styles.quick}>
        {QUICK_MIN.map((n) => {
          const ms = n * 60_000;
          const active = ms === total;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setTotal(ms)}
              style={[
                styles.quickBtn,
                { backgroundColor: active ? c.accent : c.card, borderColor: active ? c.accent : c.border },
              ]}
            >
              <Text style={{ color: active ? c.accentText : c.text, fontSize: 15, fontWeight: '600' }}>
                {formatShort(ms)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.section, { color: c.muted }]}>{t('duration')}</Text>
      <View style={styles.picker}>
        <Field value={h} max={99} unit="hours" onChange={(n) => (setH(n), setError(false))} />
        <Field value={m} max={59} unit="minutes" onChange={(n) => (setM(n), setError(false))} />
        <Field value={s} max={59} unit="seconds" onChange={(n) => (setS(n), setError(false))} />
      </View>
      {error ? <Text style={[styles.error, { color: c.done }]}>{t('durationRequired')}</Text> : null}

      <View style={[styles.row, { borderColor: c.border }]}>
        <Text style={[styles.rowText, { color: c.text }]}>{t('savePreset')}</Text>
        <Switch
          accessibilityLabel={t('savePreset')}
          value={savePreset}
          onValueChange={setSavePreset}
          trackColor={{ true: c.accent, false: c.track }}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={submit}
        style={({ pressed }) => [styles.submit, { backgroundColor: c.accent, opacity: pressed ? 0.8 : 1 }]}
      >
        <Text style={[styles.submitText, { color: c.accentText }]}>
          {t('start')} · {formatShort(total)}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 10, paddingBottom: 40 },
  section: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17 },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  picker: { flexDirection: 'row', justifyContent: 'space-around' },
  field: { alignItems: 'center', gap: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 12,
    width: 72,
    textAlign: 'center',
    fontSize: 30,
    paddingVertical: 6,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontSize: 15, width: 28 },
  error: { fontSize: 14, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, fontSize: 16 },
  submit: { marginTop: 12, borderRadius: 28, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 18, fontWeight: '700' },
});
