// Vigia da rede de casa: lista quem está conectado (tabela ARP do próprio computador) e separa o
// que é conhecido do que não é. Só lê; não varre, não bloqueia, não toca no roteador.
// A lista de conhecidos fica FORA do repositório: MAC de aparelho da casa é dado da casa.
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const ARQUIVO_PADRAO = path.join(os.homedir(), ".fenix", "rede-conhecidos.json");

export function normalizarMac(bruto) {
  const hex = String(bruto || "").toLowerCase().replace(/[^0-9a-f]/g, "");
  if (hex.length !== 12) return null;
  return hex.match(/../g).join(":");
}

// broadcast e multicast não são aparelhos
export function ehAparelho(mac) {
  if (!mac || mac === "ff:ff:ff:ff:ff:ff" || mac === "00:00:00:00:00:00") return false;
  return (parseInt(mac.slice(0, 2), 16) & 0x01) === 0;
}

// bit "localmente administrado": celulares modernos inventam um MAC por rede (privacidade)
export function macAleatorio(mac) {
  return (parseInt(mac.slice(0, 2), 16) & 0x02) === 0x02;
}

// Windows: "  192.168.0.10          a4-c3-f0-11-22-33     dinâmico"
export function lerArpWindows(texto) {
  const saida = [];
  for (const linha of String(texto).split(/\r?\n/)) {
    const m = linha.match(/^\s*(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-fA-F]{2}(?:[-:][0-9a-fA-F]{2}){5})\s/);
    if (m) saida.push({ ip: m[1], mac: normalizarMac(m[2]) });
  }
  return saida;
}

// Linux: "192.168.0.10 dev wlan0 lladdr a4:c3:f0:11:22:33 REACHABLE"
export function lerIpNeigh(texto) {
  const saida = [];
  for (const linha of String(texto).split(/\r?\n/)) {
    const m = linha.match(/^(\S+)\s.*\blladdr\s+([0-9a-fA-F:]{17})\b(.*)$/);
    if (m && !/FAILED|INCOMPLETE/.test(m[3])) saida.push({ ip: m[1], mac: normalizarMac(m[2]) });
  }
  return saida;
}

// /proc/net/arp: existe em todo Linux, sem iproute2; flag 0x0 é vizinho que não respondeu
export function lerProcArp(texto) {
  return String(texto).split(/\r?\n/).slice(1).map((l) => l.trim().split(/\s+/))
    .filter((c) => c.length >= 4 && c[2] !== "0x0")
    .map((c) => ({ ip: c[0], mac: normalizarMac(c[3]) }))
    .filter((v) => v.mac);
}

export function classificar(vizinhos, conhecidos) {
  const vistos = new Map();
  for (const v of vizinhos) if (ehAparelho(v.mac) && !vistos.has(v.mac)) vistos.set(v.mac, v);
  return [...vistos.values()].map((v) => {
    const c = conhecidos[v.mac];
    if (c) return { ...v, estado: c.bloqueado ? "BLOQUEADO-MAS-PRESENTE" : "conhecido", nome: c.nome };
    return { ...v, estado: "DESCONHECIDO", aleatorio: macAleatorio(v.mac) };
  }).sort((a, b) => ordem(a.estado) - ordem(b.estado));
}
const ordem = (e) => ({ "BLOQUEADO-MAS-PRESENTE": 0, DESCONHECIDO: 1, conhecido: 2 }[e]);

function executar(bin, args) {
  return new Promise((resolve) => {
    const p = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (d) => { out += d; });
    p.on("error", () => resolve(null));
    p.on("close", (code) => resolve(code === 0 ? out : null));
  });
}

async function lerConhecidos(arquivo) {
  try { return JSON.parse(await fs.readFile(arquivo, "utf8")); } catch { return {}; }
}

async function principal(argv) {
  const arg = (nome) => { const i = argv.indexOf(nome); return i >= 0 ? argv[i + 1] : undefined; };
  const arquivo = arg("--conhecidos") || ARQUIVO_PADRAO;
  const conhecidos = await lerConhecidos(arquivo);

  const flag = ["--marcar", "--bloqueado"].find((f) => argv.includes(f));
  if (flag) {
    const i = argv.indexOf(flag);
    const mac = normalizarMac(argv[i + 1]);
    if (!mac) { console.error("MAC inválido"); return 2; }
    const nome = argv[i + 2] || "sem nome";
    conhecidos[mac] = { nome, desde: new Date().toISOString(), ...(flag === "--bloqueado" ? { bloqueado: true } : {}) };
    await fs.mkdir(path.dirname(arquivo), { recursive: true });
    await fs.writeFile(arquivo, JSON.stringify(conhecidos, null, 2) + "\n", { mode: 0o600 });
    console.log(`${mac} → ${nome}${conhecidos[mac].bloqueado ? " (bloqueado)" : ""}`);
    return 0;
  }

  let vizinhos = null;
  if (process.platform === "win32") {
    const t = await executar("arp", ["-a"]);
    if (t !== null) vizinhos = lerArpWindows(t);
  } else {
    const t = await executar("ip", ["neigh"]);
    if (t !== null) vizinhos = lerIpNeigh(t);
    else vizinhos = await fs.readFile("/proc/net/arp", "utf8").then(lerProcArp).catch(() => null);
  }
  if (vizinhos === null) { console.error("Não consegui ler a tabela ARP deste computador."); return 3; }
  const lista = classificar(vizinhos, conhecidos);

  for (const a of lista) {
    const nota = a.estado === "DESCONHECIDO" && a.aleatorio ? " (MAC aleatório: costuma ser celular com privacidade ligada)" : "";
    console.log(`${a.estado.padEnd(22)} ${a.ip.padEnd(16)} ${a.mac}  ${a.nome || ""}${nota}`);
  }
  console.log(`\n${lista.length} aparelho(s) visto(s). A tabela ARP só mostra quem falou com este computador há pouco: rode de novo depois de um ping no gateway, e confira a lista do roteador.`);
  // 2 = há o que olhar; um agente ou um agendador pode avisar só por isso
  return lista.some((a) => a.estado !== "conhecido") ? 2 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await principal(process.argv.slice(2));
}
