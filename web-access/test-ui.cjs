const {JSDOM}=require('jsdom');
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/access.js','utf8').replace(/^import .*;\n/gm,'');
const html=fs.readFileSync(__dirname+'/school-role.html','utf8');
async function waitFor(check){for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,5))}throw Error('UI timeout')}
(async()=>{for(const role of ['teacher','student','open']){
 const dom=new JSDOM(html,{url:'https://school.example/school-role.html',runScripts:'outside-only'}),w=dom.window;
 let choice=null,requests=[],calls=[];
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'test-user'}}}})},from(){const q={select(){return q},eq(){return q},order:async()=>({data:requests}),maybeSingle:async()=>({data:choice}),upsert:async row=>{choice={function:row.function};return {data:null}}};return q},rpc:async(name,args)=>{calls.push({name,args});if(name==='jds_access_reviewer_campuses')return {data:[]};if(name==='jds_enrollment_classes')return {data:[{id:'core-p1',campus:'CORE',name:'P1',season:'2026-2027'},{id:'industry-p2',campus:'INDUSTRY',name:'P2',season:'2026-2027'}]};if(['jds_submit_access_request','jds_submit_student_request'].includes(name)){requests=[{id:'r1',kind:role,campus:args.school,status:'pending'}];return {data:'r1'}}throw Error(name)}};
 w.createClient=()=>client;w.key='public-test-key';w.eval(source);
 await waitFor(()=>w.document.querySelectorAll('input[type=radio]').length===4);
 const radio=w.document.querySelector('input[value='+role+']');radio.checked=true;radio.dispatchEvent(new w.Event('change',{bubbles:true}));
 const campus=w.document.querySelector('select[name=campus]');campus.value='INDUSTRY';campus.dispatchEvent(new w.Event('change',{bubbles:true}));
 const classes=w.document.querySelector('select[name=training_group]');
 assert.deepEqual(Array.from(classes.options).map(x=>x.value),['','industry-p2']);
 if(role==='student'){assert.equal(classes.required,true);classes.value='industry-p2';assert.equal(w.document.querySelector('textarea').required,false)}else{assert.equal(w.document.querySelector('textarea').required,true);w.document.querySelector('textarea').value='House'}
 w.document.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await waitFor(()=>w.document.getElementById('message').textContent.includes('Demande enregistrée'));
 assert.equal(choice.function,role);assert.match(w.document.body.textContent,/En attente de validation/);
 const args=JSON.parse(JSON.stringify(calls.find(c=>c.name===(role==='teacher'?'jds_submit_access_request':'jds_submit_student_request')).args));
 if(role==='student')assert.deepEqual(args,{path:'formation',school:'INDUSTRY',training_group:'industry-p2',open_classes:''});
 if(role==='open')assert.deepEqual(args,{path:'open',school:'INDUSTRY',training_group:null,open_classes:'House'});
 assert.equal(w.document.body.textContent.includes('Demandes à valider'),false);w.close();
}console.log('PASS: teacher/open/formation requests, campus-filtered classes, required inputs, saved choice and pending receipt, no reviewer UI for applicants');})().catch(e=>{console.error(e);process.exitCode=1});
