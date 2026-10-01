# CyberFiction

A responsive recreation of the CyberFiction scroll story, built with HTML, CSS and JavaScript.

[Live website](https://scriptingwithsaad.github.io/CyberFiction-Landing-Page/)

## Loading and animation

The original frame list began with an empty line, so its index-zero image never loaded. The page then waited on that image to trigger its initial canvas render. An eager, preloaded HTML poster now appears independently of JavaScript, and the canvas draws that same first frame as soon as it is decoded.

All screen sizes use native scrolling, a CSS sticky stage and compressed WebP frames. Six small seed frames (about 27 KB) arrive with JavaScript, so even a first scroll before the preview downloads changes the character. A 511 KB preview sequence in three packs then supplies all 151 frames for continuous scrubbing. When scrolling settles, only the current full-size frame is requested; this avoids competing with the preview for bandwidth. Up to 12 full-size frames remain decoded for revisits. The previous good frame remains visible if a requested frame has not arrived yet. There are no third-party runtime, font or scrolling-library requests.

At widths up to 900px, scrolling scrubs through the smaller mobile WebP sequence. The chapter text stays on alternating left and right sides, with narrow screens using top and bottom positions to leave room for the character. Reduced-motion and data-saver preferences prevent sequence downloads by default. A keyboard-accessible motion toggle pauses animation.

## Image sizes

- Original: 300 PNG files, 73,500,727 bytes.
- Desktop: 151 WebP frames, 7,363,456 bytes (about 90% smaller); only the needed full-size frames are downloaded.
- Mobile variants: 3,004,686 bytes; only the needed full-size frames are downloaded.
- First-pass preview: 510,668 bytes across three packs, shared by desktop and mobile.
- First frame: 53,650 bytes desktop / 22,136 bytes mobile.

These are file-size comparisons, not network speed or Lighthouse scores. Original PNGs remain available as editing sources. Smaller displays may receive the larger responsive poster on high-density screens.

## Development

Run `python -m http.server 8767` from this directory.

After CSS or JavaScript changes, run `python scripts/build_assets.py`. Commit the updated HTML and generated `assets/site` files together; content hashes prevent stale CSS/JavaScript combinations. Keep previous generated assets available for cached HTML.

To regenerate image variants, install Pillow and run `python scripts/optimize_frames.py`, followed by `python scripts/build_preview.py`. The retained full-size packs can be rebuilt with `python scripts/build_packs.py` if needed for other uses; the page does not download them.

## Checks

```sh
node --test tests/sequence.test.cjs
node --check script/script.js
python scripts/verify_assets.py
```

Tests cover first-load and cached-image rendering, preview-first loading, fast scrolling, pause, return to top, and mobile/reduced-motion/data-saver behavior. The asset verifier checks every full-size packed frame against its WebP source and validates the preview packs. Browser checks cover the initial unscrolled page, animation progress, responsive layouts and navigation.
