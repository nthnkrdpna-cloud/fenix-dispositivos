import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../android/fenix-hub/", import.meta.url);

test("Fênix Hub Android usa API 36, Java 17 e build determinístico sem dependência UI externa", async () => {
  const gradle = await readFile(new URL("app/build.gradle", root), "utf8");
  assert.match(gradle, /compileSdk 36/);
  assert.match(gradle, /targetSdk 36/);
  assert.match(gradle, /JavaVersion\.VERSION_17/);
  assert.doesNotMatch(gradle, /implementation\s+['"]/);
});

test("ponte Termux mantém allowlist fechada", async () => {
  const java = await readFile(new URL("app/src/main/java/com/nthnkrdpna/fenixhub/MainActivity.java", root), "utf8");
  assert.match(java, /isAllowedCommand/);
  for (const command of ["status", "fleet discover", "fleet optimize", "fleet rollback", "network discover", "quota status"]) {
    assert.match(java, new RegExp(command.replace(" ", "\\s+")));
  }
  assert.doesNotMatch(java, /command\.matches\(/);
});

test("status do Hub aponta para diagnóstico local somente leitura", async () => {
  const fenix = await readFile(new URL("../../scripts/fenix.mjs", import.meta.url), "utf8");
  assert.match(fenix, /status:\s*\{\s*check:/);
  assert.match(fenix, /scripts\/continuidade\/cli\.mjs/);
  assert.match(fenix, /\["\.",\s*"saude"\]/);
});

test("auditoria Android é local, somente leitura e seletiva", async () => {
  const manifest = await readFile(new URL("app/src/main/AndroidManifest.xml", root), "utf8");
  const java = await readFile(new URL("app/src/main/java/com/nthnkrdpna/fenixhub/MainActivity.java", root), "utf8");
  const html = await readFile(new URL("app/src/main/assets/index.html", root), "utf8");
  for (const pkg of ["com.arlosoft.macrodroid", "net.dinglisch.android.taskerm", "com.llamalab.automate", "com.automateitapp.automateit"]) {
    assert.match(manifest, new RegExp(pkg.replaceAll(".", "\\.")));
  }
  assert.match(java, /fenix-android-audit\/1/);
  assert.match(java, /root_required.*false/);
  assert.match(java, /exported_services/);
  assert.match(java, /requested_permissions/);
  assert.match(html, /Auditar workflows \/ automação/);
});

test("Manifest evita backup e cleartext e limita queries", async () => {
  const manifest = await readFile(new URL("app/src/main/AndroidManifest.xml", root), "utf8");
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.doesNotMatch(manifest, /QUERY_ALL_PACKAGES/);
});

test("frota exige exatamente os três perfis antes de otimizar", async () => {
  const s = await readFile(new URL("../../scripts/dispositivos/frota-android.mjs", import.meta.url), "utf8");
  assert.match(s, /fenix-android-fleet\/2/);
  assert.match(s, /exactly_three_authorized_nodes/);
  assert.match(s, /FLEET_INCOMPLETE/);
  assert.match(s, /FLEET_PROFILE_MISSING/);
  assert.match(s, /fleet-tuning-last\.json/);
});

test("diagnóstico e snapshot precedem qualquer alteração", async () => {
  const s = await readFile(new URL("../../scripts/dispositivos/frota-android.mjs", import.meta.url), "utf8");
  assert.match(s, /const beforeNodes=.*snapshot/);
  assert.match(s, /applyCommon/);
  assert.match(s, /rolled_back/);
});

test("build portátil não depende de secrets de aplicação e mantém versões fixadas", async () => {
  const script = await readFile(new URL("../../scripts/dispositivos/build-fenix-hub-portable.sh", import.meta.url), "utf8");
  assert.match(script, /GRADLE_VERSION=.*9\.4\.1/);
  assert.match(script, /ANDROID_API=.*36/);
  assert.match(script, /BUILD_TOOLS=.*36\.0\.0/);
  assert.match(script, /JAVA_VERSION=.*17/);
  assert.match(script, /FENIX_ANDROID_CMDLINE_URL/);
  assert.match(script, /fenix-hub-build-state\.mjs/);
  const neuralese = await readFile(new URL("../../scripts/continuidade/neuralese.mjs", import.meta.url), "utf8");
  assert.match(neuralese, /NEURALESE_VERSAO/);
  assert.match(script, /apksigner/);
  assert.match(script, /zipalign.*-P 16/);
  assert.doesNotMatch(script, /SUPABASE_SERVICE_ROLE_KEY|CLOUDFLARE_API_TOKEN|GEMINI_API_KEY/);
});
