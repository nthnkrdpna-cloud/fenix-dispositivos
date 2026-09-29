import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";

const alvo = process.argv[2] || "192.168.0.1";
const saida = process.argv[3] || "./evidencias/rede";
const comandos = [
  ["ip-route", ["route"]],
  ["ip-neigh", ["neigh"]],
  ["ip-addr", ["addr"]],
  ["ping-gateway", ["-c","5","-W","1",alvo]],
  ["dns-gateway", ["-x",alvo]]
];

function executar(bin,args){
  return new Promise((resolve)=>{
    const p=spawn(bin,args,{stdio:["ignore","pipe","pipe"]});
    let stdout="",stderr="";
    p.stdout.on("data",d=>stdout+=d);
    p.stderr.on("data",d=>stderr+=d);
    p.on("error",e=>resolve({ok:false,erro:e.message}));
    p.on("close",code=>resolve({ok:code===0,code,stdout:stdout.trim(),stderr:stderr.trim()}));
  });
}
async function primeiro(bin,args){
  const r=await executar(bin,args);
  return r;
}
const resultado={
  protocolo:"fenix-lan-audit/1",
  modo:"somente_leitura",
  iniciado_em:new Date().toISOString(),
  alvo,
  host:{},
  comandos:{}
};
for(const [nome,args] of comandos){
  const bin = nome==="dns-gateway" ? "getent" : nome==="ping-gateway" ? "ping" : "ip";
  const r=await primeiro(bin,args);
  resultado.comandos[nome]=r;
}
resultado.finalizado_em=new Date().toISOString();
await fs.mkdir(saida,{recursive:true});
const nome=`lan-audit-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;
const destino=`${saida}/${nome}`;
await fs.writeFile(destino,JSON.stringify(resultado,null,2)+"\n",{mode:0o600});
console.log(destino);
console.log(JSON.stringify(resultado,null,2));
