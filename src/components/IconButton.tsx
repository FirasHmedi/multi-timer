import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { usePalette } from '../theme';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

export function IconButton({
  icon,
  label,
  onPress,
  primary,
  showLabel,
  small,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
  showLabel?: boolean;
  small?: boolean;
}) {
  const c = usePalette();
  const fg = primary ? c.accentText : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: primary ? c.accent : small ? 'transparent' : c.chip, opacity: pressed ? 0.7 : 1 },
        showLabel && styles.wide,
        small && styles.small,
      ]}
    >
      <MaterialIcons name={icon} size={22} color={small ? c.muted : fg} />
      {showLabel ? <Text style={[styles.label, { color: fg }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  small: { minWidth: 36, height: 36, paddingHorizontal: 0, marginVertical: -6, marginRight: -6 },
  wide: { paddingHorizontal: 14, gap: 4 },
  label: { fontSize: 15, fontWeight: '600' },
});
