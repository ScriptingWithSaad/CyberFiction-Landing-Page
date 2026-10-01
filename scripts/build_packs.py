"""Bundle WebP frames into small, independently fetchable scroll sections."""
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[1]
FRAME_COUNT = 151
PACK_SIZE = 16

for variant in ("mobile", "desktop"):
    target = ROOT / "assets" / "packs" / variant
    target.mkdir(parents=True, exist_ok=True)
    for first in range(0, FRAME_COUNT, PACK_SIZE):
        data = bytearray()
        for index in range(first, min(first + PACK_SIZE, FRAME_COUNT)):
            frame = (ROOT / "assets" / "frames" / variant / f"{index:03}.webp").read_bytes()
            data += struct.pack("<I", len(frame))
            data += frame
        (target / f"{first // PACK_SIZE:02}.bin").write_bytes(data)
    print(f"{variant}: {(FRAME_COUNT + PACK_SIZE - 1) // PACK_SIZE} packs")
