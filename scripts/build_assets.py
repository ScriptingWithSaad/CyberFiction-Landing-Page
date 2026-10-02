"""Run after CSS/JS edits; commit index.html and assets/site together."""
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/site'


def build():
    OUT.mkdir(exist_ok=True)
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    for source, name, extension, pattern in [
        ('stylesheets/style.css', 'style', 'css', r'(?:stylesheets/style\.css|assets/site/style\.[a-f0-9]+\.css)'),
        ('script/script.js', 'app', 'js', r'(?:script/script\.js|assets/site/app\.[a-f0-9]+\.js)'),
        ('script/mobile-layout.js', 'mobile', 'js', r'(?:script/mobile-layout\.js|assets/site/mobile\.[a-f0-9]+\.js)'),
    ]:
        content = (ROOT / source).read_text(encoding='utf-8-sig').replace('\r\n', '\n')
        digest = hashlib.sha256(content.encode('utf-8')).hexdigest()[:12]
        filename = f'{name}.{digest}.{extension}'
        (OUT / filename).write_text(content, encoding='utf-8', newline='\n')
        html, count = re.subn(pattern, f'assets/site/{filename}', html)
        if count != 1:
            raise RuntimeError(f'Expected exactly one local {extension} reference, found {count}')
        print(filename)
    (ROOT / 'index.html').write_text(html, encoding='utf-8', newline='\n')


if __name__ == '__main__':
    build()
