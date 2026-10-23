#!/usr/bin/env python3
"""Overlay the two private workflow bundles on the full current production ZIP."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import argparse,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
def package(source,output):
 with ZipFile(source) as z:
  assert z.testzip() is None
  original={n:z.read(n) for n in z.namelist()}
 files=dict(original);changed=set()
 for name in ('enrollments','finance-import'):
  asset='app/assets/'+name+'.js';page='app/'+name+'.html'
  files[asset]=(ROOT/'website/assets'/f'{name}.js').read_bytes()
  version=hashlib.sha256(files[asset]).hexdigest()[:12]
  files[page]=re.sub(('/app/assets/'+re.escape(name)+r'\.js(?:\?v=[a-zA-Z0-9]+)?').encode(),('/app/assets/'+name+'.js?v='+version).encode(),files[page])
  changed.update((asset,page))
 for name,body in original.items():
  if name not in changed:assert files[name]==body,name
 with ZipFile(output,'w',ZIP_DEFLATED) as z:
  for name,body in files.items():z.writestr(name,body)
 with ZipFile(output) as z:assert z.testzip() is None
 print('Verified: only two workflow bundles and their HTML cache keys changed.')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('output');a=p.parse_args();package(a.source,a.output)
