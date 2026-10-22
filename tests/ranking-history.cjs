const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),ts=require('typescript');
const js=ts.transpileModule(fs.readFileSync('src/lib/ranking-history.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};vm.runInNewContext(js,{exports:mod.exports,require:()=>({supabase:{}}),Date,Map});const {historyRange,shiftHistory,bucketHistory}=mod.exports;
assert.equal(JSON.stringify(historyRange('month','2028-02-15')),JSON.stringify({start:'2028-02-01',end:'2028-02-29'}));
assert.equal(JSON.stringify(historyRange('quarter','2026-12-22')),JSON.stringify({start:'2026-10-01',end:'2026-12-31'}));
assert.equal(shiftHistory('quarter','2026-01-10',-1),'2025-10-01');assert.equal(shiftHistory('year','2026-10-22',1),'2027-10-01');
const rows=['2026-10-02','2026-10-03','2026-10-08','2026-11-04'].map(d=>({observed_on:d,result:{global_score:null}}));
assert.equal(bucketHistory(rows,'month').length,4);assert.equal(bucketHistory(rows,'quarter')[0].observed_on,'2026-10-03');assert.equal(bucketHistory(rows,'year').length,2);assert.equal(bucketHistory(rows,'year')[0].observed_on,'2026-10-08');assert.equal(bucketHistory([],'year').length,0);
console.log('Calendar boundaries, leap year, period navigation and last-observation sampling passed.');
