import templates from '../../docs/industry-weekly-templates.json';

export const industrySlots = templates.slots;
export type IndustrySlot = typeof industrySlots[number];
export const planningDays = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];

export function prepareIndustrySlot(slot:IndustrySlot) {
 return {id:undefined as string|undefined,title:slot.title,
  teacher:slot.teacher_display??'',room:'',date:'',
  start:slot.exact_time_confirmed?slot.starts_local:'',
  end:slot.exact_time_confirmed?slot.ends_local:'',repeat:'1'};
}

export function validateIndustryDraft(slot:IndustrySlot,input:{group_id:string;date:string;room:string;teacher:string;start:string;end:string;repeat:number}) {
 if(input.group_id!==slot.group_id)throw new Error('Ce créneau appartient à une autre promotion.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date))throw new Error('Renseigne la date de cette séance.');
 const day=new Date(input.date+'T12:00:00Z');
 if(Number.isNaN(day.getTime())||day.toISOString().slice(0,10)!==input.date)throw new Error('Date invalide.');
 if(day.getUTCDay()!==slot.iso_weekday)throw new Error('La date doit correspondre au jour du créneau choisi. Pour déplacer le cours, prépare un cours manuel.');
 if(!input.room.trim())throw new Error('Précise le lieu et la salle de cette séance.');
 if(slot.kind==='teaching'&&!input.teacher.trim())throw new Error('Précise le professeur avant d’enregistrer cette séance.');
 if(!input.start||!input.end)throw new Error('Précise les heures exactes de cette séance.');
 if(input.repeat!==1)throw new Error('Prépare une seule séance datée ; les périodes et vacances INDUSTRY restent à confirmer.');
}
