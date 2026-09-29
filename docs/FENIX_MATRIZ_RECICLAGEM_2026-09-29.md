# FÊNIX — MATRIZ DE RECICLAGEM DO LEGADO
## CATALOG-2026-09-29-ASSET-MATRIX

Status: pré-reciclagem. Nenhum transplante executado por este documento.

| Ativo | Origem | Evidência | Reuso provável | Risco | Condição |
|---|---|---|---|---|---|
| diário append-only | hub/continuidade | código + testes | núcleo local | autoridade/histórico | reutilizar após testes |
| preflight | hub/continuidade | código + testes | gate de toda ação | erro de classificação | manter como gate |
| Hermes | hub + sistema2 | código/docs | transporte entre executores | relé não é autoridade | reutilizar |
| frota 204 papéis | sistema2 | roster + hub | catálogo de executores | sincronização/escopo | adaptar para Hub |
| quota gate | hub | código novo | failover econômico | estado incorreto | testar local |
| vault metadata-only | hub | código novo | inventário de legado | falso positivo | ampliar busca sem coletar segredo |
| prova-batata | TERCEIRA-MARGEM | código + testes | benchmark Android/Web | métrica histórica | adaptar para APK |
| convite/pareamento | TERCEIRA-MARGEM | código | onboarding G75→G15/Redmi | privacidade | revisar antes |
| memória cifrada | TERCEIRA-MARGEM | docs + testes | memória local Fênix | segredo/recuperação | adaptar |
| terminal/API routing | hub | código/docs | conectores externos | quota/segredo | passar pelo adapter |
| TV/admin | hub | código/docs | módulo do Hub | escopo excessivo | modularizar |
| APK pipeline | APKs | README + commits | build/install | assinatura/compatibilidade | reutilizar |
| perfis de aparelhos | APKs | env + README | capability manifest | dados desatualizados | confirmar por ADB |
| geração procedural | Prototype-TM01 | README + código público | UI/asset generation | claim não retestado | reutilizar só técnica |
| Zettelkasten ingestion | zettelkasten-ai | README + scripts | conhecimento | privacidade | somente metadados/pedidos autorizados |
| Sandman/Gemini | zettelkasten-ai | código/docs | provider adapter candidato | termos/quota | não promover sem validação |
| códigos de governança | sistema2/TERCEIRA-MARGEM | docs | autoridade/consentimento | conflito histórico | derivar somente da regra vigente |
| rede LAN | hub | docs/scripts | transporte local | mudança física | primeiro discover |

## Candidatos que não devem ser promovidos automaticamente

- credenciais, tokens, chaves privadas e frases;
- dados pessoais de sistema2/AMANDABT;
- protótipo de identidade ainda não aprovado;
- código cuja dependência esteja presa a um único fornecedor sem adapter;
- resultados de benchmark antigos tratados como atuais;
- branches abandonadas tratadas como produto;
- APKs de terceiros como se fossem código Fênix.

## Regras de transformação

1. Copiar a ideia, não o segredo.
2. Preferir componente determinístico e testável.
3. Separar núcleo de adapter.
4. Preservar evidência da origem.
5. Criar teste antes de substituir implementação.
6. Manter rollback.
7. Nenhum módulo reciclado recebe autoridade por herança.
8. O APK final deve funcionar sem depender de uma única API.
