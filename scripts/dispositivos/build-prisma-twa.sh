#!/usr/bin/env bash
# Gera o APK do Prisma (TWA, M29 do hub) sem GitHub Actions: no PC do dono (Linux ou WSL) ou em
# qualquer Linux x86_64 com internet.
#
#   bash scripts/dispositivos/build-prisma-twa.sh
#       APK de teste, assinado com a chave de debug (instala por `adb install`)
#   PRISMA_KEYSTORE=~/chaves/prisma.jks bash scripts/dispositivos/build-prisma-twa.sh --release
#       APK de produção, assinado com a chave do dono. A senha é pedida na hora pelo apksigner:
#       não fica em variável, arquivo nem log.
#
# docs/PRISMA_APP.md.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ANDROID_DIR="$ROOT/android/prisma"
MODO=debug
[[ "${1:-}" == "--release" ]] && MODO=release
source "$ROOT/scripts/dispositivos/android-ambiente.sh"

node --test "$ROOT/scripts/dispositivos/prisma-twa.test.mjs"
cd "$ANDROID_DIR"

if [[ "$MODO" == release ]]; then
  [[ -n "${PRISMA_KEYSTORE:-}" && -f "$PRISMA_KEYSTORE" ]] || fail "defina PRISMA_KEYSTORE com o caminho da chave do Prisma (docs/PRISMA_APP.md)"
  gradle --no-daemon --stacktrace :app:assembleRelease
  CRU="app/build/outputs/apk/release/app-release-unsigned.apk"
  APK="app/build/outputs/apk/release/prisma-$(date -u +%Y%m%d).apk"
  "$ANDROID_HOME/build-tools/$BUILD_TOOLS/zipalign" -f -P 16 4 "$CRU" "$APK.alinhado"
  "$ANDROID_HOME/build-tools/$BUILD_TOOLS/apksigner" sign --ks "$PRISMA_KEYSTORE" --ks-key-alias "${PRISMA_KEY_ALIAS:-prisma}" --out "$APK" "$APK.alinhado"
  rm -f "$APK.alinhado"
else
  gradle --no-daemon --stacktrace :app:assembleDebug
  APK="app/build/outputs/apk/debug/app-debug.apk"
fi

[[ -s "$APK" ]] || fail "APK não produzido"
"$ANDROID_HOME/build-tools/$BUILD_TOOLS/apksigner" verify --verbose --print-certs "$APK" | tee "$APK.certificado.txt"
"$ANDROID_HOME/build-tools/$BUILD_TOOLS/zipalign" -c -P 16 -v 4 "$APK" >/dev/null
"$ANDROID_HOME/build-tools/$BUILD_TOOLS/aapt" dump badging "$APK" | tee "$APK.badging.txt"
sha256sum "$APK" | tee "$APK.sha256"

# a impressão digital no formato do assetlinks.json: maiúsculas, de dois em dois, com dois-pontos
DIGITAL="$(grep -m1 'certificate SHA-256 digest' "$APK.certificado.txt" | awk '{print $NF}' | tr 'a-f' 'A-F' | sed 's/../&:/g; s/:$//')"
echo
echo "Impressão digital do certificado (vai em hub/app/web/worker/assetlinks.js):"
echo "  $DIGITAL"
echo "PRISMA_BUILD_OK: $ANDROID_DIR/$APK"
