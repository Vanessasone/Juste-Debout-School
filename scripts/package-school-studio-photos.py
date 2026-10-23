#!/usr/bin/env python3
"""Add the three user-supplied studio views to a complete production site ZIP."""
import argparse
import hashlib
import os
from pathlib import Path
import re
import tempfile
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
PHOTOS = [
 ('parquet', 'Parquet et lumière', 'Parquet and light', 'Studio de danse avec parquet, logo mural et fenêtres', 'Dance studio with wooden floor, wall logo and windows'),
 ('miroirs', 'Miroirs et espace', 'Mirrors and space', 'Studio de danse avec miroir mural et parquet', 'Dance studio with wall mirror and wooden floor'),
 ('lumiere', 'Place au mouvement', 'Room to move', 'Vue d’un studio de danse lumineux avec miroirs', 'A bright dance studio with mirrors'),
]

def gallery():
    cards = []
    for name, fr, en, alt_fr, alt_en in PHOTOS:
        url = '/assets/studios/school-studio-' + name + '.jpg'
        cards.append('(0,k.jsxs)(`figure`,{children:[(0,k.jsx)(`a`,{href:`'+url+'`,target:`_blank`,rel:`noopener noreferrer`,"aria-label":a===`fr`?`Ouvrir la photo : '+fr+'`:`Open photo: '+en+'`,children:(0,k.jsx)(`img`,{src:`'+url+'`,alt:a===`fr`?`'+alt_fr+'`:`'+alt_en+'`,width:640,height:480,loading:`lazy`,decoding:`async`})}),(0,k.jsxs)(`figcaption`,{children:[(0,k.jsx)(`span`,{children:a===`fr`?`'+fr+'`:`'+en+'`}),(0,k.jsx)(`span`,{"aria-hidden":`true`,children:`↗`})]})]})')
    return '(0,k.jsxs)(`section`,{className:`school-studio-gallery`,id:`studios`,children:[(0,k.jsx)(`h2`,{children:a===`fr`?`CORE · Les studios en images.`:`CORE · Inside the studios.`}),(0,k.jsx)(`p`,{children:a===`fr`?`Du parquet, des miroirs et de la lumière. Un aperçu des espaces de CORE pour danser et répéter.`:`Wooden floors, mirrors and light. A look inside CORE’s spaces for dance and rehearsal.`}),(0,k.jsx)(`div`,{className:`school-studio-grid`,children:['+','.join(cards)+']})]}),'

def package(source, output):
    with ZipFile(source) as z:
        files = {n:z.read(n) for n in z.namelist()}
    html = files['index.html'].decode()
    bundle = re.search(r'<script[^>]+src="(/assets/public-site-[^"]+\.js)"',html)[1][1:]
    script = files[bundle].decode()
    needle = '(0,k.jsxs)(`section`,{className:`studios-section`,id:`studios`'
    assert script.count(needle)==1, 'Expected the current studio section exactly once'
    script = script.replace(needle, gallery()+needle.replace('id:`studios`','id:`studio-details`'))
    new_bundle = 'assets/public-site-'+hashlib.sha256(script.encode()).hexdigest()[:12]+'.js'
    files[new_bundle]=script.encode()
    html=html.replace('/'+bundle,'/'+new_bundle).replace('</head>','<link rel="stylesheet" href="/assets/studio-photos.css"></head>')
    files['index.html']=html.encode()
    for name in ['assets/studio-photos.css']+['assets/studios/school-studio-'+p[0]+'.jpg' for p in PHOTOS]:
        files[name]=(ROOT/'website'/name).read_bytes()
    with tempfile.TemporaryDirectory() as temp:
        ready=Path(temp)/'complete.zip'
        with ZipFile(ready,'w',ZIP_DEFLATED) as z:
            for n,data in files.items():z.writestr(n,data)
        with ZipFile(ready) as z:assert z.testzip() is None
        os.replace(ready,output)
    (ROOT/'website'/new_bundle).write_text(script)
    (ROOT/'website/index.html').write_text(html)
    print(f'Complete archive: {len(files)} files; new public bundle: {new_bundle}')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_zip');parser.add_argument('output_zip')
    args=parser.parse_args();package(args.source_zip,args.output_zip)
