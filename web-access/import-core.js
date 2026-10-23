import {cents,validDay,validateDraft} from './tuition-core.js';
export const MAX_ROWS=300;
export const fields=[
 ['email','Email élève',['email','e mail','mail','adresse email','email eleve']],
 ['name','Nom complet',['nom complet','eleve','etudiant','nom prenom','nom']],
 ['base','Tarif avant remise (€)',['tarif','tarif avant remise','prix','tarif formation','montant formation']],
 ['discount','Remise (€)',['remise','reduction']],
 ['aid','Bourse interne (€)',['bourse interne','aide ecole','bourse ecole']],
 ['payer','Payeur',['payeur','nom payeur']],
 ['invoice','Référence facture',['facture','reference facture','contrat']],
 ['funding','Financement externe (€)',['financement externe','subvention','prise en charge']],
 ['organization','Organisme financeur',['organisme','financeur','organisme financeur']],
 ['due','Date échéance',['echeance','date echeance','date prevue']],
 ['due_amount','Montant échéance (€)',['montant echeance','montant prevu']],
 ['paid','Date règlement',['date paiement','date reglement','date encaissement']],
 ['received','Montant reçu (€)',['montant recu','montant paye','encaissement','versement']],
 ['method','Mode règlement',['mode','mode paiement','mode reglement']],
 ['reference','Référence règlement',['reference paiement','reference reglement','reference virement']]
];
export const normalize=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9@.]+/g,' ').trim();
export function parseCSV(text){
 text=text.replace(/^\ufeff/,'');if(text.length>3000000)throw Error('Fichier texte trop volumineux.');
 const first=text.split(/\r?\n/).slice(0,5).join('\n');
 const delimiter=[';',',','\t'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted)quoted=false;else if(!cell)quoted=true;else throw Error('Guillemets CSV invalides.');}
  else if(!quoted&&(c===delimiter||c==='\n'||c==='\r')){row.push(cell);cell='';if(c!==delimiter){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(x=>x.trim()))rows.push(row);row=[];}}
  else cell+=c;
  if(rows.length>MAX_ROWS+20||row.length>80||cell.length>20000)throw Error('Limite : 300 lignes, 80 colonnes et 20 000 caractères par cellule.');
 }
 if(quoted)throw Error('Une cellule CSV contient des guillemets non refermés.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export function detectMapping(header){const result={};for(const [key,,aliases] of fields){const matches=header.map((x,i)=>aliases.includes(normalize(x))?i:-1).filter(x=>x>=0);result[key]=matches.length===1?matches[0]:-1;}return result;}
export function dateValue(raw){const s=String(raw??'').trim();if(!s)return '';if(validDay(s))return s;const m=s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);if(m){const d=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;if(validDay(d))return d;}return s;}
export function moneyValue(raw){const s=String(raw??'').trim().replace(/\s*(?:€|EUR)\s*$/i,'');if(s)cents(s);return s;}
export function matchedMember(email,name,roster){
 const mail=String(email||'').trim().toLowerCase();
 const found=mail?roster.filter(m=>String(m.email||'').toLowerCase()===mail):roster.filter(m=>normalize(m.student_name)===normalize(name)&&normalize(name));
 return found.length===1?found[0].member_id:'';
}
export function proposals(rows,map,roster){
 if(rows.length>MAX_ROWS)throw Error('300 lignes maximum par import. Sépare le fichier en plusieurs lots.');
 return rows.map((row,index)=>{const p={line:index+1,selected:false,terms:false,receiptVerified:false,fundingConfirmed:false,saved:false,error:''};
  for(const [key] of fields)p[key]=map[key]>=0?String(row[map[key]]??'').trim():'';
  p.member=matchedMember(p.email,p.name,roster);p.source=row.map(String);return p;});
}
export function buildDraft(p,today,source,uuid=()=>crypto.randomUUID()){
 if(!p.member)throw Error('Choisis explicitement un élève et sa promotion.');
 const base=cents(moneyValue(p.base),true),discount=cents(moneyValue(p.discount)||'0'),aid=cents(moneyValue(p.aid)||'0');
 const d={member_id:p.member,base_cents:base,discount_cents:discount,school_aid_cents:aid,terms_confirmed:!!p.terms,schedule_confirmed:false,payer_name:p.payer.trim(),payer_kind:'student',invoice_reference:p.invoice.trim(),qonto_payment_url:'',note:source.slice(0,1000),state:'active',funding:[],installments:[],receipts:[]};
 if(d.payer_name.length>160||d.invoice_reference.length>200)throw Error('Payeur : 160 caractères maximum ; facture : 200.');
 if(p.funding||p.organization){const amount=cents(moneyValue(p.funding));d.funding=[{id:uuid(),kind:'subsidy',organization:p.organization.trim(),amount_cents:amount,status:p.fundingConfirmed?'confirmed':'pending'}];}
 if(p.due||p.due_amount)d.installments=[{id:uuid(),label:'Échéance importée',due_on:dateValue(p.due),amount_cents:cents(moneyValue(p.due_amount))}];
 if(p.receiptVerified){const methods={virement:'transfer',transfer:'transfer',carte:'card',cb:'card',card:'card',cheque:'cheque',especes:'cash',cash:'cash',autre:'other',other:'other'};const method=methods[normalize(p.method)];if(!method)throw Error('Précise le mode du règlement vérifié.');d.receipts=[{id:uuid(),paid_on:dateValue(p.paid),amount_cents:cents(moneyValue(p.received)),method,reference:p.reference.trim(),payer_name:d.payer_name,payer_kind:'student',status:'recorded',void_reason:''}];}
 if(p.scheduleConfirmed){if(!p.terms)throw Error('Confirme le tarif avant l’échéancier.');d.schedule_confirmed=true;}
 return validateDraft(d,today);
}
// Text is treated only as data. No instruction, formula, macro or link is executed.
export function documentProposal(text){
 const p=Object.fromEntries(fields.map(([key])=>[key,'']));
 const emails=[...new Set(text.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[])];if(emails.length===1)p.email=emails[0];
 const lines=text.split(/\r?\n/);for(const [key,,aliases] of fields){if(!['base','discount','aid','payer','invoice','organization','funding','name'].includes(key))continue;
  const candidates=[];for(const line of lines){const colon=line.indexOf(':');if(colon<0)continue;const label=normalize(line.slice(0,colon));if(aliases.includes(label))candidates.push(line.slice(colon+1).trim());}
  if(candidates.length===1)p[key]=candidates[0];
 }return p;
}
