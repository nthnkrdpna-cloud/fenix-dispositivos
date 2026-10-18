# fenix-dispositivos

Lido a cada sessão. Curto de propósito.

## O que é

Ferramentas para os **aparelhos e a rede do próprio operador**: o app Fênix Hub, a frota
Android, o Termux, a rede de casa. Saiu do `hub` em 05/10/2026. A história e o motivo estão em
`README.md` e em `hub/docs/DECISIONS.md`.

## Regras

1. **Só equipamento do operador, com consentimento.** Nada aqui descobre, enumera ou mexe em
   aparelho ou rede de terceiros. Toda alteração tem registro anterior, caminho de volta e
   evidência depois (`scripts/rede/estado-reversivel.mjs`, `fleet rollback`).
2. **Nenhum secret** em arquivo, log ou commit. O build do APK não lê secret de aplicação, e
   `fenix-hub-android.test.mjs` cobra isso.
3. **A ponte Termux é lista fechada.** Comando novo no `MainActivity.isAllowedCommand` é igualdade
   exata, nunca `matches`/regex, e entra no teste de lista.
4. **Actions desligado de propósito.** A cota de Actions é da conta inteira, e uma noite de ~300
   runs já deixou os cinco repositórios sem CI. Os workflows ficam em `ci-desativado/`. Religar
   um é decisão do operador, e de preferência só com `workflow_dispatch`.
5. **Continuidade é do hub.** `scripts/continuidade/neuralese.mjs` é cópia; mudança nele nasce no
   hub e é copiada para cá, nunca o contrário.
6. **Nunca empurrar na `main`.** Sempre branch + PR, com portão local verde antes do push:
   `node --test scripts/*.test.mjs scripts/dispositivos/*.test.mjs scripts/continuidade/*.test.mjs`.
