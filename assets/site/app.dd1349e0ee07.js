(() => {
  "use strict";
  const story = document.querySelector("#story");
  const canvas = document.querySelector("#sequence");
  const poster = document.querySelector("#poster");
  const character = document.querySelector(".character");
  const toggle = document.querySelector("#motion-toggle");
  const context = canvas.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const compact = matchMedia("(max-width: 900px)");
  const connection = navigator.connection;
  const frameCount = 151;
  const previewCount = 151;
  const previewPackSize = 51;
  const cacheLimit = 12;
  const variant = compact.matches ? "mobile" : "desktop";
  const cache = new Map();
  const seeds = new Map();
  const proxies = new Array(previewCount);
  const warming = new Set();
  const anchors = [25, 50, 75, 100, 125, 150];
  const warmQueue = [
    ...anchors,
    ...Array.from({ length: previewCount - 1 }, (_, i) => i + 1).filter(
      (index) => !anchors.includes(index),
    ),
  ];
  const previewPacks = new Map();
  const previewPromises = new Map();
  const failedFrames = new Set();
  const loading = new Set();
  let target = 0;
  let drawn = -1;
  let raf = 0;
  let settleTimer;
  let firstReady = false;
  let paused = reduced.matches || Boolean(connection?.saveData);
  let storyTop = 0;
  let scrollDistance = 1;

  function updateMotion() {
    document.documentElement.classList.toggle("motion-paused", paused);
    toggle.textContent = paused ? "Play motion" : "Pause motion";
    toggle.setAttribute("aria-pressed", String(paused));
    if (!paused) {
      if (firstReady) {
        warmSequence();
        pumpProxies();
      }
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
  if (!context) return; // The eagerly loaded HTML poster remains visible.
  for (const [index, source] of window.CyberFictionSeeds || []) {
    const image = new Image();
    image.onload = () => {
      seeds.set(index, image);
      if (firstReady && !paused && target === index) draw(index);
    };
    image.src = source;
  }

  function remember(index, image) {
    cache.delete(index);
    cache.set(index, image);
    while (cache.size > cacheLimit) {
      const oldest = [...cache.keys()].find(
        (key) => key !== 0 && key !== target && key !== drawn,
      );
      if (oldest === undefined) break;
      const evicted = cache.get(oldest);
      cache.delete(oldest);
      evicted?.close?.();
    }
  }

  function draw(index) {
    const image = cache.get(index) || proxies[index] || seeds.get(index);
    const imageWidth = image?.naturalWidth || image?.width;
    const imageHeight = image?.naturalHeight || image?.height;
    if (!imageWidth || !imageHeight) return false;
    const scale = (compact.matches ? Math.max : Math.min)(
      canvas.width / imageWidth,
      canvas.height / imageHeight,
    );
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    // Keep the current frame until its replacement has decoded successfully.
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      image,
      (canvas.width - width) / 2,
      (canvas.height - height) / 2,
      width,
      height,
    );
    drawn = index;
    character.classList.add("ready");
    canvas.dataset.frame = String(index);
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
    const bounds = character.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(bounds.width * dpr));
    canvas.height = Math.max(1, Math.round(bounds.height * dpr));
    storyTop = story.getBoundingClientRect().top + scrollY;
    scrollDistance = Math.max(
      1,
      story.offsetHeight -
        document.querySelector(".character-stage").offsetHeight,
    );
    if (!draw(drawn)) draw(0);
    schedule();
  }

  function warmSequence() {
    for (let pack = 0; pack < 3; pack++) loadPreviewPack(pack);
  }

  function loadPreviewPack(pack) {
    if (!previewPromises.has(pack)) {
      const url = `assets/preview/v2/${String(pack).padStart(2, "0")}.bin`;
      const promise = fetch(url, { priority: "high" })
        .then((response) => {
          if (!response.ok) throw new Error(`Unable to load ${url}`);
          return response.arrayBuffer();
        })
        .then((buffer) => {
          previewPacks.set(pack, buffer);
          pumpProxies();
          schedule();
          return buffer;
        })
        .catch(() => null);
      previewPromises.set(pack, promise);
    }
    return previewPromises.get(pack);
  }

  function blobFromPack(pack, position) {
    const view = new DataView(pack);
    let offset = 0;
    for (let i = 0; i <= position; i++) {
      const length = view.getUint32(offset, true);
      offset += 4;
      if (i === position)
        return new Blob([pack.slice(offset, offset + length)], {
          type: "image/webp",
        });
      offset += length;
    }
  }

  function previewBlob(index) {
    const pack = previewPacks.get(Math.floor(index / previewPackSize));
    return blobFromPack(pack, index % previewPackSize);
  }

  function imageFromBlob(blob) {
    if ("createImageBitmap" in window) return createImageBitmap(blob);
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(blob);
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Frame could not be decoded"));
      };
      image.src = url;
    });
  }

  function pumpProxies() {
    if (paused || document.hidden || !firstReady) return;
    for (const index of [target, ...warmQueue]) {
      if (warming.size >= 6) break;
      if (proxies[index] || warming.has(index)) continue;
      if (!previewPacks.has(Math.floor(index / previewPackSize))) continue;
      warming.add(index);
      const blob = previewBlob(index);
      const promise = "createImageBitmap" in window
        ? createImageBitmap(blob)
        : imageFromBlob(blob);
      promise
        .then((image) => {
          proxies[index] = image;
          if (!paused && index === target) draw(target);
        })
        .catch(() => {})
        .finally(() => {
          warming.delete(index);
          pumpProxies();
        });
    }
  }

  function decode(index) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = `assets/frames/${variant}/${String(index).padStart(3, "0")}.webp`;
    });
  }

  function pump() {
    if (paused || document.hidden || !firstReady) return;
    const index = target;
    if (cache.has(index) || loading.has(index) || failedFrames.has(index)) return;
    loading.add(index);
    decode(index)
      .then((image) => {
        remember(index, image);
        if (!paused && index === target) draw(index);
      })
      .catch(() => failedFrames.add(index))
      .finally(() => loading.delete(index));
  }

  function update() {
    raf = 0;
    if (paused || document.hidden || !firstReady) return;
    const progress = Math.max(
      0,
      Math.min(1, (scrollY - storyTop) / scrollDistance),
    );
    const next = Math.round(progress * (frameCount - 1));
    target = next;
    if (drawn !== target) drawNearest(target);
    pumpProxies();
    // Small decoded proxies respond during scrolling. Full-size frames replace
    // them when scrolling settles, without holding up the animation.
    clearTimeout(settleTimer);
    settleTimer = setTimeout(pump, 120);
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(update);
  }

  async function start() {
    if (firstReady || !poster.naturalWidth) return;
    try {
      await poster.decode();
    } catch {
      /* A loaded poster can still be drawn. */
    }
    if (firstReady) return;
    firstReady = true;
    remember(0, poster);
    measure();
    draw(0);
    if (!paused) warmSequence();
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
  window.addEventListener("pageshow", () => {
    measure();
    start();
  });
  document.addEventListener("visibilitychange", schedule);
  measure();
})();
