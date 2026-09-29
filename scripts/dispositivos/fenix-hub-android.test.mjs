import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../android/fenix-hub/", import.meta.url);

test("Fênix Hub Android usa API 36 e não depende de bibliotecas UI externas", async () => {
  const gradle = await readFile(new URL("app/build.gradle", root), "utf8");
  assert.match(gradle, /compileSdk 36/);
  assert.match(gradle, /targetSdk 36/);
  assert.match(gradle, /JavaVersion\.VERSION_17/);
  assert.doesNotMatch(gradle, /implementation\s+['"]/);
});

test("ponte Termux só aceita comandos do contrato Fênix", async () => {
  const java = await readFile(new URL("app/src/main/java/com/nthnkrdpna/fenixhub/MainActivity.java", root), "utf8");
  assert.match(java, /isAllowedCommand/);
  assert.match(java, /fleet discover/);
  assert.match(java, /fleet optimize/);
  assert.match(java, /fleet rollback/);
  assert.doesNotMatch(java, /command\.matches\("\[a-zA-Z0-9_\./);
});

test("UI declara os três nós e separa descoberta de otimização", async () => {
  const html = await readFile(new URL("app/src/main/assets/index.html", root), "utf8");
  assert.match(html, /G15/);
  assert.match(html, /G75/);
  assert.match(html, /Redmi/);
  assert.match(html, /Discover — 3 nós/);
  assert.match(html, /Otimizar — comando único/);
});
