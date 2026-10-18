# fenix-dispositivos

O subsistema Fênix de **dispositivos próprios do operador**: o app Android Fênix Hub, a frota de
aparelhos (G15, G75, Redmi), o bootstrap do Termux e a auditoria da rede local de casa.

Até 05/10/2026 tudo isto morava em `nthnkrdpna-cloud/hub`. Saiu de lá porque o site não depende
de nada daqui (`app/web`, o Worker e o `supabase` do hub não referenciam estes arquivos) e
porque misturar ferramenta de aparelho e de rede com o produto deixava o hub mais difícil de
revisar. **Nada foi apagado:** o histórico continua no hub, e veio para cá junto
(ver `docs/proveniencia/`).

## O que tem aqui

| Caminho | O que é |
|---|---|
| `android/fenix-hub/` | app Android (API 36, Java 17, sem dependência de UI externa), console offline e ponte Termux com lista fechada de comandos |
| `scripts/dispositivos/` | frota (`discover`, `optimize`, `rollback`), diagnóstico, contrato de capacidade, build portátil do APK, bootstrap do Termux |
| `scripts/rede/` | auditoria da rede local e estado reversível (registro antes, retorno, evidência depois) |
| `scripts/fenix.mjs` | a CLI que o app chama (`node scripts/fenix.mjs …`) |
| `scripts/continuidade/neuralese.mjs` | **cópia** do hub, usada pelo build do APK. A fonte é `hub/scripts/continuidade/neuralese.mjs` |
| `docs/FENIX_*.md`, `docs/handoffs/` | arquitetura, build, gate de release, workspaces, handoffs do Moto G15 |
| `ci-desativado/workflows/` | os quatro workflows `fenix-*` do hub, **desligados** (ver o LEIA-ME de lá) |

## Dependência do hub

`status check`, `vault harvest` e `quota status` são da continuidade, que fica no hub. A CLI
procura um checkout dele em `FENIX_HUB_DIR` (padrão: `../hub`, ao lado deste repositório). Se
não achar, recusa dizendo o que falta, sem rodar nada pela metade.

```sh
FENIX_HUB_DIR=~/hub node scripts/fenix.mjs status check
node scripts/fenix.mjs fleet discover        # roda aqui
```

## Testar

Sem dependência, `node --test` de fábrica:

```sh
node --test scripts/*.test.mjs scripts/dispositivos/*.test.mjs scripts/continuidade/*.test.mjs
```

O build do APK (`scripts/dispositivos/build-fenix-hub-portable.sh`) baixa JDK, Gradle e o SDK do
Android, com URL e SHA-256 fixados. Ele não lê secret de aplicação nenhum.
