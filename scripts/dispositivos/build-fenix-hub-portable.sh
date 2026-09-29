#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ANDROID_DIR="$ROOT/android/fenix-hub"
CACHE_DIR="${FENIX_BUILD_CACHE:-$ROOT/.fenix-build-cache}"
GRADLE_VERSION="${FENIX_GRADLE_VERSION:-9.4.1}"
ANDROID_API="${FENIX_ANDROID_API:-36}"
BUILD_TOOLS="${FENIX_BUILD_TOOLS:-36.0.0}"
JAVA_VERSION="${FENIX_JAVA_VERSION:-17}"

fail() { echo "FENIX_BUILD_ERROR: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "ferramenta ausente: $1"; }

need curl
need tar
need unzip

mkdir -p "$CACHE_DIR"

# This script is provider-neutral. It never reads application secrets.
# A provider only needs an Ubuntu-like x86_64 environment with outbound HTTPS.
if [[ "$(uname -s)" != "Linux" || "$(uname -m)" != "x86_64" ]]; then
  fail "ambiente não suportado: esperado Linux x86_64"
fi

if ! command -v java >/dev/null 2>&1 || ! java -version 2>&1 | grep -q '"17\.'; then
  JDK_TARBALL="$CACHE_DIR/temurin-jdk17.tar.gz"
  JDK_DIR="$CACHE_DIR/jdk17"
  if [[ ! -x "$JDK_DIR/bin/java" ]]; then
    mkdir -p "$JDK_DIR"
    JDK_URL="${FENIX_JDK_URL:-https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse}"
    curl -fL --retry 3 --retry-all-errors "$JDK_URL" -o "$JDK_TARBALL"
    rm -rf "$CACHE_DIR/jdk17.extract"
    mkdir -p "$CACHE_DIR/jdk17.extract"
    tar -xzf "$JDK_TARBALL" -C "$CACHE_DIR/jdk17.extract"
    FOUND_JDK="$(find "$CACHE_DIR/jdk17.extract" -maxdepth 2 -type f -name java -path '*/bin/java' | head -n1)"
    [[ -n "$FOUND_JDK" ]] || fail "JDK 17 não encontrado após extração"
    FOUND_ROOT="$(dirname "$(dirname "$FOUND_JDK")")"
    rm -rf "$JDK_DIR"
    mv "$FOUND_ROOT" "$JDK_DIR"
  fi
  export JAVA_HOME="$JDK_DIR"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

GRADLE_HOME="$CACHE_DIR/gradle-$GRADLE_VERSION"
if [[ ! -x "$GRADLE_HOME/bin/gradle" ]]; then
  GRADLE_ZIP="$CACHE_DIR/gradle-$GRADLE_VERSION-bin.zip"
  GRADLE_URL="${FENIX_GRADLE_URL:-https://services.gradle.org/distributions/gradle-$GRADLE_VERSION-bin.zip}"
  curl -fL --retry 3 --retry-all-errors "$GRADLE_URL" -o "$GRADLE_ZIP"
  rm -rf "$CACHE_DIR/gradle.extract"
  mkdir -p "$CACHE_DIR/gradle.extract"
  unzip -q "$GRADLE_ZIP" -d "$CACHE_DIR/gradle.extract"
  mv "$CACHE_DIR/gradle.extract/gradle-$GRADLE_VERSION" "$GRADLE_HOME"
fi
export PATH="$GRADLE_HOME/bin:$PATH"

SDK_ROOT="$CACHE_DIR/android-sdk"
CMDLINE_DIR="$SDK_ROOT/cmdline-tools/latest"
if [[ ! -x "$CMDLINE_DIR/bin/sdkmanager" ]]; then
  SDK_ZIP="$CACHE_DIR/commandlinetools.zip"
  SDK_URL="${FENIX_ANDROID_CMDLINE_URL:-https://dl.google.com/android/repository/commandlinetools-linux-15859902_latest.zip}"
  SDK_SHA256="${FENIX_ANDROID_CMDLINE_SHA256:-4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583}"
  curl -fL --retry 3 --retry-all-errors "$SDK_URL" -o "$SDK_ZIP"
  echo "$SDK_SHA256  $SDK_ZIP" | sha256sum -c -
  rm -rf "$SDK_ROOT/cmdline-tools"
  mkdir -p "$SDK_ROOT/cmdline-tools"
  unzip -q "$SDK_ZIP" -d "$SDK_ROOT/cmdline-tools"
  mv "$SDK_ROOT/cmdline-tools/cmdline-tools" "$CMDLINE_DIR"
fi
export ANDROID_HOME="$SDK_ROOT"
export ANDROID_SDK_ROOT="$SDK_ROOT"
export PATH="$CMDLINE_DIR/bin:$ANDROID_HOME/platform-tools:$PATH"

yes | sdkmanager --licenses >/dev/null || true
sdkmanager "platforms;android-$ANDROID_API" "build-tools;$BUILD_TOOLS"

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
