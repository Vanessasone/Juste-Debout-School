#!/usr/bin/env python3
"""Overlay confirmed CORE formation photos on the complete admissions-ready site ZIP."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
ROOT=Path(__file__).resolve().parents[1]

def package(source,output):
    cat=json.loads((ROOT/'website/assets/core-formation/catalogue.json').read_text())
    assert cat['identity_mapping_confirmed'], 'Confirm the names of Ness, Ricky Soul and Krissy from the numbered sheet first.'
    mapped={p['id']:p for p in cat['photos'] if p['role']=='formation'}
    selected=cat['featured_photo_ids']
    assert len(selected)==3 and len(set(selected))==3
    assert [mapped[key]['teacher'] for key in selected]==['Ness','Ricky Soul','Krissy']
    with ZipFile(source) as z:
        assert z.testzip() is None
        original={n:z.read(n) for n in z.namelist()}
    assert len(original)>400 and 'documents.html' in original and 'app/tasks.html' in original, 'Use the complete admissions/documents-ready archive.'
    files=dict(original)
    paths=['core-formation.html','assets/core-pro-gallery.js','assets/core-pro-gallery.css']
    paths += ['assets/core-formation/catalogue.json']
    paths += [v['src'].lstrip('/') for photo in cat['photos']+cat['album_photos'] for v in photo['variants'].values()]
    for name in paths:files[name]=(ROOT/'website'/name).read_bytes()
    html=files['index.html'].decode()
    version=hashlib.sha256(files['assets/core-pro-gallery.js']).hexdigest()[:12]
    css_version=hashlib.sha256(files['assets/core-pro-gallery.css']).hexdigest()[:12]
    if '/assets/core-pro-gallery.js' not in html:
        tag=f'<link rel="stylesheet" href="/assets/core-pro-gallery.css"><script src="/assets/core-pro-gallery.js?v={version}" defer></script>'
        assert html.count('</head>')==1
        html=html.replace('</head>',tag+'</head>')
    html=re.sub(r'/assets/core-pro-gallery\.js(?:\?v=[a-f0-9]+)?',f'/assets/core-pro-gallery.js?v={version}',html)
    html=re.sub(r'/assets/core-pro-gallery\.css(?:\?v=[a-f0-9]+)?',f'/assets/core-pro-gallery.css?v={css_version}',html)
    files['index.html']=html.encode()
    for name,data in original.items():
        if name not in {'index.html',*paths}:assert files[name]==data,name
    with ZipFile(output,'w',ZIP_DEFLATED) as z:
        for name,data in files.items():z.writestr(name,data)
    with ZipFile(output) as z:assert z.testzip() is None
    print(f'{len(files)} files; 22 CORE teacher cards and an optional course album; original homepage photographs preserved; all app, INDUSTRY, document and other media bytes preserved.')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('source');parser.add_argument('output');args=parser.parse_args();package(args.source,args.output)
