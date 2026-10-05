# Proveniência

O conteúdo deste repositório saiu de `nthnkrdpna-cloud/hub` em 05/10/2026, extraído com
`git filter-repo` a partir de `hub@71a83c3` (a `main` daquele dia). O histórico dos arquivos
movidos veio junto: são 59 commits, com autor, data e mensagem originais.

- `commit-map.txt`: commit de origem no hub → commit correspondente aqui. Os SHAs mudam porque
  cada commit passou a carregar só os arquivos deste subsistema.
- `sha256-origem.txt`: o hash de cada arquivo extraído, tal como estava no hub. Na extração, os
  39 arquivos conferiram byte a byte, com o mesmo modo, e o conjunto bate exatamente com o da
  `main` do hub.
- Única mudança de caminho: `.github/workflows/fenix-*.yml` → `ci-desativado/workflows/`
  (ver `ci-desativado/LEIA-ME.md`).

Os arquivos alterados depois da extração (`scripts/fenix.mjs`,
`scripts/dispositivos/fenix-hub-android.test.mjs`) têm a mudança no próprio histórico daqui. O
hash em `sha256-origem.txt` é o de antes.
