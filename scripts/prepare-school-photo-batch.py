#!/usr/bin/env python3
"""Prepare responsive web assets from the read-only uploaded photo batch."""
import argparse
import hashlib
import io
import json
import os
import tempfile
from pathlib import Path
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parents[1]

def prepare(source_dir):
    manifest=json.loads((ROOT/'website/school-photo-batch-01.json').read_text())
    output=ROOT/'website/assets/school-life';output.mkdir(parents=True,exist_ok=True)
    for photo in manifest['photos']:
        source=Path(source_dir)/photo['source']
        assert hashlib.sha256(source.read_bytes()).hexdigest()==photo['source_sha256'], 'Unexpected source photo'
        original=ImageOps.exif_transpose(Image.open(source)).convert('RGB')
        variants=[]
        for limit in [480,960,1600]:
            width=min(limit,original.width)
            if any(v['width']==width for v in variants):continue
            height=round(original.height*width/original.width)
            image=original.resize((width,height),Image.Resampling.LANCZOS)
            name=f"{photo['slug']}-{photo['source_sha256'][:10]}-{width}.webp"
            encoded=io.BytesIO();image.save(encoded,'WEBP',quality=84 if limit==1600 else 80,method=6)
            # Publish only complete files to the synchronized workspace.
            with tempfile.NamedTemporaryFile(delete=False) as staged:
                staged.write(encoded.getvalue());staged_name=staged.name
            os.replace(staged_name,output/name)
            variants.append({'src':'/assets/school-life/'+name,'width':width,'height':height,'bytes':(output/name).stat().st_size})
        photo['variants']=variants
    (ROOT/'website/assets/school-life/catalogue.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(f"Prepared {len(manifest['photos'])} unique photos, {sum(len(p['variants']) for p in manifest['photos'])} responsive variants")

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source_dir');a=p.parse_args();prepare(a.source_dir)
