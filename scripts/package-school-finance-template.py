#!/usr/bin/env python3
"""Update only the finance import bundle and its cache key in the full live ZIP."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import argparse,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
def package(source,output):
 with ZipFile(source) as z:
  assert z.testzip() is None
  original={n:z.read(n) for n in z.namelist()}
 files=dict(original)
 assert 'app/tasks.html' in files
 asset='app/assets/finance-import.js';page='app/finance-import.html'
 files[asset]=(ROOT/'website/assets/finance-import.js').read_bytes()
 version=hashlib.sha256(files[asset]).hexdigest()[:12]
 files[page]=re.sub(rb'/app/assets/finance-import\.js(?:\?v=[a-zA-Z0-9]+)?',('/app/assets/finance-import.js?v='+version).encode(),files[page])
 for name,body in original.items():
  if name not in (asset,page):assert files[name]==body,name
 with ZipFile(output,'w',ZIP_DEFLATED) as z:
  for name,body in files.items():z.writestr(name,body)
 with ZipFile(output) as z:assert z.testzip() is None
 print('Verified: only finance-import.js and its HTML cache key changed.')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('output');a=p.parse_args();package(a.source,a.output)
