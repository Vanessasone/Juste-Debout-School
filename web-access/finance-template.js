import {fields} from './import-core.js';
// Browser export only: live authorized roster; no private roster is bundled.
export function financialTemplate(roster,accounts,group){
 const scoped=roster.filter(m=>m.group_id===group);
 const pending=scoped.filter(m=>!accounts.some(a=>a.member_id===m.member_id));
 const escape=value=>{let text=String(value??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
 const rows=[fields.map(([,label])=>label),...pending.map(m=>fields.map(([key])=>key==='email'?m.email||'':key==='name'?m.student_name:''))];
 const g=scoped[0];
 const filename=('School_'+[g?.campus,g?.promotion,g?.season].filter(Boolean).join('_')+'_finances.csv').replace(/[^a-zA-Z0-9_.-]/g,'_');
 return {csv:'\ufeff'+rows.map(row=>row.map(escape).join(';')).join('\r\n')+'\r\n',filename,count:pending.length,excluded:scoped.length-pending.length};
}
