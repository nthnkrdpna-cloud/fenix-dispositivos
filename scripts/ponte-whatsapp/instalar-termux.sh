#!/data/data/com.termux/files/usr/bin/bash
# A ponte do WhatsApp Web como serviço do Termux (docs/PONTE_WHATSAPP.md). Por padrão só mostra o que
# faria; --apply faz; --remover --apply desfaz. Desfazer tira o serviço e só: a sessão do WhatsApp e a
# conta da ponte (~/.fenix) ficam, porque apagá-las é decisão do dono — o painel desconecta o número.
set -euo pipefail
APPLY=0
REMOVER=0
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    --remover) REMOVER=1 ;;
    *) echo "uso: instalar-termux.sh [--apply] [--remover]"; exit 2 ;;
  esac
done
command -v pkg >/dev/null 2>&1 || { echo "BLOCKED: rode dentro do Termux"; exit 1; }

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NOME=ponte-whatsapp
SV="$PREFIX/var/service/$NOME"
MONTAGEM="$PREFIX/var/service/.$NOME.novo" # nome com ponto: o runsvdir não sobe pasta pela metade
CFG="$HOME/.fenix/ponte.json"
ESTADO="$HOME/fenix-workspace/ponte-state.json"
passo() { if ((APPLY)); then echo "FAZENDO: $1"; else echo "FARIA: $1"; fi; }
ha() { [[ -e "$1" ]] && echo presente || echo ausente; }

# o registro anterior: o que existe antes de mexer
echo "ANTES: node $(command -v node >/dev/null 2>&1 && node -v || echo ausente) · serviço $(ha "$SV") · conta da ponte $(ha "$CFG") · boot $(ha "$HOME/.termux/boot/00-fenix-servidor")"

if ((REMOVER)); then
  passo "parar e tirar o serviço $NOME (a sessão e a conta em ~/.fenix ficam)"
  if ((APPLY)) && [[ -d "$SV" ]]; then
    sv down "$NOME" 2>/dev/null || true
    touch "$SV/down"
    rm -r -- "$SV"
    echo "DEPOIS: serviço $(ha "$SV")"
  fi
  exit 0
fi

[[ -e "$HOME/.termux/boot/00-fenix-servidor" ]] ||
  echo "PENDENTE: o servidor de bolso (scripts/dispositivos/servidor-de-bolso.sh --apply); sem ele a ponte não volta sozinha depois de reiniciar."

passo "instalar nodejs-lts e termux-services"
((APPLY)) && pkg install -y nodejs-lts termux-services

if ((APPLY)); then
  maior="$(node -p 'process.versions.node.split(".")[0]')"
  ((maior >= 20)) || { echo "BLOCKED: Node $maior; a ponte pede 20 ou mais"; exit 1; }
fi

passo "dependências exatas do package-lock (npm ci; o .npmrc deixa de fora o sharp e os outros pares de imagem)"
((APPLY)) && (cd "$AQUI" && npm ci --no-audit --no-fund)

passo "provas da ponte (node --test)"
((APPLY)) && (cd "$AQUI" && node --test logica.test.mjs banco.test.mjs orquestra.test.mjs trava.test.mjs)

if [[ ! -s "$CFG" ]]; then
  echo "PENDENTE: a conta da ponte. Uma vez, à mão (pede a senha, que não fica guardada): cd \"$AQUI\" && node ponte.mjs --entrar"
  if ((APPLY)); then echo "Depois, rode este script de novo com --apply para ligar o serviço."; exit 0; fi
fi

passo "serviço $NOME em $SV, com registro em \$PREFIX/var/log/sv/$NOME"
if ((APPLY)); then
  rm -r -- "$MONTAGEM" 2>/dev/null || true
  mkdir -p "$MONTAGEM/log"
  touch "$MONTAGEM/down" # monta parado; o sv-enable tira o down e sobe
  cat > "$MONTAGEM/run" <<EOF
#!/data/data/com.termux/files/usr/bin/sh
exec 2>&1
cd "$AQUI"
exec node ponte.mjs
EOF
  chmod 700 "$MONTAGEM/run"
  ln -sf "$PREFIX/share/termux-services/svlogger" "$MONTAGEM/log/run"
  if [[ -d "$SV" ]]; then sv down "$NOME" 2>/dev/null || true; rm -r -- "$SV"; fi
  mv "$MONTAGEM" "$SV"
  sleep 5 # o runsvdir olha a pasta de serviços a cada 5 s
  sv-enable "$NOME"
fi

# a evidência depois
if ((APPLY)); then
  sleep 3
  sv status "$NOME" || true
  tail -n 5 "$PREFIX/var/log/sv/$NOME/current" 2>/dev/null || true
  mkdir -p "$HOME/fenix-workspace"
  cat > "$ESTADO" <<EOF
{
  "protocol": "fenix-ponte-whatsapp/1",
  "service": "$(ha "$SV")",
  "node": "$(node -v)",
  "applied_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
  echo "ponte: READY ($ESTADO). Agora o código: no Prisma, painel do WhatsApp → WhatsApp Web pelo servidor de bolso → o número → Pedir o código."
fi
