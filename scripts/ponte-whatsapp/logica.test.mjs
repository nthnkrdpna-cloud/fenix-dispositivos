import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizarNumero, contatoDaChave, jidDoContato, desembrulhar, textoDe, tipoDe, segundos, linhaDaMensagem,
  dentroDoPrazo, estadoDoRecibo, anteriores, limparCodigo, espera, Limitador,
} from "./logica.mjs";

test("o número do dono vira o formato do WhatsApp", () => {
  assert.equal(normalizarNumero("(11) 99999-0001"), "5511999990001");
  assert.equal(normalizarNumero("+1 415 555 0100"), "14155550100", "com +, o país já veio: nada de 55 na frente");
  assert.equal(normalizarNumero("00 44 20 7946 0958"), "442079460958");
  assert.equal(normalizarNumero("12345"), null);
});

test("o contato: número quando houver, LID quando não; grupo, status e canal ficam de fora", () => {
  assert.equal(contatoDaChave({ remoteJid: "5511977770001@s.whatsapp.net" }), "5511977770001");
  assert.equal(contatoDaChave({ remoteJid: "5511977770001:12@s.whatsapp.net" }), "5511977770001", "o aparelho sai");
  assert.equal(contatoDaChave({ remoteJid: "123456789012345@lid", remoteJidAlt: "5511977770001@s.whatsapp.net" }), "5511977770001", "o número do campo alternativo vale mais");
  assert.equal(contatoDaChave({ remoteJid: "123456789012345@lid" }), "lid:123456789012345");
  for (const j of ["120363000000000000@g.us", "status@broadcast", "120363000000000000@newsletter"]) assert.equal(contatoDaChave({ remoteJid: j }), null, j);
  assert.equal(contatoDaChave({}), null);
  assert.equal(jidDoContato("5511977770001"), "5511977770001@s.whatsapp.net");
  assert.equal(jidDoContato("lid:123456789012345"), "123456789012345@lid");
  assert.equal(jidDoContato("x@evil"), null);
});

test("cada tipo de mensagem vira texto legível; o que não é conversa não entra", () => {
  assert.equal(textoDe({ conversation: "oi" }), "oi");
  assert.equal(textoDe({ extendedTextMessage: { text: "com link" } }), "com link");
  assert.equal(textoDe({ imageMessage: { caption: "cardápio" } }), "[imagem] cardápio");
  assert.equal(textoDe({ audioMessage: { ptt: true } }), "[áudio de voz]");
  assert.equal(textoDe({ reactionMessage: { text: "👍" } }), "👍 (reação)");
  assert.equal(textoDe({ locationMessage: { degreesLatitude: -23.5, degreesLongitude: -46.6 } }), "[localização] -23.5,-46.6");
  assert.equal(textoDe({ protocolMessage: { type: 0 } }), null, "aviso do protocolo não é conversa");
  assert.equal(textoDe({ senderKeyDistributionMessage: {}, conversation: "oi" }), "oi");
  assert.equal(tipoDe({ messageContextInfo: {}, imageMessage: {} }), "image");
  assert.deepEqual(desembrulhar({ ephemeralMessage: { message: { viewOnceMessageV2: { message: { imageMessage: { caption: "x" } } } } } }), { imageMessage: { caption: "x" } });
});

test("o horário vem em segundos, às vezes como Long", () => {
  assert.equal(segundos(1763640000), 1763640000);
  assert.equal(segundos({ low: 1763640000, high: 0 }), 1763640000);
  assert.equal(segundos({ toNumber: () => 42 }), 42);
  assert.equal(segundos(undefined), 0);
});

test("a mensagem vira a linha do banco: web:, direção, nome só de quem escreveu", () => {
  const entrada = linhaDaMensagem({
    key: { id: "3EB0AA", remoteJid: "5511977770001@s.whatsapp.net", fromMe: false },
    pushName: "Dona Maria", messageTimestamp: 1763640000, message: { conversation: "Tem bolo hoje?" },
  }, "5511988880001");
  assert.deepEqual(entrada, {
    wamid: "web:3EB0AA", phone_number_id: "5511988880001", direcao: "entrada", contato: "5511977770001", contato_nome: "Dona Maria",
    tipo: "text", texto: "Tem bolo hoje?", estado: "recebida", quando: new Date(1763640000 * 1000).toISOString(),
  });
  const saida = linhaDaMensagem({ key: { id: "3EB0BB", remoteJid: "5511977770001@s.whatsapp.net", fromMe: true }, pushName: "Eu", message: { conversation: "Tem sim" } }, "5511988880001", { agora: 0 });
  assert.equal(saida.direcao, "saida");
  assert.equal(saida.contato_nome, null);
  assert.equal(saida.estado, "enviada");
  assert.equal(linhaDaMensagem({ key: { id: "G1", remoteJid: "1203@g.us" }, message: { conversation: "grupo" } }, "5511988880001"), null);
  assert.equal(linhaDaMensagem({ key: { id: "P1", remoteJid: "5511977770001@s.whatsapp.net" }, message: { protocolMessage: {} } }, "5511988880001"), null);
});

test("só entra o que tem menos de 89 dias", () => {
  const agora = Date.parse("2026-11-20T12:00:00Z");
  assert.equal(dentroDoPrazo({ quando: "2026-11-01T00:00:00Z" }, agora), true);
  assert.equal(dentroDoPrazo({ quando: "2026-08-01T00:00:00Z" }, agora), false);
});

test("recibo, código e reconexão", () => {
  assert.equal(estadoDoRecibo(3), "entregue");
  assert.equal(estadoDoRecibo(4), "lida");
  assert.equal(estadoDoRecibo(1), null, "pendente não muda nada");
  assert.deepEqual(anteriores("lida"), ["enviada", "entregue"]);
  assert.equal(limparCodigo("abcd-1234"), "ABCD1234");
  assert.equal(limparCodigo("abc"), null);
  assert.deepEqual([1, 2, 4, 5, 99].map((n) => espera(n)), [1000, 2000, 5000, 8000, 89000], "a n-ésima tentativa espera o n-ésimo Fibonacci, até 89 s");
});

test("o limitador segura o ritmo: uma a cada 3 s e 55 por hora", () => {
  let t = 0;
  const l = new Limitador({ agora: () => t });
  assert.equal(l.podeAgora().ok, true);
  l.registrar();
  t = 1000;
  assert.deepEqual(l.podeAgora(), { ok: false, esperar: 2000 });
  for (let i = 1; i < 55; i += 1) { t += 3000; assert.equal(l.podeAgora().ok, true); l.registrar(); }
  t += 3000;
  assert.equal(l.podeAgora().ok, false, "a 56ª da hora espera");
  t = 3_600_001;
  assert.equal(l.podeAgora().ok, true, "passada a hora, libera");
});
