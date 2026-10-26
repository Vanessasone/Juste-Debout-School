#!/usr/bin/env python3
"""Add 2027 auditions and supplied PDFs, preserving the complete School deployment."""
import argparse
import hashlib
import os
from pathlib import Path
import re
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
PDFS = {
    'JDS_Programme_de_formation 2027 CORE-INDUSTRY.pdf': 'jds-programme-formation-2027-fr.pdf',
    'JDS PRO TRAINING 2027.pdf': 'jds-pro-training-2027-en.pdf',
    'Regles_location_salles.pdf': 'reglement-location-salles-fr.pdf',
    'Studio_Rental_Rules.pdf': 'studio-rental-rules-en.pdf',
    'Tarifs_Open_Classes.pdf': 'tarifs-cours-open.pdf',
}

def once(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f'Expected one public marker, got {text.count(old)}: {old[:100]}')
    return text.replace(old, new, 1)

def update_home(html, bundle):
    old_bundle = re.search(r'<script[^>]+src="(/assets/public-site-[^"?]+\.js)', html)[1]
    if 'createSchoolAuditions(k.jsx,k.jsxs,t)' not in bundle:
        source = (ROOT/'website/runtime/school-auditions.js').read_text()
        bundle = source + '\n' + bundle
        title = '(0,k.jsx)(`h3`,{children:t?`PRÊT À CANDIDATER ?`:`READY TO APPLY?`}),'
        bundle = once(bundle, title, title + 'createSchoolAuditions(k.jsx,k.jsxs,t),')
        bundle = once(bundle,
            'L’équipe te précisera les auditions, les documents et les possibilités de financement.',
            'Précise la date d’audition souhaitée. L’équipe te renseignera sur les documents et les possibilités de financement.')
        bundle = once(bundle,
            'They will confirm auditions, required documents and funding options.',
            'Include your preferred audition date. The team will confirm required documents and funding options.')
        old = '(0,k.jsxs)(`a`,{href:ht,target:`_blank`,rel:`noopener noreferrer`,children:[t?`Demander le programme 2026`:`Request the 2026 programme`,` ↗`]})'
        new = '(0,k.jsx)(`a`,{className:`school-documents-link`,href:`/documents.html#brochure-qualiopi`,children:t?`lien pour télécharger la brochure et le certificat Qualiopi`:`Download the brochure and Qualiopi certificate`})'
        bundle = once(bundle, old, new)
        old = '(0,k.jsx)(`p`,{children:s.scheduleIntro})'
        new = old + ',(0,k.jsx)(`a`,{className:`school-documents-link`,href:`/documents.html#cours-open`,children:t?`Tarifs et règlement des cours open`:`Open class prices and rules`})'
        bundle = once(bundle, old, new)
    name = 'assets/public-site-'+hashlib.sha256(bundle.encode()).hexdigest()[:12]+'.js'
    html = html.replace(old_bundle, '/'+name)
    if '/assets/school-admissions.css' not in html:
        html = once(html, '</head>', '<link rel="stylesheet" href="/assets/school-admissions.css"></head>')
    return html, name, bundle

def update_rentals(html):
    if 'school-rental-documents' in html:
        return html
    downloads = '<section class="school-rental-documents"><h2>Règlement des locations de salle</h2><p>Consulte les conditions de réservation et d’utilisation avant de préparer ta demande.</p><a href="/documents/reglement-location-salles-fr.pdf" download>Télécharger le règlement des locations de salle · PDF ↓</a><a href="/documents/studio-rental-rules-en.pdf" download lang="en">Download the studio rental rules · PDF ↓</a></section>'
    html = once(html, '</main>', downloads+'</main>')
    return once(html, '</head>', '<link rel="stylesheet" href="/assets/school-admissions.css"></head>')

def package(source, output):
    with ZipFile(source) as z:
        assert z.testzip() is None
        before = {n:z.read(n) for n in z.namelist()}
    if len(before) < 400 or 'app/tasks.html' not in before or '_redirects' not in before:
        raise ValueError('A complete current School production archive is required.')
    files = dict(before)
    html = files['index.html'].decode()
    old_bundle = re.search(r'<script[^>]+src="(/assets/public-site-[^"?]+\.js)', html)[1][1:]
    html, new_bundle, bundle = update_home(html, files[old_bundle].decode())
    files['index.html'] = html.encode()
    files[new_bundle] = bundle.encode()
    files['locations-core.html'] = update_rentals(files['locations-core.html'].decode()).encode()
    for name in ['documents.html','assets/school-admissions.css','assets/school-documents.css']:
        files[name] = (ROOT/'website'/name).read_bytes()
    for name in PDFS.values():
        files['documents/'+name] = (ROOT/'website/documents'/name).read_bytes()
    changed = {'index.html','locations-core.html'}
    for name, data in before.items():
        if name not in changed:
            assert files[name] == data, f'Unrelated file changed: {name}'
    assert files['_redirects'] == before['_redirects']
    assert files.get('_headers') == before.get('_headers')
    output = Path(output)
    temporary = output.with_name(output.name+'.tmp')
    with ZipFile(temporary,'w',ZIP_DEFLATED) as z:
        for name, data in files.items():
            z.writestr(name,data)
    with ZipFile(temporary) as z:
        assert z.testzip() is None
    os.replace(temporary,output)
    print(f'Complete archive: {len(files)} files. Only the public home and rental page changed; /app, photos, redirects and headers unchanged. Bundle: {new_bundle}')

def prepare(upload):
    target = ROOT/'website/documents'
    target.mkdir(exist_ok=True)
    for original, name in PDFS.items():
        source = Path(upload)/original
        data = source.read_bytes()
        assert data.startswith(b'%PDF-'), original
        (target/name).write_bytes(data)
    home = ROOT/'website/index.html'
    html = home.read_text()
    old = re.search(r'<script[^>]+src="(/assets/public-site-[^"?]+\.js)',html)[1]
    html,name,bundle = update_home(html,(ROOT/'website'/old[1:]).read_text())
    home.write_text(html)
    (ROOT/'website'/name).write_text(bundle)
    rental = ROOT/'website/locations-core.html'
    rental.write_text(update_rentals(rental.read_text()))
    print('Prepared public source and four byte-identical PDFs:', name)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepare',metavar='UPLOAD_DIRECTORY')
    parser.add_argument('--source',metavar='COMPLETE_PRODUCTION_ZIP')
    parser.add_argument('--output',metavar='COMPLETE_OUTPUT_ZIP')
    args = parser.parse_args()
    if args.prepare:
        prepare(args.prepare)
    elif args.source and args.output:
        package(args.source,args.output)
    else:
        parser.error('Use --prepare UPLOAD_DIRECTORY or --source COMPLETE_PRODUCTION_ZIP --output COMPLETE_OUTPUT_ZIP')
