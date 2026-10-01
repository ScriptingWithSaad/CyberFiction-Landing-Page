"""Build a tiny first-pass scrub sequence; full WebP packs sharpen it later."""
from io import BytesIO
from pathlib import Path
import base64
import json
import struct
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "preview" / "v2"
OUT.mkdir(parents=True, exist_ok=True)
PACK_SIZE = 51
FRAME_COUNT = 151
SEED_FRAMES = {25, 50, 75, 100, 125, 150}
seeds = []

for pack in range(3):
    data = bytearray()
    for preview_index in range(pack * PACK_SIZE, min((pack + 1) * PACK_SIZE, FRAME_COUNT)):
        source = ROOT / "assets" / "frames" / "desktop" / f"{preview_index:03}.webp"
        with Image.open(source) as image:
            image = image.convert("RGBA").resize((384, 216), Image.Resampling.LANCZOS)
            buffer = BytesIO()
            image.save(buffer, format="WEBP", quality=25, alpha_quality=55, method=6)
            frame = buffer.getvalue()
        data += struct.pack("<I", len(frame))
        data += frame
        if preview_index in SEED_FRAMES:
            seeds.append([preview_index, "data:image/webp;base64," + base64.b64encode(frame).decode("ascii")])
    (OUT / f"{pack:02}.bin").write_bytes(data)
    print(f"preview {pack:02}: {len(data)} bytes")

(ROOT / "assets" / "site" / "seed.v2.js").write_text(
    "window.CyberFictionSeeds=" + json.dumps(sorted(seeds), separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
