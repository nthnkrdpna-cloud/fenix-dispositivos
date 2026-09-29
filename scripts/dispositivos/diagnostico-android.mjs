import { spawn } from "node:child_process";

const PROPS=["ro.product.model","ro.product.device","ro.build.id","ro.build.version.release","ro.bootloader","ro.boot.flash.locked","ro.oem_unlock_supported"];
function run(args){return new Promise((resolve,reject)=>{const p=spawn("adb",args,{stdio:["ignore","pipe","pipe"]});let out="",err="";p.stdout.on("data",d=>out+=d);p.stderr.on("data",d=>err+=d);p.on("error",reject);p.on("close",code=>code===0?resolve(out.trim()):reject(new Error(err.trim()||`adb terminou com ${code}`)));});}
const devices=await run(["devices"]);
if(!/^\S+\s+device$/m.test(devices)) throw new Error("nenhum dispositivo ADB autorizado; este diagnóstico não habilita ADB nem altera o aparelho");
const serial=devices.split("\n").find(x=>/\S+\s+device$/.test(x))?.split("\t")[0];
const props={};
for(const key of PROPS){props[key]=await run(["-s",serial,"shell","getprop",key]);}
props.bateria=await run(["-s",serial,"shell","dumpsys","battery"]).catch(()=>null);
props.memoria=await run(["-s",serial,"shell","cat","/proc/meminfo"]).catch(()=>null);
props.armazenamento=await run(["-s",serial,"shell","df","-h","/data"]).catch(()=>null);
console.log(JSON.stringify({serial,modo:"somente_leitura",props},null,2));
