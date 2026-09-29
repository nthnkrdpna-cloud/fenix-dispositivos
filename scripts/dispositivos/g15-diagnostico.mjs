import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const keys = [
  "ro.product.manufacturer","ro.product.model","ro.product.device",
  "ro.product.name","ro.build.id","ro.build.version.release",
  "ro.build.version.security_patch","ro.bootloader","ro.boot.flash.locked",
  "ro.oem_unlock_supported","ro.boot.verifiedbootstate","ro.boot.vbmeta.device_state"
];

function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn("adb", args, {stdio:["ignore","pipe","pipe"]});
    let out="", err="";
    p.stdout.on("data", d => out += d);
    p.stderr.on("data", d => err += d);
    p.on("error", reject);
    p.on("close", code => code === 0 ? resolve(out.trim()) : reject(new Error(err.trim() || "adb terminou com "+code)));
  });
}

const list = await run(["devices"]);
const serial = list.split("\n").find(x => /\sdevice$/.test(x))?.split("\t")[0];
if (!serial) throw new Error("nenhum dispositivo ADB autorizado");

const props = {};
for (const key of keys) props[key] = await run(["-s",serial,"shell","getprop",key]).catch(() => null);

const commands = {
  bateria:["shell","dumpsys","battery"],
  memoria:["shell","cat","/proc/meminfo"],
  armazenamento:["shell","df","-h","/data"],
  armazenamento_externo:["shell","df","-h","/storage/emulated"],
  temperatura:["shell","dumpsys","thermalservice"],
  rede:["shell","ip","addr"],
  rotas:["shell","ip","route"],
  vizinhos:["shell","ip","neigh"],
  uptime:["shell","cat","/proc/uptime"]
};

const dados = {};
for (const [nome,args] of Object.entries(commands)) {
  dados[nome] = await run(["-s",serial,...args]).catch(e => ({erro:e.message}));
}

const resultado = {
  protocolo:"fenix-g15-diagnostic/1",
  modo:"somente_leitura",
  coletado_em:new Date().toISOString(),
  serial, props, dados
};

console.log(JSON.stringify(resultado,null,2));
const out = process.env.FENIX_EVIDENCE_DIR || "./evidencias/dispositivos";
await fs.mkdir(out,{recursive:true});
const file = path.join(out,"g15-"+new Date().toISOString().replace(/[:.]/g,"-")+".json");
await fs.writeFile(file,JSON.stringify(resultado,null,2)+"\n",{mode:0o600});
console.error("evidência: "+file);
