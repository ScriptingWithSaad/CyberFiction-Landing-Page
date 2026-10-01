# CyberFiction

A responsive recreation of the CyberFiction scroll story, built with HTML, CSS and JavaScript.

[Live website](https://scriptingwithsaad.github.io/CyberFiction-Landing-Page/)

## Loading and animation

The original frame list began with an empty line, so its index-zero image never loaded. The page then waited on that image to trigger its initial canvas render. An eager, preloaded HTML poster now appears independently of JavaScript, and the canvas draws that same first frame as soon as it is decoded.

Desktop uses native scrolling, a CSS sticky stage and a bounded image queue. It requests at most three frames concurrently, prioritizes the current position, retains the previous good frame while a replacement loads, and keeps at most 18 decoded images. It does not eagerly download all 300 originals. There are no third-party runtime, font or scrolling-library requests.

At widths up to 900px, four lightweight character images sit with their corresponding content in normal document flow. The desktop sequence is not requested on mobile/tablet. Reduced-motion and data-saver preferences also prevent sequence downloads by default. A keyboard-accessible motion toggle pauses animation.

## Image sizes

- Original: 300 PNG files, 73,500,727 bytes.
- Desktop: 151 WebP frames, 7,363,456 bytes (about 90% smaller).
- Mobile variants: 3,004,686 bytes in total; the page uses only four static frames.
- First frame: 53,650 bytes desktop / 22,136 bytes mobile.

These are file-size comparisons, not network speed or Lighthouse scores. Original PNGs remain available as editing sources. Smaller displays may receive the larger responsive poster on high-density screens.

## Development

Run `python -m http.server 8767` from this directory.

After CSS or JavaScript changes, run `python scripts/build_assets.py`. Commit the updated HTML and generated `assets/site` files together; content hashes prevent stale CSS/JavaScript combinations. Keep previous generated assets available for cached HTML.

To regenerate image variants, install Pillow and run `python scripts/optimize_frames.py`.

## Checks

```sh
node --test tests/sequence.test.cjs
node --check script/script.js
python scripts/verify_assets.py
```

Tests cover first-load and cached-image rendering, bounded downloads, failed frames, fast scrolling, pause, return to top, and mobile/reduced-motion/data-saver loading behavior. Browser checks cover the initial unscrolled page, animation progress, responsive layouts and navigation.
