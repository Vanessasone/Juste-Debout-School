import {createClient} from '@supabase/supabase-js';
import {key} from './config.js';
const sb=createClient('https://zmzunjphubbdumowcurk.supabase.co',key,{auth:{storageKey:'jds-school-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
let serial=0;const remove=()=>document.getElementById('school-director-tasks-entry')?.remove();
async function show(){const stamp=++serial;remove();try{const {data:{session}}=await sb.auth.getSession();if(!session||stamp!==serial)return;const {data,error}=await sb.rpc('jds_school_finance_access');if(error||!data||stamp!==serial)return;const a=document.createElement('a');a.id='school-director-tasks-entry';a.href='/app/tasks.html';a.textContent='À traiter · Nicolas';a.style.cssText='position:fixed;bottom:24px;left:20px;z-index:9998;background:#f5d476;color:#171717;padding:12px 18px;border-radius:30px;font:600 14px system-ui;text-decoration:none;box-shadow:0 3px 18px #0004';document.body.append(a);}catch{remove();}}
sb.auth.onAuthStateChange?.(event=>{if(event==='SIGNED_OUT'){serial++;remove();}else if(event==='SIGNED_IN')setTimeout(show,0);});void show();
