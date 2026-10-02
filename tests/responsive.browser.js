async (page) => {
  const base = "http://127.0.0.1:8767/";
  const failures = [];
  const errors = [];
  const samples = [];
  page.on("pageerror", error => errors.push(error.message));
  const devices = [[320,568], [360,640], [375,667], [390,844], [412,915],
    [430,932], [540,360], [568,320], [667,375], [844,390], [768,1024], [820,1180], [1000,600]];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  for (const [width, height] of devices) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}?responsive=${width}x${height}`);
    await page.waitForLoadState("networkidle");
    for (const unit of [0, .5, .94, 1.16, 2, 2.94, 3.16, 4, 4.94, 5.16, 6]) {
      await page.evaluate(u => scrollTo(0, document.querySelector(".character-stage").offsetHeight * u), unit);
      await page.waitForTimeout(70);
      const result = await page.evaluate(() => {
        const active = document.querySelector(".chapter.is-active");
        const portrait = document.querySelector(".character").getBoundingClientRect();
        const nav = document.querySelector(".nav").getBoundingClientRect();
        const intersect = r => r.right > portrait.left + 1 && r.left < portrait.right - 1 && r.bottom > portrait.top + 1 && r.top < portrait.bottom - 1;
        const copy = [...active.querySelectorAll(".chapter-heading, .chapter-copy")].map(element => {
          const r = element.getBoundingClientRect();
          return { overlap: intersect(r), clipped: r.top < nav.bottom - 1 || r.bottom > innerHeight + 1 || r.left < -1 || r.right > document.documentElement.clientWidth + 1,
            font: parseFloat(getComputedStyle(element).fontSize), scrollable: element.scrollHeight > element.clientHeight };
        });
        const button = document.querySelector("#motion-toggle").getBoundingClientRect();
        return { chapter: active.id, height: portrait.height, copy, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          navFits: button.right <= document.documentElement.clientWidth && button.height >= 44,
          sourceWidth: Number(document.querySelector("#sequence").dataset.sourceWidth),
          activeCount: document.querySelectorAll(".is-active").length,
          distance: (document.querySelector("#story").offsetHeight - document.querySelector(".character-stage").offsetHeight) / document.querySelector(".character-stage").offsetHeight };
      });
      samples.push({ width, height, unit, ...result });
      const tag = `${width}x${height}, scroll ${unit}`;
      check(!result.overflow, `${tag}: horizontal overflow`);
      check(result.navFits, `${tag}: navigation clipped or button too small`);
      check(result.height >= 100, `${tag}: portrait too short`);
      check(result.sourceWidth >= 768, `${tag}: low-quality frame`);
      check(result.activeCount === 1, `${tag}: ambiguous active chapter`);
      check(Math.abs(result.distance - 6) < .01, `${tag}: original reading distance lost`);
      const expected = unit < 1 ? "intro" : unit < 3 ? "together" : unit < 5 ? "fun" : "playground";
      check(result.chapter === expected, `${tag}: wrong chapter`);
      result.copy.forEach(c => {
        check(!c.overlap, `${tag}: text overlaps portrait`);
        check(!c.clipped, `${tag}: text clipped by viewport/header`);
        check(c.font >= 11, `${tag}: unreadable font size`);
      });
    }
    // In the shortest landscape screen, every paragraph remains reachable.
    const reachesEnd = await page.evaluate(() => [...document.querySelectorAll(".is-active .chapter-copy")].every(copy => {
      copy.scrollTop = copy.scrollHeight;
      return Math.abs(copy.scrollTop + copy.clientHeight - copy.scrollHeight) <= 1;
    }));
    check(reachesEnd, `${width}x${height}: last paragraph cannot be read`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}?navigation=1#fun`);
  await page.waitForLoadState("networkidle");
  check(await page.locator(".is-active").getAttribute("id") === "fun", "deep link selects wrong mobile chapter");
  await page.locator(".nav .brand").click();
  check(await page.evaluate(() => scrollY) === 0, "home does not return to top");
  await page.locator(".scroll-link").click();
  check(await page.locator(".is-active").getAttribute("id") === "together", "Scroll to read link fails");
  await page.screenshot({ path: "outputs/cyber-mobile-390.png" });
  await page.locator("#motion-toggle").click();
  const held = await page.locator("#sequence").getAttribute("data-frame");
  await page.evaluate(() => scrollTo(0, innerHeight * 4));
  await page.waitForTimeout(150);
  check(await page.locator("#sequence").getAttribute("data-frame") === held, "pause fails");
  await page.locator("#motion-toggle").click();
  await page.waitForTimeout(150);
  check(await page.locator("#sequence").getAttribute("data-frame") !== held, "resume fails");
  await page.locator(".footer").scrollIntoViewIfNeeded();
  await page.locator(".footer > a").last().click();
  check(await page.evaluate(() => scrollY) === 0, "footer back to top fails");

  // Rotate without navigation, then cross the desktop breakpoint and return.
  for (const [width, height] of [[844,390], [1280,720], [390,844]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    check(await page.locator(".pin-spacer").count() === (width > 1000 ? 3 : 0), `${width}: old pins survive breakpoint change`);
    if (width > 1000) check(await page.locator(".loop-text").evaluate(e => getComputedStyle(e).opacity) === "1", "desktop marquee stays hidden after rotation");
  }
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto(`${base}?landscape=final#playground`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "outputs/cyber-mobile-landscape.png" });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}?reduced=1#playground`);
  await page.waitForLoadState("networkidle");
  check(await page.locator("#motion-toggle").getAttribute("aria-pressed") === "true", "reduced motion is not paused");
  check(await page.locator(".is-active").getAttribute("id") === "playground", "reduced-motion chapters inaccessible");
  check(await page.locator(".is-active").evaluate(e => getComputedStyle(e).opacity) === "1", "reduced-motion text is faded");
  await page.emulateMedia({ reducedMotion: "no-preference" });

  const retinaContext = await page.context().browser().newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const phone = await retinaContext.newPage();
  await phone.goto(`${base}?retina=1`);
  await phone.waitForLoadState("networkidle");
  await phone.locator(".scroll-link").tap();
  await phone.waitForTimeout(150);
  check(await phone.locator("#sequence").getAttribute("data-source-width") === "1280", "retina phone loses HD detail");
  check(await phone.locator(".is-active").getAttribute("id") === "together", "touch navigation fails");
  await phone.screenshot({ path: "outputs/cyber-mobile-retina.png", scale: "css" });
  await retinaContext.close();
  check(errors.length === 0, `JavaScript errors: ${errors.join(", ")}`);
  if (failures.length) throw new Error(failures.join("\n"));
  return { passed: true, viewportCount: devices.length, scrollPositions: samples.length, navigation: true, rotation: true, reducedMotion: true, retinaTouch: true, errors };
}
