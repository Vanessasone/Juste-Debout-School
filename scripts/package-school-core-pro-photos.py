#!/usr/bin/env python3
"""Overlay confirmed CORE formation photos on the complete admissions-ready site ZIP."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
ROOT=Path(__file__).resolve().parents[1]

def update_home(html,bundle,cat):
    for marker,photo in zip(['campus-depth','schedule-image','formation-image'],cat['selected_scenes']):
        pos=bundle.index('className:`'+marker+'`')
        start=bundle.index('src:',pos)
        end=bundle.index('decoding:`async`',start)+len('decoding:`async`')
        old=bundle[start:end]
        assert end-start<1500
        small=photo['variants']['480']
        sources=','.join(v['src']+' '+str(v['width'])+'w' for v in photo['variants'].values())
        new='src:`'+small['src']+'`,srcSet:`'+sources+'`,sizes:`(max-width:800px) 90vw, 50vw`,alt:`'+photo['alt']+'`,width:'+str(small['width'])+',height:'+str(small['height'])+',loading:`lazy`,decoding:`async`'
        bundle=bundle[:start]+new+bundle[end:]
    name='assets/public-site-'+hashlib.sha256(bundle.encode()).hexdigest()[:12]+'.js'
    old=re.search(r'<script[^>]+src="(/assets/public-site-[^"?]+\.js)',html)[1]
    return html.replace(old,'/'+name),name,bundle

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
    paths += [v['src'].lstrip('/') for photo in cat['photos']+cat['selected_scenes'] for v in photo['variants'].values()]
    for name in paths:files[name]=(ROOT/'website'/name).read_bytes()
    html=files['index.html'].decode()
    old=re.search(r'<script[^>]+src="(/assets/public-site-[^"?]+\.js)',html)[1][1:]
    html,new_bundle,bundle=update_home(html,files[old].decode(),cat)
    files[new_bundle]=bundle.encode()
    if '/assets/core-pro-gallery.js' not in html:
        version=hashlib.sha256(files['assets/core-pro-gallery.js']).hexdigest()[:12]
        tag=f'<link rel="stylesheet" href="/assets/core-pro-gallery.css"><script src="/assets/core-pro-gallery.js?v={version}" defer></script>'
        assert html.count('</head>')==1
        html=html.replace('</head>',tag+'</head>')
    files['index.html']=html.encode()
    for name,data in original.items():
        if name!='index.html':assert files[name]==data,name
    with ZipFile(output,'w',ZIP_DEFLATED) as z:
        for name,data in files.items():z.writestr(name,data)
    with ZipFile(output) as z:assert z.testzip() is None
    print(f'{len(files)} files; 22 CORE teacher cards and 3 selected homepage photos; all app, INDUSTRY, document and other media bytes preserved.')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('source');parser.add_argument('output');args=parser.parse_args();package(args.source,args.output)
