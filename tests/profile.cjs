const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('src/lib/profile.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(options={}) {
  const writes=[];
  const query={select(){return query},eq(key,value){assert.equal(key,'id');assert.equal(value,'owner');return query},update(fields){writes.push(fields);return query},async single(){return {data:options.empty?null:{id:'owner'},error:options.writeError?{code:'42501'}:null}}};
  const client={auth:{getUser:async()=>({data:{user:options.noUser?null:{id:'owner'}},error:options.authError?{message:'offline'}:null})},from(table){assert.equal(table,'profiles');return query}};
  const exports={};
  vm.runInNewContext(source,{exports,require(name){if(name==='@/lib/supabase')return {supabase:client};if(name==='@/lib/photos')return {resolveProfilePhoto:async()=>null};throw Error(name)}});
  return {api:exports,writes};
}
(async()=>{
  for(const options of [{noUser:true},{authError:true},{empty:true},{writeError:true}]) await assert.rejects(load(options).api.updateMyProfile({full_name:'Test',available_for_school:true}));
  const success=load();
  await success.api.updateMyProfile({full_name:'Test',available_for_school:true});
  assert.deepEqual(JSON.parse(JSON.stringify(success.writes)),[{full_name:'Test',available_for_school:true}]);
  await assert.rejects(load({authError:true}).api.getMyProfile());
  assert.equal(await load({noUser:true}).api.getMyProfile(),null);
  console.log('PASS: profile receipt, atomic availability/name update, missing session and load/write errors');
})().catch(e=>{console.error(e);process.exitCode=1});
