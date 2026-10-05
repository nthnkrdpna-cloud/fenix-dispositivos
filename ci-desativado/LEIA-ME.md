# Workflows desligados

Os quatro workflows `fenix-*` vieram do hub com o histórico, mas fora de `.github/workflows/`.
Assim, nenhum push daqui dispara run e nada gasta a cota de Actions da conta.

| Arquivo | O que fazia no hub | Aqui |
|---|---|---|
| `fenix-hub-android.yml` | build e verificação do APK (apksigner, zipalign, badging) em push/PR que tocasse `android/fenix-hub/**` | é o único que faz sentido religar |
| `fenix-runner-probe.yml` | sonda de disponibilidade do runner (29/09, quando o runner morria antes dos passos) | diagnóstico pontual, sem uso contínuo |
| `fenix-continuum.yml`, `fenix-continuum-main.yml` | `node --test scripts/continuidade/*.test.mjs …` | **obsoletos aqui:** testam a continuidade, que ficou no hub, onde `verificar.yml` roda os mesmos testes |

## Para religar um

1. Mover o arquivo para `.github/workflows/`.
2. Trocar os gatilhos `push`/`pull_request` por `workflow_dispatch`, para rodar só quando alguém
   pedir.
3. Prender as actions por SHA, como o hub fez no F3.
4. Fazer isso num PR, com o operador decidindo.
