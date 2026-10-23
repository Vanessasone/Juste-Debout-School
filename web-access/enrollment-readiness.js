export function dossierReadiness(member,enrollment,finance,rules){
 const emailValid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(member.email||'').trim());
 const phoneKnown=enrollment?Boolean(String(enrollment.phone||'').trim()):null;
 const financialTerms=finance?.state==='active'&&finance.terms_confirmed===true;
 const schedule=financialTerms&&finance.schedule_confirmed===true;
 const missing=[];
 if(!emailValid)missing.push('Email à compléter dans l’annuaire');
 if(phoneKnown===false)missing.push('Téléphone à compléter');
 if(!rules?.ready)missing.push('Modalités de la promotion à confirmer');
 if(!financialTerms)missing.push('Tarif et aides à reprendre / confirmer');
 if(!schedule)missing.push('Échéancier à confirmer');
 return {emailValid,phoneKnown,financialTerms,schedule,missing,invitationPrerequisites:!!enrollment&&enrollment.status==='draft'&&emailValid&&!!rules?.ready&&!!schedule};
}
export function scopedImportPath(group){return '/app/finance-import.html?group='+encodeURIComponent(group);}
