const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('../web-access/node_modules/jsdom');
const React = require('react');
const {createRoot} = require('react-dom/client');
const {jsx, jsxs} = require('react/jsx-runtime');
const {act} = React;
const dom = new JSDOM('<main id="root"></main>', {url:'https://school.test/'});
global.window = dom.window; global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
let mobile = true, reduced = false, deny = false, plays = 0;
const media = new Map();
window.matchMedia = query => {
  if (!media.has(query)) media.set(query, {get matches(){return query.includes('max-width') ? mobile : reduced;},
    listeners:new Set(),addEventListener(type,fn){this.listeners.add(fn);},removeEventListener(type,fn){this.listeners.delete(fn);}});
  return media.get(query);
};
window.HTMLMediaElement.prototype.play = function(){plays++;return deny ? Promise.reject(Error('Autoplay blocked')) : Promise.resolve();};
window.HTMLMediaElement.prototype.pause = function(){};
const factory = new Function(fs.readFileSync(__dirname+'/../website/runtime/school-hero.js','utf8')+';return createSchoolHero;')();
const Hero = factory(React, jsx, jsxs);
const root = createRoot(document.getElementById('root'));
const scenes = [{id:'cercle',title:'JUSTE DEBOUT\nSCHOOL.',body:'Entre dans le cercle.',clip:'/desktop.mp4',mobileClip:'/mobile.mp4',poster:'/desktop.webp',mobilePoster:'/mobile.webp'}];
async function mount(key){await act(async()=>{root.render(jsx(Hero,{scenes},key));});}
(async()=>{
  await mount('autoplay');
  let video=document.querySelector('video');
  assert.equal(video.autoplay,true);assert.equal(video.muted,true);assert.equal(video.playsInline,true);
  assert.equal(video.getAttribute('src'),'/mobile.mp4');assert.equal(video.getAttribute('poster'),'/mobile.webp');
  assert.equal(document.querySelector('img').getAttribute('fetchpriority'),'high');assert.ok(plays>0);
  await act(async()=>{document.querySelector('button').click();});
  assert.equal(document.querySelector('video').autoplay,false);
  await act(async()=>{document.querySelector('button').click();});
  assert.equal(document.querySelector('video').autoplay,true);
  deny=true;await mount('blocked');assert.match(document.querySelector('button').textContent,/Lire/);
  deny=false;await act(async()=>{document.querySelector('button').click();});assert.match(document.querySelector('button').textContent,/Pause/);
  reduced=true;const before=plays;await mount('reduced');assert.equal(document.querySelector('video').autoplay,false);assert.equal(plays,before);
  await act(async()=>{document.querySelector('button').click();});assert.equal(document.querySelector('video').autoplay,true);
  mobile=false;await act(async()=>{for(const fn of media.get('(max-width: 860px)').listeners)fn();});
  assert.equal(document.querySelector('video').getAttribute('src'),'/desktop.mp4');
  assert.equal(document.querySelector('a').getAttribute('href'),'#planning');
  await act(async()=>root.unmount());assert.equal([...media.values()].reduce((n,q)=>n+q.listeners.size,0),0);
  dom.window.close();console.log('PASS: native autoplay, mobile source, poster, pause/play, blocked autoplay fallback, reduced motion, responsive source and cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1;});
