const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/rental-public.js','utf8').replace(/^import .*;\n/gm,'');
const wait=()=>new Promise(r=>setTimeout(r,20));
async function run(fail=false){
 const dom=new JSDOM('<div id="rental-calendar"></div><p id="rental-status"></p>',{url:'https://school.test/locations-core',runScripts:'outside-only'}),w=dom.window;
 w.key='public-test-key';w.createClient=()=>({rpc:async(name)=>fail?{error:{message:'Unavailable'}}:{data:name==='jds_core_rental_public_month'?{month:'2026-11-01',source_verified:true,days:[{date:'2026-11-01',available_slots:1,verified:true},{date:'2026-11-02',available_slots:0,verified:true}]}:[{studio_id:'one',room_name:'Salle 1',starts_at:'2026-11-01T09:00:00Z',ends_at:'2026-11-01T10:00:00Z',available:true,calendar_verified:true,hour_price_cents:4000,status_label:'Disponible'},{studio_id:'one',room_name:'Salle 1',starts_at:'2026-11-01T11:00:00Z',ends_at:'2026-11-01T12:00:00Z',available:false,calendar_verified:true,hour_price_cents:4000,status_label:'Indisponible'}]}});
 w.eval(source);await wait();return dom;
}
(async()=>{
 let dom=await run(),d=dom.window.document;
 assert.equal(d.querySelectorAll('.slot.available').length,1);assert.equal(d.querySelectorAll('.slot.unavailable').length,1);
 assert.equal(d.querySelectorAll('.slot.unavailable a').length,0);assert.match(d.querySelector('.slot.available a').href,/^mailto:contact@juste-debout.com/);
 assert.match(d.querySelector('.slot.available').textContent,/40/);assert.match(d.querySelector('.slot.available').textContent,/La réservation sera confirmée/);
 assert.equal(d.getElementById('rental-calendar').getAttribute('aria-busy'),'false');assert.match(d.querySelector('.calendar button[data-free=false]').textContent,/Indisponible/);
 assert.equal(d.querySelector('input').type,'month');dom.window.close();
 dom=await run(true);d=dom.window.document;assert.equal(d.querySelectorAll('.slot.available').length,0);assert.match(d.getElementById('rental-status').textContent,/Impossible/);assert.match(d.querySelector('button').textContent,/Réessayer/);dom.window.close();
 console.log('PASS: public month/day, room colour, blocked slots cannot request, email is explicitly a request, load error does not show availability.');
})().catch(e=>{console.error(e);process.exitCode=1;});
