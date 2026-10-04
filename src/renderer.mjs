export function makeCss(image, overlay, dark, appearance="auto") {
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image)) throw new Error("只支持已检查的本地 PNG 背景。");
  if (!Number.isFinite(overlay) || overlay < 0 || overlay > 0.9) throw new Error("遮罩范围必须是 0%–90%。");
  if(!["auto","light","dark"].includes(appearance))throw new Error("外观模式无效。");
  if(appearance!=="auto")dark=appearance==="dark";
  const rgb = dark ? "24,23,32" : "246,246,246";
  const root = 'html[data-codex-light-skin="v0.1"]';
  const main = 'main:is([data-app-shell-main-surface],[class*="_MainContentSurface_"],.main-surface)';
  const palette={};
  if(!dark){
    const set=(names,value)=>{for(const name of names.split(" "))palette["--color-"+name]=value;};
    set("text text-user-message token-text-primary token-foreground token-dropdown-foreground text-primary text-primary-ghost text-primary-ghost-hover text-primary-outline text-primary-surface text-primary-soft text-primary-soft-alt","#1c1b1d");
    set("token-text-secondary token-text-tertiary token-description-foreground text-secondary text-tertiary text-secondary-ghost text-secondary-solid text-secondary-outline text-secondary-soft-alt text-disabled text-execution-output-label","#6a696a");
    set("surface surface-card token-main-surface-primary token-bg-primary","#f6f6f6");
    set("surface-secondary surface-recovery token-side-bar-background","rgba(254,254,254,0.85)");
    set("surface-elevated token-dropdown-background background-panel background-primary-soft background-page-search","rgba(254,254,254,0.92)");
    set("background-composer-surface", "rgba(234,233,234,0.92)");
    set("surface-elevated-secondary surface-tertiary token-bg-secondary token-bg-tertiary background-composer-action-bar","#eae9ea");
    set("surface-canvas token-diff-surface background-execution-output","#f6f6f6");
    set("token-border token-border-default token-border-heavy token-input-border token-interactive-border-focus border-primary-outline border-secondary-outline border-mode-toggle-selected","#d3d3d3");
    set("token-border-light border-primary-surface border-primary-soft-alt border-secondary-soft-alt border-disabled","rgba(28,27,29,0.10)");
    set("token-text-link-foreground text-info text-info-soft text-info-ghost text-discovery text-discovery-soft text-discovery-outline-hover text-business-claim","#877bcc");
    set("token-focus-border","rgba(135,123,204,0.7)");
    set("token-editor-find-match-background","rgba(135,123,204,0.18)");
    set("token-interactive-bg-secondary-hover token-list-hover-background background-secondary-soft background-secondary-soft-hover background-secondary-soft-active background-primary-soft-hover background-primary-ghost-focus background-primary-soft-alt background-home-suggestion-hover background-button-outline-hover","rgba(135,123,204,0.10)");
    set("token-scrollbar-slider-hover-background token-text-code-block-background background-primary-soft-alpha background-primary-outline-hover","rgba(28,27,29,0.07)");
    set("background-primary-solid background-primary-solid-hover background-primary-solid-active","#877bcc");
    set("text-inverse text-on-chat-accent","#ffffff");
    set("text-composer-primary","#655c99");
    set("background-mode-toggle-selected background-activity-control","#eae9ea");
    const gray={50:"#fafafa",100:"#f6f6f6",200:"#ededed",300:"#d3d3d3",400:"#b6b6b8",500:"#969699",600:"#6a696a",700:"#515052",800:"#353437",900:"#242326",950:"#1c1b1d",1000:"#111111"};
    for(const [key,value]of Object.entries(gray))palette["--color-gray-"+key]=value;
  }
  const variables=Object.entries(palette).map(([key,value])=>key+": "+value+" !important;").join(" ");
  return [
    root+' { '+variables+' color-scheme: '+(dark?"dark":"light")+' !important; '+(!dark?"color: #1c1b1d !important;":"")+" }",
    root+" "+main+" { background-image: linear-gradient(rgba("+rgb+","+overlay+"),rgba("+rgb+","+overlay+")),url(\""+image+"\") !important; background-size: cover !important; background-position: center !important; background-attachment: fixed !important; background-repeat: no-repeat !important; background-color: rgb("+rgb+") !important; }",
    root+" "+main+' :is([class*="_MainContentFrame_"],.thread-scroll-container,[data-app-shell-main-content]) { background-color: transparent !important; }',
    root+' aside.app-shell-left-panel { background-image: linear-gradient(rgba('+rgb+','+(dark?.92:.80)+'),rgba('+rgb+','+(dark?.92:.80)+')),url("'+image+'") !important; background-size: cover !important; background-position: center !important; background-attachment: fixed !important; background-color: rgba('+rgb+',0.92) !important; }',
    !dark?root+' body, '+root+' '+main+', '+root+' aside.app-shell-left-panel { color: #1c1b1d !important; }':"",
    !dark?root+' :is(dialog,[role="dialog"],[role="alertdialog"]) { background-color: rgba(254,254,254,0.96) !important; color: #1c1b1d !important; border-color: #d3d3d3 !important; }':"",
    !dark?root+' '+main+' :is([class*="_ComposerLayoutRoot_"],[data-composer-surface-variant],textarea,[contenteditable="true"]) { color: #1c1b1d !important; caret-color: #1c1b1d !important; }':"",
    !dark?root+' '+main+' :is([class*="_ComposerLayoutRoot_"],[data-composer-surface-variant]) { background-color: rgba(234,233,234,0.92) !important; border-color: #d3d3d3 !important; }':""
  ].join("\n");
}

export function readScene() {
  const mainSelector='main:is([data-app-shell-main-surface],[class*="_MainContentSurface_"],.main-surface)';
  const composerSelector='[class*="_ComposerLayoutRoot_"],[data-composer-surface-variant],textarea,[contenteditable="true"][role="textbox"]';
  const box=node=>{
    if(!node)return null;
    const r=node.getBoundingClientRect(),s=getComputedStyle(node);
    return {width:Math.round(r.width),height:Math.round(r.height),visible:r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden"};
  };
  // Native Codex keeps inactive views mounted. Select a unique visible surface.
  // document.visibilityState is unreliable for its embedded WebContentsView.
  const mains=[...document.querySelectorAll(mainSelector)].filter(n=>{
    const b=box(n);return b.visible&&b.width>=200&&b.height>=180;
  });
  const main=mains.length===1?mains[0]:null;
  const composer=main?[...main.querySelectorAll(composerSelector)].find(n=>{
    const b=box(n);return b.visible&&b.width>=80&&b.height>=20;
  })||null:null;
  const thread=main?[...main.querySelectorAll(".thread-scroll-container")].find(n=>box(n).visible)||null:null;
  return {main,composer,thread,mainCount:mains.length,ready:!!(main&&composer),
    metrics:{main:box(main),composer:box(composer),thread:box(thread)}};
}
export function makeProbeExpression() {
  return "(()=>{if(location.protocol!=='app:'||location.hostname!=='-'||location.pathname!=='/index.html')return {ready:false,owned:false};const scene=("+
    readScene.toString()+")();return {ready:scene.ready,mainCount:scene.mainCount,metrics:scene.metrics,owned:window.__codexLightSkinPatch?.kind==='CodexLightSkin/v0.1'};})()";
}

// This transaction touches one owned stylesheet and one owned root attribute.
// It collects geometry only, never message text, account data, or storage.
export async function rendererTransaction(cssLight, cssDark, action, sceneReader, appearance) {
  const KEY="__codexLightSkinPatch";
  const ATTR="data-codex-light-skin";
  const KIND="CodexLightSkin/v0.1";
  const wait=()=>new Promise(resolve=>{
    let finished=false,first=null,second=null;
    const finish=()=>{
      if(finished)return;finished=true;clearTimeout(timer);
      if(first!==null)cancelAnimationFrame(first);
      if(second!==null)cancelAnimationFrame(second);
      resolve();
    };
    const timer=setTimeout(finish,300);
    first=requestAnimationFrame(()=>{second=requestAnimationFrame(finish);});
  });
  const scene=sceneReader();
  const {main,composer,thread}=scene;
  const box=(node)=>{
    if (!node) return null;
    const r=node.getBoundingClientRect(), s=getComputedStyle(node);
    return {width:Math.round(r.width),height:Math.round(r.height),visible:r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden"};
  };
  const metrics=()=>({main:box(main),composer:box(composer),thread:box(thread)});
  const remove=()=>{
    const own=window[KEY];
    if (!own || own.kind!==KIND) return false;
    if (own.sheet) document.adoptedStyleSheets=document.adoptedStyleSheets.filter(s=>s!==own.sheet);
    if (own.style?.parentNode) own.style.remove();
    if (document.documentElement.getAttribute(ATTR)==="v0.1") {
      if (own.previousAttr===null) document.documentElement.removeAttribute(ATTR);
      else document.documentElement.setAttribute(ATTR,own.previousAttr);
    }
    delete window[KEY];
    return true;
  };
  if (location.protocol!=="app:" || location.hostname!=="-" || location.pathname!=="/index.html")
    return {ok:false,code:"unexpected-page",message:"当前页面不是已验证的 Codex 主界面。"};
  if (action==="remove") {
    const removed=remove(); await wait();
    return {ok:true,code:removed?"removed":"already-stock",metrics:metrics()};
  }
  if (action!=="apply") return {ok:false,code:"unknown-action"};
  if (document.documentElement.getAttribute("data-dream-skin")==="active")
    return {ok:false,code:"other-skin-active",message:"Dream Skin 正在应用皮肤，请先通过它的菜单恢复后再试。"};
  const before=metrics();
  if (!scene.ready || !before.main?.visible || before.main.width<200 || before.main.height<180 || !before.composer?.visible)
    return {ok:false,code:"page-not-ready",message:"请打开一个普通聊天页面，确认聊天区和输入框可见，再运行应用命令。",metrics:before};
  const root=document.documentElement;
  const fg=getComputedStyle(root).color.match(/\d+(?:\.\d+)?/g);
  const bright=fg&&fg.length>=3 ? (+fg[0]+ +fg[1]+ +fg[2])/3>145 : root.classList.contains("dark");
  const effectiveDark=appearance==="light"?false:appearance==="dark"?true:bright;
  const css=effectiveDark?cssDark:cssLight;
  // Decode before changing styles, so an invalid image cannot report success.
  try {
    const imageUrl=css.match(/url\("(data:image\/png;base64,[A-Za-z0-9+/=]+)"\)/)?.[1];
    if (!imageUrl) throw new Error("missing-image");
    await new Promise((resolve,reject)=>{
      const image=new Image();
      let finished=false;
      const finish=error=>{
        if (finished) return;
        finished=true;clearTimeout(timer);image.onload=null;image.onerror=null;
        error?reject(error):resolve();
      };
      const timer=setTimeout(()=>finish(new Error("image-timeout")),3000);
      image.onload=()=>finish(image.naturalWidth>0&&image.naturalHeight>0?null:new Error("invalid-image"));
      image.onerror=()=>finish(new Error("invalid-image"));
      try { image.src=imageUrl; } catch(error) { finish(error); }
    });
    const current=sceneReader();
    if (!current.ready || current.main!==main || current.composer!==composer)
      return {ok:false,code:"page-changed",message:"图片检查期间页面发生变化；请打开普通聊天后再运行应用命令。"};
  } catch {
    return {ok:false,code:"image-unavailable",message:"PNG 无法在界面中加载或解码，尚未改变样式；请更换有效图片后重试。"};
  }
  remove();
  const old=root.getAttribute(ATTR);
  const own={kind:KIND,previousAttr:old,sheet:null,style:null};
  window[KEY]=own;
  try {
    if ("adoptedStyleSheets" in document && typeof CSSStyleSheet==="function") {
      const sheet=new CSSStyleSheet(); sheet.replaceSync(css);
      own.sheet=sheet; document.adoptedStyleSheets=[...document.adoptedStyleSheets,sheet];
    } else {
      const style=document.createElement("style"); style.id="codex-light-skin-style";
      style.textContent=css; document.head.append(style); own.style=style;
      if (!style.sheet) throw new Error("style-blocked");
    }
    root.setAttribute(ATTR,"v0.1");
    await wait();
    const after=metrics();
    for (const name of ["main","composer","thread"]) {
      if (before[name]?.visible && (!after[name]?.visible ||
        after[name].width<before[name].width*0.95 || after[name].height<before[name].height*0.95)) {
        remove(); await wait();
        return {ok:false,code:"layout-rollback",message:"发现布局变化，临时背景已移除。",metrics:metrics()};
      }
    }
    if (!getComputedStyle(main).backgroundImage.includes("data:image/png;base64,")) {
      remove(); return {ok:false,code:"background-blocked",message:"Codex 没有接受背景样式，已移除本次修改。"};
    }
    return {ok:true,code:"applied",dark:effectiveDark,metrics:after};
  } catch {
    remove(); return {ok:false,code:"apply-rollback",message:"背景加载失败，本次样式已移除。"};
  }
}

export function makeExpression(image, overlay, action="apply", appearance="auto") {
  const light=action==="apply"&&appearance!=="dark"?makeCss(image,overlay,false,appearance):"";
  const dark=action==="apply"&&appearance!=="light"?makeCss(image,overlay,true,appearance):"";
  return "("+rendererTransaction.toString()+")("+JSON.stringify(light)+","+JSON.stringify(dark)+","+JSON.stringify(action)+","+readScene.toString()+","+JSON.stringify(appearance)+")";
}
