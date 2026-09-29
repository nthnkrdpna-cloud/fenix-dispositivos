# FÊNIX — CATÁLOGO DE LEGADO E ARQUITETURA
## CATALOG-2026-09-29-01

Status: FASE 0 — CATALOGAÇÃO, SEM RECICLAGEM
Data-base: 2026-09-29
Objetivo: registrar o que existe antes de reutilizar, substituir ou ampliar.

## 1. Regra desta fase

Esta fase não instala Termux, não altera ARRIS/CBN, não altera bootloader, não coleta segredos e não substitui código legado por hipótese.

Classes:
- CONFIRMADO: observado diretamente em repositório/arquivo/commit acessível.
- HISTÓRICO CONFIRMADO: confirmado no histórico do Git, mas não necessariamente vigente.
- RELATADO: informado no handoff/conversa, sem observação direta nesta fase.
- DESCONHECIDO: evidência ainda insuficiente.

## 2. Repositórios acessíveis

| Repositório | Função histórica/atual observada | Último snapshot consultado |
|---|---|---|
| sistema2 | arquivo privado, decisões, governança, legado, segurança e identidade | 11c5211 |
| TERCEIRA-MARGEM | aplicativo/jogo e infraestrutura web do produto | 52efe4e |
| AMANDABT | caderno, decisões e participação de Amanda | 41eb64a |
| zettelkasten-ai | segundo cérebro/notas, ingestão e reformulação | 04f7c746 |
| hub | núcleo atual Fênix/Continuum, admin, Supabase, rede, frota e recuperação | 5679ccf |
| Prototype-TM01 | pesquisa pública do motor generativo de marcas/som | 4e25668 |
| APKs | laboratório de APK/APKM e geração por aparelho | bb510db |
| codespace-android-termux | repositório público inicial para Codespace Android/Termux | 619ea6c |

## 3. Linha evolutiva consolidada

### sistema2

CONFIRMADO:
- É explicitamente o arquivo privado do projeto.
- Contém documentação, decisões, artefatos congelados e material particular.
- O código do aplicativo foi deliberadamente movido para TERCEIRA-MARGEM.
- O histórico contém a evolução das decisões D1 em diante, governança, segurança, frota, Hermes, identidade Fênix e avaliações.
- O protocolo G0–G10 e as revisões da identidade Fênix foram registrados no histórico mais recente.
- O histórico registra achados que exigiram parada, preservação e decisão humana.

HISTÓRICO CONFIRMADO:
- D35: motor determinístico/local e IA como camada opcional.
- D43: frota de aproximadamente 200 papéis gerados de roster.
- Hermes como relé para LLMs sem integração direta.
- Separação de repositório privado e produto.
- Identidade Fênix passou por protótipo e rodadas de revisão; o histórico mais recente registra estado NÃO APROVADO e pendências.

RECURSO RECICLÁVEL:
- decisões e regras;
- modelo de governança;
- threat model;
- frota/roster;
- Hermes;
- práticas de segurança;
- documentação de falhas.

NÃO RECICLAR AUTOMATICAMENTE:
- dados íntimos;
- segredos;
- protótipos de identidade como se fossem produção;
- decisões antigas quando documentos posteriores as substituem.

### TERCEIRA-MARGEM

CONFIRMADO:
- É o aplicativo principal histórico.
- Possui código de produto, web, TV, sincronização, finanças/casal e mecanismos de governança.
- O histórico recente registra consolidação de operação e memória local.
- O projeto passou por uma arquitetura de PWA/local/offline e posteriormente Cloudflare Workers.
- Existem testes de desempenho da Oficina e a régua "Batata".

RECURSOS RECICLÁVEIS:
- lógica determinística local;
- UI e mecanismos de baixa latência;
- prova-batata e limites de desempenho;
- módulos de casal/convites/compartilhamento;
- TV e integrações já implementadas;
- mecanismos de privacidade e segurança;
- componentes de memória local.

RISCO:
- não copiar a arquitetura inteira para o Hub sem separar produto, dados pessoais e infraestrutura Fênix.

### AMANDABT

CONFIRMADO:
- Repositório dedicado ao caderno e participação de Amanda.
- O histórico recente contém votos, novidades e decisões sobre o produto.
- A documentação da Batata está presente.
- A Batata é usada como régua de desempenho para celular fraco.

EVIDÊNCIA DE DESEMPENHO:
- sistema2 registra uma medição histórica da Oficina em 17,1 ms sob a bancada descrita.
- outras medições históricas registram mudanças de método e valores diferentes; estes números não devem ser tratados como estado atual sem nova execução.

RECURSOS RECICLÁVEIS:
- critérios de UX em aparelho fraco;
- testes de desempenho;
- princípios de autoria/participação;
- documentação de decisões da coautora.

### zettelkasten-ai

CONFIRMADO:
- Repositório privado de notas/segundo cérebro.
- Recebeu integração de material exportado do NotebookLM.
- A reformulação passou a ser manual em mudança posterior.
- Existe pipeline/documentação relacionada a transcrição e preservação de colisões.

RECURSOS RECICLÁVEIS:
- formato de notas;
- ingestão;
- preservação de colisões;
- estrutura de conhecimento;
- mecanismos de Hermes/NotebookLM quando tecnicamente portáveis.

NÃO RECICLAR:
- conteúdo pessoal diretamente para um APK público;
- credenciais;
- arquivos de áudio/binários desnecessários.

### hub

CONFIRMADO:
- É o núcleo atual do Protocolo Fênix/Continuum.
- Possui persistência Continuum em Supabase.
- Possui RLS, RPCs, eventos append-only, heartbeat, tarefas e reaproveitamento/reabertura.
- Possui frota, transporte, preflight, saúde, Hermes, diário, armazém e roteamento.
- Possui recuperação offline e contrato de capacidade.
- Possui diagnóstico Android.
- Possui orquestração local: CLI, quota gate, vault metadata-only e bootstrap Termux.
- Possui catálogo administrativo e biblioteca de APK.
- Possui trabalho de TV e finanças.
- A main atual contém a correção do mascaramento do vault.

ESTADO DE IMPLEMENTAÇÃO:
- Código do Termux existe no repositório.
- Nenhum Termux foi instalado no G75 nesta fase.
- Nenhuma configuração física de roteador/Mesh foi executada.
- Nenhum bootloader foi desbloqueado.
- Nenhum dos três telefones foi otimizado fisicamente pelo novo comando.
- CI atual ainda possui failures cuja causa detalhada não está disponível pelo conector.

PRINCIPAL GAP ARQUITETURAL:
- `ponte.mjs` ainda possui acoplamento Supabase.
- O núcleo provider-neutral e adaptadores precisam ser separados antes de afirmar independência real de fornecedor.

### APKs

CONFIRMADO:
- Pipeline APKM → extração → seleção de splits → merge → zipalign → assinatura de teste → validação → instalação por ADB.
- Perfis para G75, G15 e Redmi Note 11.
- Seleção explícita por aparelho.
- Geração dos dois aparelhos em um comando.
- Ingestão de fontes Git.
- Biblioteca privada e geração persistente.
- Life in Adventure 1.2.47/366 é o aplicativo de referência histórica do laboratório.

HISTÓRICO CONFIRMADO:
- O pipeline foi criado especificamente para os três aparelhos.
- Houve endurecimento de seleção e importação.
- Houve tentativa de publicação de releases persistentes.
- Houve correções de runner e normalização XAPK no snapshot mais recente.

RECURSOS RECICLÁVEIS:
- pipeline de build;
- seleção por capacidade;
- validação 16 KiB;
- instalação segura;
- testes sintéticos;
- biblioteca de artefatos.

### Prototype-TM01

CONFIRMADO:
- Pesquisa pública de geração procedural de marcas e som.
- Determinismo, receita/seed, geração sem runtime externo e derivação semântica.
- O próprio README registra um teste perceptual que falhou e um rebuild ainda não retestado.

RECURSOS RECICLÁVEIS:
- determinismo;
- seed + receita;
- geração local;
- qualidade automatizada;
- princípio de registrar falhas, não apenas sucessos.

NÃO PROMOVER PARA PRODUÇÃO:
- alegação perceptual ainda não retestada.

### codespace-android-termux

CONFIRMADO:
- Repositório público recém-criado.
- Possui apenas o README inicial no snapshot observado.
- Propõe um Codespace Android com Termux local.

ESTADO:
- É semente de projeto, não implementação funcional comprovada.

## 4. Batata — evidência consolidada

CONFIRMADO:
- O termo aparece em AMANDABT, TERCEIRA-MARGEM e sistema2.
- `prova-batata.mjs` existe no TERCEIRA-MARGEM.
- A bancada foi criada para simular hardware móvel degradado.
- O princípio documentado é: desempenho em hardware fraco é requisito de projeto, não um teste cosmético.

HISTÓRICO CONFIRMADO:
- Houve medição de 17,1 ms em uma versão da Oficina.
- Houve medições diferentes após mudanças de método.
- A documentação também registra a regra de que o teto pode mudar quando a medição muda, desde que a mudança seja registrada.

DESCONHECIDO:
- desempenho atual da interface no Redmi real;
- temperatura/thermal throttling atual;
- consumo real;
- impacto atual de serviços de fundo;
- desempenho do novo Hub no G75.

## 5. Arquitetura que pode ser formada a partir do legado

Camada A — núcleo local:
Continuum + diário + envelopes + blobs + preflight + saúde + recovery.

Camada B — execução:
executor local + adapters de provider + ADB Wi-Fi + Termux.

Camada C — frota:
G15 / G75 / Redmi + manifestos + tuning reversível + rollback.

Camada D — rede:
ARRIS + Mesh 1 + Mesh 2 + contrato de capacidade + diagnóstico.

Camada E — construção:
APK pipeline + build reproducível + validação + instalação segura.

Camada F — conhecimento:
sistema2 + Zettelkasten + Hermes + documentação, com filtragem de privacidade.

Camada G — interface:
Admin atual → futuro Fênix Hub local.

## 6. Lacunas que bloqueiam a afirmação de completude

1. Não há ainda um inventário byte-a-byte de todos os arquivos históricos de todos os repositórios.
2. Não foi executado um clone offline completo de cada histórico nesta sessão.
3. Não foi feita a triagem de todas as branches antigas.
4. Não foram catalogados todos os workflows e seus últimos resultados.
5. Não foi feita a matriz completa de dependências cruzadas entre os oito repositórios.
6. Não foi feito inventário dos ativos externos acessíveis por conectores.
7. Termux ainda não está instalado no G75.
8. ARRIS/CBN ainda não foram observados/configurados.
9. Os três telefones ainda não possuem manifestos reais coletados pelo novo orquestrador.
10. A capacidade real de execução local do APK ainda não foi demonstrada.

## 7. Próxima ordem, sem reciclagem prematura

PRESERVAR:
- fechar este catálogo;
- capturar branches, workflows, dependências e artefatos.

RECUPERAR:
- localizar código e documentação útil nos históricos.

CONSOLIDAR:
- matriz de reutilização por componente.

MAPEAR:
- dependências Hub ↔ Supabase ↔ Cloudflare ↔ APK ↔ Android ↔ rede.

VERIFICAR:
- executar testes locais reproduzíveis antes de alterar componentes.

CLASSIFICAR RISCOS:
- segurança, privacidade, fornecedor, energia, desempenho, recuperação.

CORRIGIR:
- somente depois da matriz de evidência.

VALIDAR:
- testes e evidência física.

PORTABILIZAR:
- bundle e APK.

REDUNDAR:
- adapters e provedores.

AUTOMATIZAR:
- comando único de frota.

PARAR:
- quando o critério de aceitação estiver demonstrado.

## 8. Critério de parada da catalogação

A catalogação só passa para reciclagem quando:
- os oito repositórios tiverem histórico relevante mapeado;
- arquivos-chave e workflows estiverem identificados;
- dependências cruzadas estiverem registradas;
- recursos reutilizáveis estiverem separados de dados pessoais/segredos;
- gaps de evidência estiverem explícitos;
- nenhum item histórico estiver sendo tratado como estado atual sem evidência.


## 9. Branches relevantes observadas

O inventário de branches também faz parte do legado. Branch não é prova de código vigente; é fonte de histórico e possíveis implementações.

- hub: dezenas de branches, incluindo continuidade, identidade, provider-agnostic, persistência, RPC hardening, UI, TV, APK/admin, rede e Termux.
- APKs: branches de ingestão, biblioteca, geração Life in Adventure e experiência da Amanda.
- TERCEIRA-MARGEM: branches de forja, pareamento, pesquisa, linhagens, protocolo Fênix e memória/cifras.
- sistema2: branches de planejamento, migração, regra da caixa, revisão/reconstrução e protocolo Fênix.
- zettelkasten-ai: branches de frota, Sandman, áudio, credencial e inbox.
- AMANDABT: branches de visão da Amanda, sigilos, caixa, mapa/intensivão e protocolo Fênix.

A lista completa de nomes estava disponível no GitHub durante esta catalogação e deve ser preservada como inventário antes de eventual limpeza.

## 10. Workflows observados

### hub
- `.github/workflows/fenix-continuum.yml`
- `.github/workflows/fenix-continuum-main.yml`
- `.github/workflows/supabase-deploy.yml`
- `.github/workflows/supabase-previa.yml`
- `.github/workflows/cloudflare-secrets.yml`
- `.github/workflows/tv-atualizar.yml`

### APKs
- `.github/workflows/fenix-life-in-adventure-build.yml`
- `.github/workflows/biblioteca-aplicativos.yml`

Nos demais repositórios, a busca textual por `.github/workflows` não produziu uma listagem confiável de arquivos de workflow; portanto isso permanece DESCONHECIDO até inspeção por árvore/histórico.

## 11. Marcos iniciais e atuais

- sistema2: primeiro commit encontrado pelo índice consultado em 16/09/2026; snapshot atual 11c5211 em 28/09.
- TERCEIRA-MARGEM: primeiro commit indexado em 17/09/2026; snapshot atual 52efe4e em 28/09.
- AMANDABT: primeiro commit indexado em 16/09/2026; snapshot atual 41eb64a em 28/09.
- hub: primeiro commit indexado em 24/09/2026; snapshot atual 5679ccf em 29/09.
- codespace-android-termux: primeiro e único commit observado, 619ea6c7.
- APKs, Prototype-TM01 e zettelkasten-ai não tiveram primeiro commit confiavelmente retornado pela busca ordenada usada nesta passagem; não inferir antiguidade.

## 12. Regra para a reciclagem

Nenhum módulo será transplantado apenas porque parece útil.

Cada candidato deverá receber:
- origem;
- commit de origem;
- função original;
- dependências;
- dados que toca;
- autoridade que assume;
- testes existentes;
- limitações históricas;
- destino proposto;
- adaptação necessária;
- teste de regressão;
- condição de rollback.

Somente candidatos que passem essa ficha poderão entrar na arquitetura Fênix.


## 13. Cobertura histórica indexada nesta revisão

A busca de commits do GitHub retornou:
- sistema2: 95 commits indexados, 94 mensagens únicas, 04/09–28/09.
- TERCEIRA-MARGEM: 88 commits, 78 mensagens únicas, 06/09–28/09.
- AMANDABT: 71 commits, 71 mensagens únicas, 06/09–28/09.
- zettelkasten-ai: 46 commits, 43 mensagens únicas, 08/09–28/09.
- hub: 100 commits retornados pelo limite da consulta, todos entre 27/09–29/09; portanto a cobertura do hub é truncada pelo limite de 100 e não representa todo o histórico.
- Prototype-TM01: 4 commits, 18/09.
- APKs: 18 commits, 27/09–29/09.
- codespace-android-termux: 1 commit, 29/09.

A cobertura é suficiente para localizar a evolução recente e os marcos, mas não deve ser descrita como exportação integral do Git. Para preservação total, a próxima etapa é gerar um inventário de commits por repositório fora do limite de pesquisa e guardar os identificadores em artefato portátil.
