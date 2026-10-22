const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const esbuild=require('../web-access/node_modules/esbuild');
const source=esbuild.buildSync({entryPoints:['src/lib/industry-planning.ts'],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'}).outputFiles[0].text;
const moduleObject={exports:{}};
vm.runInNewContext(source,{module:moduleObject,exports:moduleObject.exports,require,Date});
const {industrySlots,prepareIndustrySlot,validateIndustryDraft}=moduleObject.exports;
assert.equal(industrySlots.length,90);
assert.equal(new Set(industrySlots.map(s=>s.id)).size,90);
const slot=industrySlots.find(s=>s.iso_weekday===1&&s.kind==='teaching'&&s.exact_time_confirmed);
const prepared=prepareIndustrySlot(slot);
assert.equal(prepared.date,'');assert.equal(prepared.room,'');
const valid={...prepared,group_id:slot.group_id,date:'2026-10-26',room:'Studio extérieur · salle 1',repeat:1};
assert.doesNotThrow(()=>validateIndustryDraft(slot,valid));
for(const patch of [{group_id:'other'},{date:''},{date:'2026-02-30'},{date:'2026-10-27'},{room:' '},{teacher:''},{repeat:2},{start:''}]){
 assert.throws(()=>validateIndustryDraft(slot,{...valid,...patch}));
}
for(const coaching of industrySlots.filter(s=>!s.exact_time_confirmed)){
 const draft=prepareIndustrySlot(coaching);
 assert.equal(draft.start,'');assert.equal(draft.end,'');assert.equal(coaching.duration_minutes,60);
}
const free=industrySlots.find(s=>s.kind==='free_training'&&s.iso_weekday===1);
assert.doesNotThrow(()=>validateIndustryDraft(free,{...valid,group_id:free.group_id,teacher:''}));
assert.ok(industrySlots.every(s=>s.valid_from===null&&s.valid_until===null&&s.venue===null));
console.log('PASS: 90 weekly templates; date, weekday, campus group, venue, teacher and recurrence guards; ambiguous coaching times remain empty.');
