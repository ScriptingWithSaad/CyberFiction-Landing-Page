# CyberFiction

A responsive recreation of the CyberFiction scroll story, built with HTML, CSS and JavaScript.

[Live website](https://scriptingwithsaad.github.io/CyberFiction-Landing-Page/)

## Loading and animation

The original frame list began with an empty line, so its index-zero image never loaded. The page then waited on that image to trigger its initial canvas render. An eager, preloaded HTML poster now appears independently of JavaScript, and the canvas draws that same first frame as soon as it is decoded.

All screen sizes use native scrolling, a CSS sticky stage and compressed WebP frames. Scrolling and resting use the same full-detail images: 1280×720 on desktop and retina screens, and 768×432 on lower-density small screens. The tiny low-quality preview is no longer drawn. Six embedded full-resolution keyframes (388 KB) allow an early scroll to change the pose before the complete sequence arrives.

Ten HD packs download ahead of scrolling with at most three pack requests at a time, starting near the current position. The complete compressed sequence costs about 7.36 MB for desktop/retina or 3 MB for mobile. Only a nearby window is decoded, capped at 32 frames on desktop and 20 on small screens; evicted bitmaps are closed. The current frame is also requested immediately when its pack is still loading, with at most two such requests. There is no wait-for-scroll-to-stop timer and no switch from blurry to sharp images. During a cold download, the closest available sharp frame stays visible until the exact frame arrives. Resize changes invalidate older results so a late mobile download cannot replace an upgraded desktop frame. GSAP and ScrollTrigger are bundled locally, so startup needs no external CDN or font requests.

On desktop, the three story chapters pin for one additional viewport each, preserving the original six-viewport animation range. Up to 1000px wide, a single sticky reading surface preserves that same distance and changes chapters in place. Wrapped headings and English/Chinese copy are measured to reserve separate bands above and below the portrait; text never travels across the character during chapter transitions. Landscape phones use side columns, with keyboard-accessible scrolling for paragraphs that cannot fit in very short screens. Hash links, back to top and rotation work with the mobile chapters. Frames follow scrolling directly without a smoothing delay. A thin navigation progress line shows the journey through the story. Reduced-motion and data-saver preferences prevent sequence pack downloads by default, and a keyboard-accessible motion toggle pauses animation.

## Image sizes

- Original: 300 PNG files, 73,500,727 bytes.
- Desktop: 151 WebP frames, 7,363,456 bytes (about 90% smaller); the compressed sequence is prefetched for continuous sharp scrubbing.
- Mobile variants: 3,004,686 bytes; the compressed sequence is prefetched for continuous sharp scrubbing.
- Legacy preview: 510,668 bytes; retained for cached older HTML, no longer requested by the current page.
- First frame: 53,650 bytes desktop / 22,136 bytes mobile.

These are file-size comparisons, not network speed or Lighthouse scores. Original PNGs remain available as editing sources. Smaller displays may receive the larger responsive poster on high-density screens.

## Development

Run `python -m http.server 8767` from this directory.

After CSS or JavaScript changes, run `python scripts/build_assets.py`. Commit the updated HTML and generated `assets/site` files together; content hashes prevent stale CSS/JavaScript combinations. Keep previous generated assets available for cached HTML.

To regenerate image variants, install Pillow and run `python scripts/optimize_frames.py`, followed by `python scripts/build_preview.py`. Rebuild HD packs with `python scripts/build_packs.py` and the immediate sharp keyframes with `python scripts/build_hd_seeds.py`. Legacy preview assets remain available for cached older versions.

## Checks

```sh
node --test tests/sequence.test.cjs
node --check script/script.js
node --check script/mobile-layout.js
python scripts/verify_assets.py
```

Tests cover sharp first-load and cached-image rendering, consistent full-resolution scrolling, bounded prefetch and decoded memory, fast jumps and reverse scrolling, viewport upgrades, corrupt packs, image-decoder fallback, original pinned pacing, pause, return to top, and mobile/reduced-motion/data-saver behavior. The asset verifier checks every full-size packed frame against its WebP source and validates the preview packs. Browser checks cover the initial unscrolled page, animation progress, responsive layouts and navigation.

`tests/responsive.browser.js` is a Playwright page function (run through the browser tool with the local server started). It checks 13 phone/tablet viewports at 143 scroll positions, text/portrait overlap, overflow, readable copy, six-viewport pacing, deep links, pause/resume, footer navigation, rotation, reduced motion and a retina touch viewport. It also checks that short landscape paragraphs can be scrolled to their end.
