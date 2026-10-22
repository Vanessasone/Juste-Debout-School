const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(options={}){
 const calls=[];const api={auth:{getUser:async()=>({data:{user:{id:'uploader'}},error:null})},storage:{from:()=>({upload:async(...args)=>{calls.push(['upload',...args]);return {error:options.uploadError??null};},createSignedUrl:async(path,ttl)=>{calls.push(['signed',path,ttl]);return {data:{signedUrl:'https://example.invalid/private'},error:null};}})},rpc:async(name,args)=>{calls.push(['rpc',name,args]);return {data:options.receipt===undefined?'request-id':options.receipt,error:null};}};
 const moduleExports={};const source=ts.transpileModule(fs.readFileSync('src/lib/absence-requests.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{exports:moduleExports,require:()=>({supabase:api}),crypto:{randomUUID:()=> 'random-id'},Date});return {api:moduleExports,calls};
}
(async()=>{
 const {api,calls}=load();const file={name:'justificatif.pdf',type:'application/pdf',size:123};
 for(const f of [null,{...file,size:0},{...file,size:10485761},{...file,type:'text/html'}])assert.throws(()=>api.validateAbsence('2026-11-02','2026-11-03',f));
 for(const [first,last] of [['2026-02-30','2026-03-01'],['2026-11-03','2026-11-02'],['','2026-11-03']])assert.throws(()=>api.validateAbsence(first,last,file));
 await assert.rejects(api.submitAbsence('member','2026-11-02','2026-11-03',null));assert.equal(calls.length,0);
 assert.equal(await api.submitAbsence('member','2026-11-02','2026-11-03',file),'request-id');assert.equal(calls[0][0],'upload');assert.equal(calls[0][3].upsert,false);assert.equal(calls[1][1],'jds_submit_absence');
 const failed=load({uploadError:{message:'upload rejected'}});await assert.rejects(failed.api.submitAbsence('member','2026-11-02','2026-11-03',file));assert.equal(failed.calls.length,1,'failed upload must not submit');
 const missingReceipt=load({receipt:null});await assert.rejects(missingReceipt.api.submitAbsence('member','2026-11-02','2026-11-03',file));
 await api.absenceProofUrl('private-path');assert.equal(calls.at(-1)[2],60);
 console.log('PASS: mandatory proof, real dates, MIME/size limits, upload before submit, rejected uploads cannot submit, receipt required, 60-second private links.');
})().catch(e=>{console.error(e);process.exitCode=1});
