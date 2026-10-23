#!/usr/bin/env python3
"""Add the director tuition/enrollment workspace to a complete School release."""
import argparse
import hashlib
import importlib.util
import os
from pathlib import Path
import tempfile
from zipfile import ZipFile, ZIP_DEFLATED

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('qonto',ROOT/'scripts/package-school-qonto.py')
qonto=importlib.util.module_from_spec(spec);spec.loader.exec_module(qonto)

def package(source,export,output):
    with ZipFile(source) as archive: original={n:archive.read(n) for n in archive.namelist()}
    with tempfile.TemporaryDirectory() as tmp:
        stage=Path(tmp)/'qonto.zip'
        qonto.package(source,export,stage)
        with ZipFile(stage) as archive: files={n:archive.read(n) for n in archive.namelist()}
        files['app/assets/tuition.css']=(ROOT/'web-access/tuition.css').read_bytes()
        for name in ['tuition','enrollments','enrollment']:
            files['app/assets/'+name+'.js']=(ROOT/'website/assets'/f'{name}.js').read_bytes()
            html=(ROOT/'web-access'/f'{name}.html').read_text()
            for asset in ['tuition.css',name+'.js']:
                resource='app/assets/'+asset
                html=html.replace('/'+resource,'/'+resource+'?v='+hashlib.sha256(files[resource]).hexdigest()[:10])
            files['app/'+name+'.html']=html.encode()
        for name,data in original.items():
            if not name.startswith('app/'):assert files[name]==data,name
        assert files['_redirects']==original['_redirects']
        ready=Path(tmp)/'release.zip'
        with ZipFile(ready,'w',ZIP_DEFLATED) as archive:
            for name,data in files.items():archive.writestr(name,data)
        with ZipFile(ready) as archive:
            assert archive.testzip() is None
            for name in ['tuition','enrollments','enrollment']:
                assert ('app/'+name+'.html') in archive.namelist()
        os.replace(ready,output)
    print(f'Packaged {len(files)} files; all public pages and assets byte-for-byte preserved.')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source');p.add_argument('app_export');p.add_argument('output');a=p.parse_args();package(a.source,a.app_export,a.output)
