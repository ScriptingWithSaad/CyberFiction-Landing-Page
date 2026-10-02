"""Check all local HTML assets, frame variants, IDs and section anchors."""
from html.parser import HTMLParser
from pathlib import Path
import base64
import json
import re
import struct

ROOT = Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.links, self.assets = [], [], set()
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if 'href' in a:
            if a['href'].startswith('#'): self.links.append(a['href'][1:])
            elif tag == 'link': self.assets.add(a['href'])
        if 'src' in a: self.assets.add(a['src'])
        for attr in ['srcset', 'imagesrcset']:
            for entry in a.get(attr, '').split(','):
                if entry.strip(): self.assets.add(entry.strip().split()[0])

page = Page()
page.feed((ROOT / 'index.html').read_text(encoding='utf-8'))
assert len(page.ids) == len(set(page.ids)), 'Duplicate IDs'
assert all(target in page.ids for target in page.links), 'Broken section link'
assert all((ROOT / asset).is_file() for asset in page.assets), 'Missing HTML asset'
for variant in ['mobile', 'desktop']:
    for index in range(151):
        path = ROOT / f'assets/frames/{variant}/{index:03}.webp'
        assert path.is_file() and path.stat().st_size > 0, path
    for pack_index in range(10):
        pack = (ROOT / f'assets/packs/{variant}/{pack_index:02}.bin').read_bytes()
        offset = 0
        for index in range(pack_index * 16, min((pack_index + 1) * 16, 151)):
            length = struct.unpack_from('<I', pack, offset)[0]
            offset += 4
            frame = (ROOT / f'assets/frames/{variant}/{index:03}.webp').read_bytes()
            assert pack[offset:offset + length] == frame, f'Corrupt packed frame: {variant}/{index}'
            offset += length
        assert offset == len(pack), f'Unexpected bytes in {variant}/{pack_index:02}.bin'
for pack_index in range(3):
    pack = (ROOT / f'assets/preview/v2/{pack_index:02}.bin').read_bytes()
    offset = 0
    for index in range(pack_index * 51, min((pack_index + 1) * 51, 151)):
        length = struct.unpack_from('<I', pack, offset)[0]
        offset += 4
        frame = pack[offset:offset + length]
        assert frame[:4] == b'RIFF' and frame[8:12] == b'WEBP', f'Bad preview frame: {index}'
        offset += length
    assert offset == len(pack), f'Unexpected bytes in preview/v2/{pack_index:02}.bin'
seed_script = (ROOT / 'assets/site/seed.v2.js').read_text(encoding='utf-8')
assert seed_script.count('data:image/webp;base64,') == 6, 'Missing immediate seed frames'
hd_seeds = json.loads((ROOT / 'assets/site/seed.hd.v1.js').read_text(encoding='utf-8').split('=', 1)[1].strip().rstrip(';'))
assert len(hd_seeds) == 6, 'Missing HD keyframes'
for index, uri in hd_seeds:
    assert base64.b64decode(uri.split(',', 1)[1]) == (ROOT / f'assets/frames/desktop/{index:03}.webp').read_bytes(), 'HD keyframe differs from its full-size source'
html = (ROOT / 'index.html').read_text(encoding='utf-8')
assert 'assets/preview/' not in html and 'seed.v2.js' not in html, 'Low-resolution startup dependency'
script = (ROOT / 'script/script.js').read_text(encoding='utf-8')
assert 'const frameCount = 151;' in script
assert not re.search(r'https?://', (ROOT / 'index.html').read_text(encoding='utf-8').split('</head>')[0]), 'Unexpected external startup dependency'
print(f'PASS: {len(page.assets)} HTML assets, 302 frames, 20 full packs, 3 preview packs, unique IDs and section anchors.')
