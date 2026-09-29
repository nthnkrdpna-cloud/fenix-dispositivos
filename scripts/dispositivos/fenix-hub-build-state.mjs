import { writeFile } from "node:fs/promises";
import { criarEstadoSemantico, verificarEstadoSemantico, projetarParaExecutor } from "../continuidade/neuralese.mjs";

const output = process.argv[2];
if (!output) throw new Error("caminho de saída obrigatório");

const state = criarEstadoSemantico({
  intencao: "produzir APK Fênix Hub reproduzível e verificável",
  estado: "BUILD_EM_EXECUCAO",
  evidencias: [
    "contrato Android API 36",
    "Java 17",
    "Gradle 9.4.1",
    "Build Tools 36.0.0",
    "build portátil provider-neutral"
  ],
  restricoes: [
    "sem segredo de aplicação",
    "sem dependência de API de IA específica",
    "não alterar autoridade",
    "não instalar nem alterar dispositivo automaticamente"
  ],
  capacidades: ["deterministico", "android-build"],
  incertezas: ["executor", "rede", "instalação física"],
  proposta: { commit: process.env.GITHUB_SHA || "local", provedor: "metadado" },
  testes: ["contrato Android", "apksigner", "zipalign", "badging", "sha256"],
  rollback: "descartar artefato e restaurar o workspace; nenhuma mutação de autoridade",
  parada: "APK verificável + artefato preservado; testes físicos permanecem gate separado"
});

verificarEstadoSemantico(state);
const projected = projetarParaExecutor(state, {
  capacidadePermitida: ["deterministico", "android-build"],
  escopo: ["build", "verify"]
});
await writeFile(output, JSON.stringify(projected, null, 2) + "\n", "utf8");
console.log(output);
