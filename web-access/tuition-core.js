export const euro=value=>(value/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
export const parisDay=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function cents(value,optional=false){
 const text=String(value).replace(/[\s\u00a0\u202f]/g,'');
 if(optional&&!text)return null;
 if(!/^\d+(?:[.,]\d{1,2})?$/.test(text))throw Error('Indique un montant positif, avec deux décimales maximum.');
 const [whole,fraction='']=text.replace(',','.').split('.'),result=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(result)||result>2147483647)throw Error('Montant trop élevé.');
 return result;
}
export function validDay(day){return /^\d{4}-\d{2}-\d{2}$/.test(day)&&day>='1900-01-01'&&day<='2200-12-31'&&!Number.isNaN(Date.parse(day))&&new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day;}
export function amounts(row,today=parisDay()){
 const received=(row.receipts||[]).filter(r=>r.status==='recorded').reduce((s,r)=>s+r.amount_cents,0);
 const agreed=row.base_cents===null||row.base_cents===undefined?null:row.base_cents-row.discount_cents-(row.school_aid_cents||0);
 const external=(row.funding||[]).filter(f=>f.status==='confirmed').reduce((s,f)=>s+f.amount_cents,0),organizationReceived=(row.receipts||[]).filter(r=>r.status==='recorded'&&r.payer_kind==='organization').reduce((s,r)=>s+r.amount_cents,0);
 const balance=row.terms_confirmed?Math.max(agreed-received,0):null;
 const through=new Date(today+'T12:00:00Z');through.setUTCDate(through.getUTCDate()+30);const end=through.toISOString().slice(0,10);
 const past=(row.installments||[]).filter(x=>x.due_on<today).reduce((s,x)=>s+x.amount_cents,0);
 const month=(row.installments||[]).filter(x=>x.due_on<=end).reduce((s,x)=>s+x.amount_cents,0);
 const ready=row.terms_confirmed&&row.schedule_confirmed;
 return {agreed_cents:agreed,received_cents:received,external_cents:external,student_share_cents:row.terms_confirmed?agreed-external:null,organization_received_cents:organizationReceived,balance_cents:balance,surplus_cents:row.terms_confirmed?Math.max(received-agreed,0):0,overdue_cents:ready?Math.max(past-received,0):0,upcoming_cents:ready?Math.max(month-received,0)-Math.max(past-received,0):0};
}
export function accountStatus(row,summary){
 if(!row)return 'Dossier à préparer';
 if(row.state==='cancelled')return 'Dossier annulé';
 if(!row.terms_confirmed)return 'Conditions à confirmer';
 if(summary.surplus_cents>0)return 'Trop-perçu à vérifier';
 if(summary.overdue_cents>0)return 'Échéance dépassée';
 if(summary.balance_cents===0)return 'Soldé';
 if(!row.schedule_confirmed)return 'Échéancier à confirmer';
 return summary.received_cents>0?'Paiement partiel':'À encaisser';
}
export function validateDraft(d,today){
 if(!d.member_id)throw Error('Choisis un élève de formation.');
 if(d.base_cents===null&&(d.discount_cents||d.school_aid_cents||d.terms_confirmed))throw Error('Renseigne le tarif avant de confirmer les conditions.');
 if(d.base_cents!==null&&d.discount_cents+(d.school_aid_cents||0)>d.base_cents)throw Error('La remise et la bourse interne dépassent le tarif.');
 const total=d.installments.reduce((s,x)=>s+x.amount_cents,0),net=d.base_cents===null?0:d.base_cents-d.discount_cents-(d.school_aid_cents||0);
 if((d.funding||[]).some(x=>!x.organization.trim()||!x.amount_cents||x.amount_cents<0))throw Error('Complète chaque financement : organisme et montant positif.');
 if((d.funding||[]).filter(x=>x.status==='confirmed').reduce((s,x)=>s+x.amount_cents,0)>net)throw Error('Les financements externes confirmés dépassent le tarif net.');
 if(d.installments.some(x=>!x.label.trim()||!validDay(x.due_on)||x.amount_cents<=0))throw Error('Complète chaque échéance : libellé, date et montant positif.');
 if(total>net||d.schedule_confirmed&&(!d.terms_confirmed||total!==net))throw Error('Le total de l’échéancier confirmé doit correspondre au tarif après remise.');
 if(d.receipts.some(r=>!validDay(r.paid_on)||r.paid_on>today||r.amount_cents<=0||r.reference.trim().length<3||!r.method))throw Error('Vérifie la date, le montant, le mode et la référence de chaque règlement.');
 if(d.receipts.some(r=>r.status==='void'&&r.void_reason.trim().length<5))throw Error('Précise le motif de correction de chaque saisie annulée.');
 if(d.receipts.some(r=>r.status==='recorded')&&!d.terms_confirmed)throw Error('Confirme le tarif convenu avant de constater les encaissements.');
 if(d.qonto_payment_url&&!/^https:\/\/pay\.qonto\.com\/[A-Za-z0-9_/?&=%.-]+$/.test(d.qonto_payment_url))throw Error('Utilise uniquement un lien de paiement https://pay.qonto.com/.');
 return d;
}
