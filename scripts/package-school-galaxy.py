#!/usr/bin/env python3
"""Overlay the shared JD Galaxy onto a COMPLETE downloaded School production ZIP.
Never upload this repository's partial app-release/ directory as a complete site.
"""
import argparse,copy,re,os
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
URL='https://www.juste-debout.com/galaxy/widget.js'
def inject(html,section=False):
    if URL in html:return html
    tag='<script src="'+URL+'" data-current="school"'+(' data-section="true"' if section else '')+' defer></script>'
    if not re.search(r'</body\s*>',html,re.I):return html
    return re.sub(r'</body\s*>',lambda m:tag+m[0],html,count=1,flags=re.I)
def package(source,output):
    source,output=Path(source),Path(output)
    if source.resolve()==output.resolve():raise ValueError('Use a separate output archive')
    temporary=output.with_name(output.name+'.tmp')
    changed=[]
    with ZipFile(source) as original:
        names=original.namelist()
        if 'index.html' not in names or '_redirects' not in names or len(names)<100:
            raise ValueError('Expected a complete production archive, not a partial overlay')
        with ZipFile(temporary,'w',ZIP_DEFLATED) as result:
            for info in original.infolist():
                data=original.read(info)
                if info.filename.lower().endswith('.html'):
                    before=data
                    data=inject(data.decode('utf-8'),info.filename=='index.html').encode('utf-8')
                    if data!=before:changed.append(info.filename)
                result.writestr(copy.copy(info),data)
    with ZipFile(source) as original,ZipFile(temporary) as result:
        assert original.namelist()==result.namelist()
        for name in original.namelist():
            if name not in changed:assert original.read(name)==result.read(name),name
    os.replace(temporary,output)
    print(f'Prepared {output}; {len(changed)} HTML files changed; every other file preserved byte for byte.')
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('source');parser.add_argument('output');args=parser.parse_args();package(args.source,args.output)
