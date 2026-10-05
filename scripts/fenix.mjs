#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Desde 05/10/2026 este repositório guarda só os dispositivos; a continuidade (status, vault,
// quota) mora no hub. FENIX_HUB_DIR aponta para um checkout dele — padrão: ../hub, ao lado deste.
const HUB = path.resolve(process.env.FENIX_HUB_DIR || path.join(ROOT, "..", "hub"));

export function rota(domain, action, args = [], { root = ROOT, hub = HUB } = {}) {
  const routes = {
    status: {
      check: [hub, "scripts/continuidade/cli.mjs", [".", "saude"]]
    },
    fleet: {
      discover: [root, "scripts/dispositivos/frota-android.mjs", ["discover", ...args]],
      optimize: [root, "scripts/dispositivos/frota-android.mjs", ["optimize", ...args]],
      rollback: [root, "scripts/dispositivos/frota-android.mjs", ["rollback", ...args]]
    },
    vault: {
      harvest: [hub, "scripts/continuidade/vault-harvest.mjs", ["harvest", ...args]]
    },
    network: {
      discover: [root, "scripts/rede/auditoria-lan.mjs", args]
    },
    quota: {
      status: [hub, "scripts/continuidade/quota-gate.mjs", ["status", ...args]]
    }
  };
  const r = routes[domain]?.[action];
  if (!r) return null;
  const [base, file, argv] = r;
  // rota do hub roda com o hub como diretório: o "." de `status check` é o repositório dele
  return { noHub: base === hub, file: path.join(base, file), args: argv, cwd: base === hub ? hub : undefined };
}

function run({ file, args, cwd }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], { stdio: "inherit", cwd });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`${file} terminou com código ${code}`)));
  });
}

const principal = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (principal) {
  const [domain = "help", action = "help", ...args] = process.argv.slice(2);
  const r = rota(domain, action, args);
  if (r?.noHub && !existsSync(r.file)) {
    console.error(`Fênix CLI: "${domain} ${action}" roda no hub e não achei ${r.file}. Aponte FENIX_HUB_DIR para um checkout de nthnkrdpna-cloud/hub.`);
    process.exit(2);
  } else if (r) {
    await run(r);
  } else {
    console.log("Fênix CLI: fenix status | fenix fleet discover|optimize|rollback | fenix network discover | fenix vault harvest | fenix quota status");
  }
}
