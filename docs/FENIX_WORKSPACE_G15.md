# Fênix — workspace portátil no Moto G15

## Objetivo

Transformar o G15 em um nó local de continuidade, não em dependência do GitHub Codespaces.

## Modelo

Android
  ambiente Linux do usuário
    /fenix-workspace
      hub/
      continuum/
        envelopes/
        blobs/
        evidence/
      toolchains/
      cache/
      recovery/

## Offline-first

O workspace deve conseguir ler tarefas, validar envelopes, executar testes locais, registrar eventos, criar handoffs, produzir bundles de recuperação e operar transporte por LAN/Bluetooth/mídia removível sem GitHub, Supabase, Cloudflare ou Internet.

## Portabilidade

Um bundle deve conter manifest, versão do protocolo, hashes, envelopes, blobs referenciados, versão das ferramentas, bootstrap e estado de recuperação.

Outro dispositivo deve reconstruir o workspace a partir do bundle sem depender do G15 original.

## Segurança

ADB Wi‑Fi é uma capacidade administrativa explicitamente autorizada. Não abrir ADB para WAN. O roteador deve impedir exposição externa.

Bootloader desbloqueado, se algum dia aprovado, não será requisito do transporte zero.

## Condição de parada

O G15 estará integrado quando a reconstrução do workspace funcionar depois de reinício e também em outro dispositivo sem o G15.
