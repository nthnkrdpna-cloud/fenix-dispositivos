// A ponte por dentro (M30 do hub): o que fazer com cada evento do WhatsApp e com cada pedido do dono.
// Sem Baileys aqui: quem abre a sessão é injetado — ponte.mjs usa o Baileys, as provas usam um falso.
import { mkdir, rm, access } from 'node:fs/promises';
import path from 'node:path';
import {
  linhaDaMensagem, dentroDoPrazo, estadoDoRecibo, anteriores, limparCodigo, espera, jidDoContato, Limitador, PREFIXO,
} from './logica.mjs';

// os motivos de desconexão que importam (DisconnectReason do Baileys 7.0.0-rc14; ponte.mjs confere)
export const DESCONECTADO = 401;
export const REINICIAR = 515;
export const RECUSADO = 403; // o WhatsApp recusou a conta: voltar em laço só piora
export const SUBSTITUIDA = 440; // outra conexão entrou com a mesma sessão: brigar por ela derruba as duas
export const DESCASADA = 411; // a sessão não serve mais (multiaparelho): só pareando de novo

const relogioReal = { agora: () => Date.now(), depois: (f, ms) => setTimeout(f, ms) };
const curto = (erro) => String(erro?.message || erro).slice(0, 233);

export function criarPonte({ banco, abrirSessao, base, limitador = new Limitador(), relogio = relogioReal, registrar = console.error }) {
  const conexoes = new Map(); // número → { sock, aberta, abriu, tentativas }
  const agoraIso = () => new Date(relogio.agora()).toISOString();
  const pastaDe = (numero) => path.join(base, 'whatsapp', numero);
  const estado = (numero, campos) => banco.escrever('whatsapp_ponte', { numero, ...campos, atualizado_em: agoraIso() }, 'numero');
  const esquecerSessao = (numero) => rm(pastaDe(numero), { recursive: true, force: true });

  // o aviso ao dono: agrupa a rajada, no máximo um a cada 13 s (o mesmo freio da função)
  let ultimoAviso = -Infinity;
  let avisoMarcado = false;
  function agendarAviso() {
    if (avisoMarcado) return;
    avisoMarcado = true;
    relogio.depois(async () => {
      avisoMarcado = false;
      ultimoAviso = relogio.agora();
      await banco.avisarDono().catch(registrar);
    }, Math.max(2_000, 13_000 - (relogio.agora() - ultimoAviso)));
  }

  async function guardar(numero, mensagens, avisar) {
    const agora = relogio.agora();
    const linhas = (mensagens || []).map((m) => linhaDaMensagem(m, numero, { agora })).filter((l) => l && dentroDoPrazo(l, agora));
    for (let i = 0; i < linhas.length; i += 89) {
      const novas = await banco.gravar('whatsapp_mensagens', linhas.slice(i, i + 89), { conflito: 'wamid', devolver: 'wamid,direcao' });
      if (avisar && novas.some((n) => n.direcao === 'entrada')) agendarAviso();
    }
  }

  async function recibos(atualizacoes) {
    for (const { key, update } of atualizacoes || []) {
      const novo = estadoDoRecibo(update?.status);
      if (!key?.fromMe || !key.id || !novo || !anteriores(novo).length) continue;
      await banco.mudar('whatsapp_mensagens', `wamid=eq.${encodeURIComponent(PREFIXO + key.id)}&estado=in.(${anteriores(novo).join(',')})`, { estado: novo });
    }
  }

  /** Tira a conexão do mapa antes de fechar: o 'close' que o end() dispara já não a acha, e não reconecta. */
  function fechar(numero) {
    const c = conexoes.get(numero);
    if (!c) return null;
    conexoes.delete(numero);
    try { c.sock.end(undefined); } catch { /* já fechada */ }
    return c;
  }

  async function ligar(numero, { parear = false } = {}) {
    const anterior = fechar(numero);
    await mkdir(pastaDe(numero), { recursive: true, mode: 0o700 });
    const { sock, state } = await abrirSessao(numero, pastaDe(numero));
    const reg = { sock, aberta: false, abriu: false, tentativas: anterior?.tentativas ?? 0 };
    conexoes.set(numero, reg);

    let pediuCodigo = false;
    sock.ev.on('connection.update', async (u) => {
      try {
        if (conexoes.get(numero) !== reg) return; // trocada ou desligada: o evento é de uma conexão velha
        if (u.qr && !state.creds.registered) {
          if (!parear) {
            // a sessão salva não vale mais: só o dono, pelo painel, pede um código novo
            fechar(numero);
            await esquecerSessao(numero);
            await estado(numero, { estado: 'desligada', codigo: null, detalhe: 'precisa conectar de novo' });
            return;
          }
          if (!pediuCodigo) {
            pediuCodigo = true;
            const codigo = limparCodigo(await sock.requestPairingCode(numero));
            await estado(numero, { estado: 'aguardando_codigo', codigo, detalhe: null });
          }
        }
        if (u.connection === 'open') {
          Object.assign(reg, { aberta: true, abriu: true, tentativas: 0 });
          await estado(numero, { estado: 'conectada', codigo: null, detalhe: null, visto_em: agoraIso() });
        }
        if (u.connection === 'close') {
          reg.aberta = false;
          const motivo = u.lastDisconnect?.error?.output?.statusCode;
          if (motivo === DESCONECTADO || motivo === DESCASADA) {
            conexoes.delete(numero);
            await esquecerSessao(numero);
            await estado(numero, { estado: 'desligada', codigo: null, detalhe: motivo === DESCONECTADO ? 'desconectado' : 'a sessão não serve mais (motivo 411): conecte de novo' });
            return;
          }
          if (motivo === RECUSADO || motivo === SUBSTITUIDA) {
            // a sessão fica no aparelho; a ponte só para de insistir com este número até reiniciar
            conexoes.delete(numero);
            await estado(numero, {
              estado: 'caiu',
              detalhe: motivo === RECUSADO
                ? 'o WhatsApp recusou esta conta (motivo 403): a ponte parou; confira o celular antes de reiniciar'
                : 'outra conexão entrou com esta sessão (motivo 440): a ponte parou para não brigar por ela',
            });
            return;
          }
          if (parear && !reg.abriu && motivo !== REINICIAR) {
            // o código não foi usado a tempo (ou a rede caiu no meio): não pede outro sozinho — pedir código
            // em laço é o tipo de coisa que o WhatsApp vigia. O dono pede de novo pelo painel.
            conexoes.delete(numero);
            await esquecerSessao(numero);
            await estado(numero, { estado: 'desligada', codigo: null, detalhe: `o pareamento não terminou (motivo ${motivo ?? '?'}): peça outro código` });
            return;
          }
          reg.tentativas += 1;
          // logo depois do pareamento o WhatsApp pede para reiniciar a conexão: isso não é queda
          if (motivo !== REINICIAR) await estado(numero, { estado: 'caiu', detalhe: `motivo ${motivo ?? '?'}` });
          // a volta é sempre sem código: se a sessão não valer mais, o 'qr' acima desliga
          relogio.depois(() => (conexoes.get(numero) === reg ? ligar(numero).catch(registrar) : null),
            motivo === REINICIAR ? 1_000 : espera(reg.tentativas));
        }
      } catch (erro) { registrar(erro); }
    });
    sock.ev.on('messages.upsert', ({ messages, type }) => { guardar(numero, messages, type === 'notify').catch(registrar); });
    sock.ev.on('messaging-history.set', ({ messages }) => { guardar(numero, messages, false).catch(registrar); });
    sock.ev.on('messages.update', (atualizacoes) => { recibos(atualizacoes).catch(registrar); });
    return reg;
  }

  async function parear(numero) {
    if (conexoes.get(numero)?.aberta) throw new Error('este número já está conectado: desconecte antes de parear de novo');
    fechar(numero);
    await estado(numero, { estado: 'pedindo_codigo', codigo: null, detalhe: null, visto_em: agoraIso() });
    await banco.gravar('whatsapp_numeros', [{ phone_number_id: numero, apelido: `WhatsApp Web · ${numero.slice(-4)}`, exibicao: `+${numero}` }], { conflito: 'phone_number_id' });
    await esquecerSessao(numero); // pareamento novo começa limpo
    await ligar(numero, { parear: true });
  }

  async function desligar(numero) {
    const c = conexoes.get(numero);
    if (c?.aberta) {
      // o WhatsApp tira o aparelho da lista do celular; o 'close' (desconectado) que vem depois limpa o resto
      try { await c.sock.logout(); return; } catch (erro) { registrar(erro); }
    }
    fechar(numero);
    await esquecerSessao(numero);
    await estado(numero, {
      estado: 'desligada', codigo: null,
      detalhe: c?.abriu ? 'desligado aqui; confira em Aparelhos conectados, no celular' : 'desconectado',
    });
  }

  async function cumprirPedidos() {
    for (const p of await banco.ler('whatsapp_ponte_pedidos', 'feito_em=is.null&erro=is.null&order=criado_em.asc&limit=5')) {
      try {
        await (p.acao === 'parear' ? parear(p.numero) : desligar(p.numero));
        await banco.mudar('whatsapp_ponte_pedidos', `id=eq.${Number(p.id)}`, { feito_em: agoraIso() });
      } catch (erro) {
        // o painel lê o detalhe do número, não o pedido: o erro vai para os dois
        await banco.mudar('whatsapp_ponte_pedidos', `id=eq.${Number(p.id)}`, { erro: curto(erro) }).catch(registrar);
        await estado(p.numero, { detalhe: curto(erro) }).catch(registrar);
      }
    }
  }

  async function enviarFila() {
    for (const s of await banco.ler('whatsapp_saida', 'enviado_em=is.null&erro=is.null&order=criado_em.asc&limit=13')) {
      const c = conexoes.get(s.numero);
      if (!c?.aberta) continue; // espera a conexão voltar
      if (!limitador.podeAgora().ok) return; // o freio: o resto sai nos próximos ciclos
      const jid = jidDoContato(s.contato);
      if (!jid) { await banco.mudar('whatsapp_saida', `id=eq.${Number(s.id)}`, { erro: 'contato inválido' }); continue; }
      let enviada;
      try {
        enviada = await c.sock.sendMessage(jid, { text: s.texto });
        limitador.registrar();
      } catch (erro) {
        await banco.mudar('whatsapp_saida', `id=eq.${Number(s.id)}`, { erro: curto(erro) });
        continue;
      }
      await banco.mudar('whatsapp_saida', `id=eq.${Number(s.id)}`, { enviado_em: agoraIso(), wamid: `${PREFIXO}${enviada?.key?.id}` });
      // o Baileys costuma ecoar a mensagem enviada; se não ecoar, ela aparece na conversa do mesmo jeito
      await guardar(s.numero, [enviada], false);
    }
  }

  async function sinalDeVida() {
    const vivos = [...conexoes.keys()];
    if (vivos.length) await banco.mudar('whatsapp_ponte', `numero=in.(${vivos.join(',')})`, { visto_em: agoraIso() });
  }

  /** Ao subir: os números que estavam conectados voltam, se a sessão ainda existir no aparelho. */
  async function retomar() {
    for (const { numero, estado: antes } of await banco.ler('whatsapp_ponte', 'estado=neq.desligada&select=numero,estado')) {
      try {
        if (antes === 'pedindo_codigo' || antes === 'aguardando_codigo') {
          await esquecerSessao(numero);
          await estado(numero, { estado: 'desligada', codigo: null, detalhe: 'a ponte reiniciou no meio do pareamento: peça outro código' });
          continue;
        }
        const temSessao = await access(path.join(pastaDe(numero), 'creds.json')).then(() => true, () => false);
        if (temSessao) await ligar(numero);
        else await estado(numero, { estado: 'desligada', codigo: null, detalhe: 'sem sessão neste aparelho' });
      } catch (erro) { registrar(erro); }
    }
  }

  return { conexoes, ligar, parear, desligar, guardar, recibos, cumprirPedidos, enviarFila, sinalDeVida, retomar };
}
