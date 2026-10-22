const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
let source=fs.readFileSync(__dirname+'/bulletins.js','utf8').replace(/^import .*;$/mg,'').replace('export function parseScores','function parseScores');
const wait=()=>new Promise(r=>setTimeout(r,30));
async function run({manager=false,publisher=false,own=false,session=true,campus='INDUSTRY'}={}){
 const dom=new JSDOM('<p id="status"></p><div id="bulletins"></div>',{url:'https://school.test/bulletins.html',runScripts:'outside-only'}),w=dom.window,calls=[];
 const group={id:'group',campus,name:'P2',season:'2026-2027'};
 const ctx={groups:own?[]:[group],teachers:[{id:'teacher',campus:'INDUSTRY',name:'Prof Test'}],reports:own?[{id:'report',term:1,version:1,published_at:'2026-10-22',school_name:'Industry',class_name:'P2'}]:[]};
 const data={group,can_manage:manager,can_publish:publisher,subjects:[{id:'subject',subject:'Hip-Hop',teacher_profile:'teacher',teacher_name:'Prof Test',cc_coefficient:1,evaluation_coefficient:2}],members:[{id:'member',name:'Élève Test',linked:true}],grades:[],drafts:[],reports:[]};
 w.createClient=()=>({auth:{getSession:async()=>({data:{session:session?{user:{id:'user'}}:null}}),onAuthStateChange:()=>{}},rpc:async(name,args)=>{calls.push([name,args]);return{data:name==='jds_bulletin_context'?ctx:name==='jds_bulletin_group'?data:{rows:[]}};}});w.key='test';w.downloadReport=()=>{};w.score=v=>v??'—';w.confirm=()=>false;
 w.coreCatalogue=JSON.parse(fs.readFileSync(__dirname+'/core-subject-catalogue.json','utf8'));w.eval(source);await wait();return{w,calls,dom};
}
(async()=>{
 let t=await run({session:false});assert.match(t.w.document.body.textContent,/Me connecter/);assert.equal(t.calls.length,0);t.dom.window.close();
 t=await run();assert.match(t.w.document.body.textContent,/Mes évaluations/);assert.doesNotMatch(t.w.document.body.textContent,/Configurer les matières|Publier le bulletin|Synthèse ·/);
 const labels=[...t.w.document.querySelectorAll('label')];labels.find(l=>l.textContent.includes('contrôle continu /5')).querySelector('input').value='4 ; 3,5 ; 5';labels.find(l=>l.textContent.includes('évaluation /20')).querySelector('input').value='14 ; 16';labels.find(l=>l.textContent.includes('Appréciation')).querySelector('textarea').value='Bon travail';
 [...t.w.document.querySelectorAll('button')].find(b=>b.textContent==='Transmettre à l’administration').click();await wait();const save=t.calls.find(c=>c[0]==='jds_save_bulletin_grade')[1];assert.deepEqual(Array.from(save.cc),[4,3.5,5]);assert.deepEqual(Array.from(save.evaluations),[14,16]);assert.equal(save.send,true);assert.equal(save.expected_revision,0);t.dom.window.close();
 t=await run({manager:true});assert.match(t.w.document.body.textContent,/Configurer les matières/);assert.match(t.w.document.body.textContent,/publication est réservée/);assert.doesNotMatch(t.w.document.body.textContent,/Publier le bulletin/);t.dom.window.close();
 t=await run({manager:true,publisher:true});assert.match(t.w.document.body.textContent,/Publier le bulletin/);const coefficients=[...t.w.document.querySelectorAll('label')].filter(l=>l.textContent.startsWith('Coefficient'));assert.equal(coefficients[0].querySelector('input').value,'');t.dom.window.close();
 t=await run({own:true});assert.match(t.w.document.body.textContent,/Télécharger le PDF/);assert.doesNotMatch(t.w.document.body.textContent,/Mes évaluations|Configurer les matières/);t.dom.window.close();
 t=await run({manager:true,campus:'CORE'});
 const catalogue=[...t.w.document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Reprendre une matière')).querySelector('select');
 catalogue.value='0';catalogue.dispatchEvent(new t.w.Event('change'));
 const coreLabels=[...t.w.document.querySelectorAll('label')];
 assert.equal(coreLabels.find(l=>l.textContent.startsWith('Intitulé')).querySelector('input').value,'B.BOYING');
 assert.equal(coreLabels.find(l=>l.textContent.startsWith('Nom affiché')).querySelector('input').value,'ADILSON');
 assert.equal(coreLabels.find(l=>l.textContent.startsWith('Professeur validé')).querySelector('select').value,'');
 assert.equal(coreLabels.find(l=>l.textContent.startsWith('Coefficient contrôle')).querySelector('input').value,'');
 [...t.w.document.querySelectorAll('button')].find(b=>b.textContent==='Enregistrer la matière').click();await wait();
 const subjectSave=t.calls.find(c=>c[0]==='jds_save_bulletin_subject')[1];
 assert.equal(subjectSave.title,'B.BOYING');assert.equal(subjectSave.teacher,null);assert.equal(subjectSave.cc_weight,null);assert.equal(subjectSave.eval_weight,null);t.dom.window.close();
 console.log('Bulletins UI: signed-out, teacher, admin, director, student, French scores and blank coefficients passed.');
})().catch(e=>{console.error(e);process.exit(1);});
