// O APK do Prisma (TWA, M29 do hub): o projeto é só configuração, e estas provas prendem o que
// importa — para onde abre, como o site confirma o app, quem entrega o aviso, e que não há segredo.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const raiz = new URL("../../android/prisma/", import.meta.url);
const ler = (p) => readFile(new URL(p, raiz), "utf8");

test("abre https://nthnkr.com/prisma, e o site é quem confirma o aplicativo", async () => {
  const strings = await ler("app/src/main/res/values/strings.xml");
  assert.match(strings, /<string name="launchUrl">https:\/\/nthnkr\.com\/prisma<\/string>/);
  assert.match(strings, /\\"namespace\\": \\"web\\", \\"site\\": \\"https:\/\/nthnkr\.com\\"/);
  const manifesto = await ler("app/src/main/AndroidManifest.xml");
  assert.match(manifesto, /android:autoVerify="true"/);
  assert.match(manifesto, /android:scheme="https" android:host="nthnkr\.com" android:pathPrefix="\/prisma"/);
});

test("o aviso do site chega como do Prisma: serviço de delegação, ícone da barra e a permissão do Android 13", async () => {
  const m = await ler("app/src/main/AndroidManifest.xml");
  assert.match(m, /android\.permission\.POST_NOTIFICATIONS/);
  assert.match(m, /trusted\.DelegationService"\s+android:enabled="true"\s+android:exported="true"/);
  assert.match(m, /trusted\.SMALL_ICON" android:resource="@drawable\/ic_notificacao"/);
  assert.match(m, /TRUSTED_WEB_ACTIVITY_SERVICE/);
  assert.match(m, /NotificationPermissionRequestActivity/);
});

test("sem navegador de TWA, abre numa aba do Chrome — nunca num WebView; e o manifesto fecha o que não usa", async () => {
  const m = await ler("app/src/main/AndroidManifest.xml");
  assert.match(m, /FALLBACK_STRATEGY" android:value="customtabs"/);
  assert.doesNotMatch(m, /WebViewFallbackActivity/);
  assert.match(m, /android:allowBackup="false"/);
  assert.match(m, /android:usesCleartextTraffic="false"/);
  assert.doesNotMatch(m, /QUERY_ALL_PACKAGES|READ_SMS|READ_CONTACTS|BIND_NOTIFICATION_LISTENER_SERVICE/);
});

test("uma dependência só, de versão presa, e nenhum segredo no build", async () => {
  const g = await ler("app/build.gradle");
  assert.deepEqual(g.match(/implementation\s+'[^']+'/g), ["implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.7.4'"]);
  assert.match(g, /applicationId 'com\.nthnkr\.prisma'/);
  assert.match(g, /minSdk 26/);
  assert.match(g, /targetSdk 36/);
  assert.doesNotMatch(g, /getenv|storePassword|keyPassword|signingConfig/);
});

test("os desenhos saem do gerador do hub, com o traçado da casa", async () => {
  for (const d of ["olho", "olho_mono", "ic_notificacao", "splash"]) {
    const x = await ler(`app/src/main/res/drawable/${d}.xml`);
    assert.match(x, /Gerado por hub\/app\/web\/scripts\/icones\.mjs \(opção android\)/, d);
    for (const [, dentro] of x.matchAll(/<!--([\s\S]*?)-->/g)) assert.ok(!dentro.includes('--'), `${d}: XML não aceita -- dentro de comentário`);
    assert.match(x, /android:pathData="M[\d. L]+Z"/, d);
  }
  const icone = await ler("app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml");
  for (const camada of ["background", "foreground", "monochrome"]) assert.match(icone, new RegExp(`<${camada} `), camada);
});

test("o build de produção pede a senha na hora: nada de senha em variável ou na linha de comando", async () => {
  const s = await readFile(new URL("./build-prisma-twa.sh", import.meta.url), "utf8");
  assert.match(s, /MODO=debug/);
  assert.match(s, /apksigner" sign --ks "\$PRISMA_KEYSTORE"/);
  assert.doesNotMatch(s, /--ks-pass|--key-pass|PASSWORD|SENHA=/);
  assert.match(s, /source "\$ROOT\/scripts\/dispositivos\/android-ambiente\.sh"/);
  execFileSync("bash", ["-n", new URL("./build-prisma-twa.sh", import.meta.url).pathname]);
  execFileSync("bash", ["-n", new URL("./android-ambiente.sh", import.meta.url).pathname]);
});
