import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './task-handler';

/** Android: let the widget render headless, without the app being open. */
export function registerWidget(): void {
  registerWidgetTaskHandler(widgetTaskHandler);
}
