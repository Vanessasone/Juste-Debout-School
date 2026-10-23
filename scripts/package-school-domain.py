#!/usr/bin/env python3
"""Combine a downloaded production site ZIP and an Expo /app export.

Export with SCHOOL_WEB_BASE_URL=/app and the existing public Supabase variables.
Never substitute a partial website overlay for the complete production ZIP.
"""
import argparse
import copy
import re
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

OLD_APP = 'https://justedeboutschoolapp.netlify.app'
DOMAIN = 'https://www.juste-debout-school.com'

def html_paths(text):
    return re.sub(r'((?:href|src)=[\"\'])(/(?!/|app(?:/|[\"\'])))', r'\1/app\2', text)

def package(site_zip, app_export, output):
    with ZipFile(site_zip) as site, ZipFile(output, 'w', ZIP_DEFLATED) as out:
        site_names = set(site.namelist())
        for info in site.infolist():
            if info.filename == '_redirects' or info.filename.startswith('app/'):
                continue
            data = site.read(info)
            if Path(info.filename).suffix in {'.html', '.js', '.json', '.css'}:
                text = data.decode('utf-8').replace(OLD_APP, '/app').replace('https://justedeboutschool-site.netlify.app', DOMAIN)
                # The WordPress programme PDF was not migrated with the site.
                # Offer an enquiry instead of a download that returns the home page.
                text = text.replace(DOMAIN + '/wp-content/uploads/2026/04/JDS_Programme_de_formation-2026-CORE-INDUSTRY.pdf', '/#demande')
                text = text.replace('Consulter le programme publié · PDF 2026', 'Demander le programme 2026').replace('Read the published programme · 2026 PDF', 'Request the 2026 programme')
                # Netlify's download can lowercase asset names. Keep references exact.
                text = re.sub(r'(/assets/[^\"\'`\s<>]+)', lambda m: '/'+m[0][1:].lower() if m[0][1:] not in site_names and m[0][1:].lower() in site_names else m[0], text)
                data = text.encode()
            out.writestr(copy.copy(info), data)
        # Public galleries share the site's image assets, which Expo does not own.
        for info in site.infolist():
            if info.filename.startswith('assets/industry-formation/') and not (Path(app_export) / info.filename).exists():
                out.writestr('app/' + info.filename, site.read(info))
        for path in sorted(Path(app_export).rglob('*')):
            if not path.is_file():
                continue
            name = path.relative_to(app_export).as_posix()
            data = path.read_bytes()
            if path.suffix == '.html':
                text = data.decode().replace(OLD_APP, '/app').replace('https://justedeboutschool-site.netlify.app', DOMAIN)
                if name == 'index.html' and 'data-school-surface="app"' not in text:
                    text = text.replace('<html', '<html data-school-surface="app"', 1)
                    text = text.replace('</head>', '<link rel="stylesheet" href="/app/assets/industry-gallery.css"><script src="/app/assets/industry-gallery-v2.js" defer></script><link rel="stylesheet" href="/app/assets/school-access-gate.css"><script src="/app/assets/school-access.js" defer></script></head>')
                data = html_paths(text).encode()
            elif name in {'assets/industry-gallery.js', 'assets/industry-gallery-v2.js'} or (name.startswith('assets/industry-formation/catalogue') and path.suffix == '.json'):
                text = data.decode()
                data = re.sub(r'([\"\'`])(/(?:assets/|industry-formation))', r'\1/app\2', text).encode()
            out.writestr('app/' + name, data)
        out.writestr('_redirects', '''/calendrier-core /calendrier-core.html 200
/industry-open /industry-open.html 200
/cours-open-prives/* /#planning 301
/app/school-role /app/school-role.html 200
/app/bulletins /app/bulletins.html 200
/app /app/index.html 200
/app/* /app/index.html 200
/* /index.html 200
''')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('site_zip')
    parser.add_argument('app_export')
    parser.add_argument('output')
    args = parser.parse_args()
    package(args.site_zip, args.app_export, args.output)
