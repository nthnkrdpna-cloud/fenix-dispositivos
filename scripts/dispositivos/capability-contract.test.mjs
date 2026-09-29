import test from "node:test";
import assert from "node:assert/strict";
import { createCapabilityManifest, validateCapabilityManifest } from "./capability-contract.mjs";

test("contrato de capacidade aceita nó observado", () => {
  const m = createCapabilityManifest({
    id: "android:g15",
    kind: "android",
    model: "Moto G15",
    capabilities: { adb_wifi: true, settings_put: true },
    evidence: ["adb:getprop"],
    rollback: ["settings_snapshot"]
  });
  assert.equal(validateCapabilityManifest(m), true);
});

test("contrato rejeita estado desconhecido no enum", () => {
  assert.throws(() => createCapabilityManifest({ id: "mesh:1", kind: "network", state: "readyish" }), /estado/);
});
