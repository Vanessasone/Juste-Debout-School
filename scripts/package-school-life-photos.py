#!/usr/bin/env python3
"""Apply the first School photo batch and the confirmed CORE studio labels."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import tempfile
from zipfile import ZipFile,ZIP_DEFLATED
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]

def text(value):
    return '`'+value.replace('`','\\`').replace('${','\\${')+'`'

def localized(value):
    return 'a===`fr`?'+text(value['fr'])+':'+text(value['en'])

def picture(photo,sizes):
    variants=photo['variants'];small=variants[0]
    return '(0,k.jsx)(`img`,{src:'+text(small['src'])+',srcSet:'+text(','.join(v['src']+' '+str(v['width'])+'w' for v in variants))+',sizes:'+text(sizes)+',alt:'+localized(photo['alt'])+',width:'+str(small['width'])+',height:'+str(small['height'])+',loading:`lazy`,decoding:`async`})'

def gallery(photos):
    cards=[]
    for photo in photos:
        cards.append('(0,k.jsxs)(`figure`,{children:[(0,k.jsx)(`button`,{type:`button`,"data-photo-full":'+text(photo['variants'][-1]['src'])+',"aria-label":'+localized({lang:('Agrandir : ' if lang=='fr' else 'Enlarge: ')+photo['caption'][lang] for lang in ['fr','en']})+',children:'+picture(photo,'(max-width:600px) 88vw, (max-width:900px) 44vw, 30vw')+'}),(0,k.jsxs)(`figcaption`,{children:[(0,k.jsx)(`span`,{children:'+localized(photo['caption'])+'}),(0,k.jsx)(`span`,{"aria-hidden":`true`,children:`↗`})]})]})')
    return '(0,k.jsxs)(`section`,{className:`collective-section school-life-section`,id:`vie-school`,children:[(0,k.jsxs)(`div`,{className:`collective-heading`,children:[(0,k.jsx)(`h2`,{children:s.community}),(0,k.jsx)(`p`,{children:s.communityCopy})]}),(0,k.jsx)(`div`,{className:`school-life-grid`,"data-language":a,children:['+','.join(cards)+']})]}),'

def package(source,output):
    with ZipFile(source) as z:files={n:z.read(n) for n in z.namelist()}
    html=files['index.html'].decode();old=re.search(r'<script[^>]+src="(/assets/public-site-[^"]+\.js)"',html)[1][1:];script=files[old].decode()
    photos=json.loads((ROOT/'website/assets/school-life/catalogue.json').read_text())['photos'];roles={p['role']:p for p in photos if p['role']!='gallery'}
    for photo in photos:
        for variant in photo['variants']:
            data=(ROOT/'website'/variant['src'].lstrip('/')).read_bytes()
            assert len(data)==variant['bytes'] and len(data)>0, 'Incomplete photo variant: '+variant['src']
            image=Image.open(io.BytesIO(data));assert image.size==(variant['width'],variant['height']);image.verify()
    # Each main section has its own photograph; the gallery uses six other views.
    replacements=[
      ('(0,k.jsx)(`img`,{src:r===`CORE`?`/assets/brand/community.webp`:`/assets/brand/class.webp`,alt:r===`CORE`?s.communityCaption:(a===`fr`?`La transmission et le mouvement · univers INDUSTRY, visuel d’illustration`:`Movement and teaching · INDUSTRY, illustrative photograph`),loading:`lazy`},r)',
       'r===`CORE`?'+picture(roles['campus'],'(max-width:700px) 90vw, 60vw')+':(0,k.jsx)(`img`,{src:`/assets/brand/class.webp`,alt:a===`fr`?`La transmission et le mouvement · univers INDUSTRY, visuel d’illustration`:`Movement and teaching · INDUSTRY, illustrative photograph`,loading:`lazy`},r)'),
      ('(0,k.jsx)(`img`,{src:`/assets/brand/class.webp`,alt:a===`fr`?`Danse pendant un cours à Juste Debout School`:`Dance class at Juste Debout School`,loading:`lazy`})',picture(roles['schedule'],'(max-width:800px) 90vw, 38vw')),
      ('(0,k.jsx)(`img`,{src:`/assets/brand/teacher.webp`,alt:a===`fr`?`Un professeur transmet un mouvement à Juste Debout School`:`A teacher sharing a movement at Juste Debout School`,loading:`lazy`})',picture(roles['formation'],'(max-width:800px) 88vw, 45vw')),
    ]
    for before,after in replacements:
        assert script.count(before)==1,'Main photo structure changed';script=script.replace(before,after)
    start=script.index('(0,k.jsxs)(`section`,{className:`collective-section`')
    end=script.index('(0,k.jsxs)(`section`,{className:`school-studio-gallery`',start)
    script=script[:start]+gallery([p for p in photos if p['role']=='gallery'])+script[end:]
    script=script.replace('`Les studios, en images.`:`Inside the studios.`','`CORE · Les studios en images.`:`CORE · Inside the studios.`').replace('Un aperçu des espaces de la School pour danser et répéter.','Un aperçu des espaces de CORE pour danser et répéter.').replace('A look inside the School’s spaces for dance and rehearsal.','A look inside CORE’s spaces for dance and rehearsal.')
    old_studio='(0,k.jsx)(`img`,{src:`/assets/brand/studio.jpg`,alt:a===`fr`?`Un studio de danse de Juste Debout School CORE`:`A dance studio at Juste Debout School CORE`,loading:`lazy`}),'
    assert script.count(old_studio)==1,'Studio detail structure changed'
    script=script.replace(old_studio,'').replace('className:`studio-detail`','className:`studio-detail studio-detail-text`')
    bundle='assets/public-site-'+hashlib.sha256(script.encode()).hexdigest()[:12]+'.js';files[bundle]=script.encode();html=html.replace('/'+old,'/'+bundle)
    html=html.replace('</head>','<link rel="stylesheet" href="/assets/school-life-gallery.css"><script src="/assets/school-life-gallery.js" defer></script></head>');files['index.html']=html.encode()
    for path in (ROOT/'website/assets/school-life').iterdir():
        if path.suffix=='.webp':files['assets/school-life/'+path.name]=path.read_bytes()
    for name in ['assets/school-life-gallery.css','assets/school-life-gallery.js']:files[name]=(ROOT/'website'/name).read_bytes()
    with tempfile.TemporaryDirectory() as tmp:
        ready=Path(tmp)/'release.zip'
        with ZipFile(ready,'w',ZIP_DEFLATED) as z:
            for name,data in files.items():z.writestr(name,data)
        with ZipFile(ready) as z:assert z.testzip() is None
        os.replace(ready,output)
    (ROOT/'website'/bundle).write_text(script);(ROOT/'website/index.html').write_text(html)
    print(f'Packaged {len(files)} files; public bundle: {bundle}')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source_zip');p.add_argument('output_zip');a=p.parse_args();package(a.source_zip,a.output_zip)
