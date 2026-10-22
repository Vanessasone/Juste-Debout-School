from pathlib import Path
from PIL import Image
import json,zipfile
r=Path('/workspace/scratch/332efa910b40');rows=json.loads((r/'industry-catalogue.json').read_text());original=0;thumbs=0;fulls=0
for row in rows:
 p=r/'site-release'/row['image'].lstrip('/');original+=p.stat().st_size
 im=Image.open(p).convert('RGB');thumb=im.copy();thumb.thumbnail((640,800),Image.Resampling.LANCZOS)
 stem=row['id'];row['thumbnail']=f'/assets/industry-formation/{stem}-640.webp';row['image']=f'/assets/industry-formation/{stem}-1080.webp'
 for folder in ['site-release','app-release']:
  d=r/folder/'assets/industry-formation';thumb.save(d/f'{stem}-640.webp','WEBP',quality=84,method=6);im.save(d/f'{stem}-1080.webp','WEBP',quality=90,method=6)
 thumbs+=(r/'site-release'/row['thumbnail'].lstrip('/')).stat().st_size;fulls+=(r/'site-release'/row['image'].lstrip('/')).stat().st_size
for folder in ['site-release','app-release']:(r/folder/'assets/industry-formation/catalogue-v2.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
(r/'industry-catalogue-v2.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
print(json.dumps(dict(original_bytes=original,thumbnail_bytes=thumbs,fullsize_bytes=fulls,reduction_percent=round(100*(1-thumbs/original),1))))
s=(r/'industry-gallery.js').read_text().replace("const catalogue='/assets/industry-formation/catalogue.json';","const catalogue='/assets/industry-formation/catalogue-v2.json';")
s=s.replace("img.src=p.image;img.alt='Formation INDUSTRY · '+p.name;img.loading='lazy';", "img.alt='Formation INDUSTRY · '+p.name;img.decoding='async';img.loading=i===0?'eager':'lazy';if(i===0)img.fetchPriority='high';")
s=s.replace("b.hidden=!visible;b.style.transform", "b.hidden=!visible;if(visible&&!b.firstChild.getAttribute('src'))b.firstChild.src=people[i].thumbnail;b.style.transform")
s=s.replace("img.src=p.image;img.alt='Visuel officiel de '+p.name;img.loading='lazy';", "img.src=p.thumbnail;img.alt='Visuel officiel de '+p.name;img.loading='lazy';img.decoding='async';")
s=s.replace("if(playing&&!hover&&!focused&&!dialog.open&&!document.hidden){active=(active+1)%people.length;render()}","if(playing&&!hover&&!focused&&!dialog.open&&!document.hidden){const next=(active+1)%people.length;if(buttons[next].firstChild.complete&&buttons[next].firstChild.naturalWidth>0){active=next;render()}}")
(r/'industry-gallery-v2.js').write_text(s)
for folder in ['site-release','app-release']:
 d=r/folder;(d/'assets/industry-gallery-v2.js').write_text(s)
 for name in ['index.html','industry-formation.html']:
  p=d/name;txt=p.read_text().replace('/assets/industry-gallery.js','/assets/industry-gallery-v2.js')
  if name=='industry-formation.html':txt=txt.replace('</head>','<link rel="preload" as="image" fetchpriority="high" href="/assets/industry-formation/amelie-640.webp"></head>')
  p.write_text(txt)
 with zipfile.ZipFile(r/f'industry-{folder}-fast-20261022.zip','w',zipfile.ZIP_DEFLATED) as z:
  for p in d.rglob('*'):
   if p.is_file():z.write(p,p.relative_to(d))
