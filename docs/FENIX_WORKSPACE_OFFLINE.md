# Workspace Fênix — portabilidade offline

CONFIRMADO: o workspace lógico pode ser reproduzido a partir do Git + arquivos de continuidade.
DESCONHECIDO: quais imagens de container e caches estarão presentes no host offline.

## Regra
Codespaces não é a fonte de verdade. O repositório, lockfiles, migrações e envelopes são.

## Camadas
- Código: Git e working tree.
- Dependências: lockfiles e cache local.
- Toolchain: versão Node documentada no devcontainer.
- Estado: diário/envelopes do Continuum.
- Dados locais: banco de desenvolvimento e arquivos de fixture.
- Réplicas: mídia local, LAN e serviços remotos quando disponíveis.

## Modo sem internet
1. Abrir o workspace local já materializado.
2. Executar os testes determinísticos que não exigem rede.
3. Ler o estado do Continuum pelo CLI.
4. Continuar tarefas usando transporte local.
5. Não tentar instalar dependências, consultar APIs ou sincronizar remoto enquanto a rede estiver indisponível.

## Modo com internet
Sincronizar somente após validar hashes locais. Serviços remotos são réplicas/aceleradores. Uma falha de GitHub, Supabase, Cloudflare, AWS ou ISP não pode apagar a cópia local.

## G15
O mesmo workspace poderá ser materializado no nó portátil quando o Android/Termux for validado. O diagnóstico Android em scripts/dispositivos é somente leitura; não desbloqueia, não rooteia e não flashea.
