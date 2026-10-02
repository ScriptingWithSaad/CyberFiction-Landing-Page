(() => {
  "use strict";
  const story = document.querySelector("#story");
  const canvas = document.querySelector("#sequence");
  const poster = document.querySelector("#poster");
  const character = document.querySelector(".character");
  const toggle = document.querySelector("#motion-toggle");
  const progressBar = document.querySelector("#story-progress");
  const context = canvas.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const compact = matchMedia("(max-width: 900px)");
  const cover = matchMedia("(max-width: 1100px), (max-height: 600px)");
  const connection = navigator.connection;
  const frameCount = 151;
  const packSize = 16;
  const packCount = Math.ceil(frameCount / packSize);
  let cacheLimit = compact.matches ? 20 : 32;
  const cache = new Map();
  const seeds = new Map();
  const packs = new Map();
  const fetching = new Set();
  const failedPacks = new Set();
  const decoding = new Set();
  const failedDecodes = new Set();
  const urgent = new Set();
  const failedUrgent = new Set();
  let variant = viewportVariant();
  let generation = 0;
  let target = 0;
  let drawn = -1;
  let direction = 1;
  let raf = 0;
  let firstReady = false;
  let paused = reduced.matches || Boolean(connection?.saveData);
  let storyTop = 0;
  let scrollDistance = 1;

  // The original reading pauses remain independent of frame loading.
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
      document.querySelectorAll(".chapter:not(.intro)").forEach((chapter) => {
        ScrollTrigger.create({
          trigger: chapter,
          start: "top top",
          end: () => `+=${chapter.offsetHeight}`,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        });
      });
      ScrollTrigger.refresh();
    });
    ScrollTrigger.addEventListener("refresh", measure);
  }

  function viewportVariant() {
    // Retina phones need the same source detail as desktop screens.
    return compact.matches && (devicePixelRatio || 1) < 2 ? "mobile" : "desktop";
  }

  function updateMotion() {
    document.documentElement.classList.toggle("motion-paused", paused);
    toggle.textContent = paused ? "Play motion" : "Pause motion";
    toggle.setAttribute("aria-pressed", String(paused));
    if (!paused) {
      if (firstReady) warmSequence();
      schedule();
    }
  }
  toggle.hidden = false;
  toggle.addEventListener("click", () => {
    paused = !paused;
    updateMotion();
  });
  reduced.addEventListener("change", () => {
    paused = reduced.matches || Boolean(connection?.saveData);
    updateMotion();
  });
  updateMotion();
  if (!context) return; // The eager HTML poster remains visible.
  for (const [index, source] of window.CyberFictionHDSeeds || []) {
    const image = new Image();
    image.onload = () => {
      seeds.set(index, image);
      if (firstReady && !paused && !cache.has(target)) drawNearest(target);
    };
    image.src = source;
  }

  function remember(index, image) {
    const previous = cache.get(index);
    if (previous !== image && previous !== poster) previous?.close?.();
    cache.set(index, image);
    while (cache.size > cacheLimit) {
      const evict = [...cache.keys()]
        .filter((key) => key !== 0 && key !== target && key !== drawn)
        .sort((a, b) => Math.abs(b - target) - Math.abs(a - target))[0];
      if (evict === undefined) break;
      cache.get(evict)?.close?.();
      cache.delete(evict);
    }
  }

  function draw(index) {
    const image = cache.get(index) || seeds.get(index);
    const imageWidth = image?.naturalWidth || image?.width;
    const imageHeight = image?.naturalHeight || image?.height;
    if (!imageWidth || !imageHeight) return false;
    const scale = (cover.matches ? Math.max : Math.min)(
      canvas.width / imageWidth,
      canvas.height / imageHeight,
    );
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    drawn = index;
    character.classList.add("ready");
    canvas.dataset.frame = String(index);
    canvas.dataset.sourceWidth = String(imageWidth);
    return true;
  }

  function drawNearest(index) {
    if (draw(index)) return;
    for (let distance = 1; distance < frameCount; distance++) {
      if (index - distance >= 0 && draw(index - distance)) return;
      if (index + distance < frameCount && draw(index + distance)) return;
    }
  }

  function measure() {
    cacheLimit = compact.matches ? 20 : 32;
    const nextVariant = viewportVariant();
    if (nextVariant !== variant) {
      variant = nextVariant;
      generation++;
      for (const [index, image] of cache) {
        if (index !== 0) { image.close?.(); cache.delete(index); }
      }
    }
    if (cache.has(0)) remember(0, poster);
    const bounds = character.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(bounds.width * dpr));
    canvas.height = Math.max(1, Math.round(bounds.height * dpr));
    storyTop = story.getBoundingClientRect().top + scrollY;
    scrollDistance = Math.max(1, story.offsetHeight - document.querySelector(".character-stage").offsetHeight);
    if (!draw(drawn)) drawNearest(target);
    schedule();
  }

  function packKey(pack, selectedVariant = variant) {
    return `${selectedVariant}/${pack}`;
  }

  function parsePack(buffer, pack) {
    const view = new DataView(buffer);
    const frames = [];
    let offset = 0;
    const count = Math.min(packSize, frameCount - pack * packSize);
    for (let i = 0; i < count; i++) {
      if (offset + 4 > buffer.byteLength) throw new Error("Truncated frame pack");
      const length = view.getUint32(offset, true);
      offset += 4;
      if (!length || offset + length > buffer.byteLength) throw new Error("Invalid packed frame");
      frames.push(new Blob([buffer.slice(offset, offset + length)], { type: "image/webp" }));
      offset += length;
    }
    if (offset !== buffer.byteLength) throw new Error("Unexpected packed bytes");
    return frames;
  }

  function warmSequence() {
    if (paused || document.hidden || !firstReady) return;
    const currentPack = Math.floor(target / packSize);
    const order = Array.from({ length: packCount }, (_, i) => i).sort((a, b) =>
      Math.abs(a - currentPack) - Math.abs(b - currentPack) || (b - a) * direction,
    );
    // Fetch compressed HD bytes ahead of scrolling; retain only a small decoded window.
    for (const pack of order) {
      if (fetching.size >= 3) break;
      const selectedVariant = variant;
      const key = packKey(pack, selectedVariant);
      if (packs.has(key) || fetching.has(key) || failedPacks.has(key)) continue;
      fetching.add(key);
      fetch(`assets/packs/${selectedVariant}/${String(pack).padStart(2, "0")}.bin`, {
        priority: pack === currentPack ? "high" : "low",
      })
        .then((response) => {
          if (!response.ok) throw new Error("Frame pack unavailable");
          return response.arrayBuffer();
        })
        .then((buffer) => {
          packs.set(key, parsePack(buffer, pack));
          pumpDecodes();
        })
        .catch(() => failedPacks.add(key))
        .finally(() => {
          fetching.delete(key);
          warmSequence();
        });
    }
    pumpDecodes();
    requestCurrent();
  }

  function frameWindow() {
    const indices = [target];
    const radius = compact.matches ? 8 : 12;
    for (let distance = 1; distance <= radius; distance++) {
      for (const index of [target + distance * direction, target - distance * direction]) {
        if (index >= 0 && index < frameCount) indices.push(index);
      }
    }
    return indices;
  }

  function imageFromBlob(blob) {
    if ("createImageBitmap" in window) return createImageBitmap(blob);
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(blob);
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Frame decode failed")); };
      image.src = url;
    });
  }

  function pumpDecodes() {
    if (paused || document.hidden || !firstReady) return;
    for (const index of frameWindow()) {
      if (decoding.size >= 3) break;
      const key = `${variant}/${index}`;
      const frames = packs.get(packKey(Math.floor(index / packSize)));
      if (!frames || cache.has(index) || decoding.has(key) || failedDecodes.has(key)) continue;
      const token = generation;
      decoding.add(key);
      imageFromBlob(frames[index % packSize])
        .then((image) => {
          if (token !== generation) { image.close?.(); return; }
          remember(index, image);
          if (!paused && index === target) draw(index);
        })
        .catch(() => failedDecodes.add(key))
        .finally(() => { decoding.delete(key); pumpDecodes(); requestCurrent(); });
    }
  }

  function requestCurrent() {
    if (paused || document.hidden || !firstReady || cache.has(target)) return;
    const index = target;
    const selectedVariant = variant;
    const key = `${selectedVariant}/${index}`;
    if (packs.has(packKey(Math.floor(index / packSize))) && !failedDecodes.has(key)) return;
    if (urgent.size >= 2 || urgent.has(key) || failedUrgent.has(key)) return;
    urgent.add(key);
    const token = generation;
    const image = new Image();
    image.fetchPriority = "high";
    image.onload = () => {
      if (token === generation) {
        remember(index, image);
        if (!paused && index === target) draw(index);
      }
      urgent.delete(key);
      requestCurrent();
    };
    image.onerror = () => {
      failedUrgent.add(key);
      urgent.delete(key);
      requestCurrent();
    };
    image.src = `assets/frames/${selectedVariant}/${String(index).padStart(3, "0")}.webp`;
  }

  function update() {
    raf = 0;
    const progress = Math.max(0, Math.min(1, (scrollY - storyTop) / scrollDistance));
    if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
    if (paused || document.hidden || !firstReady) return;
    const next = Math.round(progress * (frameCount - 1));
    if (next !== target) direction = next > target ? 1 : -1;
    target = next;
    if (drawn !== target) drawNearest(target);
    // The same HD frames are used while moving and while stopped. No settle timer.
    warmSequence();
  }

  function schedule() { if (!raf) raf = requestAnimationFrame(update); }

  async function start() {
    if (firstReady || !poster.naturalWidth) return;
    try { await poster.decode(); } catch { /* A loaded poster can still be drawn. */ }
    if (firstReady) return;
    firstReady = true;
    remember(0, poster);
    measure();
    draw(0);
    schedule();
  }
  poster.addEventListener("load", start);
  if (poster.complete && poster.naturalWidth) start();
  window.addEventListener("scroll", schedule, { passive: true });
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 100);
  });
  window.addEventListener("pageshow", () => { measure(); start(); });
  document.addEventListener("visibilitychange", schedule);
  measure();
})();
