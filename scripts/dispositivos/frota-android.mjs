import {spawn} from "node:child_process";
import {promises as fs} from "node:fs";
import path from "node:path";

const COMMON_SETTINGS=[
  ["global","window_animation_scale","0.5"],
  ["global","transition_animation_scale","0.5"],
  ["global","animator_duration_scale","0.5"]
];

const PROFILES=[
  {id:"g75",match:/^(XT2437-1|XT2437)/i,role:"primary"},
  {id:"g15",match:/^(XT2521(?:-[0-9]+)?|moto g15)/i,role:"persistent_edge"},
  {id:"redmi-note-11",match:/^(2201117TG|Redmi Note 11)/i,role:"redundancy"}
];

function run(args){
  return new Promise((resolve,reject)=>{
    const p=spawn("adb",args,{stdio:["ignore","pipe","pipe"]});
    let out="",err="";
    p.stdout.on("data",d=>out+=d);
    p.stderr.on("data",d=>err+=d);
    p.on("error",reject);
    p.on("close",code=>code===0?resolve(out.trim()):reject(new Error(err.trim()||`adb terminou com ${code}`)));
  });
}
async function prop(serial,key){return run(["-s",serial,"shell","getprop",key]).catch(()=> "");}
async function shell(serial,args){return run(["-s",serial,"shell",...args]).catch(()=> "");}
async function setting(serial,scope,key){return shell(serial,["settings","get",scope,key]);}
async function profileFor(model){
  return PROFILES.find(x=>x.match.test(model))||null;
}
async function snapshot(serial){
  const model=await prop(serial,"ro.product.model");
  const profile=await profileFor(model);
  const settings={};
  for(const [scope,key] of COMMON_SETTINGS) settings[`${scope}.${key}`]=await setting(serial,scope,key);
  const battery=await shell(serial,["dumpsys","battery"]);
  const mem=await shell(serial,["sh","-c","cat /proc/meminfo | head -n 8"]);
  const storage=await shell(serial,["sh","-c","df -h /data | tail -n 1"]);
  const thermal=await shell(serial,["dumpsys","thermalservice"]);
  const packages=await shell(serial,["pm","list","packages","com.termux"]);
  return {
    protocol:"fenix-android-fleet/2",
    serial,
    collected_at:new Date().toISOString(),
    model,
    profile:profile?.id||"UNKNOWN",
    role:profile?.role||"UNKNOWN",
    manufacturer:await prop(serial,"ro.product.manufacturer"),
    device:await prop(serial,"ro.product.device"),
    android:await prop(serial,"ro.build.version.release"),
    sdk:await prop(serial,"ro.build.version.sdk"),
    build:await prop(serial,"ro.build.id"),
    security_patch:await prop(serial,"ro.build.version.security_patch"),
    verified_boot:await prop(serial,"ro.boot.verifiedbootstate"),
    bootloader:await prop(serial,"ro.bootloader"),
    battery_summary:battery.slice(0,12000),
    memory_summary:mem,
    storage_summary:storage,
    thermal_summary:thermal.slice(0,16000),
    termux_installed:packages.includes("package:com.termux"),
    settings
  };
}
async function devices(){
  const raw=await run(["devices"]);
  return raw.split("\n").slice(1).map(x=>x.trim().split(/\s+/))
    .filter(x=>x[1]==="device").map(x=>x[0]);
}
function requireThree(nodes){
  if(nodes.length!==3) throw new Error(`FLEET_INCOMPLETE: esperados 3 nós autorizados, encontrados ${nodes.length}`);
  const ids=nodes.map(x=>x.profile);
  for(const id of ["g75","g15","redmi-note-11"]) if(!ids.includes(id)) throw new Error(`FLEET_PROFILE_MISSING: ${id}`);
}
async function applyCommon(serial){
  const changed=[];
  for(const [scope,key,value] of COMMON_SETTINGS){
    const before=await setting(serial,scope,key);
    await run(["-s",serial,"shell","settings","put",scope,key,value]);
    const after=await setting(serial,scope,key);
    if(after!==value) throw new Error(`${serial}: alteração não confirmada em ${scope}.${key}`);
    changed.push({type:"setting",scope,key,before,after});
  }
  return changed;
}
async function applyG75Termux(serial){
  const present=(await shell(serial,["pm","list","packages","com.termux"])).includes("package:com.termux");
  if(!present) return [];
  const before=await shell(serial,["dumpsys","deviceidle","whitelist"]);
  if(before.includes("com.termux")) return [{type:"deviceidle_whitelist",package:"com.termux",before:"already_whitelisted",after:"already_whitelisted"}];
  await run(["-s",serial,"shell","dumpsys","deviceidle","whitelist","+com.termux"]);
  const after=await shell(serial,["dumpsys","deviceidle","whitelist"]);
  if(!after.includes("com.termux")) throw new Error(`${serial}: Termux não entrou na whitelist do deviceidle`);
  return [{type:"deviceidle_whitelist",package:"com.termux",before:"not_whitelisted",after:"whitelisted"}];
}
async function rollbackNode(node){
  for(const x of [...node.changes].reverse()){
    if(x.type==="setting" && x.before!=="null" && x.before!=="unknown")
      await run(["-s",node.serial,"shell","settings","put",x.scope,x.key,x.before]);
    if(x.type==="deviceidle_whitelist" && x.before==="not_whitelisted")
      await run(["-s",node.serial,"shell","dumpsys","deviceidle","whitelist","-com.termux"]).catch(()=>{});
  }
}
const mode=process.argv[2]||"discover";
const outDir=process.env.FENIX_EVIDENCE_DIR||"./evidencias/dispositivos";
if(!["discover","optimize","rollback"].includes(mode)){
  console.error("uso: node scripts/dispositivos/frota-android.mjs discover|optimize|rollback");
  process.exit(2);
}
const serials=await devices();
if(!serials.length) throw new Error("nenhum dispositivo ADB autorizado");
await fs.mkdir(outDir,{recursive:true});

if(mode==="discover"){
  const nodes=[]; for(const serial of serials) nodes.push(await snapshot(serial));
  const result={protocol:"fenix-android-fleet/2",mode:"read_only",collected_at:new Date().toISOString(),nodes};
  await fs.writeFile(path.join(outDir,"fleet-manifest.json"),JSON.stringify(result,null,2)+"\n",{mode:0o600});
  console.log(JSON.stringify(result,null,2));
  process.exit(0);
}

if(mode==="rollback"){
  const file=process.env.FENIX_TUNING_SNAPSHOT||path.join(outDir,"fleet-tuning-last.json");
  const saved=JSON.parse(await fs.readFile(file,"utf8"));
  for(const node of saved.nodes) await rollbackNode(node);
  console.log(JSON.stringify({ok:true,mode:"rollback",nodes:saved.nodes.length},null,2));
  process.exit(0);
}

const beforeNodes=[]; for(const serial of serials) beforeNodes.push(await snapshot(serial));
requireThree(beforeNodes);

const nodes=[];
for(const before of beforeNodes){
  const changes=[];
  try{
    changes.push(...await applyCommon(before.serial));
    if(before.profile==="g75") changes.push(...await applyG75Termux(before.serial));
    nodes.push({...before,changes,ok:true});
  }catch(error){
    const partial={...before,changes,ok:false,error:error.message};
    try{await rollbackNode(partial); partial.rolled_back=true;}catch(rollbackError){partial.rollback_error=rollbackError.message;}
    nodes.push(partial);
  }
}
const record={
  protocol:"fenix-android-fleet/2",
  mode:"safe_optimize",
  collected_at:new Date().toISOString(),
  contract:"exactly_three_authorized_nodes",
  nodes
};
await fs.writeFile(path.join(outDir,"fleet-tuning-last.json"),JSON.stringify(record,null,2)+"\n",{mode:0o600});
console.log(JSON.stringify(record,null,2));
if(nodes.some(x=>!x.ok)) process.exit(1);
