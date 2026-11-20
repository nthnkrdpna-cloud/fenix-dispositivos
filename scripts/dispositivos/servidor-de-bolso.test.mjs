import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const script = new URL("./servidor-de-bolso.sh", import.meta.url);

test("servidor de bolso só mostra por padrão, e nunca apaga nem pisca firmware", async () => {
  const s = await readFile(script, "utf8");
  assert.match(s, /APPLY=0/);
  assert.match(s, /FARIA:/);
  assert.doesNotMatch(s, /rm -rf/);
  assert.doesNotMatch(s, /fastboot|reboot bootloader|oem unlock/);
  execFileSync("bash", ["-n", script.pathname]);
});

test("SSH nunca por senha: sem chave cadastrada, o sshd fica desligado", async () => {
  const s = await readFile(script, "utf8");
  assert.match(s, /PasswordAuthentication no/);
  assert.match(s, /-s "\$CHAVES"/);
  assert.match(s, /no_key_sshd_off/);
  assert.doesNotMatch(s, /PasswordAuthentication yes/);
});

test("o boot segura o wake lock e sobe os serviços pelo profile, como o README do Termux:Boot", async () => {
  const s = await readFile(script, "utf8");
  assert.match(s, /termux-wake-lock\n\. \$PREFIX\/etc\/profile/);
  assert.match(s, /fenix-servidor-de-bolso\/1/);
});

test("a frota só mexe no phantom process do papel persistent_edge, com Android 12+ e Termux, e desfaz apagando o que não existia", async () => {
  const s = await readFile(new URL("./frota-android.mjs", import.meta.url), "utf8");
  assert.match(s, /settings_enable_monitor_phantom_procs","false"/);
  assert.match(s, /if\(Number\(sdk\)<31\) return \[\];/);
  assert.match(s, /before\.role==="persistent_edge"\) changes\.push\(\.\.\.await applyServidor/);
  assert.match(s, /x\.before==="null" && x\.before!==x\.after\)\s*\n\s*await run\(\["-s",node\.serial,"shell","settings","delete"/);
});
