import { t } from '../i18n';
import { parseAppData } from '../lib/storage';
import { selectWidgetTimers, type WidgetData } from '../lib/widget';
import { loadRaw } from '../platform/persist';

/** Read the saved timers (same store as the app) and pick what the widget shows. */
export function loadWidgetData(now = Date.now()): WidgetData {
  return selectWidgetTimers(parseAppData(loadRaw(), []).timers, now, t('defaultLabel'));
}
