import {createClient} from '@supabase/supabase-js';
import {key} from './config.js';
let gateUser=null;
const portal=!!document.getElementById('school-access');
const sb=createClient('https://zmzunjphubbdumowcurk.supabase.co',key,{auth:{storageKey:'jds-school-auth-v1',persistSession:true,autoRefreshToken:portal,detectSessionInUrl:false}});
const labels={open:'Participant aux cours open',student:'Élève en formation',teacher:'Professeur',team:'Membre de l’équipe'};
const statuses={pending:'En attente de validation',approved:'Demande acceptée',rejected:'Demande refusée'};
const elt=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n};
async function checked(p){const r=await p;if(r.error)throw new Error(r.error.message);return r.data}
async function init(){
 const {data:{session}}=await sb.auth.getSession();
 if(!session){if(portal){document.getElementById('school-access').textContent='Connecte-toi à ton compte School pour choisir ta fonction.';document.getElementById('login').hidden=false}return}
 const user=session.user;
 if(!portal&&gateUser===user.id)return;
 if(!portal)gateUser=user.id;
 if(!portal){
  let busy=false,done=false;
  const check=async()=>{if(busy||done||localStorage.getItem('jds_onboarded')!=='1')return;
   const path=location.pathname;if(!['/','/profile','/admin'].includes(path))return;
   if(!document.getElementById('school-function-link')){const a=elt('a','Ma fonction · Mes accès','school-function-link');a.id='school-function-link';a.href='/school-role.html';document.body.append(a)}
   if(path!=='/')return;busy=true;try{const row=await checked(sb.from('jds_function_choices').select('function').eq('profile_id',user.id).maybeSingle());done=true;if(!row)location.assign('/school-role.html')}catch{/* Preserve the app when the network is unavailable. */}finally{busy=false}
  };let timer;const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(check,250)});observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true});check();return;
 }
 const host=document.getElementById('school-access'),message=document.getElementById('message');
 function status(text,error=false){message.textContent=text;message.className=error?'error':'success'}
 let busy=false;
 async function action(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn()}catch(e){status(e.message,true)}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false)}}
 async function render(){
 const [choice,requests,campuses]=await Promise.all([
 checked(sb.from('jds_function_choices').select('function').eq('profile_id',user.id).maybeSingle()),
 checked(sb.from('jds_access_requests').select('id,kind,campus,disciplines,status,review_note,requested_at').eq('profile_id',user.id).order('requested_at',{ascending:false})),
 checked(sb.rpc('jds_access_reviewer_campuses'))]);
 host.replaceChildren();
 const form=elt('form'),fs=elt('fieldset'),legend=elt('legend','Quelle est ta fonction ?');fs.append(legend);
 for(const [value,label]of Object.entries(labels)){const line=elt('label',null,'role-option'),radio=elt('input');radio.type='radio';radio.name='function';radio.value=value;radio.checked=(choice?.function||'open')===value;line.append(radio,elt('span',label));fs.append(line)}form.append(fs);
 const details=elt('div'),campusLabel=elt('label','Ton école'),campus=elt('select');campus.name='campus';for(const code of ['CORE','INDUSTRY']){const o=elt('option',code);o.value=code;campus.append(o)}campusLabel.append(campus);
 const subjectLabel=elt('label','Tes disciplines'),subjects=elt('textarea');subjects.maxLength=500;subjects.rows=3;subjects.placeholder='Hip-Hop, House Dance…';subjectLabel.append(subjects);details.append(campusLabel,subjectLabel,elt('p','La demande sera examinée avant l’ouverture des accès. Pour les deux écoles, envoie une demande par école.','muted'));form.append(details);
 const save=elt('button','Enregistrer ma fonction');save.type='submit';form.append(save);
 function sync(){const kind=form.elements.function.value;details.hidden=!['teacher','team'].includes(kind);subjectLabel.hidden=kind!=='teacher';subjects.required=kind==='teacher';save.textContent=['teacher','team'].includes(kind)?'Enregistrer et demander mon accès':'Enregistrer ma fonction'}
 form.onchange=sync;sync();form.onsubmit=e=>{e.preventDefault();action(async()=>{const kind=form.elements.function.value;if(['teacher','team'].includes(kind))await checked(sb.rpc('jds_submit_access_request',{request_kind:kind,school:campus.value,subjects:subjects.value}));await checked(sb.from('jds_function_choices').upsert({profile_id:user.id,function:kind,updated_at:new Date().toISOString()}));await render();status(['teacher','team'].includes(kind)?'Demande enregistrée. Son statut apparaît ci-dessous.':'Fonction enregistrée. Tu peux revenir à l’accueil.');})};host.append(form);
 if(choice?.function==='student')host.append(elt('p','Ton rattachement à une promotion est vérifié par l’équipe de ton école. Choisir cette fonction ne valide pas ton dossier.','muted'));
 if(requests?.length){host.append(elt('h2','Mes demandes'));for(const r of requests){const card=elt('article',null,'card');card.append(elt('h3',labels[r.kind]+' · '+r.campus),elt('p',statuses[r.status],r.status));if(r.review_note)card.append(elt('p',r.review_note));if(r.status==='approved'&&r.kind==='teacher')card.append(elt('p','Ton statut professeur est validé pour cette école. Le rattachement aux classes et les bulletins seront ajoutés avec les éléments pédagogiques de l’école.','muted'));if(r.status==='approved'&&r.kind==='team')card.append(elt('p','L’administration doit ensuite rattacher ton compte aux responsabilités prévues.','muted'));host.append(card)}}
 if(campuses?.length){host.append(elt('h2','Demandes à valider'),elt('p','Périmètre : '+campuses.join(' et '),'muted'));const queue=await checked(sb.rpc('jds_access_review_queue'));if(!queue.length)host.append(elt('p','Aucune demande en attente.'));for(const r of queue){const card=elt('article',null,'card');card.append(elt('h3',r.applicant_name),elt('p',labels[r.kind]+' · '+r.campus),elt('p',r.disciplines));const noteLabel=elt('label','Message à la personne (facultatif)'),note=elt('textarea');note.maxLength=1000;note.rows=2;noteLabel.append(note);card.append(noteLabel);for(const decision of ['approved','rejected']){const b=elt('button',decision==='approved'?'Accepter':'Refuser',decision==='rejected'?'secondary':'');b.type='button';b.onclick=()=>action(async()=>{if(!confirm((decision==='approved'?'Accepter':'Refuser')+' la demande de '+r.applicant_name+' pour '+r.campus+' ?'))return;await checked(sb.rpc('jds_review_access_request',{request_id:r.id,decision,note:note.value}));await render();status('Décision enregistrée.');});card.append(b)}host.append(card)}}
 }
 await render();
}
if(!portal)sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session)setTimeout(()=>init().catch(()=>{}),0)});
init().catch(e=>{const m=document.getElementById('message');if(m){m.textContent='Chargement impossible : '+e.message;m.className='error';const b=elt('button','Réessayer');b.onclick=()=>location.reload();m.after(b)}});
