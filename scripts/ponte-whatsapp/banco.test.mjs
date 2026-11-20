import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { criarBanco } from "./banco.mjs";

const URL_SB = "https://exemplo.supabase.co";

function supabaseFalso() {
  const pedidos = [];
  let n = 0;
  const fetch = async (url, init = {}) => {
    pedidos.push({ url, init, corpo: init.body ? JSON.parse(init.body) : null });
    if (url.includes("/auth/v1/token")) {
      n += 1;
      return Response.json({ access_token: `acesso-${n}`, refresh_token: `renova-${n}`, expires_in: 3600 });
    }
    if (url.includes("select=wamid")) return Response.json([{ wamid: "web:1", direcao: "entrada" }]);
    if (url.includes("/functions/v1/whatsapp/avisar")) return new Response(null, { status: 202 });
    return new Response(init.method === "GET" || !init.method ? "[]" : null, { status: init.method === "PATCH" ? 204 : 200 });
  };
  return { fetch, pedidos };
}

test("entrar guarda só o refresh token, com permissão 600; a senha não vai para o arquivo", async () => {
  const pasta = await mkdtemp(join(tmpdir(), "ponte-"));
  const arquivo = join(pasta, "ponte.json");
  const { fetch, pedidos } = supabaseFalso();
  await criarBanco({ arquivo, fetch }).entrar({ supabase_url: URL_SB, anon_key: "anon", email: "ponte@exemplo.dev", senha: "segredo-de-teste" });
  const guardado = await readFile(arquivo, "utf8");
  assert.deepEqual(JSON.parse(guardado), { supabase_url: URL_SB, anon_key: "anon", refresh_token: "renova-1" });
  assert.doesNotMatch(guardado, /segredo-de-teste|ponte@exemplo/);
  assert.equal((await stat(arquivo)).mode & 0o777, 0o600);
  assert.match(pedidos[0].url, /grant_type=password$/);
});

test("depois, renova pelo refresh token e grava o novo; os pedidos vão com o acesso da ponte", async () => {
  const pasta = await mkdtemp(join(tmpdir(), "ponte-"));
  const arquivo = join(pasta, "ponte.json");
  await writeFile(arquivo, JSON.stringify({ supabase_url: URL_SB, anon_key: "anon", refresh_token: "antigo" }));
  const { fetch, pedidos } = supabaseFalso();
  const banco = criarBanco({ arquivo, fetch });
  await banco.ler("whatsapp_ponte_pedidos", "feito_em=is.null");
  assert.match(pedidos[0].url, /grant_type=refresh_token$/);
  assert.deepEqual(pedidos[0].corpo, { refresh_token: "antigo" });
  assert.equal(pedidos[1].init.headers.Authorization, "Bearer acesso-1");
  assert.equal(JSON.parse(await readFile(arquivo, "utf8")).refresh_token, "renova-1", "o refresh token novo substitui o gasto");
  assert.deepEqual(await readdir(pasta), ["ponte.json"], "a troca é atômica: não sobra arquivo pela metade");
  assert.equal((await stat(arquivo)).mode & 0o777, 0o600);
  await banco.ler("whatsapp_saida", "enviado_em=is.null");
  assert.equal(pedidos.filter((p) => p.url.includes("/auth/")).length, 1, "o acesso vale até perto de vencer: não renova a cada pedido");
});

test("gravar devolve só o que entrou de fato; escrever é upsert; avisar chama a função", async () => {
  const pasta = await mkdtemp(join(tmpdir(), "ponte-"));
  const arquivo = join(pasta, "ponte.json");
  await writeFile(arquivo, JSON.stringify({ supabase_url: URL_SB, anon_key: "anon", refresh_token: "r" }));
  const { fetch, pedidos } = supabaseFalso();
  const banco = criarBanco({ arquivo, fetch });
  const novas = await banco.gravar("whatsapp_mensagens", [{ wamid: "web:1" }], { conflito: "wamid", devolver: "wamid,direcao" });
  assert.deepEqual(novas, [{ wamid: "web:1", direcao: "entrada" }]);
  const g = pedidos.find((p) => p.url.includes("whatsapp_mensagens"));
  assert.equal(g.init.headers.Prefer, "resolution=ignore-duplicates,return=representation");
  assert.match(g.url, /on_conflict=wamid&select=wamid,direcao$/);
  await banco.escrever("whatsapp_ponte", { numero: "5511988880001", estado: "conectada" }, "numero");
  assert.equal(pedidos.at(-1).init.headers.Prefer, "resolution=merge-duplicates,return=minimal");
  assert.equal(await banco.avisarDono(), 202);
});

test("sem entrar antes, o erro diz o que fazer; URL sem https é recusada", async () => {
  const pasta = await mkdtemp(join(tmpdir(), "ponte-"));
  const arquivo = join(pasta, "ponte.json");
  await assert.rejects(criarBanco({ arquivo, fetch: supabaseFalso().fetch }).ler("x", ""), /--entrar/, "sem arquivo nenhum");
  await writeFile(arquivo, JSON.stringify({ supabase_url: URL_SB, anon_key: "anon" }));
  await assert.rejects(criarBanco({ arquivo, fetch: supabaseFalso().fetch }).ler("x", ""), /--entrar/);
  await writeFile(arquivo, JSON.stringify({ supabase_url: "http://exemplo", anon_key: "anon", refresh_token: "r" }));
  await assert.rejects(criarBanco({ arquivo, fetch: supabaseFalso().fetch }).ler("x", ""), /https/);
});
