#!/usr/bin/env python3
"""Overlay the private current-student tracker, preserving the complete live site."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import sys,hashlib,re
root=Path(__file__).resolve().parents[1]
with ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 original={n:z.read(n) for n in z.namelist()}
files=dict(original)
asset=(root/'website/assets/student-activation.js').read_bytes()
files['app/assets/student-activation.js']=asset
html=(root/'web-access/student-activation.html').read_text().replace('/app/assets/student-activation.js','/app/assets/student-activation.js?v='+hashlib.sha256(asset).hexdigest()[:12])
files['app/student-activation.html']=html.encode()
for n in ['tasks','enrollments']:
 name='app/'+n+'.html'
 files[name]=files[name].replace(b'</header>','<a href="/app/student-activation.html">Élèves actuels</a></header>'.encode())
for name,body in original.items():
 if name not in ['app/tasks.html','app/enrollments.html']:assert files[name]==body,name
with ZipFile(sys.argv[2],'w',ZIP_DEFLATED) as z:
 for name,body in files.items():z.writestr(name,body)
with ZipFile(sys.argv[2]) as z:assert z.testzip() is None
print('Verified complete archive; only tracker and two navigation links added:',Path(sys.argv[2]).stat().st_size)
