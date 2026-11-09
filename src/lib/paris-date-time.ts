export function parisDateTime(date:string,time:string):string{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))throw new Error('Date AAAA-MM-JJ et heure HH:MM requises.');
 const [y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number);const base=Date.UTC(y,m-1,d,h,min);
 if(h>23||min>59||new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)!==date)throw new Error('Date ou heure invalide.');
 const format=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 let candidate=base;
 for(let i=0;i<3;i++){const p=Object.fromEntries(format.formatToParts(new Date(candidate)).map(p=>[p.type,p.value]));const local=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);candidate+=base-local;}
 if(format.format(new Date(candidate)).replace(' ','T')!==`${date}T${time}`)throw new Error('Cette heure n’existe pas à Paris (changement d’heure).');
 return new Date(candidate).toISOString();
}
