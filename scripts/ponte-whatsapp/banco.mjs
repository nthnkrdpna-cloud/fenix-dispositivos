// A ponte fala com o Supabase pela conta de papel `ponte` (M30 do hub): a RLS deixa ela gravar só o
// canal dela, cumprir pedidos e enviar a fila — nada além. Sem biblioteca: `fetch` e o PostgREST.
//
// Guarda só o refresh token, em ~/.fenix/ponte.json, com permissão 600. A senha é digitada uma vez
// (`node ponte.mjs --entrar`) e não fica em arquivo, variável nem log.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

const RENOVAR_ANTES_MS = 5 * 60_000;

export function criarBanco({ arquivo, fetch: buscar = fetch, agora = () => Date.now() }) {
  let cfg = null;
  let acesso = null;

  async function lerCfg() {
    if (!cfg) {
      const texto = await readFile(arquivo, 'utf8').catch((erro) => {
        throw erro.code === 'ENOENT' ? new Error('a ponte ainda não entrou: rode `node ponte.mjs --entrar`') : erro;
      });
      cfg = JSON.parse(texto);
    }
    if (!/^https:\/\//.test(cfg.supabase_url || '') || !cfg.anon_key) throw new Error(`${arquivo}: faltam supabase_url (https) e anon_key`);
    return cfg;
  }

  async function guardarCfg() {
    await mkdir(dirname(arquivo), { recursive: true, mode: 0o700 });
    // grava ao lado e troca de nome: um desligamento no meio não deixa o arquivo pela metade (o refresh
    // token velho já não vale depois de renovado, então perder o novo obrigaria a entrar de novo)
    await writeFile(`${arquivo}.novo`, `${JSON.stringify(cfg, null, 2)}\n`, { mode: 0o600 });
    await rename(`${arquivo}.novo`, arquivo);
  }

  async function obterToken(tipo, corpo) {
    const c = await lerCfg();
    const r = await buscar(`${c.supabase_url}/auth/v1/token?grant_type=${tipo}`, {
      method: 'POST', headers: { apikey: c.anon_key, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.access_token || !j.refresh_token) throw new Error(`login da ponte recusado (${r.status} ${j.error_code || j.error || ''})`.trim());
    acesso = { token: j.access_token, ate: agora() + (Number(j.expires_in) || 3600) * 1000 };
    cfg.refresh_token = j.refresh_token; // o Supabase troca o refresh token a cada uso: o novo fica guardado
    await guardarCfg();
  }

  async function token() {
    if (!acesso || acesso.ate - agora() < RENOVAR_ANTES_MS) {
      const c = await lerCfg();
      if (!c.refresh_token) throw new Error('a ponte ainda não entrou: rode `node ponte.mjs --entrar`');
      await obterToken('refresh_token', { refresh_token: c.refresh_token });
    }
    return acesso.token;
  }

  async function pedir(caminho, init = {}) {
    const c = await lerCfg();
    const r = await buscar(`${c.supabase_url}${caminho}`, {
      ...init, headers: { apikey: c.anon_key, Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
    if (r.status === 401) acesso = null; // o próximo pedido renova
    return r;
  }

  async function exigir(r, oque) {
    if (r.ok) return r;
    throw new Error(`${oque}: ${r.status} ${(await r.text().catch(() => '')).slice(0, 144)}`);
  }

  return {
    /** Primeira vez: e-mail e senha da conta ponte → só o refresh token fica guardado. */
    async entrar({ supabase_url, anon_key, email, senha }) {
      cfg = { supabase_url, anon_key };
      await lerCfg();
      await obterToken('password', { email, password: senha });
    },
    async ler(tabela, filtro) {
      return (await exigir(await pedir(`/rest/v1/${tabela}?${filtro}`), tabela)).json();
    },
    /** Insere sem repetir (on conflict do nothing). Com `devolver`, só as linhas que entraram de fato. */
    async gravar(tabela, linhas, { conflito, devolver = null } = {}) {
      const r = await pedir(`/rest/v1/${tabela}?on_conflict=${conflito}${devolver ? `&select=${devolver}` : ''}`, {
        method: 'POST',
        headers: { Prefer: `resolution=ignore-duplicates,return=${devolver ? 'representation' : 'minimal'}` },
        body: JSON.stringify(linhas),
      });
      await exigir(r, tabela);
      return devolver ? r.json() : [];
    },
    /** Insere ou atualiza pela chave (o estado de um número). */
    async escrever(tabela, linha, conflito) {
      await exigir(await pedir(`/rest/v1/${tabela}?on_conflict=${conflito}`, {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([linha]),
      }), tabela);
    },
    async mudar(tabela, filtro, valores) {
      await exigir(await pedir(`/rest/v1/${tabela}?${filtro}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(valores),
      }), tabela);
    },
    /** Pede à função `whatsapp` o aviso ao dono (push). 429 é o freio da função: tudo bem. */
    async avisarDono() {
      const r = await pedir('/functions/v1/whatsapp/avisar', { method: 'POST', body: '{}' });
      return r.status;
    },
  };
}
