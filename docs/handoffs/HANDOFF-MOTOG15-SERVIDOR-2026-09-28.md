# HANDOFF — Moto G15 como executor persistente 24/7

Data: 2026-09-28
Protocolo: Fênix / Continuum
Origem: ChatGPT — sessão operacional
Destino: próximo executor / outra API / agente

## ESTADO ATUAL

CONFIRMADO:
- A infraestrutura persistente do Continuum está na main do repositório.
- O plano persistente usa Supabase/Postgres para agentes, tarefas, eventos, leases e recuperação.
- O mecanismo de recuperação por lease usa o job `fenix-continuum-reap`.
- A ponte local `scripts/continuidade/ponte.mjs` existe para processos Node sem depender de uma IA.
- `docs/CONTINUIDADE.md` é a referência operacional da arquitetura.
- Nenhum comando ADB, Fastboot, desbloqueio OEM, desbloqueio de bootloader, flash ou root foi executado nesta tarefa.
- O objetivo autorizado é transformar um Moto G15 em servidor/executor dedicado 24/7, começando por identificar o aparelho e preparar OEM/bootloader/root com segurança.

RELATADO:
- O operador informou que possui um Moto G15 e autorizou iniciar a preparação.
- O operador quer testar se outra API consegue assumir a execução a partir deste HANDOFF.

DESCONHECIDO:
- Variante/modelo exato do Moto G15.
- `ro.product.device`, `ro.build.id`, versão/build exata do Android.
- Estado atual do bootloader.
- Se `OEM unlocking` está disponível/habilitado.
- Estado atual de ADB e autorização da chave USB.
- Se há dados no aparelho que ainda precisam ser preservados.
- Método de root compatível com a build do aparelho.
- Qual computador será usado para ADB/Fastboot.

## O QUE JÁ FOI VERIFICADO

A arquitetura de continuidade foi consultada em `docs/CONTINUIDADE.md`.

Sequência operacional:
PRESERVAR → VERIFICAR → DESBLOQUEAR → RECUPERAR → ROOT → SERVIDOR 24/7 → REGISTRAR EXECUTOR → TESTAR LEASE/HEARTBEAT → TESTAR FAILOVER.

O desbloqueio pode apagar os dados do aparelho. Identificação e backup precedem qualquer operação destrutiva.

## NÃO REPETIR

Não repetir auditoria geral do Continuum, criação de novas tabelas/arquitetura de leases, reruns de GitHub Actions ou desbloqueio/flash/root antes da identificação exata do aparelho.

## PRÓXIMO PASSO OBRIGATÓRIO

No computador conectado ao Moto G15, executar somente comandos de LEITURA:

```bash
adb devices
adb shell getprop ro.product.model
adb shell getprop ro.product.device
adb shell getprop ro.build.id
adb shell getprop ro.build.version.release
adb shell getprop ro.bootloader
adb shell getprop ro.boot.flash.locked
adb shell getprop ro.oem_unlock_supported
```

Se `adb devices` retornar `device`, coletar o estado necessário para determinar a preparação de bootloader.

Se ADB não estiver autorizado: Configurações → Sobre o telefone → Número da versão → 7 toques → Opções do desenvolvedor → Depuração USB.

## RESTRIÇÕES

NÃO executar ainda:
- `fastboot flashing unlock`
- `fastboot oem unlock`
- `fastboot flash ...`
- patch de boot genérico;
- imagem de outro modelo/build;
- root sem correspondência exata com o firmware.

Não assumir que todo Moto G15 usa o mesmo procedimento. Variante e build precisam ser identificadas primeiro.

Não registrar tokens, chaves privadas, credenciais ADB ou segredos no Git, HANDOFF ou memória da IA.

## OBJETIVO FINAL

O teste termina quando houver evidência reproduzível de que:
1. o aparelho permanece ligado 24/7 com alimentação adequada;
2. inicializa automaticamente;
3. possui rede;
4. o executor acessa o plano persistente;
5. uma tarefa real executa claim → heartbeat → complete;
6. uma interrupção permite expiração do lease;
7. o Continuum recupera a tarefa conforme sua idempotência;
8. outro executor assume quando aplicável;
9. nenhuma etapa depende da conversa atual ou de uma IA específica.

## CRITÉRIO DE PARADA IMEDIATA

Parar e registrar evidência se o modelo/build não puder ser identificado, o bootloader exigir procedimento não confirmado, o desbloqueio implicar perda de dados não preservados, houver risco de firmware incompatível ou faltar evidência para o próximo comando seguro.

## HANDOFF PARA OUTRA API

Responder, usando este arquivo como estado inicial:
1. Qual é o modelo/variante/build exatos?
2. Qual procedimento de OEM/bootloader se aplica?
3. O que será apagado e como preservar?
4. Qual imagem/artefato exato é necessário para root?
5. Como validar ADB/Fastboot antes de flash?
6. Como configurar o aparelho como executor 24/7?
7. Como registrar o executor no Continuum sem expor o bearer token?
8. Como executar o primeiro teste real e produzir evidência portátil?

## AUTORIDADE

Autorização do operador: prosseguir com a preparação do Moto G15.
Essa autorização não substitui evidência técnica sobre o aparelho e não autoriza escolher firmware por suposição.

## CONDIÇÃO DE ENCERRAMENTO

Este HANDOFF deixa de ser a próxima ação quando a variante/build do Moto G15 estiver documentada e houver evidência suficiente para iniciar a preparação específica do bootloader.
