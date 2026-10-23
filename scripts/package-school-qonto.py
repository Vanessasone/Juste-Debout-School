#!/usr/bin/env python3
"""Update the School cockpit and private rental ledger in a complete verified release."""
import argparse
import hashlib
import importlib.util
import io
import os
from pathlib import Path
import re
import tempfile
from zipfile import ZipFile, ZIP_DEFLATED
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('school_domain',ROOT/'scripts/package-school-domain.py')
domain=importlib.util.module_from_spec(spec);spec.loader.exec_module(domain)

def package(source,export,output):
    with ZipFile(source) as archive:
        files={name:archive.read(name) for name in archive.namelist()}
    original=dict(files)
    extras=re.findall(r'<(?:link|script)[^>]+(?:industry-gallery|school-access)[^>]*>(?:</script>)?',files['app/index.html'].decode())
    for path in Path(export).rglob('*'):
        if not path.is_file():continue
        name=path.relative_to(export).as_posix();target='app/'+name;content=path.read_bytes()
        # Gallery fixes are owned by the complete published release, not the Expo export.
        if (name.startswith('assets/industry-formation/') or name in ['assets/industry-gallery.js','assets/industry-gallery-v2.js','assets/industry-gallery.css','industry-formation.html']) and target in original:
            continue
        if path.suffix=='.html':
            html=content.decode()
            if name=='index.html':
                html=html.replace('<html','<html data-school-surface="app"',1)
                html=html.replace('</head>',''.join(extras)+'</head>')
            content=domain.html_paths(html).encode()
        files[target]=content
    for name in ['rental-accounts.html','rental-accounts.css']:
        target='app/'+('assets/' if name.endswith('.css') else '')+name
        files[target]=(ROOT/'web-access'/name).read_bytes()
    files['app/assets/rental-accounts.js']=(ROOT/'website/assets/rental-accounts.js').read_bytes()
    html=files['app/rental-accounts.html'].decode()
    for extension in ['css','js']:
        resource='app/assets/rental-accounts.'+extension
        html=html.replace('/'+resource,'/'+resource+'?v='+hashlib.sha256(files[resource]).hexdigest()[:10])
    files['app/rental-accounts.html']=html.encode()
    files['locations-core.html']=(ROOT/'website/locations-core.html').read_bytes()
    assert files['_redirects']==original['_redirects']
    for name,data in original.items():
        if not name.startswith('app/') and name!='locations-core.html':assert files[name]==data,name
    for name,data in files.items():
        if name.endswith('.webp') and ('/school-life/' in name or '/industry-formation/' in name):Image.open(io.BytesIO(data)).verify()
    with tempfile.TemporaryDirectory() as tmp:
        ready=Path(tmp)/'release.zip'
        with ZipFile(ready,'w',ZIP_DEFLATED) as archive:
            for name,data in files.items():archive.writestr(name,data)
        with ZipFile(ready) as archive:assert archive.testzip() is None
        os.replace(ready,output)
    print(f'Packaged {len(files)} files. Public photos and reviewed teacher galleries preserved.')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source');p.add_argument('app_export');p.add_argument('output');a=p.parse_args();package(a.source,a.app_export,a.output)
