# O APK do Prisma — a oficina do dono como aplicativo (M29 do hub)

Escrito em 20/11/2026. **Pedido do operador:** "teremos os APK Admin com integração do WhatsApp".

## O que é

Uma **TWA** (*Trusted Web Activity*). O aplicativo é o próprio `https://nthnkr.com/prisma`, aberto
pelo Chrome em tela cheia, sem barra de endereço, com o ícone do olho na tela inicial. Não há código
próprio, só a biblioteca oficial do Google para TWA (`androidbrowserhelper` 2.7.4), e por isso:
- **toda melhoria do site chega ao app na hora**, sem reinstalar;
- **o aviso do WhatsApp aparece como do Prisma** (serviço de delegação), com o selo na barra de
  status. No Android 13+ quem pede a permissão de notificação é o próprio app;
- **sem rede**, abre o que já foi aberto (o service worker do site, `hub/docs/PWA.md`).

| Peça | Onde |
|---|---|
| o projeto Android | `android/prisma/` (pacote `com.nthnkr.prisma`, Android 8 ou mais novo) |
| os desenhos do ícone | `android/prisma/app/src/main/res/drawable/` — gerados por `hub/app/web/scripts/icones.mjs --android`, não editar à mão |
| o build | `scripts/dispositivos/build-prisma-twa.sh` (o ambiente vem de `android-ambiente.sh`, o mesmo do Fênix Hub) |
| as provas | `scripts/dispositivos/prisma-twa.test.mjs` |
| a confirmação do site | `hub/app/web/worker/assetlinks.js` → `https://nthnkr.com/.well-known/assetlinks.json` |

## Gerar o APK de teste

No PC (Linux, ou WSL no Windows), na pasta do repositório:

```bash
bash scripts/dispositivos/build-prisma-twa.sh
adb install -r android/prisma/app/build/outputs/apk/debug/app-debug.apk
```

Na primeira vez o script baixa JDK, Gradle e o SDK do Android para `.fenix-build-cache/` (fora do
git). O APK de teste tem o pacote `com.nthnkr.prisma.debug` e abre **com a barra do Chrome**: o site
só confirma o pacote de produção.

## Gerar o APK de produção (uma chave, para sempre)

1. **Criar a chave, uma vez só.** Guarde o arquivo e a senha fora do repositório, com cópia de
   segurança. Perder a chave obriga a desinstalar e instalar de novo para atualizar o app.
   ```bash
   .fenix-build-cache/jdk17/bin/keytool -genkeypair -v -keystore ~/chaves/prisma.jks \
     -alias prisma -keyalg RSA -keysize 4096 -validity 10000
   ```
2. **Gerar e assinar.** O `apksigner` pede a senha na hora; ela não fica em variável, arquivo nem
   log:
   ```bash
   PRISMA_KEYSTORE=~/chaves/prisma.jks bash scripts/dispositivos/build-prisma-twa.sh --release
   ```
3. **A impressão digital.** O script termina imprimindo a impressão do certificado (`AB:CD:…`).
   Ela é pública: entra em `DIGITAIS`, no `hub/app/web/worker/assetlinks.js`. Publicado o Worker, o
   app passa a abrir em tela cheia, sem a barra.
4. **Instalar:** `adb install -r android/prisma/app/build/outputs/apk/release/prisma-AAAAMMDD.apk`.

## Instalar fora da Play Store em 2026

Desde 30/09/2026, o Brasil está na primeira leva da verificação de desenvolvedor da Google. App de
quem não é verificado ainda instala pelo `adb install` ou pelo "fluxo avançado" do Android (um
ajuste, reinício e espera). A frota já é operada pelo `adb`, então nada muda para os aparelhos do
dono. Pôr na Play Store pede conta de desenvolvedor verificada: fica para quando valer.

## Ligar o aviso do WhatsApp no aparelho

No app: *Administração → WhatsApp → Avisar neste aparelho*. Antes, uma vez, o dono grava a chave
dos avisos no Supabase (`hub/docs/WHATSAPP.md`, "Avisos no celular").

## Requisito no celular

Chrome instalado e atualizado. Sem um navegador que abra TWA, o Prisma abre numa aba do Chrome
(`FALLBACK_STRATEGY = customtabs`), nunca num WebView.

## Provas (20/11/2026, neste repositório)

- `node --test scripts/dispositivos/prisma-twa.test.mjs`: 6/6.
- `bash scripts/dispositivos/build-prisma-twa.sh` rodou de ponta a ponta num Linux limpo (JDK, Gradle
  e SDK baixados pelo próprio script):
  - `BUILD SUCCESSFUL`, `app-debug.apk` de 4,9 MB, assinatura v2 conferida pelo `apksigner`;
  - `aapt`: pacote `com.nthnkr.prisma.debug`, mínimo 26, alvo 36, rótulo "Prisma";
    `POST_NOTIFICATIONS`; ícone adaptativo;
  - no manifesto final: atividade de entrada com a verificação do domínio, serviço de delegação
    exportado com o selo, e a atividade da permissão de notificação.
- O build achou dois defeitos antes de chegar ao aparelho:
  - o JDK baixado não era achado (busca rasa demais no `android-ambiente.sh`, defeito antigo do build
    do Fênix Hub);
  - os desenhos gerados tinham `--` dentro de comentário XML. Os dois estão corrigidos, e o segundo
    ganhou prova.
- **Não verificado:** o app num aparelho de verdade (pede USB e o dono) e a tela cheia sem barra
  (pede a chave de produção e a impressão no `assetlinks.js`).
