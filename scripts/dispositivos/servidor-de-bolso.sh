#!/data/data/com.termux/files/usr/bin/bash
# Servidor de bolso (docs/SERVIDORES_DE_BOLSO.md): deixa o Termux subindo sozinho no boot, com SSH
# só por chave e a tela podendo apagar. Por padrão só mostra o que faria; --apply faz.
set -euo pipefail
APPLY=0
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    *) echo "uso: servidor-de-bolso.sh [--apply]"; exit 2 ;;
  esac
done
command -v pkg >/dev/null 2>&1 || { echo "BLOCKED: rode dentro do Termux"; exit 1; }

BOOT_DIR="$HOME/.termux/boot"
BOOT="$BOOT_DIR/00-fenix-servidor"
SSHD_CONF="$PREFIX/etc/ssh/sshd_config"
CHAVES="$HOME/.ssh/authorized_keys"
passo() { if ((APPLY)); then echo "FAZENDO: $1"; else echo "FARIA: $1"; fi; }

passo "instalar termux-services e openssh"
((APPLY)) && pkg install -y termux-services openssh

passo "script de boot $BOOT (wake lock + serviços)"
if ((APPLY)); then
  mkdir -p "$BOOT_DIR"
  cat > "$BOOT" <<'EOF'
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock
. $PREFIX/etc/profile
EOF
  chmod 700 "$BOOT"
fi

# senha por SSH nunca: sem chave cadastrada, o sshd não liga
if [[ -s "$CHAVES" ]]; then
  passo "sshd só por chave (PasswordAuthentication no) e ligado no boot (porta 8022, só na rede de casa)"
  if ((APPLY)); then
    grep -q '^PasswordAuthentication no' "$SSHD_CONF" 2>/dev/null || echo 'PasswordAuthentication no' >> "$SSHD_CONF"
    sv-enable sshd || true
  fi
  SSH_STATE=key_only
else
  echo "PENDENTE: sem $CHAVES. No PC: ssh-keygen, depois copie a .pub para esse arquivo; o sshd fica desligado até lá."
  SSH_STATE=no_key_sshd_off
fi

cat <<'EOF'

O que só se faz pela tela (o script não alcança):
  1. Termux:Boot instalado da MESMA fonte do Termux (F-Droid com F-Droid), e aberto uma vez.
  2. Configurações → Apps → Termux → Bateria → Sem restrições.
  3. Configurações → Bateria → Proteção da bateria → Programação manual → Sempre (carga para em 80%).
  4. No PC: node scripts/dispositivos/frota-android.mjs optimize (tira o Termux da soneca e, no
     Android 12+, desliga o "phantom process killer" — com volta por `rollback`).
  5. Reinicie o aparelho e confira: ssh -p 8022 <ip-do-celular> a partir do PC.
EOF

if ((APPLY)); then
  mkdir -p "$HOME/fenix-workspace"
  cat > "$HOME/fenix-workspace/servidor-state.json" <<EOF
{
  "protocol": "fenix-servidor-de-bolso/1",
  "boot_script": "$( [[ -x "$BOOT" ]] && echo present || echo missing )",
  "ssh": "$SSH_STATE",
  "applied_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
  echo "servidor: READY ($HOME/fenix-workspace/servidor-state.json)"
fi
