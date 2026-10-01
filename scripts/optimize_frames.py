"""Generate responsive WebP frames from the original PNG sequence (requires Pillow)."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCES = sorted((ROOT / 'assets/images').glob('male*.png'))
SELECTED = SOURCES[::2]
if SELECTED[-1] != SOURCES[-1]:
    SELECTED.append(SOURCES[-1])

def convert(item):
    index, source = item
    with Image.open(source) as original:
        image = original.convert('RGBA')
        for name, width in [('mobile', 768), ('desktop', 1280)]:
            out = ROOT / 'assets/frames' / name
            out.mkdir(parents=True, exist_ok=True)
            resized = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
            resized.save(out / f'{index:03}.webp', quality=80, method=4, alpha_quality=90)

if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(convert, enumerate(SELECTED)))
    stats = {'original_frames': len(SOURCES), 'original_bytes': sum(p.stat().st_size for p in SOURCES), 'optimized_frames': len(SELECTED)}
    for name in ['mobile', 'desktop']:
        folder = ROOT / 'assets/frames' / name
        stats[name + '_bytes'] = sum(p.stat().st_size for p in folder.glob('*.webp'))
        stats[name + '_first_frame_bytes'] = (folder / '000.webp').stat().st_size
    (ROOT / 'scripts/frame-stats.json').write_text(json.dumps(stats, indent=2) + '\n')
    print(json.dumps(stats))
