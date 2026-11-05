from pathlib import Path
import zipfile,sys,re
base,output=map(Path,sys.argv[1:3]);root=Path(__file__).resolve().parents[1]/'website'
with zipfile.ZipFile(base) as z:
 data={i.filename:z.read(i.filename) for i in z.infolist() if not i.is_dir()}
assert 'index.html' in data and 'industry-open.html' in data
before=dict(data)
index=data['index.html'].decode()
assert '/assets/public-site-1e2bbc6567a8.js' in index, 'Production bundle changed: inspect before packaging'
assert data['assets/public-site-1e2bbc6567a8.js']==(root/'assets/public-site-1e2bbc6567a8.js').read_bytes(), 'Production JS differs from source'
index=index.replace('public-site-1e2bbc6567a8.js','public-site-c709347bd1f4.js')
index=index.replace('</head>','<link rel="stylesheet" href="/assets/industry-teaser/teaser.css"><script src="/assets/industry-teaser/teaser.js" defer></script></head>')
data['index.html']=index.encode()
# The separate Industry page has no application data: copy tested updated page.
data['industry-open.html']=(root/'industry-open.html').read_bytes()
for path in [root/'assets/public-site-c709347bd1f4.js',*(root/'assets/industry-teaser').iterdir()]:data[str(path.relative_to(root))]=path.read_bytes()
changed=[k for k in before if before[k]!=data[k]]
assert set(changed)=={'index.html','industry-open.html'}
assert all(data[k]==v for k,v in before.items() if k.startswith('app/'))
assert not any(t in data['industry-open.html'].decode() for t in ['17 novembre','11 novembre','9 décembre','18 novembre','14 décembre'])
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
 for k,v in data.items():z.writestr(k,v)
print('Archive:',output,'; files:',len(data),'; existing changed:',changed,'; all app files identical')
