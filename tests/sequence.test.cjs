const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../script/script.js'), 'utf8');

function packBuffer(pack, mobile) {
  const bytes = [];
  for (let index = pack * 16; index < Math.min(pack * 16 + 16, 151); index++) {
    bytes.push(2, 0, 0, 0, index, mobile ? 0 : 1);
  }
  return Uint8Array.from(bytes).buffer;
}

function harness({ cached=false, compact=false, reduced=false, saveData=false, seeded=false, pinned=false, badDecode=-1, dpr=1, noBitmap=false }={}) {
  const tasks=[], requests=[], draws=[], decodes=[], images=[], timers=new Map(), pins=[];
  const media=new Map(), refreshListeners=[];
  let timerId=0;
  class Element {
    constructor() { this.listeners={}; this.dataset={}; this.style={}; this.classList={add(){},toggle(){}}; this.offsetHeight=720; }
    addEventListener(name,fn) { this.listeners[name]=fn; }
    setAttribute() {}
    getBoundingClientRect() { return {top:0,width:1280,height:720}; }
    fire(name) { this.listeners[name]?.(); }
  }
  const elements=Object.fromEntries(['#story','#sequence','#poster','.character','#motion-toggle','.character-stage','#story-progress'].map(key=>[key,new Element()]));
  elements['#story'].offsetHeight=2880;
  const poster=elements['#poster'];
  poster.complete=cached; poster.naturalWidth=cached?1280:0; poster.naturalHeight=cached?720:0;
  poster.decode=()=>Promise.resolve();
  elements['#sequence'].getContext=()=>({clearRect(){},drawImage(image){assert.ok(image.naturalWidth || image.width); draws.push(image);}});
  class FakeBlob {
    constructor(parts) { this.bytes=new Uint8Array(parts[0]); }
  }
  class FakeImage {
    constructor() { this.naturalWidth=0; this.naturalHeight=0; }
    set src(value) {
      this.url=value;
      if(value.startsWith('data:')) { this.naturalWidth=1280; this.naturalHeight=720; this.onload(); }
      else if(value.startsWith('blob:')) {
        const blob=blobs.get(value); this.naturalWidth=blob.bytes[1]?1280:768;
        this.naturalHeight=this.naturalWidth*9/16; this.index=blob.bytes[0]; this.onload();
      } else images.push(this);
    }
    complete() { this.naturalWidth=this.url.includes('/mobile/')?768:1280; this.naturalHeight=this.naturalWidth*9/16; this.onload(); }
    fail() { this.onerror(); }
  }
  const window=new Element(), document=new Element(), blobs=new Map();
  if(!noBitmap) window.createImageBitmap=true;
  window.CyberFictionHDSeeds=seeded?[[25,'data:image/webp;base64,sharp']]:[];
  document.querySelector=selector=>elements[selector];
  document.documentElement=new Element(); document.hidden=false;
  const sandbox={ document,window,navigator:{connection:{saveData}},Image:FakeImage,Blob:FakeBlob,DataView,Error,
    fetch:(url,options)=>new Promise(resolve=>requests.push({url,options,done:false,
      complete() { this.done=true; resolve({ok:true,arrayBuffer:()=>Promise.resolve(packBuffer(Number(url.match(/(\d\d)\.bin$/)[1]),url.includes('/mobile/')))}); },
      fail() { this.done=true; resolve({ok:false}); },
      corrupt() { this.done=true; resolve({ok:true,arrayBuffer:()=>Promise.resolve(new Uint8Array([255]).buffer)}); }
    })),
    createImageBitmap:blob=> {
      const image={width:blob.bytes[1]?1280:768,height:blob.bytes[1]?720:432,index:blob.bytes[0],closed:false,close(){this.closed=true;}};
      decodes.push(image);
      return image.index===badDecode?Promise.reject(new Error('Bad frame')):Promise.resolve(image);
    },
    URL:{createObjectURL(blob){const key='blob:'+blobs.size;blobs.set(key,blob);return key;},revokeObjectURL(){}},
    matchMedia:query=> {
      const result={matches:query.includes('reduced')?reduced:compact,listeners:[],addEventListener(name,fn){this.listeners.push(fn);}};
      media.set(query,result); return result;
    },
    scrollY:0,devicePixelRatio:dpr,requestAnimationFrame:fn=>{tasks.push(fn);return tasks.length;},
    setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id) };
  elements['#story'].getBoundingClientRect=()=>({top:-sandbox.scrollY,width:1280,height:elements['#story'].offsetHeight});
  if(pinned) {
    document.querySelectorAll=()=>[new Element(),new Element(),new Element()];
    sandbox.gsap=window.gsap={registerPlugin(){},matchMedia:()=>({add(query,fn){if(!reduced)fn();}})};
    sandbox.ScrollTrigger=window.ScrollTrigger={config(){},create(options){pins.push(options);elements['#story'].offsetHeight+=Number(options.end().slice(2));},refresh(){refreshListeners.forEach(fn=>fn());},addEventListener(name,fn){if(name==='refresh')refreshListeners.push(fn);}};
  }
  vm.runInNewContext(source,sandbox);
  async function flush() {
    for(let i=0;i<40;i++) {
      await Promise.resolve(); while(tasks.length)tasks.shift()();
      for(const[id,fn]of[...timers]){timers.delete(id);fn();}
    }
  }
  async function finishPacks() {
    for(let i=0;i<15;i++){requests.filter(r=>!r.done).forEach(r=>r.complete());await flush();}
  }
  return {elements,requests,draws,decodes,images,sandbox,window,document,pins,flush,finishPacks,
    async loadPoster(){poster.naturalWidth=1280;poster.naturalHeight=720;poster.fire('load');await flush();},
    async scroll(y){sandbox.scrollY=y;window.fire('scroll');await flush();},
    async resize(isCompact,newDpr=1){for(const[q,m]of media){if(!q.includes('reduced'))m.matches=isCompact;}sandbox.devicePixelRatio=newDpr;window.fire('resize');await flush();}
  };
}

function frame(h){return Number(h.elements['#sequence'].dataset.frame);}
function assertSharp(h,min=768){assert.ok(h.draws.every(image=>(image.naturalWidth||image.width)>=min),'a low-resolution frame was painted');}

test('initial and cached posters paint sharply before sequence downloads',async()=>{
  for(const cached of[false,true]) {
    const h=harness({cached}); if(cached)await h.flush();else await h.loadPoster();
    assert.equal(frame(h),0);assert.equal(h.requests.length,3);
    assert.match(h.requests[0].url,/packs\/desktop\/00.bin$/);
    assert.equal(h.requests[0].options.priority,'high');assertSharp(h,1280);
  }
});

test('embedded first-scroll keyframes retain full desktop detail',async()=>{
  const h=harness({seeded:true});await h.loadPoster();await h.scroll(360);
  assert.equal(frame(h),25);assert.equal(h.elements['#sequence'].dataset.sourceWidth,'1280');
  assert.match(h.images[0].url,/desktop\/025.webp$/);assert.equal(h.images[0].fetchPriority,'high');
  h.images[0].complete();await h.flush();assertSharp(h,1280);
});

test('current HD frame starts downloading during scrolling without a settle timer',async()=>{
  const h=harness();await h.loadPoster();await h.scroll(1080);
  assert.match(h.images[0].url,/desktop\/075.webp$/);
  h.images[0].complete();await h.flush();assert.equal(frame(h),75);assertSharp(h,1280);
});

test('all compressed HD packs prefetch with bounded network and decoded memory',async()=>{
  const h=harness();await h.loadPoster();assert.equal(h.requests.filter(r=>!r.done).length,3);
  await h.finishPacks();assert.equal(h.requests.length,10);assert.ok(h.requests.every(r=>r.url.includes('/packs/desktop/')));
  for(let y=0;y<=2160;y+=90){await h.scroll(y);assert.ok(h.decodes.filter(image=>!image.closed).length<=32);}
  assert.equal(frame(h),150);assertSharp(h,1280);
});

test('moving across adjacent frames never switches to a smaller preview',async()=>{
  const h=harness();await h.loadPoster();await h.finishPacks();
  for(const y of[1080,1100,1120,1140,1120,1100,1080]) {
    await h.scroll(y);assert.equal(frame(h),Math.round(y/2160*150));
    assert.equal(h.elements['#sequence'].dataset.sourceWidth,'1280');
  }
  assert.equal(h.images.length,0);assertSharp(h,1280);
});

test('fast jumps and reverse scrolling use full-detail packed frames',async()=>{
  const h=harness();await h.loadPoster();await h.finishPacks();
  for(const y of[2100,300,2160,0]){await h.scroll(y);assert.equal(frame(h),Math.round(y/2160*150));}
  assertSharp(h,1280);
});

test('mobile uses sharp 768px frames and retina phones use desktop detail',async()=>{
  for(const[dpr,variant,width]of[[1,'mobile',768],[2,'desktop',1280]]) {
    const h=harness({compact:true,dpr});await h.loadPoster();await h.finishPacks();await h.scroll(1000);
    assert.ok(h.requests.every(r=>r.url.includes('/'+variant+'/')));
    assert.equal(h.elements['#sequence'].dataset.sourceWidth,String(width));assertSharp(h,width);
    assert.ok(h.decodes.filter(image=>!image.closed).length<=20);
  }
});

test('resizing upgrades the source and ignores obsolete frame completions',async()=>{
  const h=harness({compact:true});await h.loadPoster();await h.scroll(360);
  const old=h.images[0];await h.resize(false,2);
  const sharp=h.images.find(image=>image.url.includes('/desktop/'));
  assert.ok(sharp);sharp.complete();await h.flush();old.complete();await h.flush();
  assert.equal(frame(h),25);assert.equal(h.elements['#sequence'].dataset.sourceWidth,'1280');
  await h.finishPacks();
  for(const y of[800,1200,1800]){await h.scroll(y);assert.equal(frame(h),Math.round(y/2160*150));}
  assert.ok(h.decodes.filter(image=>!image.closed).length<=32);
});

test('failed or corrupt packs fall back to an individually requested HD image',async()=>{
  for(const failure of['fail','corrupt']) {
    const h=harness();await h.loadPoster();h.requests[0][failure]();await h.flush();await h.scroll(144);
    const image=h.images.find(image=>image.url.endsWith('010.webp'));assert.ok(image);
    image.complete();await h.flush();assert.equal(frame(h),10);assertSharp(h,1280);
  }
});

test('a damaged packed frame is skipped and the same HD frame is fetched directly',async()=>{
  const h=harness({badDecode:10});await h.loadPoster();await h.finishPacks();await h.scroll(144);
  const image=h.images.find(image=>image.url.endsWith('010.webp'));assert.ok(image);
  image.complete();await h.flush();assert.equal(frame(h),10);
  assert.equal(h.decodes.filter(image=>image.index===10).length,1);assertSharp(h,1280);
});

test('browsers without ImageBitmap still draw full-detail frames',async()=>{
  const h=harness({noBitmap:true});await h.loadPoster();await h.finishPacks();await h.scroll(1080);
  assert.equal(frame(h),75);assertSharp(h,1280);
});

test('pinned chapter pacing is unchanged while HD frames follow scroll',async()=>{
  const h=harness({pinned:true});await h.loadPoster();await h.finishPacks();
  assert.equal(h.pins.length,3);assert.equal(h.elements['#story'].offsetHeight,5040);
  for(const y of[900,1200,2160,4320,0]){await h.scroll(y);assert.equal(frame(h),Math.round(y/4320*150));}
  assertSharp(h,1280);
});

test('reduced motion and data saver skip sequence prefetching',async()=>{
  for(const options of[{reduced:true,pinned:true},{saveData:true}]) {
    const h=harness(options);await h.loadPoster();await h.scroll(1000);
    assert.equal(h.requests.length,0);assert.equal(h.images.length,0);assert.equal(frame(h),0);
    if(options.reduced)assert.equal(h.pins.length,0);
  }
});

test('pause holds the frame; resume and return to top remain sharp',async()=>{
  const h=harness();await h.loadPoster();await h.finishPacks();await h.scroll(1080);
  h.elements['#motion-toggle'].fire('click');await h.scroll(1500);assert.equal(frame(h),75);
  h.elements['#motion-toggle'].fire('click');await h.flush();assert.equal(frame(h),104);
  await h.scroll(0);assert.equal(frame(h),0);assertSharp(h,1280);
});
