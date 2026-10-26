const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const catalogue=JSON.parse(fs.readFileSync(__dirname+'/../website/assets/core-formation/catalogue.json'));
async function fixture(reduced=false,full=false){
 const dom=new JSDOM(full?'<main id="core-formation-gallery"></main>':'<div id="root"><section class="formation-section"></section><section class="school-life-section"></section></div>',{url:'https://school.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,ticks=[];
 w.matchMedia=()=>({matches:reduced});w.fetch=async()=>({ok:true,json:async()=>catalogue});w.setInterval=fn=>(ticks.push(fn),ticks.length);w.clearInterval=()=>{};
 Object.defineProperty(w.HTMLImageElement.prototype,'complete',{get:()=>true});Object.defineProperty(w.HTMLImageElement.prototype,'naturalWidth',{get:()=>480});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.eval(fs.readFileSync(__dirname+'/../website/assets/core-pro-gallery.js','utf8'));d.dispatchEvent(new w.Event('DOMContentLoaded'));await new Promise(r=>setTimeout(r,10));return {dom,w,d,tick:()=>ticks.forEach(fn=>fn())};
}
(async()=>{
 const {dom,w,d,tick}=await fixture(),host=d.querySelector('#core-formation-preview'),caption=()=>d.querySelector('.jdc-carousel__caption h3').textContent;
 const action=label=>d.querySelector('[aria-label="'+label+'"]');
 assert.equal(caption(),'Ness');assert.equal(d.querySelectorAll('.jdc-carousel__card').length,22);assert.equal(d.querySelectorAll('.jdc-carousel__card:not([hidden])').length,5);assert.equal(d.querySelectorAll('.jdc-carousel__card img[src]').length,5,'Only neighbouring cards load');assert.equal(d.querySelectorAll('.jdc-pro__grid').length,0,'Homepage uses the carousel instead of the static grid');
 tick();assert.equal(caption(),'Ricky Soul','Autoplay advances when images are ready');action('Mettre le carrousel en pause').click();tick();assert.equal(caption(),'Ricky Soul','Pause stops autoplay');
 action('Professeur précédent').click();assert.equal(caption(),'Ness');action('Professeur suivant').click();assert.equal(caption(),'Ricky Soul');action('Professeur suivant').click();assert.equal(caption(),'Krissy');action('Professeur précédent').click();action('Professeur précédent').click();action('Professeur précédent').click();assert.equal(caption(),'Rabah','Previous wraps at the beginning');action('Professeur suivant').click();assert.equal(caption(),'Ness');
 const opener=action('Voir la fiche de Ness');opener.focus();opener.click();assert(d.querySelector('dialog').open);assert(d.querySelector('dialog img').src.includes('core-teacher-16'));d.querySelector('dialog button').click();assert(!d.querySelector('dialog img').hasAttribute('src'));assert.equal(d.activeElement,opener);
 d.querySelector('.jdc-carousel__stage').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(caption(),'Ricky Soul');assert.equal(d.activeElement.getAttribute('aria-label'),'Voir la fiche de Ricky Soul');
 const pointer=(type,x)=>{const event=new w.Event(type,{bubbles:true});Object.assign(event,{pointerType:'touch',clientX:x,clientY:100});d.querySelector('.jdc-carousel__stage').dispatchEvent(event)};pointer('pointerdown',200);pointer('pointerup',100);assert.equal(caption(),'Krissy','Touch swipe advances');
 assert.equal(d.querySelectorAll('#core-course-album figure').length,16);assert([...d.querySelectorAll('#core-course-album img')].every(i=>!i.hasAttribute('src')),'Album remains deferred');dom.window.close();
 const reduced=await fixture(true,true);assert.equal(reduced.d.querySelector('.jdc-carousel__caption h3').textContent,'Ness');reduced.tick();assert.equal(reduced.d.querySelector('.jdc-carousel__caption h3').textContent,'Ness','Reduced motion starts paused');assert(reduced.d.querySelector('[aria-label="Lancer le carrousel"]'));assert.equal(reduced.d.querySelectorAll('.jdc-pro__grid figure').length,22,'Full page retains all cards below the carousel');reduced.dom.window.close();
 console.log('PASS: CORE carousel priority, visible-image loading, autoplay/pause, circular navigation, modal/focus return, keyboard, touch and reduced motion.');
})().catch(e=>{console.error(e);process.exitCode=1});
