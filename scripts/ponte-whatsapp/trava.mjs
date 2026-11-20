// Uma ponte por aparelho. Duas usariam o mesmo refresh token (o Supabase derruba a sessão reusada) e a
// mesma sessão do WhatsApp (uma derrubaria a outra, em laço — o motivo 440).
import { open, readFile, rm, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const viva = (pid) => {
  try { process.kill(pid, 0); return true; } catch (erro) { return erro.code === 'EPERM'; }
};

/** Trava o arquivo para este processo; devolve a função que solta. Trava de processo morto é retomada. */
export async function travar(arquivo, pid = process.pid) {
  await mkdir(dirname(arquivo), { recursive: true, mode: 0o700 });
  for (let vez = 0; vez < 2; vez += 1) {
    try {
      const f = await open(arquivo, 'wx', 0o600);
      await f.writeFile(String(pid));
      await f.close();
      return () => rm(arquivo, { force: true });
    } catch (erro) {
      if (erro.code !== 'EEXIST') throw erro;
      const outro = Number(await readFile(arquivo, 'utf8').catch(() => ''));
      if (outro && outro !== pid && viva(outro)) throw new Error(`já há uma ponte rodando neste aparelho (pid ${outro})`);
      await rm(arquivo, { force: true }); // sobrou de uma ponte que caiu sem soltar
    }
  }
  throw new Error(`não consegui travar ${arquivo}`);
}
