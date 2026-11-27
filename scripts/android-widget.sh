#!/usr/bin/env bash
# Home-screen widget check (CI only, after android-screenshots.sh left timers running).
# Usage: scripts/android-widget.sh <en|fr> <out-dir>
# Fails if the widget provider is not registered. Adding the widget to the launcher
# drives the Pixel launcher UI and is best effort: it never fails the job.
set -uo pipefail

LANG_CODE=$1
OUT=$2
PKG=com.pomwik.multitimer
# dumpsys prints the provider as pkg/.widget.Timers or pkg/pkg.widget.Timers.
PROVIDER="$PKG/($PKG)?\\.widget\\.Timers"
HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$OUT"

if ! adb shell dumpsys appwidget | grep -qE "$PROVIDER"; then
  echo "Widget provider $PKG .widget.Timers is not registered"
  adb shell dumpsys appwidget | head -40
  exit 1
fi
echo "Widget provider registered:"
adb shell dumpsys appwidget | grep -E -B1 -A3 "$PROVIDER" | head -20 || true

dump() {
  local i
  for i in 1 2 3; do
    adb shell rm -f /sdcard/ui.xml
    if adb shell uiautomator dump /sdcard/ui.xml 2>&1 | grep -q "dumped to" \
      && adb pull /sdcard/ui.xml "$OUT/ui.xml" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}
find_xy() { python3 "$HERE/ui_find.py" "$OUT/ui.xml" "$@" --clickable; }
tap() {
  local xy
  dump && xy=$(find_xy "$@") || { echo "not found: $*"; return 1; }
  echo "tap '$1' at $xy"
  # shellcheck disable=SC2086
  adb shell input tap $xy
}

# A placed widget appears in the "Widgets:" section with its id and provider.
bound() { adb shell dumpsys appwidget | sed -n '/^Widgets:/,/^Hosts:/p' | grep -qE "$PROVIDER"; }

add_widget() {
  adb shell input keyevent KEYCODE_HOME; sleep 2
  # Long press on an empty part of the home screen opens the launcher menu.
  adb shell input swipe 540 1100 540 1100 1500; sleep 2
  tap "Widgets" || return 1
  sleep 3
  tap "android.widget.EditText" --class || tap "Search" --prefix || return 1
  sleep 1
  adb shell input text "Minuteurs"; sleep 3
  adb shell input keyevent KEYCODE_BACK; sleep 1
  # The search result is the app's widget list; tap it to open the preview.
  tap "Minuteurs" --text || return 1
  sleep 2
  adb exec-out screencap -p > "$OUT/widget-picker.png"
  if dump && xy=$(find_xy "Add" --text || find_xy "Ajouter" --text); then
    # shellcheck disable=SC2086
    adb shell input tap $xy
  else
    # Older picker: drag the preview to the home screen.
    dump && xy=$(python3 "$HERE/ui_find.py" "$OUT/ui.xml" "Minuteurs" --desc --prefix --clickable) || return 1
    # shellcheck disable=SC2086
    set -- $xy
    adb shell input draganddrop "$1" "$2" 540 900 1500
  fi
  sleep 3
}

if bound; then
  echo "Widget already on the home screen"
else
  add_widget || echo "Could not add the widget to the launcher (best effort)"
fi
adb shell input keyevent KEYCODE_HOME
sleep 4
adb exec-out screencap -p > "$OUT/06-widget.png"
if bound; then
  echo "Widget is on the home screen"
  adb shell cmd uimode night yes >/dev/null || true
  sleep 4
  adb exec-out screencap -p > "$OUT/07-widget-dark.png"
  adb shell cmd uimode night no >/dev/null || true
else
  echo "Widget not added to the home screen (best effort, not a failure)"
fi
if adb logcat -d | grep -q "FATAL EXCEPTION"; then
  adb logcat -d | grep -A30 "FATAL EXCEPTION"; echo "App crashed"; exit 1
fi
rm -f "$OUT/ui.xml"
exit 0
