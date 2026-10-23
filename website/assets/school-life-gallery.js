/* A modal only loads the large photograph on request. No gallery autoplay. */
(()=>{
 let dialog=null,items=[],index=0,opener=null,serial=0,previousOverflow='',language='fr';
 const label=(fr,en)=>language==='en'?en:fr;
 function button(text,handler){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',handler);return b;}
 function close(){if(dialog?.open)dialog.close();}
 function create(){
  dialog=document.createElement('dialog');dialog.className='school-photo-viewer';dialog.setAttribute('aria-labelledby','school-photo-viewer-title');
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();show(index-1);}if(e.key==='ArrowRight'){e.preventDefault();show(index+1);}});
  dialog.addEventListener('close',()=>{serial++;document.body.style.overflow=previousOverflow;opener?.focus();dialog.replaceChildren();});
  document.body.append(dialog);
 }
 function show(next){
  const focused=dialog.contains(document.activeElement)?document.activeElement.textContent:null;
  index=(next+items.length)%items.length;const token=++serial,item=items[index],header=document.createElement('header'),title=document.createElement('h2');title.id='school-photo-viewer-title';title.textContent=item.closest('figure').querySelector('figcaption span').textContent;header.append(title,button(label('Fermer ✕','Close ✕'),close));
  const stage=document.createElement('div'),pending=document.createElement('p');pending.className='photo-loading';pending.textContent=label('Chargement de la photo…','Loading photo…');stage.append(pending);
  const nav=document.createElement('nav'),status=document.createElement('span');nav.setAttribute('aria-label',label('Parcourir les photos','Browse photos'));status.setAttribute('role','status');status.textContent=`${index+1} / ${items.length}`;
  nav.append(button(label('← Précédente','← Previous'),()=>show(index-1)),status,button(label('Suivante →','Next →'),()=>show(index+1)));dialog.replaceChildren(header,stage,nav);if(focused)[...dialog.querySelectorAll('button')].find(b=>b.textContent===focused)?.focus();
  const img=new Image();img.alt=item.querySelector('img').alt;img.decoding='async';img.onload=()=>{if(token===serial&&dialog.open)stage.replaceChildren(img);};img.onerror=()=>{if(token===serial&&dialog.open)pending.textContent=label('La photo ne peut pas être chargée. Essaie la suivante.','This photo could not load. Try the next one.');};img.src=item.dataset.photoFull;
 }
 document.addEventListener('click',e=>{
  const target=e.target instanceof Element?e.target.closest('button[data-photo-full]'):null;if(!target)return;
  language=target.closest('[data-language]')?.dataset.language||'fr';items=[...target.closest('.school-life-grid').querySelectorAll('button[data-photo-full]')];opener=target;
  if(!dialog)create();previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';show(items.indexOf(target));dialog.showModal();dialog.querySelector('button').focus();
 });
})();
