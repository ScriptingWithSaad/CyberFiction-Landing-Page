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
  const cacheLimit = compact.matches ? 12 : 18;
  const variant = compact.matches ? "mobile" : "desktop";
  const cache = new Map();
  const loading = new Set();
  const attempts = new Map();
  const maxWorkers = 3;
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
    else schedule();
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
      cache.delete(oldest);
    }
  }

  function draw(index) {
    const image = cache.get(index);
    if (!image?.naturalWidth || !image.naturalHeight) return false;
    const scale = (compact.matches ? Math.max : Math.min)(
      canvas.width / image.naturalWidth,
      canvas.height / image.naturalHeight,
    );
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
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

  function pump() {
    if (paused || document.hidden || !firstReady) return;
    while (loading.size < maxWorkers && queue.length) {
      const index = queue.shift();
      if (
        cache.has(index) ||
        loading.has(index) ||
        (attempts.get(index) || 0) >= 2
      )
        continue;
      loading.add(index);
      attempts.set(index, (attempts.get(index) || 0) + 1);
      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = index === target ? "high" : "low";
      let settled = false;
      const finish = (success) => {
        if (settled) return;
        settled = true;
        loading.delete(index);
        if (success) {
          attempts.delete(index);
          remember(index, image);
          if (!paused && index === target) draw(index);
        }
        pump();
      };
      image.onload = () => {
        if (image.decode)
          image.decode().then(
            () => finish(true),
            () => finish(image.naturalWidth > 0),
          );
        else finish(true);
      };
      image.onerror = () => finish(false);
      image.src = `assets/frames/${variant}/${String(index).padStart(3, "0")}.webp`;
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
    // Load only the poster at the top. Prioritize the current frame and a
    // small look-ahead window as the visitor moves through the story.
    const wanted = [target];
    if (progress > 0 && progress < 1) {
      for (let i = 1; i <= 6; i++) wanted.push(target + i * direction);
      for (let i = 1; i <= 2; i++) wanted.push(target - i * direction);
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
