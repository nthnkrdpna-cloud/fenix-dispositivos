#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
WORKSPACE="${FENIX_WORKSPACE:-$HOME/fenix-workspace}"
APPLY=0
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    --workspace=*) WORKSPACE="${arg#*=}" ;;
    *) echo "uso: termux-bootstrap.sh [--apply] [--workspace=PATH]"; exit 2 ;;
  esac
done
command -v pkg >/dev/null 2>&1 || { echo "BLOCKED: Termux/pkg não encontrado"; exit 1; }
mkdir -p "$WORKSPACE"/{hub,continuum/envelopes,continuum/blobs,continuum/evidence,toolchains,cache,recovery,evidencias}
required=(git node python openssh curl)
missing=()
for cmd in "${required[@]}"; do command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd"); done
if ((${#missing[@]})); then
  echo "MISSING_PACKAGES: ${missing[*]}"
  if ((APPLY)); then pkg update -y && pkg install -y "${missing[@]}"; else exit 3; fi
fi
if command -v adb >/dev/null 2>&1; then ADB_STATE=available; else ADB_STATE=missing; if ((APPLY)); then pkg install -y android-tools && ADB_STATE=available; fi; fi
if command -v proot-distro >/dev/null 2>&1; then PROOT_STATE=available; else PROOT_STATE=missing; if ((APPLY)); then pkg install -y proot-distro && PROOT_STATE=available; fi; fi
cat > "$WORKSPACE/bootstrap-state.json" <<EOF
{
  "protocol": "fenix-termux-bootstrap/1",
  "workspace": "$WORKSPACE",
  "git": "$(command -v git || true)",
  "node": "$(node --version 2>/dev/null || true)",
  "python": "$(python --version 2>&1 || true)",
  "adb": "$ADB_STATE",
  "proot_distro": "$PROOT_STATE",
  "apply": $APPLY
}
EOF
chmod 600 "$WORKSPACE/bootstrap-state.json"
echo "workspace: READY"
echo "adb: $ADB_STATE"
echo "proot-distro: $PROOT_STATE"
