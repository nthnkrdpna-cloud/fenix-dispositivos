#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(file, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, file), ...args], { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`${file} terminou com código ${code}`)));
  });
}

const [domain = "help", action = "help", ...args] = process.argv.slice(2);

const routes = {
  status: {
    check: ["scripts/continuidade/cli.mjs", [".", "saude"]]
  },
  fleet: {
    discover: ["scripts/dispositivos/frota-android.mjs", ["discover", ...args]],
    optimize: ["scripts/dispositivos/frota-android.mjs", ["optimize", ...args]],
    rollback: ["scripts/dispositivos/frota-android.mjs", ["rollback", ...args]]
  },
  vault: {
    harvest: ["scripts/continuidade/vault-harvest.mjs", ["harvest", ...args]]
  }
};

if (routes[domain]?.[action]) {
  await run(...routes[domain][action]);
} else if (domain === "network" && action === "discover") {
  await run("scripts/rede/auditoria-lan.mjs", args);
} else if (domain === "quota" && action === "status") {
  await run("scripts/continuidade/quota-gate.mjs", ["status", ...args]);
} else {
  console.log("Fênix CLI: fenix status | fenix fleet discover|optimize|rollback | fenix network discover | fenix vault harvest | fenix quota status");
}
