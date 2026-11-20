#!/usr/bin/env node
// A ponte do WhatsApp Web (M30 do hub). Roda no servidor de bolso (G15, Termux) ou em qualquer Node
// 20+. Entra no WhatsApp como aparelho vinculado, pelo código de pareamento do número (Baileys), e
// traz as conversas para o Prisma; manda as respostas que o dono escreve lá.
//
//   node ponte.mjs --entrar     uma vez: a conta da ponte no Supabase (só o refresh token fica)
//   node ponte.mjs              o serviço (docs/PONTE_WHATSAPP.md)
//
// A sessão do WhatsApp fica em ~/.fenix/whatsapp/<número>/ e nunca sai do aparelho. Ritmo de gente:
// uma mensagem a cada 3 s, 55 por hora (logica.mjs). Grupo, status e canal não entram.
import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers } from 'baileys';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { criarBanco } from './banco.mjs';
import { criarPonte, DESCONECTADO, REINICIAR, RECUSADO, SUBSTITUIDA, DESCASADA } from './orquestra.mjs';
import { travar } from './trava.mjs';
import { espera } from './logica.mjs';

const BASE = path.join(os.homedir(), '.fenix');
const SUPABASE_PADRAO = 'https://lexhyyglmywxsvwipsmk.supabase.co';
const CICLO_MS = 3_000; // pedidos e fila de saída
const SINAL_MS = 34_000; // o painel dá a ponte por caída depois de 89 s sem sinal

const registrar = (erro) => console.error(new Date().toISOString(), String(erro?.stack || erro?.message || erro).slice(0, 610));
const silencioso = { level: 'silent', child() { return silencioso; }, trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {} };

const dormir = (ms) => new Promise((ok) => { setTimeout(ok, ms); });

// se a biblioteca mudar os códigos de desconexão, a ponte para em vez de agir errado
const CODIGOS = { loggedOut: DESCONECTADO, restartRequired: REINICIAR, forbidden: RECUSADO, connectionReplaced: SUBSTITUIDA, multideviceMismatch: DESCASADA };
for (const [nome, codigo] of Object.entries(CODIGOS)) {
  if (DisconnectReason[nome] !== codigo) throw new Error(`Baileys mudou o código ${nome}: conferir orquestra.mjs antes de subir a ponte`);
}

async function abrirSessao(numero, pasta) {
  const { state, saveCreds } = await useMultiFileAuthState(pasta);
  const sock = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu('Prisma'),
    markOnlineOnConnect: false, // o celular segue recebendo as notificações dele
    syncFullHistory: false,
    logger: silencioso,
  });
  sock.ev.on('creds.update', saveCreds);
  return { sock, state };
}

async function servir() {
  const soltar = await travar(path.join(BASE, 'ponte.trava'));
  for (const sinal of ['SIGTERM', 'SIGINT']) process.on(sinal, () => { soltar().finally(() => process.exit(0)); });
  const banco = criarBanco({ arquivo: path.join(BASE, 'ponte.json') });
  const ponte = criarPonte({ banco, abrirSessao, base: BASE, registrar });
  // sem rede no boot, espera e tenta de novo; sem configuração, o erro diz o que fazer
  for (let n = 1; ; n += 1) {
    try { await ponte.retomar(); break; } catch (erro) {
      if (/--entrar|https/.test(erro.message)) throw erro;
      registrar(erro);
      await dormir(espera(n));
    }
  }
  setInterval(() => { ponte.sinalDeVida().catch(() => {}); }, SINAL_MS);
  // com a rede ou o Supabase fora, o ciclo espera mais a cada falha (até 89 s) e não inunda o log
  let falhas = 0;
  for (;;) {
    try {
      await ponte.cumprirPedidos();
      await ponte.enviarFila();
      falhas = 0;
    } catch (erro) {
      falhas += 1;
      if (falhas <= 3 || falhas % 13 === 0) registrar(erro);
    }
    await dormir(falhas ? espera(falhas) : CICLO_MS);
  }
}

async function perguntar(texto, { oculto = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (oculto) rl._writeToOutput = (s) => { if (s.includes(texto)) process.stdout.write(s); };
  const resposta = await new Promise((ok) => { rl.question(texto, ok); });
  rl.close();
  if (oculto) process.stdout.write('\n');
  return resposta.trim();
}

async function entrar() {
  console.log('A conta da ponte (criada no Supabase e com o papel entregue no Prisma). A senha não fica guardada.');
  const supabase_url = (await perguntar(`Supabase [${SUPABASE_PADRAO}]: `)) || SUPABASE_PADRAO;
  const anon_key = await perguntar('Chave pública (anon / publishable) do projeto: ');
  const email = await perguntar('E-mail da conta da ponte: ');
  const senha = await perguntar('Senha: ', { oculto: true });
  await criarBanco({ arquivo: path.join(BASE, 'ponte.json') }).entrar({ supabase_url, anon_key, email, senha });
  console.log(`Pronto. A sessão da ponte está em ${path.join(BASE, 'ponte.json')} (permissão 600).`);
}

if (process.argv.includes('--entrar')) {
  entrar().catch((erro) => { registrar(erro); process.exit(1); });
} else {
  // o serviço reinicia sozinho quando sai: a espera antes de sair evita um laço de um por segundo
  servir().catch(async (erro) => { registrar(erro); await dormir(89_000); process.exit(1); });
}
