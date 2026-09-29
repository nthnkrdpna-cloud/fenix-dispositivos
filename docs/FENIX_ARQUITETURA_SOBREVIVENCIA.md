# Fênix — arquitetura de sobrevivência sem fornecedor

## CONFIRMADO
- O núcleo local já reconstrói tarefas sem IA.
- O plano persistente atual usa Supabase/Postgres.
- A ponte Node existente ainda é específica de Supabase.
- O registro persistente de agentes, tarefas e eventos está vazio.
- Esta branch adiciona envelope de continuidade verificável, transporte local em disco, replicação por quorum, camada Neuralese e protocolo de automelhoria segura.

## PRINCÍPIO DE CAMADAS
1. Núcleo lógico: diário, tarefa, fingerprint, preflight, saúde e autoridade.
2. Transporte zero: arquivos locais e blobs content-addressed.
3. Transporte LAN: diretório compartilhado, SMB/SFTP/HTTP autenticado ou mídia removível.
4. Transporte rádio: Bluetooth/BLE para envelopes pequenos e descoberta; Wi-Fi Direct/LAN para dados maiores.
5. Transporte remoto: GitHub, Supabase, Drive, R2, S3 ou outro serviço como réplicas.
6. Executor: script, LLM, humano ou modelo local. O provedor é metadado, não identidade.
7. Orquestração: leases, quorum, revisão, escopo e preflight.
8. Aplicação: site e interfaces são projeções, não fonte única de continuidade.

## TRANSPORTE ZERO
O novo envelope contém task_id, revisão, fingerprint, cabeça do histórico, estado, evidências, próximo passo, itens que não devem ser repetidos, condição de parada e autoridade declarada. Sua validade depende de hash, não de GitHub, Supabase, API ou modelo.

O transporte em disco grava envelopes atomicamente e blobs por SHA-256. A replicação usa quorum explícito. Uma réplica indisponível não autoriza retry infinito e não apaga o estado.

## REDUNDÂNCIA
Preservar primeiro o menor objeto: eventos e checkpoints são pequenos; blobs grandes são referenciados por hash. A política futura deve manter pelo menos uma cópia local e uma réplica remota cifrada quando possível. Reconciliação compara hashes antes de transferir conteúdo.

## G15
RELATADO: o Moto G15 deverá atuar como nó portátil persistente. DESCONHECIDO: modelo exato, build, bootloader, armazenamento livre, temperatura, bateria, capacidade de serviços persistentes e disponibilidade de depuração Wi-Fi.

Implementação futura segura: diário, envelopes, índice, toolchains, bundles assinados e cópias cifradas. O nó nunca recebe autoridade exclusiva. Perder o G15 não pode alterar uma decisão humana.

## CODESPACE
Um Codespace específico não é a unidade de sobrevivência. A unidade é um workspace reproduzível contendo repositório, lockfiles, devcontainer, cache, toolchain, banco local e bootstrap offline. Codespaces/GitHub são aceleradores quando disponíveis.

## DRIVE
DESCONHECIDO: quota, política e acesso efetivo do Google Drive nesta sessão. O desenho prevê Drive apenas como réplica cifrada de bundles/blobs, nunca como banco único nem como fonte de autoridade.

## REDE LOCAL
DESCONHECIDO: roteador, firmware, ISP, CGNAT, IPv6, VLAN e recursos de isolamento. Não haverá configuração presumida. O estudo posterior deve levantar bridge/router, firewall, UPnP, guest/IoT isolation, WPA2/WPA3, DNS, DHCP, bandas/canais, logs, energia e perda de link.

Regra padrão: LAN-first e nenhuma porta WAN administrativa por padrão.

## WI-FI DEBUGGING
A camada de dispositivos deve separar descoberta, identidade, conectividade, capacidade, segurança e ação autorizada. Diagnóstico não desbloqueia bootloader, não faz root, não flasheia e não instala pacotes automaticamente.

Para IA local, primeiro medir CPU, RAM, armazenamento, temperatura, GPU/NPU reportados e conectividade. Benchmark e tuning só depois da coleta.

## NEURALESE
Neuralese é uma representação semântica interna estruturada. Não é autoridade nem uma nova inteligência. Transporta intenção, estado, evidência, restrições, capacidades, incertezas, proposta, testes, rollback e condição de parada. Texto natural é projeção humana; o estado estruturado é a forma de máquina.

## AUTOMELHORIA SEGURA
Uma melhoria pode ser proposta e testada em sandbox. Não pode alterar autoridade, âncoras, chaves, política da Cifra, histórico, evidências, privilégios, failover ou verificações por iniciativa própria.

Promoção para APROVADA exige: testes explícitos passando, revisão independente, rollback verificado e autorização humana. REJEITADA e REVERSAO são estados terminais. Não existe retry infinito.

## ANTI-ROGUE
Nenhuma IA é autoridade. Capacidade é teto. Escopo é teto. Subagente recebe escopo contido no pai. Failover não transfere autoridade. Relays externos são dados não verificados. Segredos não entram no diário. Executor pode ser substituído ou revogado sem destruir a tarefa.

## CRITÉRIO DE PARADA
Esta fase técnica é considerada implementada quando o pacote pode ser exportado/importado sem provedor, validado localmente, replicado com quorum e submetido ao protocolo de automelhoria sem depender de Cifra humana.

Não são CONFIRMADOS nesta fase: operação real do G15, Bluetooth, LAN compartilhada, Drive, Codespace offline, estudo do roteador/ISP e benchmark de IA local. Esses itens dependem de evidência física ou de conta ainda não disponível.
