import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationPriority, AndroidNotificationVisibility } from 'expo-notifications';
import { Platform } from 'react-native';

import { t } from '../i18n';

export const CHANNEL_ID = 'timer-done';

let ready = false;

/** Foreground handler and Android channel. Safe to call several times. */
export async function setupNotifications(): Promise<void> {
  if (ready) return;
  ready = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: t('channelName'),
      importance: AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 500, 300, 500, 300, 500],
      enableVibrate: true,
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  }
}

/** Ask once, when the first timer starts. Returns true if notifications are allowed. */
export async function ensurePermission(): Promise<boolean> {
  await setupNotifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Schedule (or replace) the end notification of a timer at its exact end time. */
export async function scheduleEnd(id: string, label: string, endAt: number): Promise<void> {
  await cancelEnd(id);
  if (endAt <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: label || t('defaultLabel'),
      body: t('notifBody'),
      sound: 'default',
      priority: AndroidNotificationPriority.MAX,
      data: { timerId: id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: endAt,
      channelId: CHANNEL_ID,
      // AlarmManager.setAlarmClock(): exact, and not deferred by battery savers.
      delivery: 'alarmClock',
    },
  });
}

export async function cancelEnd(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Not scheduled: nothing to cancel.
  }
}
