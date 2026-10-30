#!/usr/bin/env python3
"""Overlay reviewed INDUSTRY posters onto a complete, current Netlify archive."""
import argparse,hashlib,io,json,re
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def package(source,output):
 with ZipFile(source) as z: before={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
 assert len(before)>400 and 'app/index.html' in before and '_redirects' in before,'Use the complete current School production archive.'
 after=dict(before);rows=json.loads((ROOT/'website/assets/industry-formation/catalogue-v2.json').read_text());assert len(rows)==28
 additions=json.loads((ROOT/'docs/industry-new-posters-20261030.json').read_text())
 paths=['assets/industry-gallery-v2.js','assets/industry-formation/catalogue.json','assets/industry-formation/catalogue-v2.json']
 paths += [f"assets/industry-formation/{r['id']}-{size}.webp" for r in additions for size in [640,1080]]
 for path in paths:after[path]=(ROOT/'website'/path).read_bytes()
 digest=hashlib.sha256(after['assets/industry-gallery-v2.js']).hexdigest()[:10]
 html_changed=[]
 for path in list(after):
  if path.endswith('.html'):
   old=after[path];s=old.decode();s=re.sub(r'(/assets/industry-gallery-v2\.js)(?:\?v=[^"\s>]+)?',lambda m:m[1]+'?v='+digest,s);after[path]=s.encode()
   if after[path]!=old:html_changed.append(path)
 for row in rows:
  for field in ['thumbnail','image']:Image.open(io.BytesIO(after[row[field].lstrip('/')])).verify()
 allowed=set(paths+html_changed)
 assert all(after[n]==b for n,b in before.items() if n not in allowed)
 assert after['_redirects']==before['_redirects']
 with ZipFile(output,'w',ZIP_DEFLATED) as z:
  for n,b in after.items():z.writestr(n,b)
 with ZipFile(output) as z:assert z.testzip() is None
 print(json.dumps({'files':len(after),'new_files':sorted(set(after)-set(before)),'changed_existing':[n for n in before if before[n]!=after[n]],'unchanged_files':sum(after[n]==b for n,b in before.items())}))
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('source');p.add_argument('output');a=p.parse_args();package(a.source,a.output)
