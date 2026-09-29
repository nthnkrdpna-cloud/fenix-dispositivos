# Fênix Hub — Gate de Release e Continuidade
Data: 2026-09-29
Estado: GATE ABERTO / RELEASE NÃO CONCLUÍDO

## Objetivo
Preservar a continuidade do Fênix Hub e permitir uma liberação somente quando houver evidência reproduzível de build, integridade do artefato e teste físico posterior.

## CONFIRMADO
- PR #80 está aberto contra `main`.
- HEAD atual: `e9d41451a5305595374ee83b3e08b2f9a022edc1`.
- O comando `fenix status` agora aponta para diagnóstico local somente leitura via `scripts/continuidade/cli.mjs . saude`.
- O contrato Android mantém API 36, Java 17, allowlist fechada do Termux, auditoria Android local/rootless e visibilidade seletiva de pacotes.
- O workflow exige APK real, SHA-256, apksigner, zipalign 16 KiB, badging e artefato.
- As execuções recentes do workflow `fenix-hub-android` terminam antes de qualquer step: job `build` concluído com falha e `steps: null`; não houve artefato.
- Supabase permanece acessível e sem mutações nesta rodada.
- Estado Supabase observado: `fenix.agentes=0`, `fenix.tarefas=0`, `fenix.eventos=0`, objetos no bucket `fenix-apk=0`, depósitos da cifra=1.
- Segurança atual observada: 12 tabelas públicas com RLS sem política, 3 funções SECURITY DEFINER executáveis por anon e 66 por authenticated. Esses números são diagnóstico, não autorização para revogação em massa.
- A proteção contra senhas vazadas permanece desativada.

## HISTÓRICO CONFIRMADO
- O projeto já possui Continuum persistente, diário append-only, preflight, saúde, handoff e contratos de frota documentados.
- O APK real de Life in Adventure recuperado anteriormente não é o Fênix Hub e não pode substituir o artefato de release.

## RELATADO
- O dispositivo físico G75 será o primeiro alvo de instalação e teste após existir um APK verificável.

## DESCONHECIDO
- Se o código Android compila em um runner real.
- SHA-256, assinatura e alinhamento de um APK Fênix Hub.
- Instalação e comportamento no G75 físico.
- Estado efetivo de Termux/Wireless Debugging no G75.
- Se as 66 funções SECURITY DEFINER autenticadas podem ser restringidas sem quebrar contratos existentes; exige revisão função por função.

## Invariantes de arquitetura
A referência à proporção áurea/Fibonacci/geometria sagrada permanece tratada como requisito de especificação visual/arquitetural do projeto, conforme a documentação canônica já existente. Este arquivo não transforma essa referência em validação matemática de implementação.

A assinatura do Continuum é tratada operacionalmente como continuidade verificável: autoridade humana preservada, evidência separada de relato, provedor substituível, estado recuperável e histórico rastreável. Nenhuma IA, provedor ou execução local recebe autoridade canônica por padrão.

## Próximo gate
1. Runner GitHub disponível.
2. Build real.
3. Verificações criptográficas/estruturais do APK.
4. Artefato baixável.
5. Instalação no G75.
6. Testes funcionais e de auditoria.
7. Só então decisão humana sobre merge/release.

## Condição de parada
Não alterar produção nem declarar o APK pronto enquanto o runner não produzir o artefato e os gates acima não forem observados.


## Atualização operacional — 2026-09-29 10:35 UTC

### CONFIRMADO
- O job GitHub Actions `fenix-hub-android` continua falhando antes de qualquer step: run `36541291936`, job `109317070273`, `steps: null`.
- O build portátil foi endurecido para usar por padrão o pacote oficial Android Command Line Tools Linux `15859902` e validar o SHA-256 publicado pelo Android Developers.
- O workflow foi alterado para `ubuntu-24.04` e passou a chamar o mesmo build portátil, reduzindo divergência entre executores.
- O bloqueio foi registrado no Issue #84.
- Supabase permanece `ACTIVE_HEALTHY`; as migrações até `0030_continuum_rpc_private` estão registradas.
- Consulta de logs de 10:25–10:40 UTC retornou 80 eventos pgbouncer e 24 postgres; não foi encontrada evidência causal de chamada de IA no bloqueio do APK.

### DESCONHECIDO
- Se o novo runner `ubuntu-24.04` será alocado com sucesso; a API disponível não expõe execução manual de `workflow_dispatch` nem um executor alternativo.
- APK, hash, assinatura, alinhamento, artefato e instalação física continuam não comprovados.

### NÃO REPETIR
- Não repetir o mesmo rerun de um job que termina com `steps: null` sem mudar a condição do executor.
- Não alterar Supabase para tentar resolver uma falha que ocorre antes do primeiro step do workflow.

### Próximo passo
Executar o workflow em um runner efetivamente disponível, ou executar o script portátil em outro Linux x86_64 autorizado. Após o APK existir, retomar os gates criptográfico, estrutural e físico.

### Condição de parada
Parar somente quando o APK verificável e o teste físico estiverem comprovados; até lá, não declarar release concluído.
