(()=>{'use strict';
const catalogue='/assets/core-formation/catalogue.json';
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e};
function ordered(data){
 if(!data.identity_mapping_confirmed)throw Error('Unconfirmed photo names');
 const portraits=data.photos.filter(p=>p.role==='formation');
 const featured=data.featured_photo_ids.map(id=>portraits.find(p=>p.id===id));
 if(featured.length!==3||featured.some((p,i)=>!p||p.teacher!==data.priority_teachers[i])||new Set(data.featured_photo_ids).size!==3)throw Error('Invalid featured portraits');
 return [...featured,...portraits.filter(p=>!data.featured_photo_ids.includes(p.id))];
}
function appendAlbum(data){
 const section=document.querySelector('.school-life-section');if(!section||document.getElementById('core-course-album')||!data.album_photos?.length)return;
 const album=node('details','school-life-more');album.id='core-course-album';
 const summary=node('summary'),title=node('span','',`Formation CORE · ${data.album_photos.length} photos de cours`),sign=node('span','','+');sign.setAttribute('aria-hidden','true');summary.append(title,sign);album.append(summary);
 const grid=node('div','school-life-grid');album.append(grid);
 data.album_photos.forEach((photo,i)=>{const figure=node('figure'),button=node('button'),img=node('img'),caption=node('figcaption'),label=`Formation CORE · ${String(i+1).padStart(2,'0')}`,small=photo.variants['480'];button.type='button';button.dataset.photoFull=photo.variants['1600'].src;button.setAttribute('aria-label','Agrandir : '+label);img.dataset.photoSrc=small.src;img.dataset.photoSrcset=Object.values(photo.variants).map(v=>v.src+' '+v.width+'w').join(', ');img.sizes='(max-width:600px) 88vw, (max-width:900px) 44vw, 30vw';img.width=small.width;img.height=small.height;img.alt=photo.alt;img.loading='lazy';img.decoding='async';button.append(img);caption.append(node('span','',label),node('span','',photo.credit||'↗'));figure.append(button,caption);grid.append(figure)});
 section.append(album);
}
function mount(host,data,full){
 const photos=ordered(data);if(!full)appendAlbum(data);host.className='jdc-pro';host.replaceChildren();
 host.append(node('p','jdc-pro__kicker','CORE · Formation professionnelle'),node(full?'h1':'h2','','Les professeurs de la formation CORE.'),node('p','jdc-pro__intro','Ness, Ricky Soul et Krissy ouvrent la présentation de l’équipe pédagogique CORE.'));
 const dialog=node('dialog','jdc-pro__dialog');const head=node('header'),title=node('h2'),close=node('button','','Fermer ×'),image=node('img'),credit=node('p','jdc-pro__credit');close.type='button';head.append(title,close);dialog.append(head,image,credit);document.body.append(dialog);let previous;
 close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{image.removeAttribute('src');previous?.focus()});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
 function open(photo){previous=document.activeElement;title.textContent=photo.teacher||'Formation professionnelle CORE';image.src=photo.variants['1600'].src;image.alt=photo.alt;credit.textContent=photo.credit?'Photographie : '+photo.credit:'';dialog.showModal();close.focus()}
 const grid=node('div','jdc-pro__grid');host.append(grid);
 (full?photos:photos.slice(0,3)).forEach((photo,i)=>{const figure=node('figure',i<3?'jdc-pro__featured':''),button=node('button','jdc-pro__photo'),img=node('img'),label=photo.teacher||'Formation professionnelle CORE';button.type='button';button.setAttribute('aria-label','Agrandir : '+label);img.src=photo.variants['480'].src;img.srcset=Object.values(photo.variants).map(v=>v.src+' '+v.width+'w').filter((v,k,a)=>a.indexOf(v)===k).join(', ');img.sizes='(max-width: 700px) 88vw, (max-width: 1050px) 44vw, 30vw';img.alt=photo.alt;img.width=photo.variants['480'].width;img.height=photo.variants['480'].height;img.loading='lazy';img.decoding='async';button.append(img);button.onclick=()=>open(photo);figure.append(button);if(photo.teacher){const caption=node('figcaption','',photo.teacher);caption.append(node('span','jdc-pro__discipline',photo.discipline));figure.append(caption);}grid.append(figure)});
 if(!full){const more=node('a','jdc-pro__more','Découvrir tous les professeurs CORE ↗');more.href='/core-formation.html';host.append(more)}
}
let request;const load=()=>request??=fetch(catalogue,{credentials:'omit'}).then(r=>{if(!r.ok)throw Error('catalogue');return r.json()});
function start(){const page=document.getElementById('core-formation-gallery');if(page){load().then(data=>mount(page,data,true)).catch(()=>{page.replaceChildren(node('h1','','Formation professionnelle CORE'));const link=node('a','','Découvrir le programme de formation ↗');link.href='/documents.html#brochure-qualiopi';page.append(link)});return}
 let attached=false;const attach=()=>{if(attached||document.getElementById('core-formation-preview'))return;const anchor=document.querySelector('.formation-section');if(!anchor)return;attached=true;const host=node('section');host.id='core-formation-preview';const industry=document.getElementById('industry-formation-preview');if(industry)industry.before(host);else anchor.after(host);const show=()=>load().then(data=>mount(host,data,false)).catch(()=>host.remove());if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();show()}},{rootMargin:'500px'});observer.observe(host)}else show();changes.disconnect()};const changes=new MutationObserver(attach);changes.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});attach();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
