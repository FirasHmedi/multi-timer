#!/usr/bin/env bash
# Emulator screenshots for one language (CI only, needs a running emulator).
# Usage: scripts/android-screenshots.sh <en|fr> <apk> <out-dir>
# Tap targets are found with `uiautomator dump`, never with fixed coordinates.
set -euo pipefail

LANG_CODE=$1
APK=$2
OUT=$3
PKG=com.pomwik.multitimer
HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$OUT"

if [ "$LANG_CODE" = fr ]; then
  LOCALE=fr-FR; TITLE="Minuteurs"; PASTA="Pâtes"; CUSTOM="Lessive"
  START="Démarrer"; NEW="Nouveau minuteur"
else
  LOCALE=en-US; TITLE="Multi Timer"; PASTA="Pasta"; CUSTOM="Laundry"
  START="Start"; NEW="New timer"
fi

# uiautomator waits for an idle UI; retry a few times.
dump() {
  local i
  for i in 1 2 3 4 5; do
    adb shell rm -f /sdcard/ui.xml
    if adb shell uiautomator dump /sdcard/ui.xml 2>&1 | grep -q "dumped to" \
      && adb pull /sdcard/ui.xml "$OUT/ui.xml" >/dev/null 2>&1; then
      return 0
    fi
    echo "uiautomator dump failed (try $i)"; sleep 1
  done
  return 1
}

has() { dump; python3 "$HERE/ui_find.py" "$OUT/ui.xml" "$@" >/dev/null; }

# tap <value> [ui_find flags]: tap the clickable element that holds this text or label.
tap() {
  local xy
  dump
  if ! xy=$(python3 "$HERE/ui_find.py" "$OUT/ui.xml" "$@" --clickable); then
    echo "Element not found: $*"; cp "$OUT/ui.xml" "$OUT/not-found-$(date +%s).xml"; return 1
  fi
  echo "tap '$1' at $xy"
  # shellcheck disable=SC2086
  adb shell input tap $xy
}

shot() {
  sleep "${2:-3}"
  adb exec-out screencap -p > "$OUT/$1.png"
  echo "screenshot $OUT/$1.png"
}

hide_keyboard() {
  if adb shell dumpsys input_method | grep -q "mInputShown=true"; then
    adb shell input keyevent KEYCODE_BACK
    sleep 1
  fi
}

# Pending end-of-timer alarms of the app (expo-notifications uses AlarmManager.setAlarmClock).
alarms() { adb shell dumpsys alarm | grep -c "$PKG" || true; }

# System language. `cmd locale` exists on recent images; fall back to the setting.
adb shell cmd locale set-system-locales "$LOCALE" 2>/dev/null \
  || adb shell settings put system system_locales "$LOCALE"
echo "system_locales: $(adb shell settings get system system_locales || true)"

adb install -r "$APK" >/dev/null
adb shell pm clear "$PKG" >/dev/null
adb shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS || true
adb shell cmd uimode night no >/dev/null || true
adb logcat -c
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 12

# uiautomator cannot dump while a countdown ticks (the UI is never idle), so every
# tap target is read while no timer runs. The preset chips do not move afterwards.
if ! has "$TITLE"; then
  echo "The app does not show '$TITLE': language $LANG_CODE not applied"
  cp "$OUT/ui.xml" "$OUT/home.xml"; exit 1
fi
PRESET_XY=$(python3 "$HERE/ui_find.py" "$OUT/ui.xml" "$PASTA" --text --clickable)
echo "preset '$PASTA' chip at $PRESET_XY"
shot 01-home 1

# New timer: typed name, quick duration, start.
tap "$NEW" --desc
sleep 3
tap "android.widget.EditText" --class
sleep 1
adb shell input text "$CUSTOM"
hide_keyboard
tap "45 min" --text
shot 02-new-timer 2
dump
START_XY=$(python3 "$HERE/ui_find.py" "$OUT/ui.xml" "$START" --prefix --text --clickable)
before=$(alarms)
echo "tap '$START' at $START_XY"
# shellcheck disable=SC2086
adb shell input tap $START_XY
sleep 3

# Tap the first preset chip: a second timer must start.
after_new=$(alarms)
echo "tap '$PASTA' at $PRESET_XY"
# shellcheck disable=SC2086
adb shell input tap $PRESET_XY
shot 03-timers 3
after_preset=$(alarms)
echo "alarms: before=$before after-new=$after_new after-preset=$after_preset"
if [ "$after_new" -le "$before" ] || [ "$after_preset" -le "$after_new" ]; then
  echo "A timer did not start (no new end alarm)"
  adb shell dumpsys alarm | grep -B2 -A6 "$PKG" | head -60
  exit 1
fi

# Same list in the dark theme.
adb shell cmd uimode night yes >/dev/null || true
shot 04-timers-dark 5
adb shell cmd uimode night no >/dev/null || true

if adb logcat -d | grep -q "FATAL EXCEPTION"; then
  adb logcat -d | grep -A30 "FATAL EXCEPTION"; echo "App crashed"; exit 1
fi
rm -f "$OUT/ui.xml"
