import {test} from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";




import {makeCss,makeExpression,makeProbeExpression} from "../src/renderer.mjs";
import {localSocket,chooseCandidate} from "../src/cdp.mjs";

const PNG="data:image/png;base64,iVBORw0KGgo=";
const ATTR="data-codex-light-skin", KEY="__codexLightSkinPatch";

// This is an in-memory DOM substitute, not a browser or a Codex connection.
// It checks ownership and transaction branches; it cannot validate visual paint.
function fixture(opts={}){
  const attrs=new Map(Object.entries(opts.attrs||{}));
  const foreignSheet={name:"original"};
  const sheets=[foreignSheet], styles=[];
  let deniedReads=0;
  const guarded=()=>{deniedReads++;throw new Error("Private data access forbidden");};
  const root={getAttribute:n=>attrs.has(n)?attrs.get(n):null,
    setAttribute:(n,v)=>attrs.set(n,v),removeAttribute:n=>attrs.delete(n),
    classList:{contains:n=>opts.dark&&n==="dark"}};
  const active=()=>attrs.get(ATTR)==="v0.1";
  const node=(width,height,kind)=>({
    kind,
    getBoundingClientRect:()=>({width:active()&&opts.collapse&&kind===opts.collapse?width/2:width,height})
  });
  const main=node(800,700,"main"), composer=node(680,100,"composer"),thread=node(780,560,"thread");
  main.querySelectorAll=s=>s===".thread-scroll-container"?[thread]:
    s.startsWith('[class*="_ComposerLayoutRoot_"]')?(opts.hiddenFirst?[node(0,0,"inactive-composer"),composer]:[composer]):
    (()=>{throw new Error("Unexpected scoped DOM query");})();
  Object.defineProperty(main,"textContent",{get:guarded});
  Object.defineProperty(thread,"innerText",{get:guarded});
  const document={
    documentElement:root,
    querySelectorAll:s=>{
      if(s.startsWith("main:"))return opts.notReady?[]:opts.duplicateMain?[main,main]:opts.hiddenFirst?[node(0,0,"inactive-main"),main]:[main];
      throw new Error("Unexpected document DOM query");
    },
    createElement:tag=>{
      assert.equal(tag,"style");
      const style={parentNode:null,sheet:null,
        remove(){style.parentNode=null;styles.splice(styles.indexOf(style),1);}};
      return style;
    },
    head:{append:style=>{style.parentNode={};style.sheet={};styles.push(style);}}
  };
  Object.defineProperty(document,"cookie",{get:guarded});
  Object.defineProperty(document,"title",{get:guarded});
  if(!opts.fallback) document.adoptedStyleSheets=sheets;
  const context={
    window:{},document, location:{protocol:"app:",hostname:"-",pathname:"/index.html",...opts.location},
    requestAnimationFrame:fn=>opts.stalledFrames?1:queueMicrotask(fn),
    setTimeout,clearTimeout,cancelAnimationFrame:()=>{},
    getComputedStyle:n=>n===root?{color:opts.dark?"rgb(244,244,244)":"rgb(20,20,20)"}:
      {display:active()&&opts.hide===n.kind?"none":"block",visibility:"visible",
        backgroundImage:active()&&!opts.blocked?'url("'+PNG+'")':"none"},
    Image:class {
      naturalWidth=0;naturalHeight=0;
      set src(value){
        assert.match(value,/^data:image\/png;base64,/);
        if(opts.stalledImage)return;
        queueMicrotask(()=>{
          if(opts.imageError){this.onerror?.();return;}
          this.naturalWidth=1672;this.naturalHeight=941;
          opts.onImageLoad?.();this.onload?.();
        });
      }
    },
    CSSStyleSheet:class {replaceSync(css){if(opts.sheetError)throw new Error("blocked");this.css=css;}}
  };
  Object.defineProperty(context,"localStorage",{get:guarded});
  Object.defineProperty(context,"sessionStorage",{get:guarded});
  return {context,attrs,foreignSheet,styles,denied:()=>deniedReads};
}
const transact=async(f,action="apply")=>await vm.runInNewContext(makeExpression(PNG,.7,action),f.context,{timeout:1000});
const ownCleared=f=>{
  assert.equal(f.context.window[KEY],undefined);
  if("adoptedStyleSheets" in f.context.document){
    assert.equal(f.context.document.adoptedStyleSheets.length,1);
    assert.equal(f.context.document.adoptedStyleSheets[0],f.foreignSheet);
  }
  assert.equal(f.styles.length,0);assert.equal(f.denied(),0);
};

await test("Only cosmetic CSS; reject URLs, CSS injection and invalid overlay",()=>{
  for(const dark of [false,true]){
    const css=makeCss(PNG,.7,dark);
    assert.match(css,/data-codex-light-skin/);
    assert.doesNotMatch(css,/(?:^|[;{])\s*(?:display|visibility|opacity|position|width|height|min-height|overflow)\s*:/);
    assert.doesNotMatch(css,/top-fade|@import|https?:/);
  }
  for(const image of ["https://example.invalid/image.png",PNG+'");display:none;/*',""])
    assert.throws(()=>makeCss(image,.7,false));
  for(const overlay of [NaN,Infinity,-.01,.91,"0.7"]) assert.throws(()=>makeCss(PNG,overlay,false));
});

await test("Debug addresses accept only the fixed loopback page endpoint",()=>{
  assert.equal(localSocket("ws://127.0.0.1:9437/devtools/page/A1-b_c"),"ws://127.0.0.1:9437/devtools/page/A1-b_c");
  for(const bad of [
    "wss://127.0.0.1:9437/devtools/page/A","ws://example.invalid:9437/devtools/page/A",
    "ws://localhost:9437/devtools/page/A","ws://127.0.0.1:9222/devtools/page/A",
    "ws://user:pass@127.0.0.1:9437/devtools/page/A","ws://127.0.0.1:9437/devtools/browser/A",
    "ws://127.0.0.1:9437/devtools/page/","ws://127.0.0.1:9437/devtools/page/A?x=1",
    "ws://127.0.0.1:9437/devtools/page/A#fragment","ws://127.0.0.1:9437/devtools/page/A/extra"
  ]) assert.throws(()=>localSocket(bad));
});

await test("Apply and remove preserve original sheets, root attribute and geometry",async()=>{
  const f=fixture({attrs:{[ATTR]:"prior"}});
  const applied=await transact(f);
  assert.equal(applied.code,"applied");
  assert.deepEqual(JSON.parse(JSON.stringify(applied.metrics)),{
    main:{width:800,height:700,visible:true},composer:{width:680,height:100,visible:true},
    thread:{width:780,height:560,visible:true}
  });
  assert.equal(f.context.document.adoptedStyleSheets.length,2);
  assert.equal((await transact(f,"remove")).code,"removed");
  assert.equal(f.attrs.get(ATTR),"prior");ownCleared(f);
});

await test("Repeated apply owns one sheet; repeated remove is harmless",async()=>{
  const f=fixture();await transact(f);await transact(f);
  assert.equal(f.context.document.adoptedStyleSheets.length,2);
  assert.equal((await transact(f,"remove")).code,"removed");
  assert.equal((await transact(f,"remove")).code,"already-stock");
  assert.equal(f.attrs.has(ATTR),false);ownCleared(f);
});

await test("Dark foreground selects the dark background",async()=>{
  const f=fixture({dark:true});const r=await transact(f);
  assert.equal(r.dark,true);
  assert.match(f.context.document.adoptedStyleSheets[1].css,/24,23,32/);
  await transact(f,"remove");ownCleared(f);
});

await test("Fallback style can be removed without touching existing content",async()=>{
  const f=fixture({fallback:true});
  assert.equal((await transact(f)).code,"applied");assert.equal(f.styles.length,1);
  assert.equal((await transact(f,"remove")).code,"removed");ownCleared(f);
});

for(const kind of ["main","composer","thread"]) await test("Dimension loss rolls back: "+kind,async()=>{
  const f=fixture({collapse:kind});
  assert.equal((await transact(f)).code,"layout-rollback");
  assert.equal(f.attrs.has(ATTR),false);ownCleared(f);
});

await test("Hidden input area rolls back",async()=>{
  const f=fixture({hide:"composer"});assert.equal((await transact(f)).code,"layout-rollback");ownCleared(f);
});

await test("Rejected background and stylesheet both roll back",async()=>{
  for(const [opts,code] of [[{blocked:true},"background-blocked"],[{sheetError:true},"apply-rollback"]]){
    const f=fixture(opts);assert.equal((await transact(f)).code,code);ownCleared(f);
  }
});

await test("Dream Skin conflict and missing chat refuse to apply",async()=>{
  for(const [opts,code] of [[{attrs:{"data-dream-skin":"active"}},"other-skin-active"],[{notReady:true},"page-not-ready"]]){
    const f=fixture(opts);assert.equal((await transact(f)).code,code);ownCleared(f);
  }
});

await test("Unexpected page or action never creates a stylesheet",async()=>{
  for(const loc of [{protocol:"https:"},{hostname:"other"},{pathname:"/index.html-extra"}]){
    const f=fixture({location:loc});assert.equal((await transact(f)).code,"unexpected-page");ownCleared(f);
  }
  const f=fixture();assert.equal((await transact(f,"unknown")).code,"unknown-action");ownCleared(f);
});

await test("Ignore mounted inactive surfaces and inactive composers",async()=>{
  const f=fixture({hiddenFirst:true});
  assert.equal((await transact(f)).code,"applied");
  await transact(f,"remove");ownCleared(f);
});
await test("Ambiguous visible surfaces refuse without applying",async()=>{
  const f=fixture({duplicateMain:true});
  assert.equal((await transact(f)).code,"page-not-ready");ownCleared(f);
});
await test("Readonly probe reports geometry without touching styles or data",async()=>{
  const f=fixture({hiddenFirst:true});
  const p=vm.runInNewContext(makeProbeExpression(),f.context,{timeout:1000});
  assert.equal(p.ready,true);assert.equal(p.owned,false);
  assert.equal(p.metrics.main.width,800);ownCleared(f);
});
await test("A ready chat is selected while a companion page is ignored",()=>{
  const ready={ws:"verified-chat",probe:{ready:true}}, widget={ws:"companion",probe:{ready:false}};
  assert.equal(chooseCandidate([widget,ready]),ready);
  assert.throws(()=>chooseCandidate([ready,{ws:"other",probe:{ready:true}}]));
  assert.throws(()=>chooseCandidate([widget]));
  assert.equal(chooseCandidate([widget,ready],"remove"),null);
  const owned={ws:"verified-owned",probe:{ready:false,owned:true}};
  assert.equal(chooseCandidate([ready,owned],"remove"),owned);
});

await test("Suspended frame callbacks cannot block apply or remove",async()=>{
  const f=fixture({stalledFrames:true});const started=Date.now();
  assert.equal((await transact(f)).code,"applied");
  assert.equal((await transact(f,"remove")).code,"removed");
  assert.ok(Date.now()-started<2500);ownCleared(f);
});

await test("Reference light appearance overrides a native dark palette without changing layout",async()=>{
  const f=fixture({dark:true});
  const r=await vm.runInNewContext(makeExpression(PNG,.12,"apply","light"),f.context,{timeout:1000});
  assert.equal(r.code,"applied");assert.equal(r.dark,false);
  const css=f.context.document.adoptedStyleSheets[1].css;
  assert.match(css,/body, .*color: #1c1b1d !important/);
  assert.match(css,/caret-color: #1c1b1d !important/);
  assert.match(css,/--color-text: #1c1b1d !important/);
  assert.match(css,/--color-text-user-message: #1c1b1d !important/);
  assert.match(css,/--color-background-composer-surface: rgba\(234,233,234,0\.92\) !important/);
  assert.match(css,/color-scheme: light/);assert.match(css,/--color-token-text-primary: #1c1b1d/);
  assert.match(css,/246,246,246,0.12/);assert.doesNotMatch(css,/24,23,32/);
  await transact(f,"remove");ownCleared(f);
  assert.throws(()=>makeCss(PNG,.12,false,"invalid"));
});

await test("An undecodable image is rejected without changing native styles",async()=>{
  const f=fixture({imageError:true});
  const result=await transact(f);
  assert.equal(result.code,"image-unavailable");assert.equal(result.ok,false);
  assert.equal(f.attrs.has(ATTR),false);ownCleared(f);
});
await test("Image failure during reapply preserves the existing owned styles",async()=>{
  const opts={},f=fixture(opts);
  assert.equal((await transact(f)).code,"applied");
  const previous=f.context.window[KEY];
  opts.imageError=true;
  assert.equal((await transact(f)).code,"image-unavailable");
  assert.equal(f.context.window[KEY],previous);
  assert.equal(f.context.document.adoptedStyleSheets.length,2);
  await transact(f,"remove");ownCleared(f);
});
await test("A page change during image decoding refuses to mutate styles",async()=>{
  const opts={},f=fixture(opts);
  opts.onImageLoad=()=>{opts.notReady=true;};
  assert.equal((await transact(f)).code,"page-changed");
  assert.equal(f.attrs.has(ATTR),false);ownCleared(f);
});
await test("Image decoding timeout returns without changing styles",async()=>{
  const f=fixture({stalledImage:true}),started=Date.now();
  assert.equal((await transact(f)).code,"image-unavailable");
  assert.ok(Date.now()-started<4500);ownCleared(f);
});
