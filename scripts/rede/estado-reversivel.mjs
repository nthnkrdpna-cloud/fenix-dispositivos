import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

function canon(v){
  if(v===null||typeof v!=="object") return v;
  if(Array.isArray(v)) return v.map(canon);
  return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])]));
}
function hash(v){return createHash("sha256").update(JSON.stringify(canon(v))).digest("hex");}

const [acao,arquivo,saida="./evidencias/rede"] = process.argv.slice(2);
if(!["snapshot","verify"].includes(acao) || !arquivo){
  console.error("uso: node scripts/rede/estado-reversivel.mjs snapshot|verify estado.json [diretorio]");
  process.exit(2);
}
const estado=JSON.parse(await fs.readFile(arquivo,"utf8"));
const registro={
  protocolo:"fenix-network-state/1",
  criado_em:new Date().toISOString(),
  estado:canon(estado)
};
registro.hash=hash(registro);
await fs.mkdir(saida,{recursive:true});
const destino=path.join(saida,`network-state-${registro.hash}.json`);
if(acao==="snapshot"){
  await fs.writeFile(destino,JSON.stringify(registro,null,2)+"\n",{mode:0o600});
  console.log(JSON.stringify({ok:true,destino,hash:registro.hash},null,2));
}else{
  const esperado=JSON.parse(await fs.readFile(arquivo,"utf8"));
  const {hash:hashSalvo,...semHash}=esperado;
  const valido=typeof hashSalvo==="string" && hashSalvo===hash(semHash);
  console.log(JSON.stringify({valido,hashAtual:hash(semHash),hashSalvo},null,2));
  if(!valido) process.exit(1);
}
