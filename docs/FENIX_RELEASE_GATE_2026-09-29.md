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
