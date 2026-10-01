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
  const packSize = 16;
  const packCount = Math.ceil(frameCount / packSize);
  const cacheLimit = 24;
  const variant = compact.matches ? "mobile" : "desktop";
  const cache = new Map();
  const packs = new Map();
  const packPromises = new Map();
  const failedPacks = new Set();
  const failedFrames = new Set();
  const loading = new Set();
  const maxWorkers = 4;
  let queue = [];
  let target = 0;
  let drawn = -1;
  let raf = 0;
  let firstReady = false;
  let paused = reduced.matches || Boolean(connection?.saveData);
  let storyTop = 0;
  let scrollDistance = 1;

  function updateMotion() {
    document.documentElement.classList.toggle("motion-paused", paused);
    toggle.textContent = paused ? "Play motion" : "Pause motion";
    toggle.setAttribute("aria-pressed", String(paused));
    if (paused) queue = [];
    else {
      if (firstReady) {
        for (let pack = 0; pack < packCount; pack++) loadPack(pack);
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
    const image = cache.get(index);
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

  function loadPack(pack) {
    if (!packPromises.has(pack)) {
      const url = `assets/packs/${variant}/${String(pack).padStart(2, "0")}.bin`;
      const promise = fetch(url, { priority: pack < 2 ? "high" : "low" })
        .then((response) => {
          if (!response.ok) throw new Error(`Unable to load ${url}`);
          return response.arrayBuffer();
        })
        .then((buffer) => {
          packs.set(pack, buffer);
          schedule();
          return buffer;
        })
        .catch(() => {
          failedPacks.add(pack);
          schedule();
          return null;
        });
      packPromises.set(pack, promise);
    }
    return packPromises.get(pack);
  }

  function frameBlob(index) {
    const pack = packs.get(Math.floor(index / packSize));
    const view = new DataView(pack);
    let offset = 0;
    for (let i = 0; i <= index % packSize; i++) {
      const length = view.getUint32(offset, true);
      offset += 4;
      if (i === index % packSize)
        return new Blob([pack.slice(offset, offset + length)], {
          type: "image/webp",
        });
      offset += length;
    }
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

  function decode(index) {
    if (failedPacks.has(Math.floor(index / packSize))) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = `assets/frames/${variant}/${String(index).padStart(3, "0")}.webp`;
      });
    }
    return imageFromBlob(frameBlob(index));
  }

  function pump() {
    if (paused || document.hidden || !firstReady) return;
    for (const index of queue) {
      if (loading.size >= maxWorkers) break;
      if (cache.has(index) || loading.has(index) || failedFrames.has(index))
        continue;
      const pack = Math.floor(index / packSize);
      if (!packs.has(pack) && !failedPacks.has(pack)) {
        loadPack(pack);
        continue;
      }
      loading.add(index);
      decode(index)
        .then((image) => {
          remember(index, image);
          if (!paused && index === target) draw(index);
        })
        .catch(() => failedFrames.add(index))
        .finally(() => {
          loading.delete(index);
          pump();
        });
    }
  }

  function update() {
    raf = 0;
    if (paused || document.hidden || !firstReady) return;
    const progress = Math.max(
      0,
      Math.min(1, (scrollY - storyTop) / scrollDistance),
    );
    const next = Math.round(progress * (frameCount - 1));
    const direction = next >= target ? 1 : -1;
    target = next;
    if (drawn !== target) draw(target);
    // The ten packed downloads start after the poster. Decode only frames near
    // the scroll position, so scrubbing does not wait for a new network request.
    const wanted = [target];
    if (progress > 0 && progress < 1) {
      for (let i = 1; i <= 12; i++) wanted.push(target + i * direction);
      for (let i = 1; i <= 6; i++) wanted.push(target - i * direction);
    }
    queue = wanted.filter(
      (index) =>
        index >= 0 &&
        index < frameCount &&
        !cache.has(index) &&
        !loading.has(index),
    );
    pump();
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
    if (!paused) {
      for (let pack = 0; pack < packCount; pack++) loadPack(pack);
    }
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
