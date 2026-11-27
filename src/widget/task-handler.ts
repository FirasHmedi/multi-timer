import type { WidgetTaskHandler } from 'react-native-android-widget';

import { loadWidgetData } from './data';
import { TimersWidget } from './TimersWidget';

/** Runs headless when the widget is added, resized or on its periodic update. */
export const widgetTaskHandler: WidgetTaskHandler = async ({ widgetAction, renderWidget }) => {
  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      renderWidget(TimersWidget({ data: loadWidgetData() }));
      break;
    default:
      break;
  }
};
