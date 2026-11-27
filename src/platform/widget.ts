import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import type { Timer } from '../lib/timer';
import { selectWidgetTimers } from '../lib/widget';
import { t } from '../i18n';
import { TimersWidget, WIDGET_NAME } from '../widget/TimersWidget';

/** Redraw the home-screen widgets (if any) after the timers changed. */
export function updateWidget(timers: Timer[]): void {
  if (Platform.OS !== 'android') return;
  const data = selectWidgetTimers(timers, Date.now(), t('defaultLabel'));
  requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => TimersWidget({ data }) }).catch(() => {});
}
