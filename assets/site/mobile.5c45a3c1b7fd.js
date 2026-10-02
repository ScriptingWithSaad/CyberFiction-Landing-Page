(() => {
  "use strict";
  const media = matchMedia("(max-width: 1000px)");
  const root = document.documentElement;
  const story = document.querySelector("#story");
  const chapters = [...document.querySelectorAll(".chapter")];
  const stage = document.querySelector(".character-stage");
  const marquee = document.querySelector(".loop-text");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let current = -1;

  function configure() {
    root.classList.toggle("mobile-story", media.matches);
    current = -1;
    marquee.style.removeProperty("opacity");
    // Keep the marquee behind the portrait, just as on desktop.
    if (media.matches) stage.append(marquee);
    else chapters[0].append(marquee);
    for (const chapter of chapters) {
      chapter.inert = false;
      chapter.removeAttribute("aria-hidden");
      chapter.style.removeProperty("opacity");
      chapter.classList.remove("is-active");
      chapter.querySelectorAll(".chapter-copy").forEach(copy => {
        copy.removeAttribute("tabindex");
        copy.removeAttribute("role");
        copy.removeAttribute("aria-label");
      });
    }
    measure();
    update(progress());
  }

  function progress() {
    const top = story.getBoundingClientRect().top + scrollY;
    return Math.max(0, Math.min(1, (scrollY - top) / Math.max(1, story.offsetHeight - stage.offsetHeight)));
  }

  function measure() {
    if (!media.matches) return;
    const nav = document.querySelector(".nav").offsetHeight;
    const height = stage.offsetHeight;
    if (matchMedia("(min-width: 480px) and (max-height: 600px) and (orientation: landscape)").matches) {
      root.style.setProperty("--portrait-top", `${nav + 12}px`);
      root.style.setProperty("--portrait-bottom", "12px");
      chapters.forEach(chapter => chapter.querySelectorAll(".chapter-copy").forEach(copy => {
        if (copy.scrollHeight > copy.clientHeight) {
          copy.setAttribute("tabindex", "0");
          copy.setAttribute("role", "region");
          copy.setAttribute("aria-label", "Story text — scroll to continue reading");
        } else {
          copy.removeAttribute("tabindex");
          copy.removeAttribute("role");
          copy.removeAttribute("aria-label");
        }
      }));
      return;
    }
    chapters.forEach(chapter => chapter.querySelectorAll(".chapter-copy").forEach(copy => {
      copy.removeAttribute("tabindex");
      copy.removeAttribute("role");
      copy.removeAttribute("aria-label");
    }));
    // Measure the actual wrapped text, including translated paragraphs.
    // All chapters share these safe bands, so the portrait never jumps in size.
    let headingBottom = nav;
    let copyTop = height;
    for (const chapter of chapters) {
      const upper = chapter.querySelector(".chapter-heading") || chapter.querySelector(".chapter-copy.left");
      const lower = chapter.querySelector(".chapter-copy.right") || chapter.querySelector(".chapter-copy.left");
      const styles = getComputedStyle(upper);
      headingBottom = Math.max(headingBottom, parseFloat(styles.top) + upper.offsetHeight);
      copyTop = Math.min(copyTop, height - parseFloat(getComputedStyle(lower).bottom) - lower.offsetHeight);
    }
    root.style.setProperty("--portrait-top", `${Math.ceil(headingBottom + 14)}px`);
    root.style.setProperty("--portrait-bottom", `${Math.ceil(height - copyTop + 14)}px`);
    root.style.setProperty("--marquee-top", `${Math.ceil(headingBottom + 20)}px`);
  }

  function update(value) {
    if (!media.matches) return;
    // One viewport for the introduction, then two for each reading pause.
    // This retains the original six-viewport scrub distance on phones.
    const unit = value * 6;
    const index = unit < 1 ? 0 : unit < 3 ? 1 : unit < 5 ? 2 : 3;
    if (current !== index) {
      chapters.forEach((chapter, i) => {
        chapter.classList.toggle("is-active", i === index);
        chapter.inert = i !== index;
        chapter.setAttribute("aria-hidden", String(i !== index));
      });
      current = index;
    }
    const starts = [0, 1, 3, 5];
    const ends = [1, 3, 5, 6];
    const fade = reduced.matches ? 1 : Math.min(1,
      index === 0 ? 1 : (unit - starts[index]) / .12,
      index === 3 ? 1 : (ends[index] - unit) / .12);
    chapters[index].style.opacity = String(Math.max(0, fade));
    marquee.style.opacity = index === 0 ? String(Math.max(0, fade)) : "0";
  }

  function goToHash() {
    if (!media.matches) return;
    const index = chapters.findIndex(chapter => `#${chapter.id}` === location.hash);
    if (index < 0) return;
    const starts = [0, 1.15, 3.15, 5.15];
    const top = story.getBoundingClientRect().top + scrollY;
    window.scrollTo({ top: top + (story.offsetHeight - stage.offsetHeight) * starts[index] / 6, behavior: "auto" });
    update(progress());
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      if (!media.matches || !chapters.some(chapter => `#${chapter.id}` === link.getAttribute("href"))) return;
      event.preventDefault();
      history.pushState(null, "", link.getAttribute("href"));
      goToHash();
    });
  });
  media.addEventListener("change", configure);
  window.addEventListener("hashchange", goToHash);
  window.addEventListener("pageshow", goToHash);
  window.CyberFictionMobile = { measure, update };
  configure();
})();
