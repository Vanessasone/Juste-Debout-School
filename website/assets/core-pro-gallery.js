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
function carousel(host,photos,open,dialog){
 const stage=node('div','jdc-carousel__stage');stage.setAttribute('role','group');stage.setAttribute('aria-roledescription','carrousel');stage.setAttribute('aria-label','Les professeurs de la formation CORE');host.append(stage);
 const caption=node('div','jdc-carousel__caption'),name=node('h3'),subject=node('p');caption.append(name,subject);host.append(caption);
 const controls=node('div','jdc-carousel__controls'),prev=node('button','','←'),pause=node('button','','Pause'),next=node('button','','→'),details=node('button','','Voir sa fiche ↗');
 prev.setAttribute('aria-label','Professeur précédent');next.setAttribute('aria-label','Professeur suivant');[prev,pause,next,details].forEach(b=>b.type='button');controls.append(prev,pause,next,details);host.append(controls);
 const count=node('p','jdc-carousel__count'),status=node('span','jdc-carousel__status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');host.append(count,status);
 let active=0,playing=!window.matchMedia('(prefers-reduced-motion: reduce)').matches,hover=false,focused=false,visible=true,suppressClickUntil=0;
 const buttons=photos.map((photo,i)=>{const b=node('button','jdc-carousel__card'),img=node('img');b.type='button';img.alt=photo.alt;img.width=480;img.height=600;img.decoding='async';img.loading='lazy';img.sizes='(max-width:700px) 196px, (max-width:1280px) 23vw, 294px';b.append(img);b.onclick=()=>{if(performance.now()<suppressClickUntil)return;if(active===i)open(photo);else select(i)};stage.append(b);return b});
 function render(){
  const mobile=host.clientWidth<650,radius=mobile?230:420;
  buttons.forEach((b,i)=>{let delta=(i-active+photos.length)%photos.length;if(delta>photos.length/2)delta-=photos.length;const shown=Math.abs(delta)<=2;b.hidden=!shown;b.tabIndex=delta===0?0:-1;b.setAttribute('aria-pressed',String(delta===0));b.setAttribute('aria-label',(delta===0?'Voir la fiche de ':'Mettre en avant ')+photos[i].teacher);
   if(shown&&!b.firstChild.hasAttribute('src')){const img=b.firstChild;img.loading='eager';img.srcset=Object.values(photos[i].variants).map(v=>v.src+' '+v.width+'w').join(', ');img.src=photos[i].variants['480'].src;}
   const x=Math.sin(delta*Math.PI/3)*radius,scale=delta===0?1:.68-Math.abs(delta)*.07;b.style.transform=`translateX(calc(-50% + ${x}px)) translateY(${Math.abs(delta)*26}px) scale(${scale}) rotateY(${-delta*13}deg)`;b.style.zIndex=String(10-Math.abs(delta));b.style.opacity=delta===0?'1':'.48';
  });
  name.textContent=photos[active].teacher;subject.textContent=photos[active].discipline;count.textContent=String(active+1).padStart(2,'0')+' / '+photos.length+' professeurs';pause.textContent=playing?'Pause':'Lecture';pause.setAttribute('aria-label',playing?'Mettre le carrousel en pause':'Lancer le carrousel');pause.setAttribute('aria-pressed',String(!playing));
 }
 function select(i){active=(i+photos.length)%photos.length;render();status.textContent=photos[active].teacher+' · '+photos[active].discipline;}
 prev.onclick=()=>select(active-1);next.onclick=()=>select(active+1);pause.onclick=()=>{playing=!playing;render()};details.onclick=()=>open(photos[active]);
 stage.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();select(active+(e.key==='ArrowRight'?1:-1));buttons[active].focus()}});
 host.addEventListener('mouseenter',()=>hover=true);host.addEventListener('mouseleave',()=>hover=false);host.addEventListener('focusin',()=>focused=true);host.addEventListener('focusout',e=>focused=host.contains(e.relatedTarget));
 let touch;stage.style.touchAction='pan-y';stage.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.pointerType==='pen')touch={x:e.clientX,y:e.clientY}});stage.addEventListener('pointercancel',()=>touch=null);stage.addEventListener('pointerup',e=>{if(!touch)return;const x=e.clientX-touch.x,y=e.clientY-touch.y;touch=null;if(Math.abs(x)>45&&Math.abs(x)>Math.abs(y)){suppressClickUntil=performance.now()+350;select(active+(x<0?1:-1))}});
 const visibility='IntersectionObserver'in window?new IntersectionObserver(entries=>visible=entries.some(e=>e.isIntersecting)):null;visibility?.observe(host);
 window.addEventListener('resize',render);
 const timer=setInterval(()=>{if(!host.isConnected){clearInterval(timer);window.removeEventListener('resize',render);visibility?.disconnect();dialog.remove();return}if(playing&&visible&&!hover&&!focused&&!dialog.open&&!document.hidden){const upcoming=buttons[(active+1)%photos.length].firstChild;if(upcoming.complete&&upcoming.naturalWidth>0){active=(active+1)%photos.length;render()}}},4000);
 render();
}
function mount(host,data,full){
 const photos=ordered(data);if(host.dataset.ready)return;host.dataset.ready='true';if(!full)appendAlbum(data);host.className='jdc-pro';host.style.minHeight='';host.replaceChildren();
 host.append(node('p','jdc-pro__kicker','CORE · Formation professionnelle'),node(full?'h1':'h2','','Les professeurs de la formation CORE.'),node('p','jdc-pro__intro','Découvre l’équipe pédagogique CORE et les disciplines de la formation professionnelle.'));
 const dialog=node('dialog','jdc-pro__dialog');const head=node('header'),title=node('h2'),close=node('button','','Fermer ×'),image=node('img'),credit=node('p','jdc-pro__credit');close.type='button';head.append(title,close);dialog.append(head,image,credit);document.body.append(dialog);let previous;
 close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{image.removeAttribute('src');previous?.focus()});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
 function open(photo){previous=document.activeElement;title.textContent=photo.teacher||'Formation professionnelle CORE';image.src=photo.variants['1600'].src;image.alt=photo.alt;credit.textContent=photo.credit?'Photographie : '+photo.credit:'';dialog.showModal();close.focus()}
 carousel(host,photos,open,dialog);
 if(full){const grid=node('div','jdc-pro__grid');host.append(grid);
 photos.forEach((photo,i)=>{const figure=node('figure',i<3?'jdc-pro__featured':''),button=node('button','jdc-pro__photo'),img=node('img'),label=photo.teacher||'Formation professionnelle CORE';button.type='button';button.setAttribute('aria-label','Agrandir : '+label);img.src=photo.variants['480'].src;img.srcset=Object.values(photo.variants).map(v=>v.src+' '+v.width+'w').filter((v,k,a)=>a.indexOf(v)===k).join(', ');img.sizes='(max-width: 700px) 88vw, (max-width: 1050px) 44vw, 30vw';img.alt=photo.alt;img.width=photo.variants['480'].width;img.height=photo.variants['480'].height;img.loading='lazy';img.decoding='async';button.append(img);button.onclick=()=>open(photo);figure.append(button);if(photo.teacher){const caption=node('figcaption','',photo.teacher);caption.append(node('span','jdc-pro__discipline',photo.discipline));figure.append(caption);}grid.append(figure)});}
 if(!full){const more=node('a','jdc-pro__more','Découvrir tous les professeurs CORE ↗');more.href='/core-formation.html';host.append(more)}
}
let request;const load=()=>request??=fetch(catalogue,{credentials:'omit'}).then(r=>{if(!r.ok)throw Error('catalogue');return r.json()});
function start(){const page=document.getElementById('core-formation-gallery');if(page){load().then(data=>mount(page,data,true)).catch(()=>{page.replaceChildren(node('h1','','Formation professionnelle CORE'));const link=node('a','','Découvrir le programme de formation ↗');link.href='/documents.html#brochure-qualiopi';page.append(link)});return}
 let attached=false;const attach=()=>{if(attached||document.getElementById('core-formation-preview'))return;const anchor=document.querySelector('.formation-section');if(!anchor)return;attached=true;const host=node('section');host.id='core-formation-preview';host.style.minHeight='650px';const industry=document.getElementById('industry-formation-preview');if(industry)industry.before(host);else anchor.after(host);const show=()=>load().then(data=>mount(host,data,false)).catch(()=>host.remove());if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();show()}},{rootMargin:'500px'});observer.observe(host)}else show();changes.disconnect()};const changes=new MutationObserver(attach);changes.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});attach();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
