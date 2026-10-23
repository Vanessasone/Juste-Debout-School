from pathlib import Path
import json,shutil,zipfile,unicodedata,re
base=Path('/workspace/scratch/332efa910b40');repo=base/'school-app';site=base/'site-release';app=base/'app-release'
for archive,d in [('/workspace/scratch/school-spacious-site-20261020.zip',site),('/workspace/scratch/school-industry-app-20261019.zip',app)]:
 d.mkdir(exist_ok=True)
 with zipfile.ZipFile(archive) as z:z.extractall(d)
people=[('Amélie','Techniques académiques'),('Ashley Khelif','Heels / Techniques académiques'),('Bruce Ykanji','Popping / Hip-Hop'),('Creesto','Popping'),('Enzo Hacini','Heels'),('Joël Tenda','Ndombolo'),('Loïc','Locking'),('Loriane','Heels / Techniques académiques'),('Marie Mwiza Ndutiye','Yoga'),('Meech','Hip-Hop'),('Mélissa Fromentin','Street Jazz'),('Michmich','Urban contemporain'),('P.lock','Locking'),('Queensy','Dancehall'),('Quentin','Modern'),('Rickysoul','House Dance'),('Ulijen','House Choreo'),('Vision','Électro'),('William','Coaching physique'),('Xtana','Afro House')]
def slug(s):return re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip('-')
source={unicodedata.normalize('NFC',p.stem):p for p in (base/'industry-formation').glob('*.png')}
rows=[]
# Meech's supplied poster says Heels; withdrawn by Vanessa pending a corrected original.
people=[(name,subject) for name,subject in people if name!='Meech']
for name,subject in people:
 p=source[unicodedata.normalize('NFC',name)];id=slug(name);rows.append(dict(id=id,name='ULIJEN' if name=='Ulijen' else name,subject=subject,image='/assets/industry-formation/'+id+'.png'))
 for d in [site,app]:
  dest=d/'assets/industry-formation'/f'{id}.png';dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
(base/'industry-catalogue.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
for d in [site,app]:
 (d/'assets/industry-formation/catalogue.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
print('Prepared',len(rows),'official visuals in site and application releases')
