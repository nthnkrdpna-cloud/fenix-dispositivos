// O fluxo inteiro da ponte com um WhatsApp falso: pedir o código, conectar, cair, ser desconectado no
// celular, receber e avisar, enviar a fila com o freio. Sem Baileys e sem rede.
import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, mkdir, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarPonte, DESCONECTADO, REINICIAR, RECUSADO, SUBSTITUIDA, DESCASADA } from "./orquestra.mjs";
import { Limitador } from "./logica.mjs";

const NUMERO = "5511988880001";
const fechou = (statusCode) => ({ connection: "close", lastDisconnect: { error: statusCode ? { output: { statusCode } } : undefined } });

/** Os eventos rodam soltos (como no Baileys): a prova espera a condição chegar, com prazo. */
async function ate(condicao, oque = "a condição") {
  const fim = Date.now() + 3000;
  while (!(await condicao())) {
    if (Date.now() > fim) throw new Error(`${oque} não chegou a tempo`);
    await new Promise((ok) => { setTimeout(ok, 3); });
  }
}
const existe = (p) => access(p).then(() => true, () => false);

function montar({ pedidos = [], fila = [], registrado = false, ponteSalva = [] } = {}) {
  const m = { chamadas: [], sockets: [], marcados: [], registrado };
  m.banco = {
    escrever: async (tabela, linha) => { m.chamadas.push(["escrever", tabela, linha]); },
    gravar: async (tabela, linhas) => { m.chamadas.push(["gravar", tabela, linhas]); return tabela === "whatsapp_mensagens" ? linhas.map((l) => ({ wamid: l.wamid, direcao: l.direcao })) : []; },
    mudar: async (tabela, filtro, valores) => { m.chamadas.push(["mudar", tabela, filtro, valores]); },
    ler: async (tabela) => (tabela === "whatsapp_ponte_pedidos" ? pedidos.splice(0) : tabela === "whatsapp_saida" ? fila.splice(0) : ponteSalva),
    avisarDono: async () => { m.chamadas.push(["avisar"]); return 202; },
  };
  m.abrirSessao = async () => {
    const sock = {
      ev: new EventEmitter(),
      pedidosDeCodigo: [], enviados: [], saiu: false, fechou: false,
      requestPairingCode: async (n) => { sock.pedidosDeCodigo.push(n); return "abcd-1234"; },
      sendMessage: async (jid, conteudo) => {
        sock.enviados.push([jid, conteudo]);
        return { key: { id: `ENV${sock.enviados.length}`, remoteJid: jid, fromMe: true }, message: { conversation: conteudo.text }, messageTimestamp: Date.parse("2026-11-20T12:00:00Z") / 1000 };
      },
      // como no Baileys: logout e end disparam o 'close' na hora, de dentro da chamada
      logout: async () => { sock.saiu = true; sock.ev.emit("connection.update", fechou(DESCONECTADO)); },
      end: () => { sock.fechou = true; sock.ev.emit("connection.update", fechou()); },
    };
    m.sockets.push(sock);
    return { sock, state: { creds: { registered: m.registrado } } };
  };
  let t = Date.parse("2026-11-20T12:00:00Z");
  m.relogio = { agora: () => t, depois: (f, ms) => { m.marcados.push({ f, ms }); } };
  m.avancar = (ms) => { t += ms; };
  m.estados = () => m.chamadas.filter(([k, tb]) => k === "escrever" && tb === "whatsapp_ponte").map(([, , l]) => l.estado);
  m.detalhes = () => m.chamadas.filter(([k, tb]) => k === "escrever" && tb === "whatsapp_ponte").map(([, , l]) => l.detalhe);
  return m;
}

async function novaPonte(m, extra = {}) {
  const base = await mkdtemp(join(tmpdir(), "ponte-"));
  return { base, ponte: criarPonte({ banco: m.banco, abrirSessao: m.abrirSessao, base, relogio: m.relogio, registrar: () => {}, ...extra }) };
}

async function conectado(m, ponte) {
  await ponte.ligar(NUMERO);
  m.sockets.at(-1).ev.emit("connection.update", { connection: "open" });
  await ate(() => ponte.conexoes.get(NUMERO)?.aberta, "a conexão aberta");
}

test("parear: pede um código só, para o número pedido, mostra no painel limpo, e conecta", async () => {
  const m = montar({ pedidos: [{ id: 7, acao: "parear", numero: NUMERO }] });
  const { ponte } = await novaPonte(m);
  await ponte.cumprirPedidos();
  const sock = m.sockets[0];
  sock.ev.emit("connection.update", { qr: "QR-QUE-NAO-SE-USA" });
  sock.ev.emit("connection.update", { qr: "OUTRO-QR" });
  await ate(() => m.estados().includes("aguardando_codigo"), "o código");
  assert.deepEqual(sock.pedidosDeCodigo, [NUMERO]);
  assert.equal(m.chamadas.find(([, , l]) => l?.estado === "aguardando_codigo")[2].codigo, "ABCD1234");
  assert.ok(m.chamadas.some(([k, tb, , v]) => k === "mudar" && tb === "whatsapp_ponte_pedidos" && v.feito_em), "o pedido fica feito");
  const numero = m.chamadas.find(([k, tb]) => k === "gravar" && tb === "whatsapp_numeros")[2][0];
  assert.deepEqual([numero.phone_number_id, numero.exibicao], [NUMERO, `+${NUMERO}`]);
  sock.ev.emit("connection.update", { connection: "open" });
  await ate(() => m.estados().includes("conectada"), "o conectada");
  assert.deepEqual(m.estados(), ["pedindo_codigo", "aguardando_codigo", "conectada"]);
});

test("código usado: o 'reinicie' do WhatsApp não vira queda, e a volta não pede código de novo", async () => {
  const m = montar({ pedidos: [{ id: 1, acao: "parear", numero: NUMERO }] });
  const { ponte } = await novaPonte(m);
  await ponte.cumprirPedidos();
  m.sockets[0].ev.emit("connection.update", { qr: "QR" });
  await ate(() => m.estados().includes("aguardando_codigo"), "o código");
  m.registrado = true; // o celular aceitou o código
  m.sockets[0].ev.emit("connection.update", fechou(REINICIAR));
  await ate(() => m.marcados.length === 1, "a volta marcada");
  assert.equal(m.marcados[0].ms, 1000);
  assert.ok(!m.estados().includes("caiu"), "reiniciar não é queda");
  await m.marcados[0].f();
  m.sockets[1].ev.emit("connection.update", { connection: "open" });
  await ate(() => m.estados().includes("conectada"), "o conectada");
  assert.deepEqual(m.sockets[1].pedidosDeCodigo, []);
});

test("código não usado a tempo: desliga e espera o dono — nunca pede código em laço", async () => {
  const m = montar({ pedidos: [{ id: 1, acao: "parear", numero: NUMERO }] });
  const { ponte, base } = await novaPonte(m);
  await ponte.cumprirPedidos();
  m.sockets[0].ev.emit("connection.update", { qr: "QR" });
  await ate(() => m.estados().includes("aguardando_codigo"), "o código");
  m.sockets[0].ev.emit("connection.update", fechou(408));
  await ate(() => m.estados().at(-1) === "desligada", "o desligada");
  assert.match(m.detalhes().at(-1), /pareamento não terminou \(motivo 408\): peça outro código/);
  assert.equal(m.marcados.length, 0, "nenhuma volta marcada");
  assert.equal(await existe(join(base, "whatsapp", NUMERO)), false);
  assert.equal(ponte.conexoes.has(NUMERO), false);
});

test("queda de verdade: avisa 'caiu' e volta com espera crescente (Fibonacci)", async () => {
  const m = montar({ registrado: true });
  const { ponte } = await novaPonte(m);
  await conectado(m, ponte);
  m.sockets[0].ev.emit("connection.update", fechou(428));
  await ate(() => m.marcados.length === 1, "a primeira volta");
  assert.equal(m.marcados[0].ms, 1000);
  await m.marcados[0].f();
  m.sockets[1].ev.emit("connection.update", fechou(428));
  await ate(() => m.marcados.length === 2, "a segunda volta");
  assert.equal(m.marcados[1].ms, 2000);
  assert.deepEqual(m.estados(), ["conectada", "caiu", "caiu"]);
});

test("desconectado no celular: a sessão é apagada do aparelho e o painel mostra desligado", async () => {
  const m = montar({ registrado: true });
  const { ponte, base } = await novaPonte(m);
  await conectado(m, ponte);
  await writeFile(join(base, "whatsapp", NUMERO, "creds.json"), "{}");
  m.sockets[0].ev.emit("connection.update", fechou(DESCONECTADO));
  await ate(() => m.estados().at(-1) === "desligada", "o desligada");
  assert.equal(await existe(join(base, "whatsapp", NUMERO)), false, "a pasta da sessão sumiu");
  assert.equal(ponte.conexoes.has(NUMERO), false);
  assert.equal(m.marcados.length, 0);
});

test("conta recusada (403) ou sessão tomada por outra (440): para de insistir e guarda a sessão; 411 pede parear de novo", async () => {
  for (const [motivo, detalhe] of [[RECUSADO, /recusou esta conta/], [SUBSTITUIDA, /outra conexão entrou/]]) {
    const m = montar({ registrado: true });
    const { ponte, base } = await novaPonte(m);
    await conectado(m, ponte);
    await writeFile(join(base, "whatsapp", NUMERO, "creds.json"), "{}");
    m.sockets[0].ev.emit("connection.update", fechou(motivo));
    await ate(() => m.estados().at(-1) === "caiu", `o caiu (${motivo})`);
    assert.match(m.detalhes().at(-1), detalhe);
    assert.equal(m.marcados.length, 0, `nenhuma volta (${motivo})`);
    assert.equal(await existe(join(base, "whatsapp", NUMERO, "creds.json")), true, `a sessão fica (${motivo})`);
  }
  const m = montar({ registrado: true });
  const { ponte, base } = await novaPonte(m);
  await conectado(m, ponte);
  m.sockets[0].ev.emit("connection.update", fechou(DESCASADA));
  await ate(() => m.estados().at(-1) === "desligada", "o desligada (411)");
  assert.equal(await existe(join(base, "whatsapp", NUMERO)), false);
});

test("sessão salva que não vale mais: não pede código sozinha — espera o dono pedir", async () => {
  const m = montar({ registrado: false });
  const { ponte } = await novaPonte(m);
  await ponte.ligar(NUMERO);
  m.sockets[0].ev.emit("connection.update", { qr: "QR" });
  await ate(() => m.estados().length === 1, "o estado");
  assert.deepEqual(m.sockets[0].pedidosDeCodigo, []);
  assert.equal(m.sockets[0].fechou, true);
  assert.deepEqual([m.estados()[0], m.detalhes()[0]], ["desligada", "precisa conectar de novo"]);
  assert.equal(m.marcados.length, 0, "o 'close' do end() não vira volta");
});

test("parear um número já conectado é recusado, e o motivo aparece no painel", async () => {
  const m = montar({ registrado: true, pedidos: [] });
  const { ponte } = await novaPonte(m);
  await conectado(m, ponte);
  await m.banco.ler("whatsapp_ponte_pedidos"); // esvazia
  const pedidos = [{ id: 5, acao: "parear", numero: NUMERO }];
  m.banco.ler = async (tabela) => (tabela === "whatsapp_ponte_pedidos" ? pedidos.splice(0) : []);
  await ponte.cumprirPedidos();
  assert.equal(m.sockets.length, 1, "não abre conexão nova");
  const erro = m.chamadas.find(([k, tb, , v]) => k === "mudar" && tb === "whatsapp_ponte_pedidos" && v.erro);
  assert.match(erro[3].erro, /já está conectado/);
  assert.match(m.detalhes().at(-1), /já está conectado/);
  assert.equal(ponte.conexoes.get(NUMERO).aberta, true, "a conexão que existia continua");
});

test("desconectar com a conexão aberta sai do WhatsApp; durante uma queda, desliga aqui e não volta sozinha", async () => {
  const m = montar({ registrado: true, pedidos: [{ id: 9, acao: "desconectar", numero: NUMERO }] });
  const { ponte } = await novaPonte(m);
  await conectado(m, ponte);
  await ponte.cumprirPedidos();
  await ate(() => m.estados().at(-1) === "desligada", "o desligada");
  assert.equal(m.sockets[0].saiu, true, "logout: o aparelho sai da lista do celular");

  const m2 = montar({ registrado: true, pedidos: [] });
  const { ponte: p2 } = await novaPonte(m2);
  await conectado(m2, p2);
  m2.sockets[0].ev.emit("connection.update", fechou(428));
  await ate(() => m2.marcados.length === 1, "a volta marcada");
  const pedidos = [{ id: 10, acao: "desconectar", numero: NUMERO }];
  m2.banco.ler = async (tabela) => (tabela === "whatsapp_ponte_pedidos" ? pedidos.splice(0) : []);
  await p2.cumprirPedidos();
  assert.equal(m2.sockets[0].saiu, false, "sem conexão não há logout");
  assert.match(m2.detalhes().at(-1), /desligado aqui; confira em Aparelhos conectados/);
  await m2.marcados[0].f();
  assert.equal(m2.sockets.length, 1, "a volta marcada antes não reconecta");
});

test("mensagem nova grava e avisa o dono uma vez pela rajada; histórico grava sem avisar; grupo não entra", async () => {
  const m = montar({ registrado: true });
  const { ponte } = await novaPonte(m);
  await ponte.ligar(NUMERO);
  const msg = (id, jid = "5511977770001@s.whatsapp.net") => ({ key: { id, remoteJid: jid, fromMe: false }, pushName: "Maria", messageTimestamp: Date.parse("2026-11-20T11:59:00Z") / 1000, message: { conversation: `oi ${id}` } });
  m.sockets[0].ev.emit("messages.upsert", { type: "notify", messages: [msg("A"), msg("G", "1203@g.us")] });
  m.sockets[0].ev.emit("messages.upsert", { type: "notify", messages: [msg("B")] });
  m.sockets[0].ev.emit("messaging-history.set", { messages: [msg("H")] });
  const gravadas = () => m.chamadas.filter(([k, tb]) => k === "gravar" && tb === "whatsapp_mensagens").flatMap(([, , l]) => l.map((x) => x.wamid));
  await ate(() => gravadas().length === 3, "as três gravadas");
  assert.deepEqual(gravadas().sort(), ["web:A", "web:B", "web:H"]);
  assert.equal(m.marcados.length, 1, "um aviso só para a rajada");
  await m.marcados[0].f();
  assert.equal(m.chamadas.filter(([k]) => k === "avisar").length, 1);
});

test("a fila sai pelo número certo, com o freio, e a enviada aparece na conversa; contato estranho vira erro; sem conexão, espera", async () => {
  const m = montar({
    registrado: true,
    fila: [
      { id: 1, numero: NUMERO, contato: "5511977770001", texto: "Tem sim!" },
      { id: 2, numero: NUMERO, contato: "lid:123456789012345", texto: "segunda" },
    ],
  });
  const { ponte } = await novaPonte(m, { limitador: new Limitador({ agora: () => 0 }) });
  await conectado(m, ponte);
  await ponte.enviarFila();
  assert.deepEqual(m.sockets[0].enviados, [["5511977770001@s.whatsapp.net", { text: "Tem sim!" }]], "a segunda espera o freio de 3 s");
  const marcou = m.chamadas.find(([k, tb]) => k === "mudar" && tb === "whatsapp_saida");
  assert.deepEqual([marcou[2], marcou[3].wamid], ["id=eq.1", "web:ENV1"]);
  const naConversa = m.chamadas.find(([k, tb]) => k === "gravar" && tb === "whatsapp_mensagens")[2][0];
  assert.deepEqual([naConversa.wamid, naConversa.direcao, naConversa.contato, naConversa.texto], ["web:ENV1", "saida", "5511977770001", "Tem sim!"]);

  const m2 = montar({ registrado: true, fila: [{ id: 3, numero: NUMERO, contato: "x@evil", texto: "?" }, { id: 4, numero: "5511000000000", contato: "5511977770001", texto: "sem conexão" }] });
  const { ponte: p2 } = await novaPonte(m2);
  await conectado(m2, p2);
  await p2.enviarFila();
  assert.deepEqual(m2.chamadas.filter(([k, tb]) => k === "mudar" && tb === "whatsapp_saida").map(([, , f, v]) => [f, v.erro]), [["id=eq.3", "contato inválido"]], "o de número sem conexão fica na fila");
});

test("recibo de leitura sobe o estado sem voltar atrás; recibo de mensagem alheia não conta", async () => {
  const m = montar({ registrado: true });
  const { ponte } = await novaPonte(m);
  await ponte.recibos([{ key: { id: "ENV1", fromMe: true }, update: { status: 4 } }, { key: { id: "X", fromMe: false }, update: { status: 4 } }]);
  const recibo = m.chamadas.filter(([k, tb]) => k === "mudar" && tb === "whatsapp_mensagens");
  assert.deepEqual(recibo.map(([, , f, v]) => [f, v.estado]), [["wamid=eq.web%3AENV1&estado=in.(enviada,entregue)", "lida"]]);
});

test("ao subir, volta só quem tem sessão no aparelho; pareamento interrompido pede código novo", async () => {
  const m = montar({ registrado: true, ponteSalva: [{ numero: NUMERO, estado: "conectada" }, { numero: "5511000000001", estado: "caiu" }, { numero: "5511000000002", estado: "aguardando_codigo" }] });
  const { ponte, base } = await novaPonte(m);
  await mkdir(join(base, "whatsapp", NUMERO), { recursive: true });
  await writeFile(join(base, "whatsapp", NUMERO, "creds.json"), "{}");
  await ponte.retomar();
  assert.equal(m.sockets.length, 1);
  assert.deepEqual(m.chamadas.filter(([k]) => k === "escrever").map(([, , l]) => [l.numero, l.estado, l.detalhe]), [
    ["5511000000001", "desligada", "sem sessão neste aparelho"],
    ["5511000000002", "desligada", "a ponte reiniciou no meio do pareamento: peça outro código"],
  ]);
});
