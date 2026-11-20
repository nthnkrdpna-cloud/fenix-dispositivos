# Servidores de bolso — celulares antigos trabalhando para a casa e para os negócios

Escrito em 20/11/2026. **Pedido do operador:** emprestar o processamento dos celulares antigos,
controlá-los de um computador com Claude (ou Antigravity), ligá-los pela rede de casa, pelo hotspot
e pelo Bluetooth, e montar com eles uma rede de atendimento "digna de mega corporação" com o básico.

## O que um celular antigo é, de verdade

Um computador ARM de 4 a 8 núcleos, 3 a 8 GB de memória, bateria que serve de *no-break*, Wi-Fi,
4G e Bluetooth, gastando poucos watts. **Inferência, sem medição aqui:** é muito para tarefa leve e
contínua, pouco para tarefa pesada. Serve para:

| Serve | Não serve |
|---|---|
| agente que coleta notícia e preço o dia todo (o Olho de Deus) | treinar modelo, rodar IA grande |
| tela fixa de pedidos da loja, com alarme | banco de dados principal (o Supabase continua sendo) |
| player no lugar do TV Box, com o `/tv` do hub | ficar exposto na internet |
| 4G de reserva quando a Claro cair (hotspot) | central de chips para ligação em massa (abaixo) |
| alerta por SMS para a própria equipe | |

## Os papéis da frota (já são os perfis de `frota-android.mjs`)

| Aparelho | Perfil | Papel proposto |
|---|---|---|
| Moto G75 | `primary` | o celular do dia a dia, e o 4G de reserva (hotspot) |
| Moto G15 | `persistent_edge` | **o servidor de bolso**: ligado 24 h, Termux, SSH, agentes |
| Redmi Note 11 | `redundancy` | a tela da loja (pedidos) ou a TV no lugar do TV Box |

## Como o computador manda nos celulares

```
PC (Windows) com Claude Code ou Antigravity, platform-tools (adb, fastboot), scrcpy, Node
   ├── USB ou ADB por Wi-Fi ── frota-android.mjs discover | optimize | rollback
   ├── scrcpy ─────────────── a tela do celular no PC, com mouse e teclado
   └── ssh -p 8022 ────────── o Termux do servidor de bolso (só na rede de casa, só por chave)
```

- **ADB por Wi-Fi** (Android 11+, *Depuração por Wi-Fi*) cai a cada reinício: serve para
  configurar. O canal estável do servidor é o **SSH do Termux**.
- Claude no PC opera por estes mesmos comandos, dentro do repositório, sob a regra 1 do
  `CLAUDE.md`: só aparelho do operador, registro antes, volta e evidência depois.

## Montar o servidor de bolso (G15)

1. Termux e **Termux:Boot da mesma fonte** (os dois do F-Droid, ou os dois do GitHub). Abra o
   Termux:Boot uma vez.
2. No Termux: `bash scripts/dispositivos/termux-bootstrap.sh --apply` (já existia), depois
   `bash scripts/dispositivos/servidor-de-bolso.sh` para ver o que muda, e `--apply` para fazer.
   - O boot segura o *wake lock* e sobe os serviços, como no exemplo do
     [Termux:Boot](https://github.com/termux/termux-boot).
   - **SSH nunca por senha:** sem chave em `~/.ssh/authorized_keys`, o sshd fica desligado.
3. No PC: `node scripts/dispositivos/frota-android.mjs optimize`.
   - Para o papel `persistent_edge` (só ele), com Termux instalado: tira o Termux da soneca
     (`deviceidle`) e, no Android 12+, desliga o *phantom process killer*
     (`settings_enable_monitor_phantom_procs false`), que mata os serviços do Termux.
   - Tudo vai para `evidencias/dispositivos/fleet-tuning-last.json`, com o valor de antes;
     `rollback` desfaz. Chave que não existia antes é **apagada** na volta, não regravada.
4. Pela tela: Termux com bateria **Sem restrições**.
5. **Bateria:** *Configurações → Bateria → Proteção da bateria → Programação manual → Sempre*
   segura a carga em 80% nos Motorola mais novos; nos mais antigos é *Proteção contra sobrecarga*,
   que só entra depois de três dias na tomada ([Motorola](https://help.motorola.com/hc/3740/16/global/en-gb/T2101254315.html)).
6. **Lugar físico:** sem capinha, ventilado, longe de papel e tecido. Bateria estufada (tampa
   levantando, tela descolando) aposenta o aparelho na hora — celular na tomada 24 h é o risco
   físico real desta frota.
7. Reinicie e confira do PC: `ssh -p 8022 <ip-do-g15>`.

**Limite conhecido:** relatos de Android 15 matando processo do Termux mesmo com tudo acima
([termux-app #5150](https://github.com/termux/termux-app/issues/5150)). O G15 roda Android 14 ou 15
conforme a atualização: conferir com `discover` e testar matando a sessão e reiniciando.

## Rede

- **Wi-Fi de casa** (AP5541) é o caminho normal. Os servidores ficam na rede principal, atrás do
  `vigia-lan.mjs`; o que é "coisa" (TV, lâmpada) vai para a rede Convidados/IoT.
- **Hotspot do G75** é a reserva quando a internet da Claro cair: o G15 e o PC trocam de rede.
- **Bluetooth** (ancoragem/PAN) é lento, mas mantém um fio de conversa entre dois aparelhos quando
  o Wi-Fi some. Serve para aviso, não para dado.

## Desbloquear o bootloader: só quando valer

**Por padrão, não.** Device Owner, ADB e Termux cobrem o servidor. Desbloquear **apaga o aparelho**,
pode tirar a garantia e quebra a verificação de integridade (app de banco e carteira digital param).

Vale quando o aparelho não recebe mais atualização e se quer um sistema limpo e duradouro
(LineageOS, postmarketOS). O caminho de cada modelo já está em `hub/docs/PRISMA-APK.md`: G75 pelo
programa oficial da Motorola; G15 só por exploit comunitário (kaeru), **sem suporte oficial e com
risco de inutilizar o aparelho**.

## "Uma rede de ligações e notificações de mega corporação" — o que pode e o que derruba

| Pode | Por onde |
|---|---|
| conversar com clientes em volume nos números da empresa | **WhatsApp Cloud API** (`hub/docs/WHATSAPP.md`) — não precisa de celular nenhum |
| atender ligação de WhatsApp da empresa | *Business Calling API* (fase W3 do WhatsApp), atendida no PC ou num celular da frota |
| alerta por SMS para a própria equipe, em pouco volume | [SMS Gateway for Android](https://docs.sms-gate.app/) (Apache-2.0, modo servidor local), num chip da frota. **Não verificado:** se o projeto segue mantido — conferir no GitHub antes |
| ligação comum de cada chip, pelo próprio celular | o celular |

| Derruba | Por quê |
|---|---|
| **central de chips** (SIM box) que transforma ligação de internet em ligação de celular, ou que roda chips para fugir de bloqueio | a Anatel trata como irregular revender, alugar ou ceder numeração, e passou a exigir que todo número de celular tenha chip de verdade por trás (IMSI); as operadoras bloqueiam ([Tecnoblog](https://tecnoblog.net/noticias/apos-alerta-do-itau-anatel-decide-bloquear-operadoras-que-facilitam-spoofing/)) |
| mensagem em massa para quem não pediu, por WhatsApp ou por app não oficial | banimento do número pela Meta e conflito com a LGPD |

## Quando a frota passar de três

[Headwind MDM](https://h-mdm.com/) tem edição comunitária gratuita, de código aberto e hospedada
por conta própria, que entra em modo Device Owner por QR. Algumas funções (quiosque, controle
remoto sem ninguém do outro lado) aparecem nas edições pagas segundo sites de avaliação — conferir
na tabela do fabricante antes.

## Próximos passos

- **S1:** G15 como servidor (o que está acima).
- **S2:** cada aparelho se registra como executor do Continuum do hub (Prisma → Administração →
  Continuum) e manda sinal de vida; o painel mostra quem caiu.
- **S3:** as cargas — o coletor do Olho de Deus e a tela de pedidos da loja.
- **S4 (opcional):** o gateway de SMS para os alertas da equipe.
