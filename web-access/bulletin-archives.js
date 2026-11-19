import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';

const formats='.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.tif,.tiff,.doc,.docx,.xls,.xlsx,.csv,.odt,.ods,.txt,.zip';

export function downloadSheet(sheet,subject,group,members){
  const doc=new jsPDF();
  const roll=sheet.kind==='roll';
  const title=roll?'Feuille d’appel':sheet.kind==='exam'?'Évaluation trimestrielle':'Contrôle continu';
  doc.setFontSize(15);
  doc.text(title,14,18);
  doc.setFontSize(10);
  doc.text(doc.splitTextToSize(`${group.campus} · ${group.name} · ${group.season} · T${subject.term}\n${subject.subject} · ${subject.teacher_name}\n${sheet.lesson_date} · ${roll?'Appel enregistré':'Feuille validée'}`,180),14,27);
  const people=new Map(members.map(m=>[m.id,m.name]));
  const labels={present:'Présent',absent:'Absent',late:'En retard',excused:'Absence excusée'};
  autoTable(doc,{startY:47,head:[['Élève','Présence',...(roll?[]:[sheet.kind==='exam'?'Note /20':'Note /5','Appréciation'])]],
    body:sheet.entries.map(e=>[people.get(e.member_id)||'Élève retiré de la classe',labels[e.presence]||'—',...(roll?[]:[e.grade??'—',e.comment||''])])});
  doc.save(`Feuille_${group.campus}_${group.name}_${sheet.kind}_${sheet.lesson_date}_${sheet.id.slice(0,8)}.pdf`);
}

function safeSegment(value){
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_. -]/g,'_').replace(/^\.+/,'_').slice(0,140)||'_';
}

export function renderArchives({data,area,el,btn,field,rpc,storage,checked,downloadReport,downloadAssessment}){
  const section=area('Archives');
  const content=el('div');
  section.append(el('p','Retrouve les documents de cette classe et du trimestre sélectionné.'),btn('Ouvrir les archives',load,true),content);

  async function load(){
    const files=await rpc('jds_list_school_archive',{group_key:data.group.id});
    content.replaceChildren();
    if(files===null){
      content.append(el('p','Les archives sont réservées aux responsables autorisés.'));
      return;
    }
    const prefix=`${data.group.id}/T${data.term}/`;
    content.append(el('h3','Bulletins publiés'));
    if(!data.reports.length)content.append(el('p','Aucun bulletin publié pour ce trimestre.'));
    for(const report of data.reports){
      const name=data.members.find(m=>m.id===report.member_id)?.name||'Élève';
      content.append(btn(`${name} · Bulletin v${report.version} · PDF`,()=>downloadReport(report.id)));
    }
    content.append(el('h3','Feuilles d’évaluation validées'),btn('Afficher les feuilles à télécharger',async()=>{
      const subjects=await rpc('jds_archived_assessment_index',{group_key:data.group.id,trimester:data.term});
      sheets.replaceChildren();
      for(const item of subjects){
        sheets.append(btn(`${item.lesson_date} · ${item.subject} · ${item.kind==='exam'?'Évaluation /20':'Contrôle continu /5'} · PDF`,()=>downloadAssessment(item.id,item)));
      }
      if(!subjects.length)sheets.append(el('p','Aucune feuille validée pour ce trimestre.'));
    }));
    const sheets=el('div');content.append(sheets);
    const calls=el('div');
    content.append(el('h3','Feuilles d’appel'),btn('Afficher les appels à télécharger',async()=>{
      const items=await rpc('jds_archived_roll_calls',{group_key:data.group.id,trimester:data.term});
      calls.replaceChildren();
      for(const item of items){
        const when=new Date(item.starts_at).toLocaleString('fr-FR',{timeZone:'Europe/Paris',dateStyle:'short',timeStyle:'short'});
        calls.append(btn(`${when} · ${item.subject} · PDF`,()=>downloadAssessment(item.id,item)));
      }
      if(!items.length)calls.append(el('p','Aucune feuille d’appel enregistrée pour ce trimestre.'));
    }),calls);
    content.append(el('h3','Documents déposés'));
    for(const file of files.filter(f=>f.name.startsWith(prefix))){
      const label=file.name.slice(prefix.length).split('/').slice(1).join('/');
      content.append(btn(`Télécharger · ${label}`,async()=>{
        const blob=await checked(storage.download(file.name));
        const url=URL.createObjectURL(blob);
        const link=el('a');
        link.href=url;link.download=label.split('/').pop();link.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      }));
    }
    const [filesLabel,uploads]=field('Fichiers ou scans PDF','', 'file');
    uploads.accept=formats;uploads.multiple=true;
    const [photoLabel,photo]=field('Prendre une photo','', 'file');
    photo.accept='image/*';photo.setAttribute('capture','environment');
    const [folderLabel,folder]=field('Importer un dossier','', 'file');
    folder.setAttribute('webkitdirectory','');folder.multiple=true;
    const [batchLabel,batch]=field('Nom du lot (facultatif)');
    batch.maxLength=60;
    const upload=async()=>{
      const inputs=[...uploads.files,...photo.files,...folder.files];
      if(!inputs.length)throw Error('Sélectionne un fichier, une photo ou un dossier.');
      if(inputs.length>100)throw Error('Sélectionne au maximum 100 fichiers par dépôt ou envoie un ZIP.');
      for(const file of inputs){
        const extension=file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
        if(!formats.split(',').includes(extension)||file.size>26214400)throw Error(`${file.name} · format non pris en charge ou fichier supérieur à 25 Mo.`);
      }
      const lot=`${safeSegment(batch.value.trim()||'Dépôt')}_${crypto.randomUUID()}`;
      const paths=new Set();
      for(const file of inputs){
        const relative=(file.webkitRelativePath||file.name).split('/').map(safeSegment).join('/');
        if(paths.has(relative))throw Error('Deux fichiers auraient le même nom. Renomme-les avant le dépôt.');
        paths.add(relative);
      }
      let count=0;
      for(const [i,relative] of [...paths].entries()){
        try{await checked(storage.upload(prefix+lot+'/'+relative,inputs[i],{upsert:false,contentType:'application/octet-stream'}));count++;}
        catch(e){await load();throw Error(`${count}/${inputs.length} fichiers déposés. Reprends au fichier ${inputs[i].name}. ${e.message}`);}
      }
      await load();
    };
    content.append(el('h3','Ajouter un document'),el('p','PDF, photos, documents bureautiques, CSV ou ZIP. Les sous-dossiers sont conservés. 25 Mo par fichier.'),batchLabel,filesLabel,photoLabel,folderLabel,btn('Déposer dans les archives',upload,true));
  }
}
