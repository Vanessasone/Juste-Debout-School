(()=>{
  const reduce=matchMedia('(prefers-reduced-motion: reduce)'), items=new Map();
  function label(item){
    const paused=item.video.paused, fr=document.documentElement.lang!=='en';
    const text=paused?(fr?'Lire l’animation':'Play animation'):(fr?'Pause Ⅱ':'Pause Ⅱ');
    if(item.button.textContent!==text)item.button.textContent=text;
    item.button.setAttribute('aria-label',paused?(fr?'Lire l’animation Industry':'Play Industry animation'):(fr?'Mettre l’animation Industry en pause':'Pause Industry animation'));
    item.button.setAttribute('aria-pressed',String(paused));
  }
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){
    const item=items.get(entry.target);if(!item)continue;
    item.visible=entry.isIntersecting;
    if(!item.visible){item.systemPause=true;item.video.pause()}
    else if(!item.userPaused&&!reduce.matches&&!document.hidden){item.systemPause=false;item.video.play().catch(()=>label(item))}
  }},{threshold:.1});
  function scan(){
    for(const [video,item] of items){if(!video.isConnected){observer.unobserve(video);item.button.remove();items.delete(video)}else label(item)}
    document.querySelectorAll('video[data-industry-teaser]').forEach(video=>{
      if(items.has(video))return;
      video.controls=false;video.removeAttribute('controls');video.disablePictureInPicture=true;video.muted=true;
      const button=document.createElement('button');button.type='button';button.className='industry-motion-toggle';
      const item={video,button,userPaused:reduce.matches,visible:true,systemPause:false};items.set(video,item);
      video.insertAdjacentElement('afterend',button);
      video.addEventListener('play',()=>label(item));video.addEventListener('pause',()=>label(item));
      button.addEventListener('click',()=>{if(video.paused){item.userPaused=false;video.play().catch(()=>label(item))}else{item.userPaused=true;video.pause()}label(item)});
      if(reduce.matches){video.autoplay=false;video.pause()}
      label(item);observer.observe(video);
    });
  }
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
  reduce.addEventListener('change',()=>{for(const item of items.values())if(reduce.matches){item.userPaused=true;item.video.pause();label(item)}});
  document.addEventListener('visibilitychange',()=>{for(const item of items.values()){if(document.hidden)item.video.pause();else if(item.visible&&!item.userPaused&&!reduce.matches)item.video.play().catch(()=>label(item))}});
  scan();
})();