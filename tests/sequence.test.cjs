const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../script/script.js'), 'utf8');

function packBuffer(pack, preview) {
  const bytes = [];
  const size = preview ? 51 : 16;
  const count = 151;
  for (let i = 0; i < size && pack * size + i < count; i++) {
    bytes.push(1, 0, 0, 0, pack * size + i);
  }
  return Uint8Array.from(bytes).buffer;
}

function harness({ cached = false, compact = false, reduced = false, saveData = false, seeded = false } = {}) {
  const tasks = [], requests = [], draws = [], decodes = [], individual = [], timers = new Map();
  let timerId = 0;
  class Element {
    constructor() { this.listeners = {}; this.dataset = {}; this.classList = {add(){}, toggle(){}}; this.offsetHeight = 720; }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    setAttribute() {}
    getBoundingClientRect() { return {top: 0, width: 1280, height: 720}; }
    fire(name) { this.listeners[name]?.(); }
  }
  const elements = Object.fromEntries(['#story','#sequence','#poster','.character','#motion-toggle','.character-stage'].map(key => [key, new Element()]));
  elements['#story'].offsetHeight = 2880;
  const poster = elements['#poster'];
  poster.complete = cached;
  poster.naturalWidth = cached ? 1280 : 0;
  poster.naturalHeight = cached ? 720 : 0;
  poster.decode = () => Promise.resolve();
  elements['#sequence'].getContext = () => ({clearRect(){},drawImage(image){assert.ok(image.naturalWidth || image.width); draws.push(image);}});
  class FakeBlob {
    constructor(parts) { this.bytes = new Uint8Array(parts[0]); }
  }
  class FakeImage {
    constructor() { this.naturalWidth = 0; this.naturalHeight = 0; }
    set src(value) {
      if (value.startsWith('data:')) {
        this.naturalWidth = 384;
        this.naturalHeight = 216;
        this.onload();
      } else if (value.startsWith('assets/frames/')) {
        this.url = value;
        individual.push(this);
      }
    }
    complete() { this.naturalWidth = 1280; this.naturalHeight = 720; this.onload(); }
  }
  const window = new Element();
  window.createImageBitmap = true;
  window.CyberFictionSeeds = seeded ? [[25,'data:image/webp;base64,fake']] : [];
  const document = new Element();
  document.querySelector = selector => elements[selector];
  document.documentElement = new Element();
  document.hidden = false;
  const sandbox = { document, window, navigator: {connection:{saveData}}, Image:FakeImage,
    Blob:FakeBlob, DataView, Error,
    fetch: url => new Promise(resolve => requests.push({url, complete() {
      const match = url.match(/(\d\d)\.bin$/);
      resolve({ok:true,arrayBuffer:()=>Promise.resolve(packBuffer(Number(match[1]),url.includes('/preview/')))});
    }})),
    createImageBitmap: blob => {
      const image={width:1280,height:720,index:blob.bytes[0],close(){}};
      decodes.push(image.index);
      return Promise.resolve(image);
    },
    matchMedia: query => ({matches:query.includes('reduced') ? reduced : compact, addEventListener(){}}),
    scrollY:0, devicePixelRatio:1, requestAnimationFrame:fn => {tasks.push(fn); return tasks.length;},
    setTimeout:fn => {timers.set(++timerId,fn); return timerId;},
    clearTimeout:id => timers.delete(id) };
  vm.runInNewContext(source, sandbox);
  async function flush() {
    for(let i=0;i<20;i++) {
      await Promise.resolve();
      while(tasks.length) tasks.shift()();
      for(const [id,fn] of [...timers]) { timers.delete(id); fn(); }
    }
  }
  return { elements, requests, draws, decodes, individual, sandbox, window, flush,
    async loadPoster() { poster.naturalWidth=1280; poster.naturalHeight=720; poster.fire('load'); await flush(); },
    async scroll(y) { sandbox.scrollY=y; window.fire('scroll'); await flush(); } };
}

test('poster paints at load and the tiny preview packs start first', async () => {
  const h=harness(); assert.equal(h.draws.length,0); await h.loadPoster();
  assert.equal(h.elements['#sequence'].dataset.frame,'0');
  assert.equal(h.requests.length,3);
  assert.match(h.requests[0].url,/preview\/v2\/00.bin$/);
});

test('cached poster also paints immediately', async () => {
  const h=harness({cached:true}); await h.flush();
  assert.equal(h.elements['#sequence'].dataset.frame,'0');
});

test('an embedded seed changes the frame before a preview pack downloads', async () => {
  const h=harness({seeded:true}); await h.loadPoster();
  await h.scroll(360);
  assert.equal(h.elements['#sequence'].dataset.frame,'25');
  assert.equal(h.requests.length,3);
  assert.match(h.individual[0].url,/desktop\/025.webp$/);
  h.individual[0].complete(); await h.flush();
  assert.equal(h.draws.at(-1).naturalWidth,1280);
});

test('finishing the preview does not start bulk high-resolution downloads', async () => {
  const h=harness(); await h.loadPoster();
  h.requests[0].complete(); h.requests[1].complete(); h.requests[2].complete();
  await h.flush();
  assert.equal(h.requests.length,3);
  await h.scroll(1080);
  assert.match(h.individual[0].url,/desktop\/075.webp$/);
});

test('a loaded preview pack supplies multiple scrub frames without another request', async () => {
  const h=harness(); await h.loadPoster(); await h.scroll(1080);
  assert.equal(h.elements['#sequence'].dataset.frame,'0');
  h.requests[1].complete(); await h.flush();
  assert.equal(h.elements['#sequence'].dataset.frame,'75');
  const count=h.requests.length;
  await h.scroll(1100);
  assert.equal(h.elements['#sequence'].dataset.frame,'76');
  assert.equal(h.requests.length,count);
  assert.ok(h.decodes.includes(75) && h.decodes.includes(76));
});

test('fast scrolling draws the newest frame when its pack is ready', async () => {
  const h=harness(); await h.loadPoster(); await h.scroll(300); await h.scroll(2100);
  h.requests[0].complete(); await h.flush();
  assert.notEqual(h.elements['#sequence'].dataset.frame,'146');
  h.requests[2].complete(); await h.flush();
  assert.equal(h.elements['#sequence'].dataset.frame,'146');
});

test('mobile shares the tiny preview and scrubs from it', async () => {
  const h=harness({compact:true}); await h.loadPoster(); await h.scroll(1000);
  assert.equal(h.requests.length,3);
  assert.match(h.requests[1].url,/preview\/v2\/01.bin$/);
  h.requests[1].complete(); await h.flush();
  assert.equal(h.elements['#sequence'].dataset.frame,'69');
});

test('reduced motion and data saver skip background pack downloads', async () => {
  for(const options of [{reduced:true},{saveData:true}]) {
    const h=harness(options); await h.loadPoster(); await h.scroll(1000);
    assert.equal(h.requests.length,0);
    assert.equal(h.elements['#sequence'].dataset.frame,'0');
  }
});

test('pause stops decoding and returning to top restores the poster', async () => {
  const h=harness(); await h.loadPoster(); h.elements['#motion-toggle'].fire('click');
  await h.scroll(1000); h.requests[1].complete(); await h.flush();
  assert.equal(h.decodes.length,0);
  h.elements['#motion-toggle'].fire('click'); await h.flush();
  assert.equal(h.elements['#sequence'].dataset.frame,'69');
  await h.scroll(0); assert.equal(h.elements['#sequence'].dataset.frame,'0');
});
