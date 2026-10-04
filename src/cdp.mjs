import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {fileURLToPath} from "node:url";
import {makeExpression,makeProbeExpression} from "./renderer.mjs";

export const PORT=9437;
export const TESTED_VERSION="26.930.3930.0";
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const run=promisify(execFile);
const quotePS=v=>"'"+String(v).replaceAll("'","''")+"'";
const ps=async script=>{
  if(process.platform!=="win32")throw new Error("当前仅支持 Windows。");
  let stdout;
  try{({stdout}=await run(path.join(process.env.WINDIR||"C:\\Windows","System32","WindowsPowerShell","v1.0","powershell.exe"),
    ["-NoProfile","-NonInteractive","-Command","[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false);"+script],
    {windowsHide:true,timeout:12000,maxBuffer:65536}));}catch{throw new Error("无法验证本机窗口身份；请核对 README 的手动准备步骤，操作已取消。");}
  return stdout.trim()?JSON.parse(stdout.trim()):null;
};

export function localSocket(value){
  const u=new URL(value);
  if(u.protocol!=="ws:"||u.hostname!=="127.0.0.1"||u.port!==String(PORT)||
    u.username||u.password||u.search||u.hash||!/^\/devtools\/page\/[A-Za-z0-9_-]+$/.test(u.pathname))
    throw new Error("拒绝连接未经验证的本机调试地址。");
  return u.href;
}
export function chooseCandidate(candidates,action="apply"){
  const selected=candidates.filter(c=>action==="remove"?c.probe?.owned===true:c.probe?.ready===true);
  if(action==="remove"&&selected.length===0)return null;
  if(selected.length===1)return selected[0];
  if(selected.length>1)throw new Error("有多个可用聊天窗口，请保留一个再操作。");
  throw new Error("未找到可见的聊天区和输入框；请打开普通聊天。");
}
export function sameOwner(a,b){
  return !!a&&!!b&&a.pid===b.pid&&a.started===b.started&&a.exe===b.exe;
}
async function discover(){
  const pkg=await ps("$ErrorActionPreference='Stop';$p=Get-AppxPackage -Name OpenAI.Codex|Sort-Object Version -Descending|Select-Object -First 1;if(-not $p){throw 'Codex not registered'};[pscustomobject]@{family=[string]$p.PackageFamilyName;version=[string]$p.Version;root=[string]$p.InstallLocation}|ConvertTo-Json -Compress");
  if(pkg?.family!=="OpenAI.Codex_2p2nqsd0c76g0"||!path.isAbsolute(pkg.root||""))
    throw new Error("没有发现已注册的官方 Microsoft Store Codex。");
  const exe=path.join(pkg.root,"app","ChatGPT.exe");
  if(!fs.existsSync(exe))throw new Error("官方 Codex 程序不可用。");
  return {...pkg,exe};
}
async function portOwner(codex){
  const profile=path.join(ROOT,"local-profile");
  const script="$ErrorActionPreference='Stop';$ls=@(Get-NetTCPConnection -State Listen -LocalPort "+PORT+" -ErrorAction SilentlyContinue);"+
    "if($ls.Count -eq 0){'null';exit};if(@($ls|Where-Object{$_.LocalAddress -notin @('127.0.0.1','::1')}).Count){throw 'Non-loopback listener'};"+
    "$ids=@($ls.OwningProcess|Select-Object -Unique);if($ids.Count -ne 1){throw 'Ambiguous owner'};"+
    "$p=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$ids[0]);"+
    "$profilePattern='--user-data-dir(?:=|\\s+)(?:\"'+[regex]::Escape("+quotePS(profile)+")+'\"|'+[regex]::Escape("+quotePS(profile)+")+')(?:\\s|$)';"+
    "if(($p.ExecutablePath -ine "+quotePS(codex.exe)+") -or ($p.CommandLine -notmatch $profilePattern) -or ($p.CommandLine -notmatch '--remote-debugging-port[= ]"+PORT+"(?:\\s|$)')){throw 'Unverified owner'};"+
    "$roots=@(Get-CimInstance Win32_Process -Filter \"Name = 'ChatGPT.exe'\"|Where-Object{$_.ExecutablePath -ieq "+quotePS(codex.exe)+" -and $_.CommandLine -notmatch '--type='});"+
    "if($roots.Count -ne 1 -or $roots[0].ProcessId -ne $p.ProcessId){throw 'Multiple Codex instances'};"+
    "[pscustomobject]@{pid=[int]$p.ProcessId;started=$p.CreationDate.ToUniversalTime().ToString('o');exe=$p.ExecutablePath}|ConvertTo-Json -Compress";
  return ps(script);
}
export function localJson(route,port=PORT){
  if(route!=="/json/list"||port!==PORT)throw new Error("只允许固定本机入口。");
  return new Promise((resolve,reject)=>{
    const req=http.get({host:"127.0.0.1",port:PORT,path:route,agent:false,timeout:4000},res=>{
      if(res.statusCode!==200){res.resume();reject(new Error("本机调试入口回应异常。"));return;}
      let bytes=0;const chunks=[];
      res.on("data",chunk=>{
        bytes+=chunk.length;
        if(bytes>262144){req.destroy(new Error("回应超出限额。"));return;}
        chunks.push(chunk);
      });
      res.on("aborted",()=>reject(new Error("本机回应中断。")));
      res.on("error",()=>reject(new Error("本机回应失败。")));
      res.on("end",()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));}catch{reject(new Error("本机回应格式无效。"));}});
    });
    req.on("timeout",()=>req.destroy(new Error("本机入口超时。")));
    req.on("error",()=>reject(new Error("未找到本机调试入口。补丁不会替你启动 Codex。")));
  });
}
export async function evaluate(socket,expression){
  const url=localSocket(socket);
  const {WebSocket,Agent}=await import("undici");
  const dispatcher=new Agent({connect:{timeout:4000}});
  let ws;
  try{
    ws=new WebSocket(url,{dispatcher});
    return await new Promise((resolve,reject)=>{
      let done=false,opened=false;
      const timer=setTimeout(()=>finish(new Error(opened?"操作超时。":"本机连接超时。")),12000);
      const finish=(err,value)=>{
        if(done)return;done=true;clearTimeout(timer);
        err?reject(err):resolve(value);
      };
      ws.addEventListener("open",()=>{
        opened=true;
        try{ws.send(JSON.stringify({id:1,method:"Runtime.evaluate",params:{expression,awaitPromise:true,returnByValue:true,userGesture:false}}));}
        catch{finish(new Error("本机操作发送失败。"));}
      },{once:true});
      ws.addEventListener("message",event=>{
        if(done)return;
        if(typeof event.data!=="string"||Buffer.byteLength(event.data,"utf8")>1048576){finish(new Error("本机回应超过限额或格式无效。"));return;}
        let result;try{result=JSON.parse(event.data);}catch{finish(new Error("本机回应格式无效。"));return;}
        if(result.id!==1)return;
        if(result.error||result.result?.exceptionDetails)finish(new Error("Codex 拒绝了临时样式操作。"));
        else finish(null,result.result?.result?.value);
      });
      ws.addEventListener("error",()=>finish(new Error("本机连接失败。")),{once:true});
      ws.addEventListener("close",()=>finish(new Error("本机连接已关闭。")),{once:true});
    });
  }finally{try{ws?.close();}catch{}await dispatcher.destroy().catch(()=>{});}
}
export async function patch(action,image,overlay,appearance,{acknowledged=false}={}){
  if(action!=="apply"&&action!=="remove")throw new Error("只支持应用和撤销。");
  if(action==="apply"&&!acknowledged)throw new Error("应用前必须明确确认本机调试风险。");
  const codex=await discover();
  if(action==="apply"&&codex.version!==TESTED_VERSION)
    throw new Error("当前 Codex 版本未验证，未应用。已验证版本："+TESTED_VERSION);
  const owner=await portOwner(codex);
  if(!owner)throw new Error("没有已验证的本机调试窗口；补丁不会启动或重启 Codex。");
  const pages=await localJson("/json/list");
  const candidates=Array.isArray(pages)?pages.filter(p=>p.type==="page"&&/^app:\/\/-\/index\.html(?:[?#]|$)/.test(p.url||"")):[];
  if(candidates.length>8)throw new Error("候选页面数量异常。");
  const probes=[];
  for(const page of candidates){
    if(!sameOwner(owner,await portOwner(codex)))throw new Error("进程在检查期间变化，操作取消。");
    const ws=localSocket(page.webSocketDebuggerUrl);
    probes.push({ws,probe:await evaluate(ws,makeProbeExpression())});
  }
  const target=chooseCandidate(probes,action);
  if(!sameOwner(owner,await portOwner(codex)))throw new Error("进程在检查期间变化，操作取消。");
  if(!target)return {ok:true,code:"already-stock",message:"没有本补丁的临时样式。"};
  const result=await evaluate(target.ws,makeExpression(image,overlay,action,appearance));
  if(!result?.ok)throw new Error(result?.message||"临时样式未通过检查。");
  if(!sameOwner(owner,await portOwner(codex)))throw new Error("窗口在操作后发生变化，结果无法确认，请正常退出该窗口恢复。");
  return {ok:true,code:result.code,metrics:result.metrics,message:action==="apply"?
    "临时样式已应用，聊天区及输入框尺寸检查通过；补丁已结束运行。":
    "本补丁的临时样式已撤销；关闭 Codex 后，本机调试入口才会关闭。"};
}
