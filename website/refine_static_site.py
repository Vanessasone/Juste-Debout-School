from pathlib import Path
import re,hashlib
root=Path('/workspace/scratch/school-site')
old=root/'assets/public-site-B0_PfqXn.js'; s=old.read_text()
before='src:`/assets/brand/community.jpg`,alt:s.communityCaption,loading:`lazy`'
after='src:r===`CORE`?`/assets/brand/community.jpg`:`/assets/brand/class.webp`,alt:r===`CORE`?s.communityCaption:(a===`fr`?`La transmission et le mouvement · univers INDUSTRY, visuel d’illustration`:`Movement and teaching · INDUSTRY, illustrative photograph`),loading:`lazy`'
assert s.count(before)>=1
s=s.replace(before,after,1)
# Give the campus image its own transition on each switch.
s=s.replace(after+'})}',after+'},r)}')
new='public-site-'+hashlib.sha256(s.encode()).hexdigest()[:12]+'.js'
(root/'assets'/new).write_text(s)
for f in root.glob('*.html'):
 t=f.read_text();t=t.replace('public-site-B0_PfqXn.js',new)
 t=re.sub(r"<a href='/calendrier-core' style=.*?</a><a href='/industry-open' style=.*?</a>",'',t)
 assert 'jds-campus-dock' not in t
 t=t.replace('</head>','<link rel="stylesheet" href="/assets/school-refinements.css"></head>')
 core=' aria-current="page"' if f.name=='calendrier-core.html' else ''
 industry=' aria-current="page"' if f.name=='industry-open.html' else ''
 dock=f'<nav class="jds-campus-dock" aria-label="Naviguer entre CORE et INDUSTRY"><a class="jds-core" href="/calendrier-core.html"{core} aria-label="JD CORE · Agenda et vacances">JD CORE <span aria-hidden="true">↗</span></a><a class="jds-industry" href="/industry-open.html"{industry} aria-label="INDUSTRY · Programme prévisionnel">INDUSTRY <span aria-hidden="true">↗</span></a></nav>'
 t=t.replace('</body>',dock+'</body>');f.write_text(t)
(root/'_redirects').write_text('/calendrier-core /calendrier-core.html 200\n/industry-open /industry-open.html 200\n/* /index.html 200\n')
(root/'_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n')
print('Updated',new,'pages',len(list(root.glob('*.html'))))
