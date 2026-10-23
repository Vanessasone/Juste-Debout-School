import {createClient} from '@supabase/supabase-js';
import {key} from './config.js';
import {fields,detectMapping,proposals,buildDraft,matchedMember,MAX_ROWS} from './import-core.js';
import {euro} from './tuition-core.js';
const sb=createClient('https://zmzunjphubbdumowcurk.supabase.co',key,{auth:{storageKey:'jds-school-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const host=document.getElementById('importer'),message=document.getElementById('message');
let authorized=false,epoch=0,data=null,group='',analysis=null,sheet=0,header=0,mapping={},items=[],source='',busy=false,worker=null,timer=null,abortRead=null;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function status(text,error=false){message.textContent=text;message.className=error?'error':'success';}
function button(text,action,primary=false){const b=el('button',text,primary?'primary':'');b.type='button';b.disabled=busy;b.onclick=action;return b;}
function link(text,url){const a=el('a',text,'button');a.href=url;return a;}
function input(box,label,value,change,type='text'){const l=el('label',label),i=el(type==='textarea'?'textarea':'input');if(type!=='textarea')i.type=type;i.value=value||'';i.oninput=()=>change(i.value);l.append(i);box.append(l);return i;}
function select(box,label,options,value,change){const l=el('label',label),s=el('select');for(const [v,t] of options)s.append(new Option(t,v));s.value=value;s.onchange=()=>change(s.value);l.append(s);box.append(l);return s;}
function check(box,label,value,change){const l=el('label',undefined,'check'),i=el('input');i.type='checkbox';i.checked=value;i.onchange=()=>change(i.checked);l.append(i,el('span',label));box.append(l);return i;}
async function checked(p){const r=await p;if(r.error)throw Error(r.error.message);return r.data;}
async function loadData(){const [finance,enrollment]=await Promise.all([checked(sb.rpc('jds_tuition_data')),checked(sb.rpc('jds_enrollment_workspace'))]);return {...finance,roster:finance.roster.map(m=>({...m,email:enrollment.roster.find(e=>e.member_id===m.member_id)?.email||''}))};}
function roster(){return data.roster.filter(m=>m.group_id===group);}
function cancelWorker(){if(worker){worker.terminate();worker=null;}clearTimeout(timer);timer=null;if(abortRead){const reject=abortRead;abortRead=null;reject(Error('Lecture annulée.'));}}
function clear(){epoch++;cancelWorker();authorized=false;data=null;analysis=null;items=[];mapping={};source='';busy=false;host.replaceChildren(link('Me connecter','/app/login'));status('Connexion School requise.');}
function invalidate(p){p.selected=false;p.terms=false;p.receiptVerified=false;p.fundingConfirmed=false;p.scheduleConfirmed=false;p.error='';}
async function read(file){if(busy||!authorized)return;const ticket=++epoch;cancelWorker();busy=true;analysis=null;items=[];source='';render();status('Lecture du fichier dans ton navigateur…');
 try{if(file.size>5*1024*1024)throw Error('5 Mo maximum. Sépare les fichiers volumineux en plusieurs lots.');
  if(!/\.(xlsx|csv|tsv|pdf|txt)$/i.test(file.name))throw Error('Formats acceptés : XLSX, CSV, TSV, PDF texte et TXT.');
  const buffer=await file.arrayBuffer();if(ticket!==epoch||!authorized)return;
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),x=>x.toString(16).padStart(2,'0')).join('');if(ticket!==epoch||!authorized)return;
  source='Import '+file.name.slice(0,140)+' · SHA-256 '+digest;
  const result=await new Promise((resolve,reject)=>{abortRead=reject;worker=new Worker('/app/assets/import-file-worker.js');timer=setTimeout(()=>{worker?.terminate();worker=null;reject(Error('Lecture interrompue après 45 secondes. Réduis le fichier ou utilise un CSV.'));},45000);worker.onmessage=e=>{if(typeof e.data?.ok!=='boolean')return;clearTimeout(timer);abortRead=null;e.data.ok?resolve(e.data.result):reject(Error(e.data.error||'Analyse impossible. Vérifie le fichier.'));};worker.onerror=()=>{clearTimeout(timer);abortRead=null;reject(Error('Le fichier ne peut pas être analysé. Réessaie avec un CSV ou un fichier plus petit.'));};worker.postMessage({buffer,name:file.name},[buffer]);});
  if(ticket!==epoch||!authorized)return;analysis=result;sheet=0;header=0;mapping={};if(result.type==='document'){const p=proposals([[]],{},roster())[0];Object.assign(p,result.suggestion);p.member=matchedMember(p.email,p.name,roster());items=[p];}status('Lecture terminée. Aucune information enregistrée : vérifie les propositions.');
 }catch(e){if(ticket===epoch&&authorized){analysis=null;items=[];source='';status(e.message,true);}}
 finally{if(ticket===epoch){cancelWorker();busy=false;if(authorized)render();}}
}
function prepare(){try{const rows=analysis.sheets[sheet].rows;if(!rows[header])throw Error('Choisis une ligne d’en-têtes.');items=proposals(rows.slice(header+1).filter(r=>r.some(v=>String(v).trim())),mapping,roster());if(!items.length)throw Error('Aucune ligne sous les en-têtes.');render();status(items.length+' proposition(s) à vérifier.');}catch(e){status(e.message,true);}}
function manual(){analysis=null;source='Saisie manuelle';items=proposals([[]],{},roster());render();}
function rowIssue(p){if(p.saved)return '';if(!p.member)return 'Élève ou promotion à choisir.';if(!roster().some(m=>m.member_id===p.member))return 'Cet élève ne fait pas partie de la promotion choisie.';if(data.accounts.some(a=>a.member_id===p.member))return 'Un dossier existe déjà : ouvre-le dans les finances pour le compléter.';if(items.filter(x=>!x.saved&&x.member===p.member).length>1)return 'Plusieurs lignes concernent cet élève : conserve une seule ligne, puis complète ses échéances dans les finances.';try{buildDraft(p,data.today,source);return '';}catch(e){return e.message;}}
async function save(){if(busy||!authorized)return;const selected=items.filter(p=>p.selected&&!p.saved);if(!selected.length){status('Valide au moins une ligne.',true);return;}
 for(const p of selected){const issue=rowIssue(p);if(issue){p.error=issue;render();status('Corrige les lignes signalées avant de continuer.',true);return;}}
 const ticket=epoch;busy=true;render();status('Enregistrement des dossiers validés…');let saved=0;
 try{
  // Check again before creating. The existing database unique constraint is the final race guard.
  const latest=await loadData();if(ticket!==epoch||!authorized)return;data=latest;
  for(const p of selected){if(ticket!==epoch||!authorized)return;const issue=rowIssue(p);if(issue)throw Error(issue);
   const details=buildDraft(p,data.today,source);await checked(sb.rpc('jds_save_tuition_account',{account_key:null,expected_revision:null,details}));
   if(ticket!==epoch||!authorized)return;p.saved=true;p.selected=false;saved++;data.accounts.push({...details,id:'saved-'+p.member});
  }
  if(ticket===epoch&&authorized)status(saved+' dossier(s) enregistré(s). Les échéanciers non confirmés restent à compléter dans les finances.');
 }catch(e){if(ticket===epoch&&authorized){status(saved+' dossier(s) enregistré(s). Arrêt : '+e.message+' Actualise les finances avant de reprendre les lignes restantes.',true);for(const p of items)if(!p.saved){p.selected=false;p.error='Vérifie les finances avant une nouvelle tentative.';}}}
 finally{if(ticket===epoch&&authorized){busy=false;render();}}
}
function render(){if(!authorized||!data)return;host.replaceChildren();const intro=el('aside');intro.append(el('strong','1. Choisir la formation · 2. Lire le fichier · 3. Vérifier et enregistrer'),el('p','Les fichiers sont analysés dans ton navigateur et ne sont pas envoyés à un service d’analyse. Seules les informations que tu valides sont enregistrées dans School. Fermer la page efface la préparation non enregistrée.'));
 host.append(intro);const groups=data.groups?.map(g=>[g.group_id,g.campus+' · '+g.promotion+' · '+g.season])||[...new Map(data.roster.map(m=>[m.group_id,[m.group_id,m.campus+' · '+m.promotion+' · '+m.season]])).values()];
 select(host,'Formation / promotion',[[ '', 'Choisir une formation' ],...groups],group,v=>{group=v;analysis=null;items=[];mapping={};source='';render();});
 if(!group){host.append(el('p','Choisis la promotion concernée pour rapprocher les personnes du bon groupe.'));return;}
 const start=el('section',undefined,'card');start.append(el('h2','Comment veux-tu commencer ?'));const file=input(start,'Fichier à analyser','','', 'file');file.oninput=null;file.accept='.xlsx,.csv,.tsv,.pdf,.txt';file.onchange=()=>{if(file.files?.[0])void read(file.files[0]);};start.append(el('p','Excel XLSX, CSV/TSV, PDF avec texte ou TXT. 5 Mo, 300 lignes ou 30 pages maximum. Les scans et photos nécessitent une transcription.','muted'),button('Saisir un dossier à la main',manual),link('Modifier les modalités et les pièces demandées','/app/enrollments.html?group='+encodeURIComponent(group)));host.append(start);
 if(analysis?.type==='table'){
  const box=el('section',undefined,'card');box.append(el('h2','Associer les colonnes'));select(box,'Feuille',analysis.sheets.map((s,i)=>[String(i),s.name]),String(sheet),v=>{sheet=Number(v);header=0;mapping={};items=[];render();});const rows=analysis.sheets[sheet].rows;
  select(box,'Ligne des en-têtes',rows.slice(0,20).map((r,i)=>[String(i),(i+1)+' · '+r.slice(0,4).join(' / ').slice(0,120)]),String(header),v=>{header=Number(v);mapping={};items=[];render();});
  if(!Object.keys(mapping).length)mapping=detectMapping(rows[header]||[]);const mapBox=el('div',undefined,'fields');for(const [key,label] of fields)select(mapBox,label,[['-1','Ne pas importer'],...(rows[header]||[]).map((v,i)=>[String(i),(i+1)+' · '+String(v).slice(0,100)])],String(mapping[key]??-1),v=>{mapping[key]=Number(v);items=[];render();});
  box.append(mapBox,el('p','Les colonnes inconnues restent ignorées. Vérifie notamment tarif total, remise, bourse interne et montant reçu : ces montants ont des sens différents.','muted'),button('Préparer les propositions',prepare,true));host.append(box);
 }
 if(analysis?.type==='document'){const box=el('details');box.append(el('summary','Consulter le texte extrait du document'));const raw=el('pre',analysis.text,'import-source');box.append(raw,el('p','Seuls les libellés explicites sont proposés. Les montants ambigus restent vides. Vérifie le document original si une ligne paraît mal extraite.','muted'));host.append(box);}
 if(items.length){host.append(el('h2','Vérifier les propositions'),el('p','Une ligne par élève et promotion. Les dossiers existants sont protégés contre l’écrasement. Pour un échéancier à plusieurs dates, utilise ensuite le dossier financier.','muted'));
  for(const [index,p] of items.entries()){
   const box=el('article',undefined,'card');box.append(el('h3','Proposition '+(index+1)+(p.name?' · '+p.name:'')));
   if(p.saved){box.append(el('strong','Dossier enregistré','success'));host.append(box);continue;}
   const raw=el('details');raw.append(el('summary','Voir la ligne source'),el('p',p.source.join(' · ')||'Saisie manuelle ou document texte','preline'));box.append(raw);
   const options=[['','Choisir l’élève et sa promotion'],...roster().map(m=>[m.member_id,m.student_name+' · '+(m.email||'email absent')])];
   select(box,'Élève destinataire',options,p.member,v=>{p.member=v;invalidate(p);render();});box.append(el('p','Identité source : '+(p.email||p.name||'à identifier'),'muted'));
   const existing=data.accounts.find(a=>a.member_id===p.member);if(existing){box.append(el('p','Dossier existant : aucun écrasement par import.','error'),link('Ouvrir le dossier existant','/app/tuition.html?member='+encodeURIComponent(p.member)));host.append(box);continue;}
   const editor=el('div',undefined,'fields');for(const [key,label] of fields){if(['email','name'].includes(key))continue;const control=input(editor,label,p[key],v=>{p[key]=v;invalidate(p);const checks=box.querySelectorAll('input[type=checkbox]');for(const c of checks)c.checked=false;updateValidity();});control.maxLength=['payer','organization'].includes(key)?160:['invoice','reference'].includes(key)?200:60;}
   box.append(editor);const summary=el('p','', 'muted');box.append(summary);
   check(box,'Je confirme le tarif, la remise et la bourse interne de cette ligne',p.terms,v=>{p.terms=v;p.selected=false;render();});
   check(box,'Le financement externe a été confirmé par l’organisme',p.fundingConfirmed,v=>{p.fundingConfirmed=v;p.selected=false;render();});
   check(box,'Cet échéancier est complet et correspond au tarif net',p.scheduleConfirmed||false,v=>{p.scheduleConfirmed=v;p.selected=false;render();});
   if(p.received||p.paid)box.append(el('p','Le règlement proposé reste exclu des encaissements tant que sa réception n’est pas vérifiée ci-dessous.','attention'));
   check(box,'J’ai vérifié la réception réelle du règlement et je veux le comptabiliser',p.receiptVerified,v=>{p.receiptVerified=v;p.selected=false;render();});
   function updateValidity(){const issue=rowIssue(p);issueNode.textContent=issue;accept.disabled=!!issue||busy;summary.textContent='';try{const d=buildDraft(p,data.today,source);summary.textContent='Tarif net : '+(d.base_cents===null?'à définir':euro(d.base_cents-d.discount_cents-d.school_aid_cents))+' · '+(p.terms?'conditions confirmées':'brouillon, exclu des totaux confirmés')+' · '+(d.receipts.length?'règlement vérifié : '+euro(d.receipts[0].amount_cents):'aucun règlement à comptabiliser');}catch{}}
   const issueNode=el('p','','error');box.append(issueNode);if(p.error)box.append(el('p',p.error,'error'));
   const accept=check(box,'J’ai vérifié cette proposition et son élève destinataire',p.selected,v=>{p.selected=v;});updateValidity();
   box.append(button('Retirer cette proposition',()=>{items.splice(index,1);render();}));host.append(box);
  }
  host.append(button('Enregistrer uniquement les propositions validées',()=>void save(),true),link('Ouvrir les finances','/app/tuition.html'));
 }
 for(const control of host.querySelectorAll('input,select,button'))if(busy)control.disabled=true;
}
async function init(){const ticket=++epoch;try{const {data:{session},error}=await sb.auth.getSession();if(error)throw error;if(ticket!==epoch)return;if(!session){clear();return;}const allowed=await checked(sb.rpc('jds_school_finance_access'));if(ticket!==epoch)return;if(!allowed)throw Error('Accès réservé aux directeurs School activés.');const result=await loadData();if(ticket!==epoch)return;authorized=true;data=result;render();status('Choisis une formation pour commencer.');}catch(e){if(ticket===epoch){authorized=false;data=null;host.replaceChildren(button('Réessayer',init));status(e.message,true);}}}
sb.auth.onAuthStateChange?.(event=>{if(event==='SIGNED_OUT')clear();else if(event==='SIGNED_IN')setTimeout(()=>void init(),0);});
window.addEventListener('pagehide',()=>clear());void init();
