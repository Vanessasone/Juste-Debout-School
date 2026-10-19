const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(options={}) {
  const calls=[];
  const api={
    from(table) {
      calls.push(table);
      const query={then(resolve){return Promise.resolve({data:options.data??[],error:options.error??null}).then(resolve)}};
      for(const key of ['select','eq','gte','lt','order','limit']) query[key]=()=>query;
      return query;
    },
    rpc:async()=>({data:options.result,error:options.error??null}),
  };
  const exports={};
  const source=ts.transpileModule(fs.readFileSync('src/lib/schools.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{exports,require(name){if(name==='@/lib/supabase')return {supabase:api,isSupabaseConfigured:!options.demo};throw Error(name)}});
  return {api:exports,calls};
}
(async()=>{
  const outage=load({error:{message:'Offline'}});
  await assert.rejects(outage.api.getSessions('CORE',new Date()));
  await assert.rejects(outage.api.getUpcomingSessions('ALL'));
  assert.equal((await outage.api.getSchools()).length,0,'real outage must not return demo schools');
  const empty=load();
  assert.equal((await empty.api.getSessions('CORE',new Date())).length,0,'valid empty planning');
  assert.equal((await empty.api.getUpcomingSessions('ALL')).length,0);
  for(const result of [null,undefined,'unexpected',{}]) await assert.rejects(load({result}).api.bookSession('session','card'));
  for(const result of ['booked','waitlist'])assert.equal(await load({result}).api.bookSession('session','card'),result);
  await assert.rejects(load({error:{message:'card rejected'}}).api.bookSession('session','card'));
  const demo=load({demo:true});
  assert.equal((await demo.api.getSchools()).length,2);
  assert.equal(demo.calls.length,0,'demo should not call production');
  console.log('PASS: planning outage vs empty list, no production demo fallback, booking receipts and demo isolation');
})().catch(e=>{console.error(e);process.exitCode=1});
