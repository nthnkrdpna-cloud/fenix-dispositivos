import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("bootstrap Termux é não destrutivo por padrão", async () => {
  const source = await readFile(new URL("./termux-bootstrap.sh", import.meta.url), "utf8");
  assert.match(source, /--apply/);
  assert.match(source, /fenix-termux-bootstrap/);
  assert.match(source, /mkdir -p/);
  assert.doesNotMatch(source, /rm -rf/);
  assert.doesNotMatch(source, /fastboot.*(flash|erase)/s);
});

test("bootstrap registra estado do workspace", async () => {
  const source = await readFile(new URL("./termux-bootstrap.sh", import.meta.url), "utf8");
  assert.match(source, /bootstrap-state\.json/);
  assert.match(source, /workspace: READY/);
});