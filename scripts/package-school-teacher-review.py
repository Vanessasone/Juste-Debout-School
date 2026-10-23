#!/usr/bin/env python3
"""Apply verified teacher captions to a complete School release, preserving originals."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import tempfile
from zipfile import ZipFile, ZIP_DEFLATED
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def package(source, output):
    with ZipFile(source) as archive:
        files = {name: archive.read(name) for name in archive.namelist()}
    rows = json.loads((ROOT / 'website/assets/industry-formation/catalogue-v2.json').read_text())
    assert len(rows) == 19
    assert not any(row['id'] == 'meech' for row in rows), 'Withdrawn poster must remain excluded'
    resources = ['industry-gallery-v2.js', 'industry-gallery.css']
    repaired = []
    # Verify full posters and thumbnails, restoring incomplete derivatives from the original.
    for row in rows:
        for size in [480, 640, 1080]:
            name = f"assets/industry-formation/{row['id']}-{size}.webp"
            try:
                image = Image.open(io.BytesIO(files[name])); image.verify()
            except (KeyError, OSError, ValueError):
                image = Image.open(io.BytesIO(files[f"assets/industry-formation/{row['id']}.png"])).convert('RGB')
                image.thumbnail((size, size * 5 // 4), Image.Resampling.LANCZOS)
                buffer = io.BytesIO(); image.save(buffer, 'WEBP', quality=90 if size == 1080 else 84, method=6)
                files[name] = buffer.getvalue(); repaired.append(name)
                target = ROOT / 'website' / name
                target.parent.mkdir(parents=True, exist_ok=True)
                with tempfile.NamedTemporaryFile(delete=False) as ready:
                    ready.write(files[name]); temp_name = ready.name
                os.replace(temp_name, target)
            Image.open(io.BytesIO(files[name])).verify()
            if 'app/' + name in files:
                files['app/' + name] = files[name]
    for name in ['catalogue.json', 'catalogue-v2.json']:
        content = (ROOT / 'website/assets/industry-formation' / name).read_bytes()
        for prefix in ['', 'app/']:
            files[prefix + 'assets/industry-formation/' + name] = content
    for resource in resources:
        content = (ROOT / 'website/assets' / resource).read_bytes()
        for prefix in ['', 'app/']:
            files[prefix + 'assets/' + resource] = content
        digest = hashlib.sha256(content).hexdigest()[:10]
        for name in list(files):
            if name.endswith('.html'):
                html = files[name].decode()
                html = re.sub(r'(/(?:app/)?assets/' + re.escape(resource) + r')(?:\?v=[^"\s>]+)?', r'\1?v=' + digest, html)
                files[name] = html.encode()
                local = ROOT / 'website' / name
                if local.is_file():
                    local.write_text(html)
    with tempfile.TemporaryDirectory() as temp:
        ready = Path(temp) / 'release.zip'
        with ZipFile(ready, 'w', ZIP_DEFLATED) as archive:
            for name, content in files.items():
                archive.writestr(name, content)
        with ZipFile(ready) as archive:
            assert archive.testzip() is None
            for row in rows:
                for size in [480, 640, 1080]:
                    for prefix in ['', 'app/']:
                        Image.open(io.BytesIO(archive.read(f"{prefix}assets/industry-formation/{row['id']}-{size}.webp"))).verify()
        os.replace(ready, output)
    print(json.dumps({'files': len(files), 'repaired_derivatives': repaired}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_zip'); parser.add_argument('output_zip')
    args = parser.parse_args(); package(args.source_zip, args.output_zip)
