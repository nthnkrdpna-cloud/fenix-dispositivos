// A ponte do WhatsApp Web (M30 do hub): a parte pura, sem Baileys e sem rede, para o node:test.
// Daqui saem: quem é o contato (número ou LID), o texto de cada tipo de mensagem, a linha que vai
// para `whatsapp_mensagens`, o limitador de envio e a espera entre reconexões.

export const PREFIXO = 'web:';
export const PRAZO_DIAS = 89; // o mesmo esquecimento do banco (whatsapp_esquecer)

/** O que o dono digita → só dígitos, com o 55 do Brasil quando vier só DDD e número. */
export function normalizarNumero(texto) {
  const bruto = String(texto || '').trim();
  const d = bruto.replace(/\D/g, '');
  // com + (ou 00) na frente, o país já veio; sem, 10 ou 11 dígitos são DDD e número do Brasil
  const n = /^(\+|00)/.test(bruto) ? d.replace(/^00/, '') : d.length === 10 || d.length === 11 ? `55${d}` : d;
  return /^[0-9]{10,15}$/.test(n) ? n : null;
}

/** '5511999990001:12@s.whatsapp.net' → '5511999990001@s.whatsapp.net' (o aparelho sai). */
export const jidSemAparelho = (jid) => String(jid || '').replace(/:\d+@/, '@');

/**
 * O contato de uma mensagem: o número quando houver (direto ou no campo alternativo do LID), senão
 * `lid:<id>`. Grupo, status e canal ficam de fora: a ponte é para conversa de uma pessoa.
 */
export function contatoDaChave(chave) {
  const jids = [chave?.remoteJid, chave?.remoteJidAlt].filter(Boolean).map(jidSemAparelho);
  if (!jids.length || jids.some((j) => /@g\.us$|@broadcast$|@newsletter$/.test(j))) return null;
  const numero = jids.find((j) => j.endsWith('@s.whatsapp.net'));
  if (numero) return numero.split('@')[0];
  const lid = jids.find((j) => j.endsWith('@lid'));
  return lid ? `lid:${lid.split('@')[0]}` : null;
}

/** O caminho de volta: o contato gravado → o endereço para responder. */
export function jidDoContato(contato) {
  const lid = /^lid:(\d{5,30})$/.exec(String(contato || ''));
  if (lid) return `${lid[1]}@lid`;
  return /^\d{8,15}$/.test(String(contato || '')) ? `${contato}@s.whatsapp.net` : null;
}

const EMBRULHOS = ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension', 'documentWithCaptionMessage', 'editedMessage'];

/** Mensagem temporária, de visualização única ou editada vem embrulhada: tira o embrulho. */
export function desembrulhar(conteudo) {
  let c = conteudo;
  for (let i = 0; c && i < 5; i += 1) {
    const chave = EMBRULHOS.find((k) => c[k]?.message);
    if (!chave) break;
    c = c[chave].message;
  }
  return c || null;
}

const TIPOS = {
  conversation: 'text', extendedTextMessage: 'text', imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio',
  documentMessage: 'document', stickerMessage: 'sticker', locationMessage: 'location', liveLocationMessage: 'location',
  contactMessage: 'contacts', contactsArrayMessage: 'contacts', reactionMessage: 'reaction', pollCreationMessage: 'poll',
  pollCreationMessageV3: 'poll', buttonsResponseMessage: 'button', listResponseMessage: 'interactive', templateButtonReplyMessage: 'button',
};
// o que não é conversa: chaves de cifra, avisos do protocolo, voto de enquete cifrado
const IGNORAR = new Set(['protocolMessage', 'senderKeyDistributionMessage', 'messageContextInfo', 'pollUpdateMessage', 'keepInChatMessage']);

export function tipoDe(conteudo) {
  const chave = Object.keys(conteudo || {}).find((k) => !IGNORAR.has(k));
  return chave ? (TIPOS[chave] || chave.replace(/Message$/, '')).slice(0, 34) : null;
}

/** O texto que o painel mostra. `null` quer dizer "não é conversa": não entra no banco. */
export function textoDe(conteudo) {
  const c = conteudo || {};
  if (c.conversation) return c.conversation;
  if (c.extendedTextMessage) return c.extendedTextMessage.text ?? '';
  if (c.imageMessage) return c.imageMessage.caption ? `[imagem] ${c.imageMessage.caption}` : '[imagem]';
  if (c.videoMessage) return c.videoMessage.caption ? `[vídeo] ${c.videoMessage.caption}` : '[vídeo]';
  if (c.audioMessage) return c.audioMessage.ptt ? '[áudio de voz]' : '[áudio]';
  if (c.documentMessage) return `[documento] ${c.documentMessage.fileName || c.documentMessage.caption || ''}`.trim();
  if (c.stickerMessage) return '[figurinha]';
  const local = c.locationMessage || c.liveLocationMessage;
  if (local) return `[localização] ${[local.name, local.address].filter(Boolean).join(' · ') || `${local.degreesLatitude},${local.degreesLongitude}`}`;
  if (c.contactMessage || c.contactsArrayMessage) return '[contato compartilhado]';
  if (c.reactionMessage) return c.reactionMessage.text ? `${c.reactionMessage.text} (reação)` : '(reação removida)';
  const enquete = c.pollCreationMessage || c.pollCreationMessageV3;
  if (enquete) return `[enquete] ${enquete.name || ''}`.trim();
  if (c.buttonsResponseMessage) return c.buttonsResponseMessage.selectedDisplayText || '[resposta]';
  if (c.listResponseMessage) return c.listResponseMessage.title || '[resposta]';
  if (c.templateButtonReplyMessage) return c.templateButtonReplyMessage.selectedDisplayText || '[resposta]';
  const tipo = tipoDe(c);
  return tipo ? `[${tipo}]` : null;
}

/** O horário do WhatsApp vem em segundos, às vezes como Long ({ low, high }). */
export function segundos(ts) {
  if (ts == null) return 0;
  if (typeof ts === 'object') return typeof ts.toNumber === 'function' ? ts.toNumber() : Number(ts.low) + Number(ts.high || 0) * 2 ** 32;
  return Number(ts) || 0;
}

const corta = (s, n) => (s == null ? null : String(s).slice(0, n));

/** Uma mensagem do Baileys → a linha de `whatsapp_mensagens`, ou null se não for conversa. */
export function linhaDaMensagem(m, numero, { agora = Date.now() } = {}) {
  const id = m?.key?.id;
  const contato = contatoDaChave(m?.key);
  const conteudo = desembrulhar(m?.message);
  if (!id || !contato || !conteudo) return null;
  const texto = textoDe(conteudo);
  if (texto === null) return null;
  const deMim = Boolean(m.key.fromMe);
  const s = segundos(m.messageTimestamp);
  return {
    wamid: corta(`${PREFIXO}${id}`, 233),
    phone_number_id: numero,
    direcao: deMim ? 'saida' : 'entrada',
    contato: corta(contato, 89),
    contato_nome: deMim ? null : corta(m.pushName || null, 89),
    tipo: tipoDe(conteudo) || 'desconhecido',
    texto: corta(texto, 4096),
    estado: deMim ? 'enviada' : 'recebida',
    quando: new Date(s > 0 ? s * 1000 : agora).toISOString(),
  };
}

export const dentroDoPrazo = (linha, agora = Date.now()) => agora - new Date(linha.quando).getTime() < PRAZO_DIAS * 86_400_000;

// o recibo do WhatsApp (WAMessageStatus): 0 erro, 2 no servidor, 3 entregue, 4 lida, 5 ouvida
const RECIBOS = { 0: 'falhou', 2: 'enviada', 3: 'entregue', 4: 'lida', 5: 'lida' };
export const estadoDoRecibo = (status) => RECIBOS[status] ?? null;

/** Estados que um recibo novo pode substituir: "lida" não volta a "entregue". */
export function anteriores(estado) {
  if (estado === 'falhou') return ['enviada'];
  const ordem = ['enviada', 'entregue', 'lida'];
  const i = ordem.indexOf(estado);
  return i > 0 ? ordem.slice(0, i) : [];
}

export function limparCodigo(codigo) {
  const c = String(codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === 8 ? c : null;
}

// entre reconexões, a espera cresce em Fibonacci e para em 89 s
const FIB = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
export const espera = (tentativa) => FIB[Math.min(Math.max(tentativa, 1), FIB.length) - 1] * 1000;

/**
 * O freio do envio: ritmo de gente, não de robô. Uma mensagem a cada 3 s no máximo e 55 por hora.
 * Quem manda muito e rápido por aparelho vinculado é quem o WhatsApp bane.
 */
export class Limitador {
  constructor({ intervaloMs = 3000, porHora = 55, agora = () => Date.now() } = {}) {
    Object.assign(this, { intervaloMs, porHora, agora, envios: [] });
  }

  podeAgora() {
    const t = this.agora();
    this.envios = this.envios.filter((x) => t - x < 3_600_000);
    const ultimo = this.envios[this.envios.length - 1];
    if (ultimo != null && t - ultimo < this.intervaloMs) return { ok: false, esperar: this.intervaloMs - (t - ultimo) };
    if (this.envios.length >= this.porHora) return { ok: false, esperar: 3_600_000 - (t - this.envios[0]) };
    return { ok: true, esperar: 0 };
  }

  registrar() { this.envios.push(this.agora()); }
}
