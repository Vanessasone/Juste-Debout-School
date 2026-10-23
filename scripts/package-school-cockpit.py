#!/usr/bin/env python3
"""Add the public CORE calendar and School social links to a complete site/app ZIP."""
import argparse
import hashlib
import importlib.util
import os
from pathlib import Path
import re
import tempfile
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('domain_package', ROOT / 'scripts/package-school-domain.py')
domain = importlib.util.module_from_spec(spec)
spec.loader.exec_module(domain)

def package(site, app, output):
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp) / 'complete.zip'
        domain.package(site, app, base)
        with ZipFile(base) as source:
            files = {i.filename: source.read(i) for i in source.infolist()}
        html = files['index.html'].decode()
        bundle = re.search(r'<script[^>]+src="(/assets/public-site-[^"]+\.js)"', html)[1][1:]
        script = files[bundle].decode()
        old_rental = 'href:`#demande`,target:`_blank`,rel:`noopener noreferrer`,children:[s.rental,'
        assert script.count(old_rental) == 1, 'Cannot locate the CORE studio rental link'
        script = script.replace(old_rental, 'href:`/locations-core.html`,children:[s.rental,')
        old_instagram = '(0,k.jsx)(`a`,{href:`https://www.instagram.com/jdschool/`,target:`_blank`,rel:`noopener noreferrer`,children:`Instagram ↗`})'
        assert script.count(old_instagram) == 1, 'Cannot locate the School footer Instagram link'
        links = ','.join('(0,k.jsx)(`a`,{href:`https://www.instagram.com/'+handle+'/`,target:`_blank`,rel:`noopener noreferrer`,children:`Instagram '+school+' · @'+handle+' ↗`})' for school, handle in [('CORE','jdschool'),('INDUSTRY','jdschoolindustry')])
        script = script.replace(old_instagram, links)
        new_bundle = 'assets/public-site-' + hashlib.sha256(script.encode()).hexdigest()[:12] + '.js'
        files[new_bundle] = script.encode()
        files['index.html'] = html.replace('/'+bundle, '/'+new_bundle).encode()
        for name in ['locations-core.html','assets/rental-public.js','assets/rental-public.css']:
            files[name] = (ROOT / 'website' / name).read_bytes()
        files['_redirects'] = b'/locations-core /locations-core.html 200\n' + files['_redirects']
        assert not any(n.lower().endswith('.xlsx') for n in files), 'Private source workbook must never be published'
        complete = Path(tmp) / 'final.zip'
        with ZipFile(complete, 'w', ZIP_DEFLATED) as out:
            for name, data in files.items():
                out.writestr(name, data)
        with ZipFile(complete) as check:
            assert check.testzip() is None, 'Archive verification failed'
        os.replace(complete, output)
        # Keep the exact built public source in version control for the next release.
        (ROOT / 'website' / new_bundle).write_text(script)
        (ROOT / 'website/index.html').write_bytes(files['index.html'])
        print(f'Packaged {len(files)} files; public bundle {new_bundle}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('site_zip')
    parser.add_argument('app_export')
    parser.add_argument('output')
    args = parser.parse_args()
    package(args.site_zip, args.app_export, args.output)
