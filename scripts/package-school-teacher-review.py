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


def package(source, output, sync_local_html=False, media_archive=None):
    with ZipFile(source) as archive:
        files = {name: archive.read(name) for name in archive.namelist()}
    rows = json.loads((ROOT / 'website/assets/industry-formation/catalogue-v2.json').read_text())
    assert len(rows) == 19
    assert not any(row['id'] == 'meech' for row in rows), 'Withdrawn poster must remain excluded'
    prefixes = ['', 'app/'] if 'app/index.html' in files else ['']
    restored = []
    if media_archive:
        # Historical Netlify ZIPs can omit media. Restore only the reviewed public posters.
        with ZipFile(media_archive) as media:
            for row in rows:
                for suffix in ['.png', '-480.webp', '-640.webp', '-1080.webp']:
                    name = f"assets/industry-formation/{row['id']}{suffix}"
                    if not files.get(name):
                        data = media.read(name)
                        Image.open(io.BytesIO(data)).verify()
                        files[name] = data
                        restored.append(name)
    resources = ['industry-gallery-v2.js', 'industry-gallery.css']
    repaired = []
    # Verify full posters and thumbnails, restoring incomplete derivatives from the original.
    for row in rows:
        sizes = [640, 1080]
        if f"assets/industry-formation/{row['id']}-480.webp" in files:
            sizes.insert(0, 480)
        for size in sizes:
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
        for prefix in prefixes:
            files[prefix + 'assets/industry-formation/' + name] = content
    for resource in resources:
        content = (ROOT / 'website/assets' / resource).read_bytes()
        for prefix in prefixes:
            files[prefix + 'assets/' + resource] = content
        digest = hashlib.sha256(content).hexdigest()[:10]
        for name in list(files):
            if name.endswith('.html'):
                html = files[name].decode()
                html = re.sub(r'(/(?:app/)?assets/' + re.escape(resource) + r')(?:\?v=[^"\s>]+)?', r'\1?v=' + digest, html)
                files[name] = html.encode()
                local = ROOT / 'website' / name
                if sync_local_html and local.is_file():
                    local.write_text(html)
    with tempfile.TemporaryDirectory() as temp:
        ready = Path(temp) / 'release.zip'
        with ZipFile(ready, 'w', ZIP_DEFLATED) as archive:
            for name, content in files.items():
                archive.writestr(name, content)
        with ZipFile(ready) as archive:
            assert archive.testzip() is None
            for row in rows:
                for field in ['image', 'thumbnail']:
                    for prefix in prefixes:
                        Image.open(io.BytesIO(archive.read(prefix + row[field].lstrip('/')))).verify()
        os.replace(ready, output)
    print(json.dumps({'files': len(files), 'repaired_derivatives': repaired, 'restored_media': len(restored)}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_zip'); parser.add_argument('output_zip')
    parser.add_argument('--sync-local-html', action='store_true', help='Also update matching HTML sources; omit for a historical application release.')
    parser.add_argument('--media-archive', help='Verified complete School release supplying missing public posters.')
    args = parser.parse_args(); package(args.source_zip, args.output_zip, args.sync_local_html, args.media_archive)
