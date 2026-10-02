"""Embed sharp first-scroll keyframes; no low-resolution images enter the canvas."""
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
indices = [25, 50, 75, 100, 125, 150]
frames = [[index, 'data:image/webp;base64,' + base64.b64encode(
    (ROOT / f'assets/frames/desktop/{index:03}.webp').read_bytes()).decode('ascii')]
    for index in indices]
out = ROOT / 'assets/site/seed.hd.v1.js'
out.write_text('window.CyberFictionHDSeeds=' + json.dumps(frames, separators=(',', ':')) + ';\n', encoding='utf-8')
print(f'HD keyframes: {out.stat().st_size:,} bytes')
