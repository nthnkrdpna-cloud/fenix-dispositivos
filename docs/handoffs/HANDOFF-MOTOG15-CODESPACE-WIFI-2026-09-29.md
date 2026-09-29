# HANDOFF — Moto G15 como nó de workspace local e executor Wi‑Fi

Data: 2026-09-29
Estado: PREPARAÇÃO / NÃO EXECUTADO NO APARELHO

## CONFIRMADO

- O moto g15 oficial usa Android 15, Helio G81 Extreme, 4 GB LPDDR4X, 128 GB internos, microSD até 1 TB e bateria de 5200 mAh. Isso é especificação da família, não prova da unidade física instalada.
- Android 11+ suporta ADB por Wi‑Fi com pareamento por código/QR.
- O pareamento precisa ser autorizado no próprio dispositivo e na mesma rede.
- A Motorola informa que a maioria dos dispositivos recentes participa do programa de desbloqueio de bootloader, mas existem restrições por modelo/operadora.
- O estado exato do G15 desta infraestrutura ainda não foi observado.

## DESCONHECIDO

- SKU exato, build, codename e bootloader.
- ro.boot.flash.locked e ro.oem_unlock_supported.
- disponibilidade efetiva de OEM unlocking.
- elegibilidade efetiva no serviço Motorola.
- comportamento de fastboot pela rede nessa unidade.
- espaço livre, desempenho sustentado e temperatura.
- possibilidade de serviço persistente 24/7 sem degradação.

## ARQUITETURA

O G15 não será uma Codespace proprietária. Será um workspace reproduzível compatível com devcontainer:

- repositório;
- lockfiles;
- devcontainer;
- toolchain;
- caches;
- estado local;
- envelopes Continuum;
- blobs content-addressed;
- manifestos e hashes;
- bootstrap offline.

GitHub Codespaces será apenas uma projeção remota quando disponível.

## BOOTLOADER

O desbloqueio permanece uma operação separada e opcional.

Antes dele:
- backup;
- snapshot do estado;
- confirmação do SKU;
- confirmação de elegibilidade;
- coleta do estado de lock;
- recuperação oficial disponível;
- plano de retorno.

Não executar unlock automaticamente. Não apagar dados. Não flashear firmware. Não fazer root.

## WI-FI ADB

Fluxo suportado pelo Android:

1. habilitar Opções do desenvolvedor;
2. habilitar Depuração por Wi‑Fi;
3. parear com código/QR;
4. adb pair IP:PORTA_DE_PAREAMENTO;
5. adb connect IP:PORTA_DE_CONEXAO;
6. adb devices.

## CRITÉRIO DE SUCESSO

G15 só será declarado executor portátil quando sua identidade física, ADB Wi‑Fi, diagnóstico, workspace local, bootstrap offline, persistência pós-reinício, transporte zero e recuperação independente estiverem comprovados.

## NÃO REPETIR

Não repetir desbloqueio, flash, root ou testes destrutivos antes da coleta acima.

## PRÓXIMO PASSO

Executar somente o diagnóstico ADB Wi‑Fi do aparelho e anexar sua saída ao inventário Fênix.
