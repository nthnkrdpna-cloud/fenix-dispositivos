## Build portátil do Fênix Hub

O Fênix Hub não depende conceitualmente do GitHub Actions para ser compilado. O script
`scripts/dispositivos/build-fenix-hub-portable.sh` prepara, em Linux x86_64, JDK 17,
Gradle 9.4.1 e Android SDK API 36/build-tools 36.0.0, executa o contrato estático e
produz o APK debug com SHA-256, assinatura, alinhamento 16 KiB e badging.

O script não lê nem grava secrets de aplicação. O bootstrap padrão agora usa o pacote oficial Android Command Line Tools para Linux
`commandlinetools-linux-15859902_latest.zip`, publicado pelo Android Developers, com
SHA-256 `4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583`. O executor
pode sobrescrever URL e checksum explicitamente, mas não precisa mais fornecer a URL para
o caminho padrão.

### Uso

```bash
bash scripts/dispositivos/build-fenix-hub-portable.sh
```

Saída esperada após sucesso:

```
FENIX_BUILD_OK: android/fenix-hub/app/build/outputs/apk/debug/app-debug.apk
```

O APK só deve ser chamado de release verificável depois de o arquivo existir e os
artefatos `SHA256SUMS.txt` e `APK_BADGING.txt`, além de `apksigner` e `zipalign`,
serem confirmados.

### Workers Builds

O Cloudflare Workers Builds usa um ambiente Ubuntu 24.04 x86_64 e permite comandos de
build personalizados. A configuração efetiva do Worker, porém, é administrativa e não
é controlada pelo `wrangler.jsonc` atual. Portanto, a sessão que não possui conector
Cloudflare não deve alegar que configurou ou disparou esse caminho.

Quando o acesso Cloudflare estiver disponível, o build pode usar o script acima como
comando de build, desde que o ambiente tenha saída HTTPS e permita o bootstrap dos
artefatos necessários. O Worker de produção não deve ser usado como substituto do gate
do APK: build, hash, assinatura, alinhamento e teste físico continuam evidências
independentes.

### Invariantes

- Continuum: autoridade humana, evidência rastreável, recuperação e substituição de
  executor/provedor.
- Fênix Hub: sem root, allowlist Termux fechada e auditoria Android somente leitura.
- Proporção áurea/Fibonacci/geometria sagrada: permanece requisito de especificação
  visual/arquitetural, não uma alegação de validação matemática automática.
- Nenhum segredo entra no APK, no diário ou no script de build.
