import { createHash } from "node:crypto";
export const NEURALESE_VERSAO="fenix-neuralese/1";
const canon=v=>v===null||typeof v!=="object"?v:Array.isArray(v)?v.map(canon):Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])]));
const hash=v=>createHash("sha256").update(JSON.stringify(canon(v))).digest("hex");
export function criarEstadoSemantico({intencao,estado,evidencias=[],restricoes=[],capacidades=[],incertezas=[],proposta=null,testes=[],rollback=null,parada=null}){
 if(typeof intencao!=="string"||!intencao.trim())throw new Error("intenção obrigatória");
 const x={protocolo:NEURALESE_VERSAO,intencao,estado,evidencias,restricoes,capacidades,incertezas,proposta,testes,rollback,parada};
 return Object.freeze({...x,semantica_hash:hash(x)});
}
export function verificarEstadoSemantico(x){const {semantica_hash,...rest}=x||{};if(rest.protocolo!==NEURALESE_VERSAO)throw new Error("versão Neuralese desconhecida");if(semantica_hash!==hash(rest))throw new Error("estado semântico adulterado");return true;}
export function projetarParaExecutor(x,{capacidadePermitida=[],escopo=[]}={}){
 verificarEstadoSemantico(x);
 return Object.freeze({intencao:x.intencao,estado:x.estado,restricoes:x.restricoes,capacidades_requeridas:x.capacidades.filter(c=>capacidadePermitida.includes(c)),escopo,incertezas:x.incertezas,proposta:x.proposta,testes:x.testes,rollback:x.rollback,parada:x.parada,nao_autoriza:true});
}