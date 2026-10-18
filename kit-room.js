(() => {
"use strict";
// The drawing engine lives in kit-engine.js; load it (and presets.js) before this file.
const {SAMPLE_CREST,PATTERNS,TWO_TONE_LABEL,FLIPPABLE,GAP_LABEL,DEFAULT,clone,NOLOGO,NECK,SPOTS,SHAPE_BASE,geom,esc,r2,HEX,safeColor,num,clamp,MAX_UPLOAD,COLOR_KEYS,PATTERN_IDS,COLLAR_IDS,SPOT_IDS,STAR_POS,STAR_LAYOUT,MOTTLE_IDS,patternSVG,MAKERS,MAKER_IDS,mottleTile,LOGO_CSS_PROPS,inlineClassStyles,colorCache,normColor,PAINT_PROPS,SHAPES,badgeColors,expandUses,prepLogo,badgeInner,logoCache,logoData,render,sanitizeKit,CFG_TAG,b64enc,b64dec,PAL,toFile,seededRandom,randomKit} = window.KitEngine;
// Starter kits live in presets.js, which must be loaded before this file.
const PRESETS = (typeof window.KIT_ROOM_PRESETS==="function" ? window.KIT_ROOM_PRESETS({SAMPLE_CREST,NOLOGO}) : []).map(([n,o])=>{const k=Object.assign(clone(DEFAULT),clone(o));k.logos=k.logos.map(L=>Object.assign({invert:false,recolor:false,tint:"#ffffff"},L));return [n,k];});

let S = clone(DEFAULT);
/* ---------- UI ---------- */
const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
const getPath=(o,p)=>p.split(".").reduce((a,k)=>a?.[k],o);
function setPath(o,p,v){const ks=p.split(".");let t=o;ks.slice(0,-1).forEach(k=>t=t[k]);t[ks.at(-1)]=v;}

function bindAll(){
  $$("[data-k]").forEach(el=>{
    if(el.dataset.bound)return; el.dataset.bound=1;
    el.addEventListener("input",()=>{
      let v=el.type==="checkbox"?el.checked:(el.type==="range"?parseFloat(el.value):el.value);
      setPath(S,el.dataset.k,v); update();
    });
  });
  $$("[data-hex]").forEach(el=>{
    if(el.dataset.bound)return; el.dataset.bound=1;
    el.addEventListener("change",()=>{const m=el.value.trim().match(HEX);if(m){setPath(S,el.dataset.hex,"#"+m[1].toLowerCase());update();}else syncUI();});
  });
}
function syncUI(){
  $$("[data-k]").forEach(el=>{const v=getPath(S,el.dataset.k);if(v===undefined)return;
    if(el.type==="checkbox")el.checked=!!v;else if(document.activeElement!==el||el.type!=="text")el.value=v;
    if(el.type==="range"){const out=el.parentElement.querySelector("output");if(out)out.textContent=v+(el.dataset.unit||"");}});
  $$("[data-hex]").forEach(el=>{if(document.activeElement!==el)el.value=getPath(S,el.dataset.hex)||"";});
  const show=(PATTERNS.find(p=>p[0]===S.pattern)||PATTERNS[0])[2];
  $$("[data-show]").forEach(r=>{const k=r.dataset.show;r.hidden=k==="color2"?!(show.includes("color2")||(show.includes("twoTone")&&S.twoTone))
      :k==="color3"?!(show.includes("color3")&&(!show.includes("twoTone")||S.twoTone)):!show.includes(k);});
  $("#twoToneLabel").textContent=TWO_TONE_LABEL[S.pattern]||"Alternate with a second colour";
  $("#gapLabel").textContent=GAP_LABEL[S.pattern]||"Centre gap";
  $("#sleeveRow").hidden=S.patternSleeves; $("#cuffRow").hidden=!S.cuff; $("#cuffWidRow").hidden=!S.cuff; $("#cuffStripeRow").hidden=!S.cuff; $("#shRow").hidden=!S.shStripes;
  $$("[data-star]").forEach(r=>r.hidden=!(+S.stars>0));
  $$("[data-mottle]").forEach(r=>r.hidden=S.mottle==="off");
  $$("[data-maker]").forEach(r=>r.hidden=!MAKERS[S.makerLogo]);
  $("#mottleSeedRow").hidden=!(S.mottle==="speckle"||S.mottle==="blotch"||S.mottle==="zebra"||S.mottle==="streaks");
  $("#mottleSeedNote").textContent=`#${S.mottleSeed}`;
  $$(".pat").forEach(b=>b.setAttribute("aria-pressed",b.dataset.p===S.pattern));
  S.logos.forEach((L,i)=>{const n=$(`#fname${i}`);if(n)n.textContent=L.src?(L.name||"Badge"):"No file";$(`#slotbody${i}`).hidden=!L.src;$(`#rm${i}`).hidden=!L.src;
    const d=logoData(L.src), two=!!(d&&d.colors.length===2), one=!!(d&&d.colors.length===1);$(`#invRow${i}`).hidden=!two;
    $(`#tintRow${i}`).hidden=!one;$(`#tintPick${i}`).hidden=!L.recolor;
    $(`#invSw${i}`).innerHTML=two?(L.invert?[...d.colors].reverse():d.colors).map(c=>`<i style="background:${c}"></i>`).join(""):"";});
}

function buildPatterns(){
  $("#patterns").innerHTML=PATTERNS.map(([k,n])=>`<button type="button" class="pat" data-p="${k}" aria-pressed="false"><span data-mini="${k}"></span>${n}</button>`).join("");
  $$(".pat").forEach(b=>b.addEventListener("click",()=>{S.pattern=b.dataset.p;update();}));
}
function drawPatternMinis(){
  $$("[data-mini]").forEach(sp=>{const s=Object.assign(clone(S),{pattern:sp.dataset.mini,logos:[],number:"",shading:20,outlineW:1.6});sp.innerHTML=render(s);});
}

function buildSlots(){
  $("#slots").innerHTML=S.logos.map((L,i)=>`
    <div class="slot">
      <div class="slot-head"><b>${i===0?"Crest":"Second badge"}</b><span class="fname" id="fname${i}"></span>
        <div class="btns"><label class="btn small file">Upload SVG<input type="file" accept=".svg,image/svg+xml" id="file${i}"></label>
        ${i===0?`<button class="btn small" type="button" id="sample${i}">Example</button>`:""}
        <button class="btn small" type="button" id="rm${i}">Remove</button></div></div>
      <div id="slotbody${i}">
        <div class="row"><label for="s-pos${i}">Position</label><select id="s-pos${i}" data-k="logos.${i}.pos"><option value="L">Left chest (as viewed)</option><option value="C">Centre chest</option><option value="R">Right chest (as viewed)</option><option value="M">Centre front</option></select></div>
        <div class="row" id="invRow${i}"><span class="lbl">Colours</span><label class="check"><input type="checkbox" id="k-inv${i}" data-k="logos.${i}.invert"> Swap the two colours <span class="inv-sw" id="invSw${i}"></span></label></div>
        <div class="row" id="tintRow${i}"><span class="lbl">Colour</span><div class="color"><label class="check"><input type="checkbox" id="k-rec${i}" data-k="logos.${i}.recolor"> Recolour</label><span class="color" id="tintPick${i}"><input type="color" id="c-tint${i}" data-k="logos.${i}.tint" aria-label="Badge colour"><input type="text" class="hex" id="h-tint${i}" data-hex="logos.${i}.tint" aria-label="Badge colour hex"></span></div></div>
        <div class="row"><label for="r-size${i}">Size</label><div class="range"><input type="range" id="r-size${i}" min="4" max="40" step="0.5" data-k="logos.${i}.size"><output></output></div></div>
        <div class="row"><label for="r-dx${i}">Nudge across</label><div class="range"><input type="range" id="r-dx${i}" min="-12" max="12" step="0.5" data-k="logos.${i}.dx"><output></output></div></div>
        <div class="row"><label for="r-dy${i}">Nudge down</label><div class="range"><input type="range" id="r-dy${i}" min="-12" max="20" step="0.5" data-k="logos.${i}.dy"><output></output></div></div>
      </div>
    </div>`).join("");
  S.logos.forEach((L,i)=>{
    $(`#file${i}`).addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;e.target.value="";
      if(f.size>MAX_UPLOAD){toast("That file is over 5 MB. Try a smaller SVG.");return;}
      const fr=new FileReader();
      fr.onload=()=>{const txt=String(fr.result);if(!prepLogo(txt)){toast("That file isn't a readable SVG. Try exporting it again as plain SVG.");return;}
        S.logos[i].src=txt;S.logos[i].name=f.name;S.logos[i].invert=false;S.logos[i].recolor=false;update();toast(`${f.name} added`);};fr.readAsText(f);});
    const sb=$(`#sample${i}`); if(sb) sb.addEventListener("click",()=>{S.logos[i].src=SAMPLE_CREST;S.logos[i].name="Example crest";S.logos[i].invert=false;update();});
    $(`#rm${i}`).addEventListener("click",()=>{S.logos[i].src="";S.logos[i].name="";update();});
  });
  bindAll();
}

function strip(el,list,onPick,onDel){
  el.innerHTML="";
  list.forEach(([name,kit],i)=>{const b=document.createElement("div");b.className="thumb";b.tabIndex=0;b.setAttribute("role","button");
    b.innerHTML=render(kit)+`<span>${esc(name)}</span>`+(onDel?`<button class="x" type="button" aria-label="Delete ${esc(name)}">×</button>`:"");
    b.addEventListener("click",e=>{if(e.target.classList.contains("x")){onDel(i);return;}onPick(kit);});
    b.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onPick(kit);}});
    el.appendChild(b);});
}
function loadKit(k){S=sanitizeKit(k);update();}

/* saved kits (per-browser convenience) */
const KEY="kitroom.saved.v1";
function readSaved(){try{const l=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(l)?l:[];}catch(e){return [];}}
function writeSaved(l){try{localStorage.setItem(KEY,JSON.stringify(l));return true;}catch(e){return false;}}
function drawSaved(){const l=readSaved().map(x=>({name:String(x?.name||"Kit").slice(0,80),kit:sanitizeKit(x?.kit)}));$("#savedEmpty").hidden=l.length>0;
  strip($("#saved"),l.map(x=>[x.name,x.kit]),loadKit,i=>{const a=readSaved();a.splice(i,1);writeSaved(a);drawSaved();});}
$("#saveKit").addEventListener("click",()=>{const l=readSaved();const name=(S.number?`#${S.number} `:"")+(PATTERNS.find(p=>p[0]===S.pattern)||[0,"Kit"])[1];
  l.unshift({name:`${name} ${l.length+1}`,kit:clone(S)});
  if(writeSaved(l.slice(0,24))){drawSaved();toast("Kit saved in this browser");}else toast("This browser blocks saving here. Use Copy config instead.");});

/* random */
const pick=a=>a[Math.floor(Math.random()*a.length)];
$("#randomize").addEventListener("click",()=>{const base=pick(PAL);let p1=pick(PAL);while(p1===base)p1=pick(PAL);let p2=pick(PAL);
  const pat=pick(PATTERNS.slice(1))[0];
  Object.assign(S,{base,p1,p2,pattern:pat,twoTone:Math.random()<.3,count:3+Math.floor(Math.random()*6),width:30+Math.floor(Math.random()*40),
    angle:[-35,-20,0,20,35][Math.floor(Math.random()*5)],patternSleeves:Math.random()<.4,sleeve:pick([base,p1]),cuff:Math.random()<.7,cuffColor:pick([p1,base,p2]),
    collar:pick(["round","crew","v","polo"]),collarColor:pick([p1,p2])});update();});

/* export */
// Kit settings travel inside exported files as base64 JSON in <metadata>, so a downloaded shirt can be reopened and edited.
function exportSVG(){
  const svg=render(S,$("#s-exportSize").value);
  if(!$("#k-embed").checked)return svg;
  const meta=`<metadata id="${CFG_TAG}">${b64enc(JSON.stringify(S))}</metadata>`;
  return svg.replace(/^(<svg[^>]*>)/,"$1"+meta);
}
// Reads the settings back out of a shirt SVG; null when the file has none.
function kitFromSvg(text){
  let d;try{d=new DOMParser().parseFromString(text,"image/svg+xml");}catch(e){return null;}
  if(!d||d.getElementsByTagName("parsererror").length)return null;
  const m=d.getElementById(CFG_TAG)||[...d.getElementsByTagName("metadata")].find(x=>x.getAttribute("id")===CFG_TAG);
  if(!m)return null;
  try{const k=JSON.parse(b64dec(m.textContent.replace(/\s+/g,"")));return k&&typeof k==="object"&&!Array.isArray(k)?k:null;}catch(e){return null;}
}
function openShirtFile(f){
  if(!f)return;
  if(f.size>MAX_UPLOAD*3){toast("That file is too large to be a Kit Room shirt.");return;}
  const fr=new FileReader();
  fr.onload=()=>{const k=kitFromSvg(String(fr.result));
    if(!k){toast("This SVG has no Kit Room settings inside. Only shirts downloaded with \u201cReopen later\u201d ticked can be opened.");return;}
    loadKit(k);$("#t-fname").value=f.name;toast(`${f.name} opened`);};
  fr.readAsText(f);
}
// Returns an error message when the SVG would not open as a standalone file, otherwise "".
function svgProblem(t){try{const d=new DOMParser().parseFromString(t,"image/svg+xml");const e=d.getElementsByTagName("parsererror")[0];
  return e?(e.textContent||"invalid SVG").replace(/\s+/g," ").trim().slice(0,140):"";}catch(e){return "invalid SVG";}}
async function copy(text,ta,msg){try{await navigator.clipboard.writeText(text);toast(msg);}catch(e){if(ta){ta.focus();ta.select();}toast("Copy was blocked. The code is selected, so press Ctrl+C or ⌘C.");}}
$("#copySvg").addEventListener("click",()=>{const t=exportSVG();const bad=svgProblem(t);if(bad){toast("This SVG would not open as a file. Try removing or re-saving the badge. ("+bad+")");return;}$("#svgOut").value=t;copy(t,$("#svgOut"),"SVG copied");});
// Inside the Claude viewer, saves go through the downloads capability.
// Opened as a plain HTML file (no window.claude), the browser downloads directly.
const inViewer=!!(window.claude&&typeof window.claude.use==="function");
let downloads=null;
if(inViewer){(async()=>{try{downloads=await window.claude.use("downloads");}catch(e){downloads=null;}
  if(!downloads){$("#downloadSvg").hidden=true;$("#copySvg").classList.add("primary");}})();}
function fileName(){let n=$("#t-fname").value.trim().replace(/[\\/:*?"<>|]+/g,"-")||"kit";if(!/\.svg$/i.test(n))n=n.replace(/\.[a-z0-9]+$/i,"")+".svg";return n;}
function browserDownload(name,text){const url=URL.createObjectURL(new Blob([text],{type:"image/svg+xml"}));
  const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);}
$("#downloadSvg").addEventListener("click",async()=>{const n=fileName();
  const svg=exportSVG(), bad=svgProblem(svg);
  if(bad){toast("This SVG would not open as a file. Try removing or re-saving the badge. ("+bad+")");return;}
  const data='<?xml version="1.0" encoding="UTF-8"?>\n'+svg+"\n";
  if(!inViewer){browserDownload(n,data);toast(`${n} downloaded`);return;}
  if(!downloads){toast("Downloads are still loading. Try again in a moment.");return;}
  try{await downloads.save({filename:n,data});toast(`${n} saved`);}
  catch(e){const c=e&&e.code;
    if(c==="declined")return;
    if(c==="rate_limited")toast("A save prompt is already open.");
    else{toast("Downloads aren't available here. Use Copy SVG instead.");$("#downloadSvg").hidden=true;$("#copySvg").classList.add("primary");}}});
$("#copyCfg").addEventListener("click",()=>{const t=JSON.stringify(S);$("#svgOut").value=t;copy(t,$("#svgOut"),"Config copied");});
$("#s-exportSize").addEventListener("change",update);
$("#k-embed").addEventListener("change",update);
$("#openSvg").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";openShirtFile(f);});
{const st=document.querySelector(".stage");
  st.addEventListener("dragover",e=>{if([...e.dataTransfer.types].includes("Files")){e.preventDefault();st.classList.add("drop");}});
  st.addEventListener("dragleave",()=>st.classList.remove("drop"));
  st.addEventListener("drop",e=>{e.preventDefault();st.classList.remove("drop");const f=e.dataTransfer.files[0];if(f)openShirtFile(f);});}
$("#loadCfg").addEventListener("click",()=>{try{const k=JSON.parse($("#cfgIn").value);if(!k||typeof k!=="object"||Array.isArray(k))throw 0;loadKit(k);toast("Config loaded");}catch(e){toast("That isn't valid kit config JSON. Copy it again with Copy config.");}});

let tt;function toast(m){const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,2400);}

function update(){
  syncUI();
  $("#preview").innerHTML=render(S);
  $("#sizes").innerHTML=`<div class="sz"><div class="box">${render(S,64)}</div>64px</div>`;
  drawPatternMinis();
  const out=exportSVG();$("#svgOut").value=out;$("#bytes").textContent=`${(new Blob([out]).size/1024).toFixed(1)} KB`;
}

/* Kit Room image reader: takes RGBA pixels of a jersey icon and guesses kit settings. */
function analyzeKit(img){
  const {width:w,height:h,data:d}=img;
  const idx=(x,y)=>(y*w+x)*4;
  const rgb=(x,y)=>{const i=idx(x,y);return [d[i],d[i+1],d[i+2]];};
  const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  const hex=c=>"#"+c.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");
  const lum=c=>0.2126*c[0]+0.7152*c[1]+0.0722*c[2];

  /* 1. foreground mask */
  const fg=new Uint8Array(w*h);
  let transparentEdge=0,edgeN=0;
  for(let x=0;x<w;x++)for(const y of [0,h-1]){edgeN++;if(d[idx(x,y)+3]<128)transparentEdge++;}
  for(let y=0;y<h;y++)for(const x of [0,w-1]){edgeN++;if(d[idx(x,y)+3]<128)transparentEdge++;}
  if(transparentEdge/edgeN>0.5){
    for(let i=0;i<w*h;i++)fg[i]=d[i*4+3]>=128?1:0;
  }else{ // solid background: flood fill from the border with the corner colour
    fg.fill(1);const bg=rgb(0,0),st=[];
    const push=(x,y)=>{if(x<0||y<0||x>=w||y>=h)return;const k=y*w+x;if(!fg[k])return;if(dist(rgb(x,y),bg)>40)return;fg[k]=0;st.push(k);};
    for(let x=0;x<w;x++){push(x,0);push(x,h-1);}for(let y=0;y<h;y++){push(0,y);push(w-1,y);}
    while(st.length){const k=st.pop(),x=k%w,y=(k-x)/w;push(x+1,y);push(x-1,y);push(x,y+1);push(x,y-1);}
  }
  let x0=w,x1=-1,y0=h,y1=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(fg[y*w+x]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1<0)return null;
  const W=x1-x0+1,H=y1-y0+1;
  const isFg=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&fg[y*w+x]===1;
  const depth=new Uint16Array(w*h); // distance (in px, 4-connected) from the shirt edge
  {const q=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=y*w+x;if(!fg[k])continue;
      if(!isFg(x+1,y)||!isFg(x-1,y)||!isFg(x,y+1)||!isFg(x,y-1)){depth[k]=1;q.push(k);}}
    for(let qi=0;qi<q.length;qi++){const k=q[qi],x=k%w,y=(k-x)/w;
      for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){if(!isFg(nx,ny))continue;const nk=ny*w+nx;if(!depth[nk]){depth[nk]=depth[k]+1;q.push(nk);}}}}
  const inset=Math.max(2,Math.round(W/40));
  const pts=(fx0,fx1,fy0,fy1,minDepth=inset)=>{const out=[];
    for(let y=Math.floor(y0+fy0*H);y<=Math.min(y1,Math.ceil(y0+fy1*H));y++)
      for(let x=Math.floor(x0+fx0*W);x<=Math.min(x1,Math.ceil(x0+fx1*W));x++)
        if(isFg(x,y)&&depth[y*w+x]>minDepth)out.push([x,y]);return out;};

  /* 2. colour clusters from the torso */
  function cluster(colors,thr){
    const buckets=new Map();
    colors.forEach(c=>{const k=(c[0]>>4)<<8|(c[1]>>4)<<4|(c[2]>>4);const b=buckets.get(k);if(b){b.n++;b.s[0]+=c[0];b.s[1]+=c[1];b.s[2]+=c[2];}else buckets.set(k,{n:1,s:[...c]});});
    const list=[...buckets.values()].map(b=>({n:b.n,c:b.s.map(v=>v/b.n)})).sort((a,b)=>b.n-a.n);
    const cl=[];
    list.forEach(b=>{const t=cl.find(k=>dist(k.c,b.c)<thr);if(t){const n=t.n+b.n;t.c=t.c.map((v,i)=>(v*t.n+b.c[i]*b.n)/n);t.n=n;}else cl.push({n:b.n,c:b.c});});
    const tot=colors.length;cl.forEach(k=>k.share=k.n/tot);
    return cl.sort((a,b)=>b.n-a.n);
  }
  const nearest=(c,cl)=>{let bi=0,bd=1e9;cl.forEach((k,i)=>{const dd=dist(c,k.c);if(dd<bd){bd=dd;bi=i;}});return bi;};

  const torso=pts(0.24,0.76,0.3,0.92);
  const tcl=cluster(torso.map(([x,y])=>rgb(x,y)),62).filter(k=>k.share>=0.02);
  if(!tcl.length)return null;
  // When two colours split the shirt about evenly, treat the lighter one as the ground.
  let main=tcl.slice(0,3);
  if(main.length>1&&main[1].share>0.38&&lum(main[1].c)>lum(main[0].c)+20)main=[main[1],main[0],...main.slice(2)];
  // drop colours that are only anti-aliasing blends between two others
  const onSegment=(c,a,b)=>{const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);const L=ab.reduce((s,v)=>s+v*v,0)||1;const t=Math.max(0,Math.min(1,ac.reduce((s,v,i)=>s+v*ab[i],0)/L));return dist(c,a.map((v,i)=>v+t*ab[i]));};
  main=main.filter((k,i)=>i<2||onSegment(k.c,main[0].c,main[1].c)>40);
  const base=main[0],p1=main[1]&&main[1].share>=0.02?main[1]:null,p2=main[2]&&main[2].share>=0.05?main[2]:null;

  /* 3. pattern from a sampled map of the body (true = pattern colour) */
  const res={};
  const notes=[];
  const GX=40,GY=40,bx0=0.22,bx1=0.78,by0=0.3,by1=0.93;
  const grid=[];
  for(let j=0;j<GY;j++){const row=[];for(let i=0;i<GX;i++){
    const x=Math.round(x0+(bx0+(bx1-bx0)*(i+0.5)/GX)*W),y=Math.round(y0+(by0+(by1-by0)*(j+0.5)/GY)*H);
    if(!isFg(x,y)||depth[y*w+x]<=1){row.push(null);continue;}
    row.push(p1?nearest(rgb(x,y),main)!==0:false);}grid.push(row);}
  const frac=cells=>{const v=cells.filter(c=>c!==null);return v.length?v.filter(Boolean).length/v.length:0;};
  const cols=[...Array(GX)].map((_,i)=>frac(grid.map(r=>r[i])));
  const rows=grid.map(r=>frac(r));
  const purity=a=>a.reduce((s,f)=>s+Math.max(f,1-f),0)/a.length;
  const diagProfile=sign=>{const bins=new Map();grid.forEach((r,j)=>r.forEach((c,i)=>{if(c===null)return;const k=Math.round((i+sign*j)/2);const b=bins.get(k)||[];b.push(c);bins.set(k,b);}));
    return [...bins.keys()].sort((a,b)=>a-b).map(k=>bins.get(k)).filter(b=>b.length>=6).map(frac);};
  const dA=diagProfile(1),dB=diagProfile(-1);
  const pC=purity(cols),pR=purity(rows),pA=purity(dA),pB=purity(dB);
  const runs=prof=>{const r=[];let start=-1;prof.forEach((f,i)=>{const on=f>0.5;if(on&&start<0)start=i;if(!on&&start>=0){r.push([start,i-1]);start=-1;}});if(start>=0)r.push([start,prof.length-1]);return r;};
  const share=frac(grid.flat());
  const periodOf=rr=>rr.length>1?(rr[rr.length-1][0]-rr[0][0])/(rr.length-1):null;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const q=(fx0,fx1,fy0,fy1)=>frac(grid.slice(Math.floor(fy0*GY),Math.floor(fy1*GY)).flatMap(r=>r.slice(Math.floor(fx0*GX),Math.floor(fx1*GX))));

  const thin=share<0.1;
  // how much the inner edge of a one-sided pattern drifts from row to row (curved swoosh vs straight stripe)
  function curveSpread(){const right=cols.slice(GX/2).reduce((t,v)=>t+v,0)>cols.slice(0,GX/2).reduce((t,v)=>t+v,0);
    const xs=[];grid.forEach(r=>{let e=-1;if(right){for(let i=GX/2;i<GX;i++)if(r[i]){e=i;break;}}else{for(let i=GX/2-1;i>=0;i--)if(r[i]){e=i;break;}}if(e>=0)xs.push(e);});
    if(xs.length<GY*0.4)return 0;const m=xs.reduce((t,v)=>t+v,0)/xs.length;return Math.sqrt(xs.reduce((t,v)=>t+(v-m)*(v-m),0)/xs.length);}
  const rowRuns=runs(rows),colRuns=runs(cols);
  if(!p1||share<0.015){res.pattern="plain";}
  else if(thin&&rowRuns.length>=3){const per=periodOf(rowRuns)/GY*0.63*92;res.pattern="pinhoops";res.count=clamp(Math.round(88/per),2,12);}
  else if(share<0.3&&colRuns.length>=1&&colRuns.length<=5&&colRuns[colRuns.length-1][1]-colRuns[0][0]<GX*0.35&&Math.abs((colRuns[0][0]+colRuns[colRuns.length-1][1])/2-GX/2)>GX*0.15&&curveSpread()>2.2){
    res.pattern="swoosh";res.flip=(colRuns[0][0]<GX/2);res.width=clamp(Math.round(share*350),15,90);res.count=3;}
  else if(share<0.3&&colRuns.length>=1&&colRuns.length<=5&&colRuns[colRuns.length-1][1]-colRuns[0][0]<GX*0.35){
    const a=colRuns[0][0],b=colRuns[colRuns.length-1][1];res.pattern="offset";res.count=Math.max(1,colRuns.length);
    const unit=0.56*92/GX;res.width=clamp(Math.round((((b-a+1)*unit/res.count)-0.8)/4*100),10,90);
    res.pos=clamp(Math.round(((a+b+1)/2/GX-0.5)*0.56*92*2)/2,-24,24);
    if(Math.abs(res.pos)<3){res.pattern="centre";res.width=clamp(Math.round(((b-a+1)*unit-4)/30*100),10,90);delete res.pos;}}
  else if(thin){res.pattern="plain";}
  else{
    const tl=q(0,.5,0,.5),tr=q(.5,1,0,.5),bl=q(0,.5,.5,1),br=q(.5,1,.5,1);
    const best=Math.max(pC,pR,pA,pB);
    if(((tr>.75&&bl>.75&&tl<.25&&br<.25)||(tl>.75&&br>.75&&tr<.25&&bl<.25))){res.pattern="quarters";if(tl>tr)notes.push("swap the colours if the quarters look mirrored");}
    else if(best===pC&&pC>0.8){
      const rr=runs(cols),per=periodOf(rr);
      if(rr.length===1){const [a,b]=rr[0];
        if(b>=GX-2&&a>GX*0.3)res.pattern="halves";
        else if(a<=1&&b<=GX-2&&b<GX*0.7){res.pattern="halves";[res.swap]=[true];}
        else if(Math.abs((a+b)/2-GX/2)>GX*0.12&&(b-a+1)<GX*0.3){res.pattern="offset";res.count=1;res.width=clamp(Math.round((((b-a+1)/GX*0.56*92)-0.8)/4*100),10,90);res.pos=clamp(Math.round(((a+b+1)/2/GX-0.5)*0.56*92*2)/2,-24,24);}
        else {res.pattern="centre";res.width=clamp(Math.round(((b-a+1)/GX*0.56*92-4)/30*100),10,90);}
      }else if(rr.length===2&&rr[0][0]<=1&&rr[1][1]>=GX-2){res.pattern="sides";res.width=clamp(Math.round((((rr[0][1]+1)/GX*0.56*92)-3)/14*100),10,90);}
      else{
        const perUnits=per/GX*0.56*92; // px period in jersey units (shirt is 92 units wide)
        if(share<0.2&&rr.length>=6){res.pattern="pinstripes";res.count=clamp(Math.round(54/perUnits/2),2,12);}
        else{res.pattern="stripes";res.count=clamp(Math.round(54/perUnits),2,12);res.width=clamp(Math.round(share*100),15,85);
          res.center=cols[Math.floor(GX/2)]>0.5||cols[Math.floor(GX/2)-1]>0.5;}
      }
    } else if(best===pR&&pR>0.8){
      const rr=runs(rows),per=periodOf(rr);
      if(rr.length>=4&&share<0.2){const perUnits=per/GY*0.63*92;res.pattern="pinhoops";res.count=clamp(Math.round(88/perUnits),2,12);}
      else if(rr.length>=2){const perUnits=per/GY*0.63*92;res.pattern="hoops";res.count=clamp(Math.round(88/perUnits),2,12);res.width=clamp(Math.round(share*100),15,85);}
      else if(rr.length===1){const [a,b]=rr[0];
        if(a<=1){res.pattern="yoke";}
        else if(b>=GY-2){res.pattern="fade";}
        else{res.pattern="band";res.width=clamp(Math.round(((b-a+1)/GY*0.63*92-4)/22*100),10,90);}}
      else res.pattern="plain";
    } else if((best===pA||best===pB)&&best>0.78){
      const prof=best===pA?dA:dB,rr=runs(prof);
      // pA: cells with equal i+j share a colour, i.e. "/" lines; pB: "\" lines
      if(rr.length<=1){res.pattern="sash";res.width=clamp(Math.round((share*100*1.3)),10,90);res.angle=best===pA?60:0;}
      else{res.pattern="diagonal";res.angle=best===pA?45:-45;const per=periodOf(rr)*Math.SQRT2;res.count=clamp(Math.round(60/(per/GX*0.56*92)),2,12);res.width=clamp(Math.round(share*100),15,85);}
    } else {
      // checks: colour flips between neighbouring cells along both axes
      let flips=0,n=0;for(let j=0;j<GY;j++)for(let i=1;i<GX;i++){const a=grid[j][i-1],b=grid[j][i];if(a===null||b===null)continue;n++;if(a!==b)flips++;}
      const rate=n?flips/n:0;
      if(rate>0.06&&share>0.3&&share<0.7){res.pattern="checkers";res.count=clamp(Math.round((rate*(GX-1)+1)*54/(0.56*92)),2,12);}
      else{res.pattern=pC>=pR?"stripes":"hoops";res.count=5;res.width=50;notes.push("the pattern was hard to read, so check it");}
    }
  }

  /* 4. outline */
  const edge=[];for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(isFg(x,y)&&depth[y*w+x]===1&&d[idx(x,y)+3]>200)edge.push(rgb(x,y));
  const ecl=cluster(edge,50);
  let outline=ecl[0]?ecl[0].c:base.c;
  if(dist(outline,base.c)<60||(p1&&dist(outline,p1.c)<60))outline=base.c.map(v=>v*0.55);

  /* 5. sleeves and cuffs: look only at the outer part of each sleeve */
  const sl=[...pts(0,0.12,0.1,0.42,1),...pts(0.88,1,0.1,0.42,1)].map(([x,y])=>rgb(x,y));
  let patternSleeves=false,sleeve=base.c,cuff=false,cuffColor=outline;
  if(sl.length){
    const scl=cluster(sl,62).filter(k=>k.share>=0.08);
    const near=(c,k)=>dist(c,k.c)<62;
    const isMain=k=>main.findIndex(m=>dist(m.c,k.c)<62);
    if(p1&&scl.some(k=>isMain(k)===0&&k.share>0.22)&&scl.some(k=>isMain(k)===1&&k.share>0.22)&&res.pattern!=="halves"&&res.pattern!=="quarters"){
      patternSleeves=true;
      const extra=scl.find(k=>isMain(k)<0&&k.share>0.1);if(extra){cuff=true;cuffColor=extra.c;}
    }else if(scl[0]){
      sleeve=scl[0].c;
      const second=scl.find((k,i)=>i>0&&k.share>0.12&&dist(k.c,sleeve)>60);
      if(second){cuff=true;cuffColor=second.c;}
    }
  }

  /* 6. collar */
  const top=pts(0.34,0.66,0,0.16,0).map(([x,y])=>rgb(x,y));
  let collarColor=outline;
  const tcol=cluster(top,55).filter(k=>dist(k.c,base.c)>60&&!(p1&&dist(k.c,p1.c)<60)&&k.share>0.06);
  if(tcol[0])collarColor=tcol[0].c;
  const bigCollar=tcol[0]&&tcol[0].share>0.3;
  // the front of the collar is the lowest collar-coloured pixel down the middle of the chest
  let neckY=-1;const cx=Math.round(x0+W/2);
  for(let y=y0;y<y0+H*0.32;y++){for(let dx=-1;dx<=1;dx++){const x=cx+dx;if(isFg(x,y)&&dist(rgb(x,y),collarColor)<70)neckY=y;}}
  const neckDepth=neckY<0?0.1:(neckY-y0)/H;
  let collar=bigCollar?"polo":neckDepth<0.07?"crew":"round";
  if(neckDepth>0.15){
    // a V-neck: collar pixels drift away from the centre line faster than a round neck
    const spread=fy=>{const y=Math.round(y0+fy*H);let lo=null,hi=null;for(let x=x0;x<=x1;x++)if(isFg(x,y)&&dist(rgb(x,y),collarColor)<70){if(lo===null)lo=x;hi=x;}return lo===null?0:(hi-lo)/W;};
    if(spread(neckDepth*0.85)<0.12&&spread(neckDepth*0.4)>0.18)collar="v";
  }

  /* 7. shading: ground colour near the sides versus the middle */
  const lumOf=list=>{const v=list.map(([x,y])=>rgb(x,y)).filter(c=>dist(c,base.c)<70);return v.length?v.reduce((s,c)=>s+lum(c),0)/v.length:null;};
  const mid=lumOf(pts(0.4,0.6,0.45,0.85)),sides=lumOf([...pts(0.2,0.3,0.45,0.85),...pts(0.7,0.8,0.45,0.85)]);
  const shading=mid!==null&&sides!==null?clamp(Math.round((mid-sides)*2.2+25),0,80):30;

  let baseC=base.c,p1C=p1?p1.c:base.c;
  if(res.swap){[baseC,p1C]=[p1C,baseC];}
  const out={
    base:hex(baseC),p1:hex(p1C),outline:hex(outline),outlineW:0.5,shading,
    pattern:res.pattern,twoTone:!!(p2&&["stripes","hoops","diagonal","offset"].includes(res.pattern)),
    patternSleeves,sleeve:hex(sleeve),cuff,cuffColor:hex(cuffColor),collar,collarColor:hex(collarColor)
  };
  if(p2)out.p2=hex(p2.c);
  ["count","width","angle","center","pos","flip"].forEach(k=>{if(res[k]!==undefined)out[k]=res[k];});
  return {kit:out,notes,palette:main.map(k=>({hex:hex(k.c),share:Math.round(k.share*100)}))};
}

/* image import */
let beforeImport=null;
const PAT_NAME=Object.fromEntries(PATTERNS.map(p=>[p[0],p[1].toLowerCase()]));
function readImage(file){
  if(!file||!/^image\//.test(file.type)){toast("Choose a PNG, JPG or WebP image.");return;}
  if(file.size>MAX_UPLOAD){toast("That image is over 5 MB. Try a smaller file.");return;}
  const url=URL.createObjectURL(file);const im=new Image();
  im.onload=()=>{
    const sc=Math.min(1,300/Math.max(im.naturalWidth,im.naturalHeight));
    const cw=Math.max(1,Math.round(im.naturalWidth*sc)),ch=Math.max(1,Math.round(im.naturalHeight*sc));
    const cv=document.createElement("canvas");cv.width=cw;cv.height=ch;const cx=cv.getContext("2d");
    cx.imageSmoothingEnabled=sc<1;cx.drawImage(im,0,0,cw,ch);
    let r=null;try{r=analyzeKit(cx.getImageData(0,0,cw,ch));}catch(e){r=null;}
    const pic=$("#importImg");pic.src=url;pic.hidden=false;$("#importHint").hidden=true;
    if(!r){$("#importText").textContent="Couldn't find a shirt in that image. Try an icon on a plain or transparent background.";$("#importSwatches").innerHTML="";return;}
    beforeImport=clone(S);
    const keep={makerLogo:S.makerLogo,makerColor:S.makerColor,makerPos:S.makerPos,makerSize:S.makerSize,makerDx:S.makerDx,makerDy:S.makerDy,stars:S.stars,starColor:S.starColor,starPos:S.starPos,starLayout:S.starLayout,starSize:S.starSize,starGap:S.starGap,starDy:S.starDy,shirtLen:S.shirtLen,shirtWid:S.shirtWid,sleeveLen:S.sleeveLen,sleeveWid:S.sleeveWid,cuffWid:S.cuffWid,logos:S.logos,number:S.number,numColor:S.numColor,numStroke:S.numStroke,numEdge:S.numEdge,numPos:S.numPos,numSize:S.numSize};
    S=sanitizeKit(Object.assign(clone(DEFAULT),r.kit,clone(keep)));
    $("#importUndo").hidden=false;
    const k=r.kit,bits=[`${PAT_NAME[k.pattern]||k.pattern}${k.count&&["stripes","hoops","diagonal","pinstripes","checkers"].includes(k.pattern)?` (${k.count})`:""}`,
      k.patternSleeves?"pattern on sleeves":"plain sleeves",k.cuff?"contrast cuffs":"no cuffs",`${k.collar==="v"?"V-neck":k.collar} collar`];
    $("#importText").textContent=`Read ${file.name}: ${bits.join(", ")}.`+(r.notes.length?` Tip: ${r.notes.join("; ")}.`:" Fine-tune anything below.");
    $("#importSwatches").innerHTML=r.palette.map(c=>`<span class="sw"><i style="background:${c.hex}"></i>${c.hex} · ${c.share}%</span>`).join("");
    update();toast("Kit read from image");
  };
  im.onerror=()=>{toast("That image couldn't be opened.");};
  im.src=url;
}
$("#importFile").addEventListener("change",e=>{readImage(e.target.files[0]);e.target.value="";});
$("#importUndo").addEventListener("click",()=>{if(beforeImport){S=beforeImport;beforeImport=null;$("#importUndo").hidden=true;update();toast("Back to your previous kit");}});
{const dz=$("#importDrop");
 dz.addEventListener("dragover",e=>{e.preventDefault();dz.classList.add("over");});
 dz.addEventListener("dragleave",()=>dz.classList.remove("over"));
 dz.addEventListener("drop",e=>{e.preventDefault();dz.classList.remove("over");readImage(e.dataTransfer.files[0]);});}

$("#mottleShuffle").addEventListener("click",()=>{S.mottleSeed=1+Math.floor(Math.random()*99998);update();});
$("#resetShape").addEventListener("click",()=>{["shirtLen","shirtWid","sleeveLen","sleeveWid","cuffWid"].forEach(k=>S[k]=100);update();});
buildPatterns(); buildSlots(); bindAll();
strip($("#presets"),PRESETS,loadKit);
drawSaved(); update();
})();
