import {test} from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {parseArgs,validatePng} from "../src/patch.mjs";
import {sameOwner,localJson} from "../src/cdp.mjs";

test("There is no launcher or extra operation",()=>{
  for(const command of ["start","preview","watch","install","restart"])assert.throws(()=>parseArgs([command]));
  assert.equal(parseArgs([]).action,"help");
  assert.equal(parseArgs(["remove"]).action,"remove");
  assert.throws(()=>parseArgs(["remove","--anything"]));
});
test("Apply refuses without an explicit acknowledgment",()=>{
  assert.throws(()=>parseArgs(["apply","missing.png"]),/风险/);
  const result=spawnSync(process.execPath,[fileURLToPath(new URL("../src/patch.mjs",import.meta.url)),"apply","missing.png"],{encoding:"utf8",timeout:5000,windowsHide:true});
  assert.equal(result.status,1);
  assert.match(JSON.parse(result.stdout).message,/风险/);
  assert.equal(result.stderr,"");
});
test("Strict arguments reject injected, duplicate and invalid values",()=>{
  const ack="--acknowledge-local-debugging";
  for(const rest of [["--overlay","1"],["--overlay","-1"],["--overlay","NaN"],["--overlay"],["--overlay","0.2","--overlay","0.3"],[ack],["--run","calc.exe"]])
    assert.throws(()=>parseArgs(["apply","image.png",ack,...rest]));
  assert.equal(parseArgs(["apply","image.png",ack,"--overlay","0.3"]).overlay,.3);
});
function png(){
  const bytes=Buffer.alloc(58);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);
  bytes.writeUInt32BE(13,8);bytes.write("IHDR",12,"ascii");
  bytes.writeUInt32BE(1672,16);bytes.writeUInt32BE(941,20);
  bytes.writeUInt32BE(1,33);bytes.write("IDAT",37,"ascii");
  bytes.writeUInt32BE(0,46);bytes.write("IEND",50,"ascii");
  return bytes;
}
test("PNG input rejects truncation, excessive dimensions, size and trailing data",()=>{
  assert.match(validatePng(png()),/^data:image\/png;base64,/);
  const oversized=png();oversized.writeUInt32BE(9000,16);
  const empty=png();empty.writeUInt32BE(0,20);
  for(const bytes of [Buffer.alloc(12),Buffer.alloc(8388609),png().subarray(0,48),oversized,empty,Buffer.concat([png(),Buffer.alloc(1)])])
    assert.throws(()=>validatePng(bytes));
});
test("Process identity includes PID, creation time and official executable",()=>{
  const a={pid:5,started:"time",exe:"official"};
  assert.equal(sameOwner(a,{...a}),true);
  for(const b of [null,{...a,pid:6},{...a,started:"different"},{...a,exe:"other"}])assert.equal(sameOwner(a,b),false);
});
test("HTTP requests cannot target other routes or ports",()=>{
  assert.throws(()=>localJson("/private"));
  assert.throws(()=>localJson("/json/list",9222));
});
