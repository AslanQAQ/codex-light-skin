import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"release.manifest.json"),"utf8"));
if(!Array.isArray(manifest)||new Set(manifest).size!==manifest.length)throw new Error("Invalid release manifest.");
const reserved=/^(?:profile|local-profile|node_modules|vendor|\.cache|dist|source-backups|document-backups)(?:\/|$)/i;
const privatePath=/(?:C:[\\\/]+Users[\\\/]+admin|D:[\\\/]+tools[\\\/]+Codex(?:Light|Dream)Skin)/i;
const credential=/\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password)\b\s*[:=]\s*["'][^"'\r\n]{8,}["']/i;
let total=0;
for(const rel of manifest){
  if(typeof rel!=="string"||!/^[-A-Za-z0-9_./]+$/.test(rel)||rel.split("/").some(s=>s===".."||s==="")||
    path.isAbsolute(rel)||reserved.test(rel)||/preview|session\.json|\.env|\.toml$|\.exe$|\.png$|\.ps1$|\.bat$|\.cmd$|\.vbs$/i.test(rel))
    throw new Error("Forbidden release path: "+rel);
  const file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)||fs.lstatSync(file).isSymbolicLink())throw new Error("Unsafe release path.");
  const bytes=fs.readFileSync(file);total+=bytes.length;
  if(bytes.length>2097152||total>8388608)throw new Error("Unexpected release size.");
  const text=bytes.toString("utf8");
  if(privatePath.test(text)||credential.test(text))throw new Error("Potential personal data: "+rel);
}
console.log(JSON.stringify({checked:true,files:manifest.length,bytes:total,noPreviewFiles:true,allowlistOnly:true}));
if(process.argv.includes("--check"))process.exit(0);
if(process.platform!=="win32")throw new Error("ZIP packaging currently requires Windows; source/tests are otherwise inspectable.");
const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
if(!/^\d+\.\d+\.\d+$/.test(pkg.version))throw new Error("Invalid version.");
const dist=path.join(root,"dist"),zip=path.join(dist,"codex-light-skin-v"+pkg.version+"-source.zip");
if(fs.existsSync(zip))throw new Error("Existing source ZIP preserved; move it yourself before rebuilding.");
const stage=path.join(root,".cache","release-"+Date.now(),"codex-light-skin");
for(const rel of manifest){
  const dest=path.join(stage,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(path.join(root,rel),dest,fs.constants.COPYFILE_EXCL);
}
fs.mkdirSync(dist,{recursive:true});
const quote=v=>"'"+v.replaceAll("'","''")+"'";
execFileSync(path.join(process.env.WINDIR||"C:\\Windows","System32","WindowsPowerShell","v1.0","powershell.exe"),
  ["-NoProfile","-NonInteractive","-Command","$ErrorActionPreference='Stop';Compress-Archive -LiteralPath "+quote(stage)+" -DestinationPath "+quote(zip)],
  {windowsHide:true,timeout:30000,stdio:"pipe"});
const sha=createHash("sha256").update(fs.readFileSync(zip)).digest("hex");
fs.writeFileSync(path.join(dist,"SHA256SUMS.txt"),sha+"  "+path.basename(zip)+"\n",{flag:"wx"});
console.log(JSON.stringify({sourceZip:zip,sha256:sha}));
