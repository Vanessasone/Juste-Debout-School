#!/usr/bin/env python3
"""Overlay reviewed import resources on the complete currently published School ZIP."""
import argparse
import hashlib
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT=Path(__file__).resolve().parents[1]
def package(source,output,qa=None):
    with ZipFile(source) as z:
        assert z.testzip() is None
        original={n:z.read(n) for n in z.namelist()}
    assert 'app/enrollments.html' in original and 'app/tuition.html' in original
    files=dict(original)
    files['app/assets/finance-import.js']=(ROOT/'website/assets/finance-import.js').read_bytes()
    files['app/assets/import-file-worker.js']=(ROOT/'website/assets/import-file-worker.js').read_bytes()
    files['app/assets/pdf.worker.min.mjs']=(ROOT/'website/assets/pdf.worker.min.mjs').read_bytes()
    files['app/assets/import-LICENSES.txt']=(ROOT/'website/assets/import-LICENSES.txt').read_bytes()
    files['app/assets/import.css']=b'.import-source{max-height:28rem;overflow:auto;white-space:pre-wrap;font:14px/1.6 system-ui;border:1px solid #ffffff30;padding:18px;border-radius:12px}.card input{scroll-margin-top:24px}'
    for name in ['finance-import','tuition','enrollments']:
        html=(ROOT/'web-access'/f'{name}.html').read_text()
        if name=='finance-import':html=html.replace('</head>','<link rel="stylesheet" href="/app/assets/import.css"></head>')
        for asset in ['tuition.css',name+'.js','import.css']:
            target='app/assets/'+asset
            if target in files:html=html.replace('/'+target,'/'+target+'?v='+hashlib.sha256(files[target]).hexdigest()[:10])
        files['app/'+name+'.html']=html.encode()
    allowed={'app/tuition.html','app/enrollments.html'}
    for name,content in original.items():
        if name not in allowed:assert files[name]==content,name
    if qa:
        files['__qa-import.html']=(ROOT/'web-access/finance-import.html').read_bytes().replace(b'/app/assets/finance-import.js',b'/__qa-import.js')
        files['__qa-import.js']=Path(qa).read_bytes()
    with ZipFile(output,'w',ZIP_DEFLATED) as z:
        for name,content in files.items():z.writestr(name,content)
    with ZipFile(output) as z:assert z.testzip() is None
    print(f'{len(files)} files; all existing bytes preserved except the two private navigation pages; redirects unchanged.')
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source');p.add_argument('output');p.add_argument('--qa');a=p.parse_args();package(a.source,a.output,a.qa)
