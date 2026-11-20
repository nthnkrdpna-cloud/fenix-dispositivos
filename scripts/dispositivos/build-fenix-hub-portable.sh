#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ANDROID_DIR="$ROOT/android/fenix-hub"
source "$ROOT/scripts/dispositivos/android-ambiente.sh"

node "$ROOT/scripts/dispositivos/fenix-hub-android.test.mjs"
node "$ROOT/scripts/dispositivos/fenix-hub-build-state.mjs" "$ANDROID_DIR/app/build/outputs/apk/debug/FENIX_NEURALESE.json"
cd "$ANDROID_DIR"
gradle --no-daemon --stacktrace :app:assembleDebug

APK="app/build/outputs/apk/debug/app-debug.apk"
[[ -s "$APK" ]] || fail "APK não produzido"

"$ANDROID_HOME/build-tools/$BUILD_TOOLS/apksigner" verify --verbose "$APK"
"$ANDROID_HOME/build-tools/$BUILD_TOOLS/zipalign" -c -P 16 -v 4 "$APK"
"$ANDROID_HOME/build-tools/$BUILD_TOOLS/aapt" dump badging "$APK" | tee "app/build/outputs/apk/debug/APK_BADGING.txt"
sha256sum "$APK" | tee "app/build/outputs/apk/debug/SHA256SUMS.txt"

echo "FENIX_BUILD_OK: $ANDROID_DIR/$APK"
