import {createClient} from '@supabase/supabase-js';
import {key} from './config.js';
import {downloadReport,score} from './bulletin-pdf.js';
import coreCatalogue from './core-subject-catalogue.json';
const sb=createClient('https://zmzunjphubbdumowcurk.supabase.co',key,{auth:{storageKey:'jds-school-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const host=document.getElementById('bulletins'),status=document.getElementById('status');
let context,data,groupId,term=1,memberId,subjectId,busy=false,loadedTerm=1;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const message=(s,error=false)=>{status.textContent=s;status.className=error?'error':'success';};
async function checked(p){const r=await p;if(r.error)throw Error(r.error.message);return r.data;}
async function rpc(name,args){return checked(sb.rpc(name,args));}
async function action(fn){if(busy)return;busy=true;host.querySelectorAll('button').forEach(b=>b.disabled=true);message('En cours…');try{await fn();message('Enregistré.');}catch(e){message(e.message,true);}finally{busy=false;host.querySelectorAll('button').forEach(b=>b.disabled=false);}}
const btn=(label,fn,primary=false)=>{const b=el('button',label,primary?'primary':'');b.type='button';b.onclick=()=>action(fn);return b;};
function field(label,value='',type='text'){const l=el('label',label),i=el(type==='textarea'?'textarea':'input');if(type!=='textarea')i.type=type;i.value=value??'';l.append(i);return [l,i];}
function select(label,items,value,change){const l=el('label',label),s=el('select');items.forEach(([v,t])=>{const o=el('option',t);o.value=v;s.append(o);});s.value=value??'';s.onchange=()=>change?.(s.value);l.append(s);return[l,s];}
function check(label,value){const l=el('label',undefined,'check'),i=el('input');i.type='checkbox';i.checked=!!value;l.append(i,document.createTextNode(label));return[l,i];}
function area(title){const s=el('section');s.append(el('h2',title));host.append(s);return s;}
function number(i){if(i.value.trim()==='')return null;const n=Number(i.value.replace(',','.'));if(!Number.isFinite(n)||n<0)throw Error('Renseigne un nombre positif ou laisse vide.');return n;}
export function parseScores(value,max){if(!value.trim())return[];const values=value.split(/[;\n]+/).map(v=>Number(v.trim().replace(',','.')));if(values.length>100||values.some(v=>!Number.isFinite(v)||v<0||v>max)||value.split(/[;\n]+/).some(v=>!v.trim()))throw Error(`Sépare les notes par un point-virgule. Chaque note doit être comprise entre 0 et ${max}.`);return values;}
async function load(){let next;try{next=await rpc('jds_bulletin_group',{target_group:groupId,target_term:term});}catch(e){if(data){groupId=data.group.id;term=loadedTerm;render();}throw e;}data=next;loadedTerm=term;if(!data.members.some(m=>m.id===memberId))memberId=data.members[0]?.id;if(!data.subjects.some(s=>s.id===subjectId))subjectId=data.subjects[0]?.id;render();}
async function openReport(id){const r=await checked(sb.from('jds_bulletin_reports').select('snapshot').eq('id',id).single());await rpc('jds_read_bulletin_notice',{target_report:id});downloadReport(r.snapshot);}
function render(){host.replaceChildren();
 const own=area('Mes bulletins');if(!context.reports.length)own.append(el('p','Tes bulletins apparaîtront ici après publication par la direction.','muted'));
 for(const r of context.reports){const row=el('div',undefined,'report-row');row.append(el('strong',`${r.school_name} · ${r.class_name} · T${r.term} · v${r.version}`),el('p',`Publié le ${new Date(r.published_at).toLocaleDateString('fr-FR')}`),btn('Télécharger le PDF',()=>openReport(r.id)));own.append(row);}
 if(!context.groups.length){const s=area('Accès à la formation');s.append(el('p','Les professeurs accèdent à leurs classes après validation de leur fonction et attribution de leurs matières. Les élèves retrouvent leurs bulletins après validation de leur rattachement.'),Object.assign(el('a','Vérifier mes accès →'),{href:'/school-role.html'}));return;}
 const scope=area('Espace pédagogique');const grid=el('div',undefined,'grid');grid.append(select('Classe',context.groups.map(g=>[g.id,`${g.campus} · ${g.name} · ${g.season}`]),groupId,v=>action(async()=>{groupId=v;term=context.groups.find(g=>g.id===v)?.available_terms?.[0]||1;await load();}))[0],select('Période',(context.groups.find(g=>g.id===groupId)?.available_terms||[1,2,3]).map(t=>[String(t),`Trimestre ${t}`]),String(term),v=>action(async()=>{term=Number(v);await load();}))[0]);scope.append(grid,btn('Actualiser',load));
 if(!data)return;
 if(data.can_manage)renderConfig();
 if(!data.subjects.length){scope.append(el('p','Aucune matière attribuée pour ce trimestre. L’administration doit renseigner les matières, les professeurs et les coefficients.'));return;}
 if(!data.members.length){scope.append(el('p','Aucun élève rattaché à cette classe.'));return;}
 renderGrades();if(data.can_manage)renderDirection();
}
function renderConfig(){const details=el('details');details.append(el('summary',`Configurer les matières · ${data.subjects.length} matière(s)`),el('p','Choisis un professeur validé pour cette école et les coefficients du modèle. Laisser un coefficient vide bloque la publication. Un coefficient 0 exclut cette composante.','muted'));host.append(details);
 const subjectLabel=s=>`${s.subject}${s.teacher_name?' · '+s.teacher_name:''}`;
 const options=[['','Nouvelle matière'],...data.subjects.map(s=>[s.id,subjectLabel(s)])];const [sl,choice]=select('Matière à configurer',options,'',()=>draw());details.append(sl);const form=el('div');details.append(form);
 function draw(){form.replaceChildren();const s=data.subjects.find(s=>s.id===choice.value)||{};
 const [tl,title]=field('Intitulé de la matière',s.subject);title.maxLength=150;
 const teachers=context.teachers.filter(t=>t.campus===data.group.campus);
 const [pl,teacher]=select('Professeur validé',[['','À attribuer'],...teachers.map(t=>[t.id,t.name])],s.teacher_profile,()=>{label.value=teachers.find(t=>t.id===teacher.value)?.name||'';});
 const [nl,label]=field('Nom affiché sur le bulletin',s.teacher_name);label.maxLength=150;
 const [cl,cc]=field('Coefficient contrôle continu',s.cc_coefficient,'number'),[vl,ev]=field('Coefficient évaluation',s.evaluation_coefficient,'number'),[ol,order]=field('Ordre d’affichage',s.sort_order??0,'number');cc.step=ev.step='any';
 if(data.group.campus==='CORE'&&!s.id){
 const [catalogueLabel]=select('Reprendre une matière du catalogue CORE',[['','Saisie libre'],...coreCatalogue.map((entry,index)=>[String(index),`${entry.subject}${entry.teacher?' · '+entry.teacher:''}`])],'',value=>{
 if(value==='')return;
 const entry=coreCatalogue[Number(value)];title.value=entry.subject;label.value=entry.teacher;teacher.value='';
 });
 form.append(catalogueLabel,el('p','Catalogue du modèle CORE. Sélectionne uniquement les enseignements de cette classe et de ce trimestre, puis attribue le compte professeur validé et les coefficients.','muted'));
 }
 form.append(tl,pl,nl,cl,vl,ol,btn('Enregistrer la matière',async()=>{await rpc('jds_save_bulletin_subject',{target_group:groupId,target_term:term,title:title.value,teacher:teacher.value||null,teacher_label:label.value,cc_weight:number(cc),eval_weight:number(ev),sort_position:number(order)??0,subject_key:s.id||null});await load();},true));
 if(s.id)form.append(btn('Retirer de ce trimestre',async()=>{
 if(!window.confirm(`Retirer ${subjectLabel(s)} de ce trimestre ? Ses évaluations seront conservées. Les bulletins déjà publiés resteront inchangés.`))return;
 await rpc('jds_set_bulletin_subject_active',{subject_key:s.id,enabled:false});await load();
 }));
 if(!teachers.length)form.prepend(el('p','Aucun professeur validé pour cette école. Valide d’abord les demandes dans « Ma fonction · Mes accès ».','muted'));
 }draw();
 const archived=data.archived_subjects||[];
 if(archived.length){const removed=el('details');removed.append(el('summary',`Lignes retirées de ce trimestre · ${archived.length}`),el('p','Les évaluations sont conservées. Réintégrer une ligne la remet dans les prochains calculs et contrôles du bulletin.','muted'));
 for(const s of archived){const row=el('div',undefined,'report-row');row.append(el('strong',subjectLabel(s)),btn('Réintégrer dans ce trimestre',async()=>{await rpc('jds_set_bulletin_subject_active',{subject_key:s.id,enabled:true});await load();}));removed.append(row);}details.append(removed);}
}
function renderGrades(){const section=area(data.can_manage?'Suivi et saisie des évaluations':'Mes évaluations');
 const grid=el('div',undefined,'grid');grid.append(select('Élève',data.members.map(m=>[m.id,m.name]),memberId,v=>{memberId=v;render();})[0],select('Matière',data.subjects.map(s=>[s.id,`${s.subject}${s.teacher_name?' · '+s.teacher_name:''}`]),subjectId,v=>{subjectId=v;render();})[0]);section.append(grid);
 const g=data.grades.find(g=>g.member_id===memberId&&g.subject_id===subjectId)||{},s=data.subjects.find(s=>s.id===subjectId);
 section.append(el('p',`${s.teacher_name||'Professeur à attribuer'} · ${g.submitted?'Évaluation transmise':'Brouillon'}`,'muted'));
 if(g.submitted&&!data.can_manage){section.append(el('p',`Contrôle continu /5 : ${g.cc_exempt?'Non évalué':(g.cc_scores||[]).join(' ; ')} · Évaluation /20 : ${g.evaluation_exempt?'Non évaluée':(g.evaluation_scores||[]).join(' ; ')}`),el('p',g.appreciation),el('p','Évaluation transmise à l’administration. Pour corriger, demande une réouverture.'));return;}
 const [cl,cc]=field('Notes de contrôle continu /5 · séparées par ;',(g.cc_scores||[]).join(' ; '));cc.placeholder='Exemple : 4 ; 3,5 ; 5';
 const [vl,ev]=field('Notes d’évaluation /20 · séparées par ;',(g.evaluation_scores||[]).join(' ; '));ev.placeholder='Exemple : 14 ; 16';
 const [cn,ce]=check('Contrôle continu non évalué / dispensé',g.cc_exempt),[en,ee]=check('Évaluation non évaluée / dispensée',g.evaluation_exempt);
 const toggle=(input,checkbox)=>{input.disabled=checkbox.checked;checkbox.onchange=()=>{input.disabled=checkbox.checked;};};toggle(cc,ce);toggle(ev,ee);
 const [al,app]=field('Appréciation du professeur',g.appreciation,'textarea');app.maxLength=3000;
 section.append(cl,cn,vl,en,al,el('p','Une note manquante ne devient jamais un zéro. Indique explicitement « non évalué » si nécessaire.','muted'));
 async function save(send){await rpc('jds_save_bulletin_grade',{subject_key:subjectId,student_member:memberId,cc:ce.checked?[]:parseScores(cc.value,5),evaluations:ee.checked?[]:parseScores(ev.value,20),no_cc:ce.checked,no_evaluations:ee.checked,comment:app.value,send,expected_revision:g.revision||0});await load();}
 section.append(btn(g.submitted?'Enregistrer et rouvrir le brouillon':'Enregistrer le brouillon',()=>save(false)),btn('Transmettre à l’administration',()=>save(true),true));
}
function renderDirection(){const progress=area('Avancement de la classe');const wrap=el('div',undefined,'table-wrap'),table=el('table'),head=el('thead'),tr=el('tr');['Élève','Évaluations transmises','Compte lié'].forEach(v=>tr.append(el('th',v)));head.append(tr);table.append(head);const body=el('tbody');for(const m of data.members){const tr=el('tr');[m.name,`${data.grades.filter(g=>g.member_id===m.id&&g.submitted).length} / ${data.subjects.length}`,m.linked?'Oui':'À rattacher'].forEach(v=>tr.append(el('td',v)));body.append(tr);}table.append(body);wrap.append(table);progress.append(wrap);
 const section=area(`Synthèse · ${data.members.find(m=>m.id===memberId)?.name}`),d=data.drafts.find(d=>d.member_id===memberId)||{};
 const [sl,summary]=field('Synthèse de la direction',d.summary,'textarea');summary.maxLength=5000;
 const [jl,j]=field('Nombre d’absences justifiées',d.justified_absences,'number'),[ul,u]=field('Nombre d’absences non justifiées',d.unjustified_absences,'number');j.min=u.min='0';j.step=u.step='1';const grid=el('div',undefined,'grid');grid.append(jl,ul);
 section.append(sl,grid,el('p','Vérifie les absences du trimestre. Saisis 0 si aucune ; elles ne sont pas calculées automatiquement tant que les périodes et présences ne sont pas complètes.','muted'));
 async function save(){await rpc('jds_save_bulletin_draft',{student_member:memberId,target_term:term,director_summary:summary.value,justified:number(j),unjustified:number(u),expected_revision:d.revision||0});}
 section.append(btn('Enregistrer la synthèse',async()=>{await save();await load();},true));
 const preview=el('div',undefined,'preview');let payload;
 section.append(btn('Vérifier le bulletin complet',async()=>{payload=await rpc('jds_preview_bulletin',{student_member:memberId,target_term:term});preview.replaceChildren(el('h3','Bulletin complet · prêt pour relecture'),el('p',`${payload.school_name} · ${payload.address}`),el('p',`Moyenne CC : ${score(payload.cc_average20)} /20 · Évaluations : ${score(payload.evaluation_average20)} /20`),el('p',payload.summary),btn('Télécharger l’aperçu PDF',()=>downloadReport(payload)));message('Vérification réussie. Relis l’aperçu PDF avant publication.');}),preview);
 section.append(el('small','La vérification et la publication utilisent les dernières données enregistrées.'));
 const versions=data.reports.filter(r=>r.member_id===memberId).sort((a,b)=>b.version-a.version),latest=versions[0]?.version||0;
 if(data.can_publish){const [rl,reason]=field(latest?'Motif de correction (obligatoire)':'Note de publication (facultatif)');reason.maxLength=1000;section.append(rl,btn(latest?'Publier une nouvelle version':'Publier le bulletin',async()=>{await rpc('jds_preview_bulletin',{student_member:memberId,target_term:term});if(!window.confirm(`Publier le bulletin de ${data.members.find(m=>m.id===memberId)?.name}, trimestre ${term} ? Cette version sera figée et accessible à l’élève dès que son compte est rattaché.`))return;await rpc('jds_publish_bulletin',{student_member:memberId,target_term:term,expected_version:latest,correction_reason:reason.value});context=await rpc('jds_bulletin_context');await load();},true));}else section.append(el('p','La publication est réservée à la direction de l’école ou à l’administration globale.'));
 if(versions.length){section.append(el('h3','Versions publiées'));for(const r of versions)section.append(btn(`PDF · version ${r.version} · ${new Date(r.published_at).toLocaleDateString('fr-FR')}`,()=>openReport(r.id)));}
}
async function init(){try{const {data:{session},error}=await sb.auth.getSession();if(error)throw error;if(!session){host.replaceChildren(el('p','Connecte-toi à ton compte School pour accéder à tes bulletins.'),Object.assign(el('a','Me connecter →','button'),{href:'/login'}));return;}context=await rpc('jds_bulletin_context');groupId=context.groups[0]?.id;term=context.groups[0]?.available_terms?.[0]||1;if(groupId)await load();else render();}catch(e){message(e.message,true);host.replaceChildren(btn('Réessayer',init));}}
sb.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){host.replaceChildren(el('p','Session terminée. Reconnecte-toi pour continuer.'));}});
init();
