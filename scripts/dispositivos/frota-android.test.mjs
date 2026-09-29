import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("workflow da frota exige exatamente os três perfis antes de otimizar",async()=>{
  const s=await readFile(new URL("./frota-android.mjs",import.meta.url),"utf8");
  assert.match(s,/fenix-android-fleet\/2/);
  assert.match(s,/exactly_three_authorized_nodes/);
  assert.match(s,/g75/);
  assert.match(s,/g15/);
  assert.match(s,/redmi-note-11/);
  assert.match(s,/FLEET_INCOMPLETE/);
  assert.match(s,/FLEET_PROFILE_MISSING/);
  assert.match(s,/fleet-tuning-last\.json/);
});

test("diagnóstico e snapshot precedem qualquer alteração",async()=>{
  const s=await readFile(new URL("./frota-android.mjs",import.meta.url),"utf8");
  assert.match(s,/const beforeNodes=.*snapshot/);
  assert.match(s,/applyCommon/);
  assert.match(s,/rolled_back/);
});

test("persistência Termux do G75 é condicional à instalação",async()=>{
  const s=await readFile(new URL("./frota-android.mjs",import.meta.url),"utf8");
  assert.match(s,/com\.termux/);
  assert.match(s,/deviceidle/);
});
