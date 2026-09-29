# Fênix — auditoria da infraestrutura de rede local

## Objetivo

Transformar o ARRIS TG1692A e os dois CBN AP5541 em recursos temporários de redundância, sem criar dependência irreversível. Toda configuração futura deve possuir registro anterior, método de retorno e evidência pós-mudança.

## CONFIRMADO POR DOCUMENTAÇÃO

### ARRIS TG1692A

A documentação/tutorial da Claro identifica o TG1692A como equipamento administrável pela interface local. O endereço documentado para acesso é `192.168.0.1` em material de configuração do modelo. O modelo possui Wi-Fi em 2,4 GHz e 5 GHz. Fontes secundárias sobre o mesmo firmware/família também documentam LAN/DHCP/NAT, IPv6 e modo bridge, mas esses itens devem ser tratados como capacidade potencial até serem observados na unidade atual.

A página oficial da Claro confirma que o diagnóstico de velocidade deve distinguir conexão por cabo e Wi-Fi e que obstáculos físicos interferem no desempenho.

### CBN AP5541

A documentação oficial da Claro confirma:

- interface local de administração;
- modo principal e modo adicional;
- backhaul adicional por Wi-Fi ou Ethernet;
- LAN1;
- LAN2/WAN;
- operação como ponto de acesso/extensor;
- visualização da topologia e dispositivos conectados;
- bloqueio por MAC;
- rede Convidados/IoT;
- alteração de SSID e senha no Mesh principal;
- restauração de fábrica;
- retorno ao modo bridge após restauração;
- configuração adicional por cabo.

Material técnico do equipamento identifica as duas interfaces como Gigabit Ethernet e rádio 2x2 em 2,4/5 GHz, com 802.11b/g/n e 802.11a/n/ac.

## LIMITE DA EVIDÊNCIA

Não está confirmado apenas pela documentação:

- firmware atualmente instalado;
- versão/configuração específica da Claro na residência;
- canais efetivos;
- largura de canal efetiva;
- potência de transmissão efetiva;
- DHCP atual;
- NAT atual;
- firewall atual;
- IPv6 atual;
- UPnP;
- isolamento entre clientes;
- qualidade real do backhaul dos AP5541;
- throughput LAN↔LAN;
- throughput Wi-Fi por banda;
- roaming;
- latência e perda por ponto;
- comportamento durante perda do gateway;
- capacidade de continuar fornecendo LAN quando a WAN/Claro cai.

Esses pontos exigem coleta local.

## REGRA DE REVERSIBILIDADE

Antes de qualquer alteração:

1. registrar data/hora;
2. registrar modelo, MAC e firmware;
3. fotografar etiquetas e estado dos LEDs;
4. exportar/salvar qualquer configuração que a interface permita;
5. registrar SSID, modo, DHCP/NAT, DNS, canais, largura e regras existentes;
6. calcular hash do registro;
7. executar uma alteração por vez;
8. testar;
9. registrar resultado;
10. manter um procedimento de reversão;
11. somente então avançar.

Nunca alterar simultaneamente gateway e Mesh.

## TOPOLOGIA TEMPORÁRIA FÊNIX

Estado-alvo inicial, sem alteração ainda:

```
Claro/WAN
   |
ARRIS TG1692A
192.168.0.1
   |
   +---- AP5541 #1 (Mesh principal)
   |          |
   |          +---- dispositivos Fênix
   |
   +---- AP5541 #2 (Mesh adicional)
              |
              +---- dispositivos Fênix
```

A prioridade é manter o ARRIS como ponto de recuperação e usar o Mesh como extensão. Não colocar o ARRIS em bridge enquanto não existir outro roteador independente validado para assumir NAT/DHCP/firewall.

## AUDITORIA SOMENTE LEITURA

`scripts/rede/auditoria-lan.mjs` coleta:

- rota padrão;
- vizinhança ARP/ND;
- interfaces locais;
- cinco pings ao gateway;
- resolução reversa do gateway.

Exemplo:

```
node scripts/rede/auditoria-lan.mjs 192.168.0.1
```

A execução não altera o roteador.

## TESTE FUNCIONAL POR CAMADAS

### Camada 0 — existência

Confirmar fisicamente:

- ARRIS ligado;
- AP5541 #1 ligado;
- AP5541 #2 ligado;
- cabos;
- LEDs;
- etiquetas.

### Camada 1 — LAN

Com WAN indisponível de forma controlada, verificar se dois dispositivos continuam se alcançando na LAN. Não desconectar coaxial nem alterar WAN antes de preservar o estado atual.

### Camada 2 — gateway

Medir cinco séries de ping do mesmo dispositivo:

- diretamente no ARRIS;
- próximo do AP5541 #1;
- próximo do AP5541 #2.

Registrar mediana, mínimo, máximo e perda.

### Camada 3 — backhaul

Quando possível, comparar AP adicional por Wi-Fi versus cabo Ethernet. O manual da Claro confirma ambos os métodos.

### Camada 4 — roaming

Percorrer os pontos com um único dispositivo e registrar BSSID/AP, RSSI e latência. Não concluir qualidade apenas pela barra de sinal.

### Camada 5 — isolamento

Verificar separadamente:

- rede principal;
- Convidados/IoT;
- comunicação entre clientes;
- acesso administrativo;
- resolução DNS;
- acesso ao gateway.

### Camada 6 — recuperação

Restaurar exatamente o estado anterior e repetir os testes básicos. A reversão só será considerada VALIDADA se o estado funcional anterior retornar.

## PAPEL NO CONTINUUM

Os equipamentos de rede são infraestrutura de transporte, não autoridade.

O Continuum deve sobreviver a:

- remoção de um AP;
- remoção dos dois APs;
- substituição do ARRIS;
- troca de SSID;
- troca de sub-rede;
- perda da WAN;
- perda do provedor;
- perda temporária de GitHub/Supabase;
- perda do G15.

Por isso, endereços como `192.168.0.1` nunca devem ser codificados como autoridade permanente. Devem ser parâmetros descobertos/registrados no inventário local.

## PRÓXIMA EVIDÊNCIA NECESSÁRIA

Para transformar esta auditoria documental em auditoria física:

1. abrir a interface local do ARRIS e registrar somente telas/configuração, sem alterar;
2. abrir a interface do AP5541 principal;
3. registrar firmware, modo, topologia, canais, DHCP/NAT, rede convidado/IoT e clientes;
4. repetir no AP adicional;
5. executar o script de auditoria LAN;
6. salvar os resultados como evidência;
7. somente depois escolher alterações.

## CRITÉRIO DE PARADA

Parar a fase de configuração quando houver:

- snapshot do estado original;
- mapa físico/lógico;
- capacidades efetivamente observadas;
- testes de LAN/Wi-Fi/backhaul;
- plano de reversão;
- pelo menos uma rota de recuperação independente do Mesh.

A partir daí qualquer melhoria deve ser uma mudança isolada, mensurável e reversível.
