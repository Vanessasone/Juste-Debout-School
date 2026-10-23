#!/usr/bin/env python3
"""Add the private director task workspace to a complete School production ZIP."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import argparse,hashlib
ROOT=Path(__file__).resolve().parents[1]
def package(source,output):
 with ZipFile(source) as z:
  assert z.testzip() is None
  original={n:z.read(n) for n in z.namelist()}
 files=dict(original)
 assert 'app/index.html' in files and 'app/finance-import.html' in files
 for name in ('tasks','tasks-entry'):
  files['app/assets/'+name+'.js']=(ROOT/'website/assets'/f'{name}.js').read_bytes()
 version=hashlib.sha256(files['app/assets/tasks.js']).hexdigest()[:12]
 html=(ROOT/'web-access/tasks.html').read_text().replace('/app/assets/tasks.js','/app/assets/tasks.js?v='+version)
 files['app/tasks.html']=html.encode()
 for name in ('app/tuition.html','app/enrollments.html','app/finance-import.html','app/rental-accounts.html'):
  files[name]=files[name].replace(b'</header>',b'<a href="/app/tasks.html">\xc3\x80 traiter \xc2\xb7 Nicolas</a></header>')
 entry=b'<script defer src="/app/assets/tasks-entry.js?v='+version.encode()+b'"></script>'
 files['app/index.html']=files['app/index.html'].replace(b'</body>',entry+b'</body>')
 changed={'app/index.html','app/tuition.html','app/enrollments.html','app/finance-import.html','app/rental-accounts.html'}
 for name,body in original.items():
  if name not in changed:assert files[name]==body,name
 with ZipFile(output,'w',ZIP_DEFLATED) as z:
  for name,body in files.items():z.writestr(name,body)
 with ZipFile(output) as z:assert z.testzip() is None
 print(f'{len(files)} archive entries. All existing non-navigation bytes preserved, including Galaxy and redirects.')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('output');a=p.parse_args();package(a.source,a.output)
