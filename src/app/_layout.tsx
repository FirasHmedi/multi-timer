import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { t } from '../i18n';
import { TimersProvider } from '../state/TimersContext';
import { usePalette } from '../theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = usePalette();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, background: c.bg, card: c.bg, text: c.text, border: c.border, primary: c.accent },
  };
  return (
    <ThemeProvider value={theme}>
      <TimersProvider>
        <Stack screenOptions={{ headerShadowVisible: false }}>
          <Stack.Screen name="index" options={{ title: t('appName') }} />
          <Stack.Screen name="new" options={{ title: t('newTimer'), presentation: 'modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </TimersProvider>
    </ThemeProvider>
  );
}
