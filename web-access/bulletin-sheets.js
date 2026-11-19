export function renderSheets({data,area,el,btn,select,field,rpc,action}) {
  const panel=area('Feuilles d’évaluation de la classe');
  const [subjectLabel,subject]=select('Matière',data.subjects.map(s=>[s.id,[s.subject,s.teacher_name].filter(Boolean).join(' · ')]),data.subjects[0].id,()=>action(refresh));
  const queue=el('div'),content=el('div');
  panel.append(queue,subjectLabel,btn('Faire l’appel',()=>refresh(undefined,true),true),btn('Afficher les feuilles',()=>refresh()),content);
  if(data.can_manage)queue.append(btn('Voir les feuilles à valider',refreshQueue));
  const states={draft:'Brouillon',pending:'À vérifier',returned:'À corriger',approved:'Validée'};
  const kinds={cc:'Contrôle continu /5',exam:'Évaluation trimestrielle /20'};
  const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris'}).format(new Date());
  const displayDate=value=>value.split('-').reverse().join('/');
  async function refreshQueue(){
    const pending=await rpc('jds_pending_bulletin_sheets',{class_key:data.group.id,trimester:data.subjects[0].term});
    queue.replaceChildren(el('h3',`Feuilles à valider · ${pending.length}`),btn('Actualiser la liste',refreshQueue));
    for(const sheet of pending)queue.append(btn(`${displayDate(sheet.lesson_date)} · ${sheet.subject} · ${sheet.teacher} · ${kinds[sheet.kind]}`,async()=>{
      subject.value=sheet.subject_id;await refresh(sheet.id);
    }));
  }
  async function refresh(openSheetId,openRollCall=false) {
    const key=subject.value;
    const {sheets,can_review:canReview}=await rpc('jds_get_bulletin_sheets',{subject_key:key});
    if(subject.value!==key)return;
    content.replaceChildren();
    const edit=el('div');
    const create=kind=>draw({kind,entries:[]});
    content.append(btn('Nouvelle séance de contrôle continu',async()=>create('cc'),true));
    if(!sheets.some(s=>s.kind==='exam'))content.append(btn('Nouvelle évaluation trimestrielle',async()=>create('exam')));
    const list=el('div');
    if(canReview)list.append(el('h3',`Validation · ${sheets.filter(s=>s.state==='pending').length} à vérifier`));
    if(!sheets.length)list.append(el('p','Aucune feuille pour cette matière.'));
    for(const sheet of [...sheets].sort((a,b)=>Number(b.state==='pending')-Number(a.state==='pending'))) {
      list.append(btn(`${displayDate(sheet.lesson_date)} · ${kinds[sheet.kind]} · ${states[sheet.state]}`,async()=>draw(sheet)));
    }
    content.append(list,edit);
    const approved=sheets.filter(s=>s.kind==='cc'&&s.state==='approved').sort((a,b)=>a.lesson_date.localeCompare(b.lesson_date));
    const summary=el('details');
    summary.append(el('summary','Contrôle continu · moyennes et séances validées'));
    if(approved.length){
      const [wrap,body]=table(['Élève',...approved.map(s=>displayDate(s.lesson_date)),'Moyenne /20']);
      for(const student of data.members){
        const row=el('tr');
        row.append(el('th',student.name));
        const scores=[];
        for(const sheet of approved){
          const entry=sheet.entries.find(e=>e.member_id===student.id);
          if(entry?.grade!=null)scores.push(entry.grade);
          row.append(el('td',entry?.presence==='absent'?'Absent':entry?.grade??'—'));
        }
        row.append(el('td',scores.length?(4*scores.reduce((total,n)=>total+n,0)/scores.length).toLocaleString('fr-FR',{maximumFractionDigits:2}):'—'));
        body.append(row);
      }
      summary.append(wrap);
    }else summary.append(el('p','Les moyennes apparaissent après la première validation.'));
    content.append(summary);
    const opened=sheets.find(sheet=>sheet.id===openSheetId);
    if(opened)draw(opened);
    if(openRollCall){drawRollCall();edit.scrollIntoView?.({block:'start'});}

    function drawRollCall(){
      edit.replaceChildren(el('h3','Appel du cours'));
      const [dl,date]=field('Date',today(),'date');
      const [bl,begins]=field('Début du cours','','time');
      const [fl,ends]=field('Fin du cours','','time');
      const call=el('div',undefined,'quick-roll-call');
      const timing=el('div',undefined,'grid');
      timing.append(dl,bl,fl);
      const count=el('p');
      count.setAttribute('aria-live','polite');
      const list=el('ul',undefined,'roll-list');
      const entries=data.members.map(member=>{
        const row=el('li',undefined,'roll-row');
        const choices=el('div',undefined,'roll-choices');
        choices.setAttribute('role','group');
        choices.setAttribute('aria-label',member.name);
        const entry={member,status:''};
        const buttons=[['present','Présent'],['absent','Absent']].map(([value,label])=>{
          const button=el('button',label,'roll-choice');
          button.type='button';
          button.dataset.presence=value;
          button.setAttribute('aria-pressed','false');
          button.onclick=()=>{set(value);updateCount();};
          choices.append(button);
          return button;
        });
        function set(value){
          entry.status=value;
          for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.presence===value));
        }
        row.append(el('strong',member.name),choices);list.append(row);
        return {...entry,get status(){return entry.status;},set};
      });
      function updateCount(){
        const remaining=entries.filter(entry=>!entry.status).length;
        count.textContent=remaining?`${remaining} élève(s) à cocher`:`${entries.filter(e=>e.status==='present').length} présent(s) · ${entries.filter(e=>e.status==='absent').length} absent(s)`;
      }
      updateCount();
      call.append(timing,btn('Tous présents',async()=>{for(const entry of entries)entry.set('present');updateCount();}),count,list,
        btn('Enregistrer l’appel',async()=>{
          if(entries.some(entry=>!entry.status))throw Error('Coche Présent ou Absent pour chaque élève.');
          if(!date.value||!begins.value||!ends.value)throw Error('Renseigne la date et les horaires du cours.');
          await rpc('jds_record_quick_roll_call',{subject_key:key,day:date.value,begins:begins.value,ends:ends.value,
            roster:entries.map(({member,status})=>({member_id:member.id,status}))});
          edit.replaceChildren(el('p','Appel enregistré.'));
        },true));
      edit.append(call);
    }
    function draw(sheet){
      edit.replaceChildren(el('h3',kinds[sheet.kind]));
      if(sheet.feedback)edit.append(el('p',sheet.feedback));
      const editable=!sheet.id||['draft','returned'].includes(sheet.state);
      const exam=sheet.kind==='exam';
      const max=exam?20:5;
      const [dateLabel,date]=field('Date',sheet.lesson_date||today(),'date');
      date.disabled=!editable;
      const [wrap,body]=table(['Élève','Présence',`Note /${max}`,...(exam?['Appréciation']:[])]);
      const roster=data.members.map(member=>{
        const entry=sheet.entries.find(e=>e.member_id===member.id);
        const row=el('tr');
        row.append(el('th',member.name));
        const [presenceLabel,presence]=select('',[['unset','À renseigner'],['present','Présent'],['absent','Absent']],entry?.presence||'unset',()=>{
          grade.disabled=presence.value!=='present';
          if(grade.disabled)grade.value='';
        });
        const [gradeLabel,grade]=field('',entry?.grade??'','number');
        grade.min='0';grade.max=String(max);grade.step='any';
        const [commentLabel,comment]=field('',entry?.comment||'');
        comment.maxLength=3000;
        presence.setAttribute('aria-label',`Présence · ${member.name}`);
        grade.setAttribute('aria-label',`Note · ${member.name}`);
        comment.setAttribute('aria-label',`Appréciation · ${member.name}`);
        presence.disabled=comment.disabled=!editable;
        grade.disabled=!editable||presence.value!=='present';
        for(const control of [presenceLabel,gradeLabel,...(exam?[commentLabel]:[])]){
          const cell=el('td');cell.append(control);row.append(cell);
        }
        body.append(row);
        return {read:()=>({member_id:member.id,presence:presence.value,grade:grade.disabled||grade.value===''?null:grade.valueAsNumber,comment:exam?comment.value:''}),setPresence:value=>{
          presence.value=value;presence.onchange();
        }};
      });
      edit.append(dateLabel);
      if(editable)edit.append(btn('Reprendre les présences de l’appel',async()=>{
        if(!date.value)throw Error('Choisis la date du cours.');
        const attendance=await rpc('jds_quick_roll_call_for_day',{subject_key:key,day:date.value});
        if(!attendance.length)throw Error('Il faut un seul appel enregistré pour cette matière à cette date.');
        const byMember=new Map(attendance.map(entry=>[entry.member_id,entry.presence]));
        for(const entry of roster){
          const presence=byMember.get(entry.read().member_id);
          if(presence)entry.setPresence(presence);
        }
      }));
      edit.append(el('p','Indique la présence de chaque élève avant transmission. Une case vide ne compte pas dans la moyenne.'),wrap);
      async function save(send){
        if(!date.value)throw Error('Choisis la date de la séance.');
        await rpc('jds_write_bulletin_sheet',{subject_key:key,sheet_key:sheet.id||null,sheet_kind:sheet.kind,day:date.value,roster:roster.map(entry=>entry.read()),send,expected_revision:sheet.revision||0});
        await refresh();
      }
      if(editable)edit.append(btn('Enregistrer le brouillon',()=>save(false)),btn('Envoyer pour validation',()=>save(true),true));
      if(canReview&&sheet.state==='pending'){
        const [label,feedback]=field('Correction à demander');
        feedback.maxLength=1000;
        const review=async approve=>{
          await rpc('jds_review_bulletin_sheet',{sheet_key:sheet.id,expected_revision:sheet.revision,approve,reason:feedback.value});
          await refresh();
          await refreshQueue();
        };
        edit.append(btn('Valider les présences et les notes',()=>review(true),true),label,btn('Renvoyer au professeur',()=>review(false)));
      }
    }
  }
  function table(labels){
    const wrap=el('div',undefined,'table-wrap'),table=el('table'),head=el('thead'),row=el('tr'),body=el('tbody');
    for(const label of labels)row.append(el('th',label));
    head.append(row);table.append(head,body);wrap.append(table);
    return [wrap,body];
  }
}
