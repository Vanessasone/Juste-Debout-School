#!/usr/bin/env python3
"""Patch the complete School Netlify ZIP without rebuilding or changing /app.

Requires Pillow and ffmpeg. Produces responsive WebP posters, streamable H.264,
and a native autoplay hero. Existing application entries are preserved, except
shared INDUSTRY thumbnails/gallery behavior. Re-running uses the same media cache.
"""
import argparse
import hashlib
import io
import json
import re
import subprocess
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]

def webp(data, size, quality):
    image = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert('RGB')
    image.thumbnail(size, Image.Resampling.LANCZOS)
    output = io.BytesIO()
    image.save(output, 'WEBP', quality=quality, method=6)
    return output.getvalue()

def replace_once(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f'Unexpected public bundle: expected one {old[:70]!r}, found {text.count(old)}')
    return text.replace(old, new, 1)

def optimize(input_zip, output_zip, cache):
    cache = Path(cache)
    cache.mkdir(parents=True, exist_ok=True)
    with ZipFile(input_zip) as source:
        files = {i.filename: source.read(i) for i in source.infolist() if not i.is_dir()}
    report = {'core_thumbnails': {}, 'industry_thumbnails': {}, 'videos': {}}
    original_files = dict(files)
    for name, data in original_files.items():
        if re.fullmatch(r'assets/core-open/[^/]+\.jpg', name):
            stem = name[:-4]
            files[stem+'-480.webp'] = webp(data, (480, 600), 79)
            files[stem+'-960.webp'] = webp(data, (960, 1200), 87)
            report['core_thumbnails'][name] = [len(data), len(files[stem+'-480.webp'])]

    for name, data in original_files.items():
        if name.startswith(('assets/industry-formation/', 'app/assets/industry-formation/')) and name.endswith('catalogue-v2.json'):
            people = json.loads(data)
            prefix = '/app' if name.startswith('app/') else ''
            for person in people:
                original = f'{prefix}/assets/industry-formation/{person["id"]}.png'
                thumbnail = f'{prefix}/assets/industry-formation/{person["id"]}-480.webp'
                files[thumbnail.lstrip('/')] = webp(files[original.lstrip('/')], (480, 600), 78)
                old = files.get(person['thumbnail'].lstrip('/'), b'')
                person['thumbnail'] = thumbnail
                report['industry_thumbnails'][thumbnail] = [len(old), len(files[thumbnail.lstrip('/')])]
            files[name] = json.dumps(people, ensure_ascii=False, indent=2).encode()

    for old in ['community.jpg', 'teacher.png']:
        name = 'assets/brand/'+old
        if name in files:
            files[name.rsplit('.', 1)[0]+'.webp'] = webp(files[name], (1280, 1280), 80)

    for kind in ['desktop', 'mobile']:
        old_name = 'school-brand-v5'+('-mobile' if kind == 'mobile' else '')
        source_name = 'assets/world/'+old_name+'.mp4'
        target_name = f'assets/world/school-brand-v6-{kind}.mp4'
        digest = hashlib.sha256(files[source_name]).hexdigest()[:12]
        original = cache/(old_name+'.mp4')
        target = cache/f'{digest}-{kind}.mp4'
        original.write_bytes(files[source_name])
        if not target.exists():
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(original), '-an', '-vf',
                            'scale=406:-2' if kind == 'mobile' else 'scale=960:-2',
                            '-c:v', 'libx264', '-preset', 'medium', '-crf', '29', '-pix_fmt', 'yuv420p',
                            '-movflags', '+faststart', '-threads', '2', str(target)], check=True)
        files[target_name] = target.read_bytes()
        report['videos'][kind] = [len(files[source_name]), len(files[target_name])]
        poster_name = 'assets/world/'+old_name+'-poster.png'
        files[f'assets/world/school-brand-v6-{kind}-poster.webp'] = webp(files[poster_name], (960, 960), 82)

    index = files['index.html'].decode()
    bundle_name = re.search(r'src="(/assets/public-site-[^"/]+\.js)"', index).group(1).lstrip('/')
    bundle = files[bundle_name].decode()
    start = bundle.index('function rt({scenes:e,connectors:t,theme:n,className:r,onActiveSectionChange:i})')
    end = bundle.index('var it={background:', start)
    factory = (ROOT/'website/runtime/school-hero.js').read_text()
    bundle = bundle[:start] + factory + '\nvar rt=createSchoolHero(_,k.jsx,k.jsxs);' + bundle[end:]
    bundle = replace_once(bundle, 'scenes:y,theme:it,className:`school-film`', 'scenes:y,theme:it,className:`school-film`,locale:a')
    nav = 'children:[[`ecoles`,s.schools],[`planning`,s.classes],[`formation`,s.training],[`studios`,s.studios]].map(([e,t])=>(0,k.jsx)(`a`,{href:`#`+e,onClick:()=>l(!1),children:t},e))'
    new_nav = 'children:[[`#ecoles`,s.schools],[`#planning`,s.classes],[`#formation`,s.training],[`#studios`,s.studios],[`/app/login`,s.account]].map(([e,t])=>(0,k.jsx)(`a`,{href:e,className:e===`/app/login`?`nav-account`:void 0,onClick:()=>l(!1),children:t},e))'
    bundle = replace_once(bundle, nav, new_nav)
    for var in ['e', 'c']:
        old = '`/assets/core-open/`+'+var+'.poster'
        replacement = old+'.replace(/\\.jpg$/,`-960.webp`)'
        # One shared course list, one teacher profile, and one carousel image.
        bundle = bundle.replace(old, replacement)
    orbit = 'src:`/assets/core-open/`+e.poster.replace(/\\.jpg$/,`-960.webp`),alt:e.teacher+` · `+e.style,loading:`lazy`,width:`400`,height:`500`,draggable:`false`'
    fast_orbit = 'src:s?`/assets/core-open/`+e.poster.replace(/\\.jpg$/,`-480.webp`):void 0,alt:e.teacher+` · `+e.style,loading:`lazy`,decoding:`async`,width:`400`,height:`500`,draggable:`false`'
    bundle = replace_once(bundle, orbit, fast_orbit)
    for old in ['community.jpg', 'teacher.png']:
        bundle = bundle.replace('/assets/brand/'+old, '/assets/brand/'+old.rsplit('.', 1)[0]+'.webp')
    for kind in ['desktop', 'mobile']:
        old_name = 'school-brand-v5'+('-mobile' if kind == 'mobile' else '')
        bundle = bundle.replace('/assets/world/'+old_name+'.mp4', f'/assets/world/school-brand-v6-{kind}.mp4')
        bundle = bundle.replace('/assets/world/'+old_name+'-poster.png', f'/assets/world/school-brand-v6-{kind}-poster.webp')
    new_bundle = 'assets/public-site-'+hashlib.sha256(bundle.encode()).hexdigest()[:12]+'.js'
    files[new_bundle] = bundle.encode()
    files['assets/school-mobile.css'] = (ROOT/'website/assets/school-mobile.css').read_bytes()
    gallery = (ROOT/'website/assets/industry-gallery-v2.js').read_text()
    files['assets/industry-gallery-v2.js'] = gallery.encode()
    files['app/assets/industry-gallery-v2.js'] = re.sub(r'([\"\'`])(/(?:assets/|industry-formation))', r'\1/app\2', gallery).encode()
    for name, data in list(files.items()):
        if not name.endswith('.html') or name.startswith('app/'):
            continue
        text = data.decode().replace('/'+bundle_name, '/'+new_bundle)
        if name == 'index.html':
            links = '<link rel="stylesheet" href="/assets/school-mobile.css">'
            for kind, media in [('mobile', '(max-width: 860px)'), ('desktop', '(min-width: 861px)')]:
                links += f'<link rel="preload" as="image" type="image/webp" media="{media}" href="/assets/world/school-brand-v6-{kind}-poster.webp" fetchpriority="high">'
            text = text.replace('</head>', links+'</head>')
        files[name] = text.encode()
    with ZipFile(output_zip, 'w', ZIP_DEFLATED) as out:
        for name, data in sorted(files.items()):
            out.writestr(name, data)
    print(json.dumps({'bundle': new_bundle, 'report': report}, ensure_ascii=False))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input_zip')
    parser.add_argument('output_zip')
    parser.add_argument('--cache', required=True)
    args = parser.parse_args()
    optimize(args.input_zip, args.output_zip, args.cache)
