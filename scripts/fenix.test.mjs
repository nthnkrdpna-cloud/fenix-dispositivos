import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rota } from "./fenix.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "scripts/fenix.mjs");
const opcoes = { root: "/repo", hub: "/hub" };

test("frota e rede rodam neste repositório, no diretório de quem chamou", () => {
  for (const [d, a, arquivo] of [["fleet", "discover", "scripts/dispositivos/frota-android.mjs"],
                                 ["fleet", "optimize", "scripts/dispositivos/frota-android.mjs"],
                                 ["fleet", "rollback", "scripts/dispositivos/frota-android.mjs"],
                                 ["network", "discover", "scripts/rede/auditoria-lan.mjs"]]) {
    const r = rota(d, a, ["x"], opcoes);
    assert.equal(r.file, path.join("/repo", arquivo));
    assert.equal(r.noHub, false);
    assert.equal(r.cwd, undefined);
  }
});

test("status, vault e quota vão para o hub e rodam com ele como diretório", () => {
  for (const [d, a, arquivo] of [["status", "check", "scripts/continuidade/cli.mjs"],
                                 ["vault", "harvest", "scripts/continuidade/vault-harvest.mjs"],
                                 ["quota", "status", "scripts/continuidade/quota-gate.mjs"]]) {
    const r = rota(d, a, [], opcoes);
    assert.equal(r.file, path.join("/hub", arquivo));
    assert.equal(r.noHub, true);
    assert.equal(r.cwd, "/hub");
  }
  assert.deepEqual(rota("status", "check", [], opcoes).args, [".", "saude"]);
});

test("comando desconhecido não vira rota", () => {
  assert.equal(rota("fleet", "apagar", [], opcoes), null);
  assert.equal(rota("help", "help", [], opcoes), null);
});

test("sem checkout do hub, a rota do hub falha dizendo o que falta, sem rodar nada", () => {
  const vazio = mkdtempSync(path.join(tmpdir(), "sem-hub-"));
  const r = spawnSync(process.execPath, [CLI, "quota", "status"], { env: { ...process.env, FENIX_HUB_DIR: vazio }, encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /FENIX_HUB_DIR/);
});

test("importar o módulo não executa a CLI", () => {
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", `import(${JSON.stringify(CLI)}).then(() => console.log("ok"))`], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), "ok");
});
