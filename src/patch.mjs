import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {patch} from "./cdp.mjs";

export function parseArgs(args){
  if(args.length===0||(args.length===1&&["help","--help","-h"].includes(args[0])))return {action:"help"};
  if(args[0]==="remove"&&args.length===1)return {action:"remove",overlay:.12,appearance:"light"};
  if(args[0]!=="apply")throw new Error("只支持 apply（应用）和 remove（撤销）。");
  if(typeof args[1]!=="string"||args[1].startsWith("--"))throw new Error("请提供本机 PNG 背景图片。");
  let overlay=.12,acknowledged=false,seenOverlay=false;
  for(let i=2;i<args.length;i++){
    if(args[i]==="--acknowledge-local-debugging"&&!acknowledged){acknowledged=true;continue;}
    if(args[i]==="--overlay"&&!seenOverlay){
      seenOverlay=true;
      const value=args[++i];
      if(typeof value!=="string"||!/^(?:0(?:\.\d+)?|\.\d+)$/.test(value))throw new Error("背景淡化值应为 0–0.9 的小数。");
      overlay=Number(value);
      if(!Number.isFinite(overlay)||overlay<0||overlay>.9)throw new Error("背景淡化值应为 0–0.9 的小数。");
      continue;
    }
    throw new Error("未知或重复参数。");
  }
  if(!acknowledged)throw new Error("应用前请了解 README 的本机调试风险，并明确添加 --acknowledge-local-debugging。");
  return {action:"apply",file:args[1],overlay,appearance:"light",acknowledged};
}
export function validatePng(bytes){
  if(!Buffer.isBuffer(bytes)||bytes.length<45||bytes.length>8388608||
    !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||
    bytes.readUInt32BE(8)!==13||bytes.subarray(12,16).toString("ascii")!=="IHDR")
    throw new Error("背景须为不超过 8 MiB 的 PNG 图片。");
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  if(!width||!height||width>8192||height>8192||width*height>32000000)
    throw new Error("图片尺寸超出限额；请先缩小图片。");
  let offset=8,hasData=false,ended=false;
  while(offset+12<=bytes.length){
    const size=bytes.readUInt32BE(offset),end=offset+12+size;
    if(end>bytes.length)throw new Error("PNG 文件不完整。");
    const type=bytes.subarray(offset+4,offset+8).toString("ascii");
    if(type==="IDAT")hasData=true;
    if(type==="IEND"){if(size!==0||end!==bytes.length)throw new Error("PNG 结尾无效。");ended=true;break;}
    offset=end;
  }
  if(!hasData||!ended)throw new Error("PNG 文件缺少图像数据或结尾。");
  return "data:image/png;base64,"+bytes.toString("base64");
}
export async function main(args){
  const options=parseArgs(args);
  if(options.action==="help")return {ok:true,message:
    "Codex Light Skin：一次性临时样式。\n应用：node src/patch.mjs apply 图片.png --acknowledge-local-debugging\n撤销：node src/patch.mjs remove\n只连接手动准备的本机窗口；不启动 Codex、浏览器或后台服务。准备方法见 README。"};
  let image="";
  if(options.action==="apply"){
    let bytes;
    try{
      const file=path.resolve(options.file);
      if(path.extname(file).toLowerCase()!==".png")throw new Error();
      const stat=fs.statSync(file);
      if(!stat.isFile()||stat.size>8388608||stat.size<45)throw new Error();
      bytes=fs.readFileSync(file);
    }catch{throw new Error("无法读取有效的本机 PNG 图片；未连接 Codex。");}
    image=validatePng(bytes);
  }
  return patch(options.action,image,options.overlay,options.appearance,{acknowledged:options.acknowledged});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const deadline=setTimeout(()=>{console.log(JSON.stringify({ok:false,message:"操作超过 45 秒，补丁已退出；请检查窗口，必要时正常退出 Codex 恢复。"}));process.exit(1);},45000);
  deadline.unref();
  try{console.log(JSON.stringify(await main(process.argv.slice(2))));}
  catch(error){console.log(JSON.stringify({ok:false,message:error.message||"操作未完成。"}));process.exitCode=1;}
  finally{clearTimeout(deadline);}
}
