import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile, chmod, readdir } from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = new URL("./instalar-termux.sh", import.meta.url).pathname;

async function termuxFalso() {
  const raiz = await mkdtemp(join(tmpdir(), "termux-"));
  const bin = join(raiz, "bin");
  await mkdir(bin);
  await writeFile(join(bin, "pkg"), "#!/bin/sh\necho pkg-chamado \"$@\" >> \"$HOME/chamadas\"\n");
  await chmod(join(bin, "pkg"), 0o755);
  await mkdir(join(raiz, "prefix"));
  await mkdir(join(raiz, "home"));
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, PREFIX: join(raiz, "prefix"), HOME: join(raiz, "home") };
  return { raiz, env, rodar: (...args) => spawnSync("bash", [script, ...args], { env, encoding: "utf8" }) };
}

test("por padrão só mostra: nada instalado, nenhum serviço criado, nenhuma pasta nova", async () => {
  execFileSync("bash", ["-n", script]);
  const t = await termuxFalso();
  const r = t.rodar();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^ANTES: /m);
  assert.match(r.stdout, /FARIA: instalar nodejs-lts/);
  assert.match(r.stdout, /FARIA: serviço ponte-whatsapp/);
  assert.match(r.stdout, /PENDENTE: a conta da ponte/);
  assert.doesNotMatch(r.stdout, /FAZENDO:/);
  assert.deepEqual(await readdir(join(t.raiz, "prefix")), []);
  assert.deepEqual(await readdir(join(t.raiz, "home")), [], "nem o pkg foi chamado");
  assert.equal(t.rodar("--remover").status, 0);
  assert.equal(t.rodar("--sei-la").status, 2);
});

test("desfazer tira o serviço e nunca a sessão nem a conta; o serviço sobe montado, nunca pela metade", async () => {
  const s = await readFile(script, "utf8");
  assert.doesNotMatch(s, /rm -rf/);
  assert.doesNotMatch(s, /rm [^\n]*(\.fenix|\$CFG|whatsapp\/)/, "a sessão do WhatsApp e a conta da ponte não saem por script");
  assert.match(s, /MONTAGEM="\$PREFIX\/var\/service\/\.\$NOME\.novo"/);
  assert.match(s, /touch "\$MONTAGEM\/down"[\s\S]*mv "\$MONTAGEM" "\$SV"[\s\S]*sv-enable "\$NOME"/);
  assert.match(s, /npm ci --no-audit --no-fund/, "o lock exato, nunca npm install");
  assert.match(s, /exec node ponte\.mjs/);
});

test("o .npmrc deixa os pares de imagem de fora, e o lock não traz o sharp nativo", async () => {
  assert.match(await readFile(new URL("./.npmrc", import.meta.url), "utf8"), /^legacy-peer-deps=true$/m);
  const lock = JSON.parse(await readFile(new URL("./package-lock.json", import.meta.url), "utf8"));
  const pacotes = Object.keys(lock.packages);
  assert.ok(pacotes.includes("node_modules/baileys"));
  assert.ok(!pacotes.some((p) => /node_modules\/(sharp|@img\/|jimp)/.test(p)), "nada de binário de imagem");
  assert.equal(lock.packages["node_modules/baileys"].version, "7.0.0-rc14", "versão exata, a que foi provada");
});
