import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { travar } from "./trava.mjs";

test("uma ponte por aparelho: a segunda é recusada enquanto a primeira vive; soltar libera", async () => {
  const arquivo = join(await mkdtemp(join(tmpdir(), "trava-")), ".fenix", "ponte.trava"); // a pasta ainda não existe
  const soltar = await travar(arquivo);
  assert.equal(await readFile(arquivo, "utf8"), String(process.pid));
  assert.equal((await stat(arquivo)).mode & 0o777, 0o600);
  await assert.rejects(travar(arquivo, process.pid + 1), /já há uma ponte rodando neste aparelho/);
  await soltar();
  const soltarDeNovo = await travar(arquivo, process.pid + 1);
  await soltarDeNovo();
});

test("trava de uma ponte que morreu sem soltar é retomada", async () => {
  const arquivo = join(await mkdtemp(join(tmpdir(), "trava-")), "ponte.trava");
  const morto = spawnSync(process.execPath, ["-e", ""]).pid; // já saiu quando o spawnSync volta
  await writeFile(arquivo, String(morto));
  const soltar = await travar(arquivo);
  assert.equal(await readFile(arquivo, "utf8"), String(process.pid));
  await soltar();
});
