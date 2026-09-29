export const CAPABILITY_CONTRACT_VERSION = "fenix-capability/1";

export const CAPABILITY_STATES = Object.freeze([
  "unknown", "observed", "ready", "degraded", "blocked"
]);

export function createCapabilityManifest({ id, kind, model = null, version = null, state = "observed", capabilities = {}, evidence = [], rollback = [] }) {
  if (!id || !kind) throw new TypeError("id e kind são obrigatórios");
  if (!CAPABILITY_STATES.includes(state)) throw new TypeError("estado de capacidade inválido");
  return Object.freeze({
    contract: CAPABILITY_CONTRACT_VERSION,
    id, kind, model, version, state,
    capabilities: Object.freeze({ ...capabilities }),
    evidence: Object.freeze([...evidence]),
    rollback: Object.freeze([...rollback])
  });
}

export function validateCapabilityManifest(manifest) {
  if (!manifest || manifest.contract !== CAPABILITY_CONTRACT_VERSION) throw new Error("contrato de capacidade desconhecido");
  if (!manifest.id || !manifest.kind) throw new Error("manifesto sem identidade");
  if (!CAPABILITY_STATES.includes(manifest.state)) throw new Error("estado de capacidade inválido");
  if (!manifest.capabilities || typeof manifest.capabilities !== "object") throw new Error("capacidades inválidas");
  if (!Array.isArray(manifest.evidence) || !Array.isArray(manifest.rollback)) throw new Error("evidência/rollback inválidos");
  return true;
}
