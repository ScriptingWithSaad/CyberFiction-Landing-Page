const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../script/script.js'), 'utf8');

function harness({ cached = false, compact = false, reduced = false, saveData = false } = {}) {
  const tasks = [], requests = [], draws = [];
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
  elements['#sequence'].getContext = () => ({clearRect(){},drawImage(image){assert.ok(image.naturalWidth > 0); draws.push(image);}});
  class FakeImage {
    constructor() { this.naturalWidth = 0; this.naturalHeight = 0; requests.push(this); }
    decode() { return Promise.resolve(); }
    completeSuccessfully() { this.naturalWidth = 1280; this.naturalHeight = 720; this.onload(); }
  }
  const window = new Element();
  const document = new Element();
  document.querySelector = selector => elements[selector];
  document.documentElement = new Element();
  document.hidden = false;
  const sandbox = { document, window, navigator: {connection:{saveData}}, Image:FakeImage,
    matchMedia: query => ({matches:query.includes('reduced') ? reduced : compact, addEventListener(){}}),
    scrollY:0, devicePixelRatio:1, requestAnimationFrame:fn => {tasks.push(fn); return tasks.length;}, setTimeout, clearTimeout };
  vm.runInNewContext(source, sandbox);
  async function flush() { await Promise.resolve(); await Promise.resolve(); while(tasks.length) tasks.shift()(); }
  return { elements, requests, draws, sandbox, window, flush,
    async loadPoster() { poster.naturalWidth=1280; poster.naturalHeight=720; poster.fire('load'); await flush(); },
    async scroll(y) { sandbox.scrollY=y; window.fire('scroll'); await flush(); } };
}

test('first decoded poster paints without a scroll and requests no other frames', async () => {
  const h=harness(); assert.equal(h.draws.length,0); await h.loadPoster();
  assert.equal(h.elements['#sequence'].dataset.frame,'0'); assert.equal(h.requests.length,0);
});
test('already cached poster also paints immediately', async () => {
  const h=harness({cached:true}); await h.flush(); assert.equal(h.elements['#sequence'].dataset.frame,'0');
});
test('requests are bounded and missing frames never clear the current image', async () => {
  const h=harness(); await h.loadPoster(); await h.scroll(1080);
  assert.equal(h.requests.length,3); assert.match(h.requests[0].src,/075.webp$/);
  assert.equal(h.elements['#sequence'].dataset.frame,'0');
  h.requests[0].completeSuccessfully(); await h.flush();
  assert.equal(h.elements['#sequence'].dataset.frame,'75');
  h.requests[1].onerror(); await h.flush(); assert.equal(h.elements['#sequence'].dataset.frame,'75');
});
test('fast scrolling prioritizes the new target rather than painting stale requests', async () => {
  const h=harness(); await h.loadPoster(); await h.scroll(300); await h.scroll(2100);
  h.requests[0].completeSuccessfully(); await h.flush();
  assert.equal(h.elements['#sequence'].dataset.frame,'0');
  assert.match(h.requests[3].src,/146.webp$/);
  h.requests[3].completeSuccessfully(); await h.flush(); assert.equal(h.elements['#sequence'].dataset.frame,'146');
});
test('mobile, reduced-motion and data-saver modes do not download a sequence', async () => {
  for(const options of [{compact:true},{reduced:true},{saveData:true}]) {
    const h=harness(options); await h.loadPoster(); await h.scroll(1000);
    assert.equal(h.requests.length,0); assert.equal(h.elements['#sequence'].dataset.frame,'0');
  }
});
test('pause stops new requests and return to top restores frame zero', async () => {
  const h=harness(); await h.loadPoster(); h.elements['#motion-toggle'].fire('click');
  await h.scroll(1000); assert.equal(h.requests.length,0);
  h.elements['#motion-toggle'].fire('click'); await h.flush();
  assert.equal(h.requests.length,3); h.requests[0].completeSuccessfully(); await h.flush();
  await h.scroll(0); assert.equal(h.elements['#sequence'].dataset.frame,'0');
});
