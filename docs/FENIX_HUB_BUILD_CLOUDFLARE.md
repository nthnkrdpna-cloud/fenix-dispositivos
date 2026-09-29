# Fênix Hub — build por Workers Builds

Estado: infraestrutura de build alternativa ao GitHub Actions, sem depender da quota de Actions.

## Contrato

O build do APK deve executar:

```bash
FENIX_ANDROID_CMDLINE_URL='<URL oficial aprovada>' bash scripts/dispositivos/build-fenix-hub-portable.sh
```

O script prepara JDK 17, Gradle 9.4.1 e Android SDK API 36/build-tools 36.0.0, executa o contrato estático e exige:

- APK real;
- assinatura verificável por `apksigner`;
- alinhamento 16 KiB por `zipalign`;
- badging com package `com.nthnkrdpna.fenixhub.debug`;
- SDK mínimo 33;
- target SDK 36;
- SHA-256.

## Configuração administrativa do Workers Builds

A configuração de Workers Builds é externa ao repositório. Para o Worker `hub`, o executor administrativo deve apontar o repositório `nthnkrdpna-cloud/hub`, branch `main`, ambiente Linux x86_64 e comando de build que invoque o script acima.

O build pode usar o ambiente Ubuntu 24.04 x86_64 do Workers Builds. O projeto não deve colocar credenciais no script nem no APK.

O resultado do Workers Builds continua sendo evidência de compilação; ele não substitui a validação física no Moto G75.

## Rastreabilidade

O build deve ser associado a um commit específico de `main`. O resultado mínimo a preservar é:

1. commit SHA;
2. build UUID;
3. saída do build;
4. SHA-256 do APK;
5. resultado de `apksigner`;
6. resultado de `zipalign`;
7. badging;
8. localização do artefato;
9. teste físico posterior no G75.

## Quota GitHub Actions

A compilação do APK não deve depender de uma nova execução do GitHub Actions. O workflow existente permanece como verificação auxiliar quando houver quota/runner, mas sua indisponibilidade não deve impedir o caminho portátil/Workers Builds.

## Continuum e invariantes

- Autoridade permanece humana.
- Evidência de build não é confundida com autorização de distribuição.
- Nenhum segredo entra no diário, no APK ou no repositório.
- O executor de build é substituível.
- Proporção áurea/Fibonacci/geometria sagrada permanece requisito de especificação visual/arquitetural; não é apresentada como validação matemática automática.
- O APK só é classificado como pronto após os gates de artefato e teste físico.

## Condição de parada

Parar quando o APK real existir, todos os gates de integridade forem preservados e o teste no G75 produzir evidência reproduzível. Se o Workers Builds não estiver configurado/acessível, registrar o bloqueio administrativo sem declarar o APK pronto.
