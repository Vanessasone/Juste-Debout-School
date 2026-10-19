const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync('src/lib/checkin.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function scenario(options = {}) {
  const writes = [];
  const client = {
    auth: { getUser: async () => ({data: {user: options.noUser ? null : {id:'staff-1'}}, error:null}) },
    from(table) {
      let inserting = false;
      const builder = {
        select() {return builder;}, eq() {return builder;},
        insert(row) {inserting = true; writes.push(row); return builder;},
        async single() {
          if (options.networkError) throw new Error('Offline');
          if (table === 'jds_schools') return {data:options.noSchool ? null : {id:'core-1'},error:null};
          if (table === 'jds_sessions') return {data:{school_id:options.otherCampus ? 'industry-1' : 'core-1'},error:null};
          assert.equal(inserting, true);
          return options.denied ? {data:null,error:{code:'42501'}} : {data:options.noReceipt ? null : {id:'checkin-1'},error:null};
        },
      };
      return builder;
    },
  };
  const exports = {};
  vm.runInNewContext(source, {exports, require(name) {
    if (name === '@/lib/supabase') return {isSupabaseConfigured:!options.demo,supabase:client};
    if (name === '@/lib/photos') return {resolveProfilePhoto:async value=>value};
    throw new Error(`Unexpected dependency: ${name}`);
  }});
  return {checkIn:exports.checkIn,writes};
}

(async () => {
  for (const options of [{denied:true},{networkError:true},{noUser:true},{noSchool:true},{otherCampus:true},{noReceipt:true}]) {
    const test = scenario(options);
    assert.equal(await test.checkIn('member-1','lesson-1','CORE'),false,JSON.stringify(options));
    if (options.noUser || options.noSchool || options.otherCampus) assert.equal(test.writes.length,0);
  }
  for (const session of [null,'lesson-1']) {
    const test = scenario();
    assert.equal(await test.checkIn('member-1',session,'CORE'),true);
    assert.deepEqual(JSON.parse(JSON.stringify(test.writes)),[{member_id:'member-1',session_id:session,school_id:'core-1',by_staff:'staff-1'}]);
  }
  const demo = scenario({demo:true});
  assert.equal(await demo.checkIn('demo-member',null,'CORE'),true);
  assert.equal(demo.writes.length,0);
  console.log('PASS: 9 attendance cases — failures, server receipt, campus/staff attribution and demo isolation');
})().catch(error=>{console.error(error);process.exitCode=1;});
