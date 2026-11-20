# TV Box suspeito na rede de casa — contenção

Aberto em 20/11/2026. **Informado pelo operador:** há um TV Box em casa que usa a rede residencial
em ataques de botnet. **Não verificado aqui:** modelo, MAC e tráfego do aparelho — isso só se vê na
casa, pelo roteador. O registro do incidente está no hub (`docs/SECURITY_INCIDENTS.md`, INC-03).

## O que se sabe de fora (verificado em 20/11/2026)

- O FBI descreve a botnet **BADBOX 2.0**: TV Box e aparelhos Android sem certificação Play Protect,
  muitos já infectados de fábrica, que viram nó de botnet e de "proxy residencial" — a internet da
  casa passa a ser alugada para tráfego de terceiros
  ([IC3, alerta I-060525-PSA](https://www.ic3.gov/PSA/2025/PSA250605)).
- A Anatel afirma que o Brasil é o país mais afetado, com mais de 1,5 milhão de aparelhos, e que
  aparelho fora da lista de homologados deve ser **desligado imediatamente**
  ([Teletime, 12/08/2025](https://teletime.com.br/12/08/2025/anatel-alerta-bad-box-2-0-infecta-15-milhao-de-tv-boxes-no-brasil/);
  [Tecnoblog](https://tecnoblog.net/noticias/anatel-alerta-brasil-tem-mais-de-15-milhao-de-tv-boxes-infectados-com-malware/)).
- Sinais típicos: marca desconhecida (T95, X96Q, MX10, SuperBox…), promessa de canais pagos de
  graça, Play Protect desligado ([Kaspersky](https://www.kaspersky.com/blog/android-tv-botnet/55799/)).

**Inferência, não fonte:** como a infecção pode vir no firmware, restaurar de fábrica não limpa o
aparelho com segurança. O aparelho não volta para a rede, em nenhuma rede.

## Agora (5 minutos)

1. **Tire o TV Box da tomada** e, se houver, do cabo de rede. Desligar no controle não basta.
2. Não leve para outra rede (casa de parente, hotspot do celular): ele infecta a rede onde estiver.
3. Guarde a caixa ou a etiqueta: marca, modelo e o **MAC** (às vezes impresso embaixo) servem para
   bloquear e para conferir na lista da Anatel.

## Depois (30 minutos) — uma mudança por vez, com registro antes

A regra de reversibilidade de `FENIX_AUDITORIA_REDE_LOCAL.md` vale aqui: antes de cada mudança no
roteador, `node scripts/rede/estado-reversivel.mjs snapshot estado.json`.

1. **Lista de aparelhos conectados.** No AP5541 (topologia e dispositivos conectados) e no ARRIS
   TG1692A (`192.168.0.1`). Anote o MAC do TV Box se ainda aparecer.
2. **Bloqueio por MAC** do TV Box no AP5541 (a função existe, confirmada pela documentação da Claro).
3. **Troque a senha do Wi-Fi.** Todo aparelho cai e precisa reconectar — é isso que expulsa quem
   pegou carona com a senha antiga. Senha nova longa, que não é usada em mais nada.
4. **Troque a senha de administração do roteador** se ainda for a da etiqueta.
5. **WPS e UPnP desligados**, se a interface deixar. UPnP é o que deixa um aparelho infectado abrir
   porta para fora sozinho.
6. **Rede Convidados/IoT** do AP5541 para o que é "coisa" (TV, lâmpada, caixa de som): separa o que
   pode ser infectado do computador e dos celulares.
7. **Contas que estavam logadas no TV Box** (Google, Netflix, YouTube, qualquer app): troque a senha
   e encerre as sessões de cada uma. Há relato de malware desse tipo roubando senha
   ([Tom's Guide](https://www.tomsguide.com/computing/malware-adware/over-one-million-android-devices-infected-with-password-stealing-pre-installed-botnet-malware-how-to-stay-safe)).

## Vigiar daqui em diante

```bash
node scripts/rede/vigia-lan.mjs                               # quem está na rede agora
node scripts/rede/vigia-lan.mjs --marcar <MAC> "celular Caio"  # ensina um conhecido
node scripts/rede/vigia-lan.mjs --bloqueado <MAC> "tv box"      # se reaparecer, sai no topo
```

- Só lê a tabela ARP do próprio computador (Windows `arp -a`, Linux `ip neigh` ou `/proc/net/arp`).
  Não varre a rede, não bloqueia nada, não toca no roteador.
- A lista de conhecidos fica em `~/.fenix/rede-conhecidos.json`, **fora do repositório**.
- Sai com código `2` quando há desconhecido ou bloqueado presente: um agendador ou agente pode avisar
  só por isso, sem ler a saída.
- Limite: a tabela ARP só mostra quem conversou com este computador há pouco. A lista do roteador
  continua sendo a fonte de verdade.

## O que entra no lugar

Um celular antigo da frota, com o `/tv` do hub (só fontes oficiais ou licenciadas) e saída por HDMI
ou espelhamento, faz o papel do TV Box sem trazer ninguém de carona. O desenho fica no hub, com a
TV.
