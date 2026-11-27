import { getLocales } from 'expo-localization';

import { en } from './en';
import { fr, type Strings } from './fr';

export type StringKey = keyof Strings;

function pickLanguage(): 'fr' | 'en' {
  try {
    return getLocales()[0]?.languageCode === 'fr' ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}

export const language = pickLanguage();
const strings: Strings = language === 'fr' ? fr : en;

export function t(key: StringKey, params?: Record<string, string>): string {
  let s = strings[key];
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, v);
  return s;
}

/** Clock time of a timestamp, in the phone's language. */
export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', {
    hour: language === 'fr' ? '2-digit' : 'numeric',
    minute: '2-digit',
  });
}
