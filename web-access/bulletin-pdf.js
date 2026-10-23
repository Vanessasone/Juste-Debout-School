import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
const txt=v=>String(v??'—').replace(/[’‘]/g,"'").replace(/[–—]/g,'-').replace(/œ/g,'oe').replace(/Œ/g,'OE');
export const score=v=>v===null||v===undefined?'—':Number(v).toLocaleString('fr-FR',{maximumFractionDigits:2});
export function createReportPdf(r){
 const doc=new jsPDF();let y=19;
 doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text(txt(r.school_name),14,y);y+=8;
 doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(txt(r.address),14,y);y+=11;
 doc.setFontSize(14);doc.text(`BULLETIN - TRIMESTRE ${r.term}`,14,y);y+=8;
 doc.setFontSize(11);doc.text(txt(`${r.student_name} | ${r.class_name} | ${r.season}`),14,y);y+=7;
 doc.setFontSize(9);doc.text(r.version?`Version ${r.version} - ${new Date(r.published_at).toLocaleDateString('fr-FR')}`:'APERÇU - NON PUBLIÉ',14,y);y+=6;
 autoTable(doc,{startY:y,rowPageBreak:'avoid',head:[['Matière / professeur','CC /20','Coef.','Éval. /20','Coef.','Appréciation']],body:r.rows.map(s=>[txt(`${s.subject}\n${s.teacher??''}${s.excluded_low_course_count?'\n'+s.taught_course_count+' cours - hors moyenne':''}`),s.cc_exempt?'NE':score(s.cc20),score(s.cc_coefficient),s.evaluation_exempt?'NE':score(s.evaluation20),score(s.evaluation_coefficient),txt(s.appreciation)]),styles:{font:'helvetica',fontSize:8,cellPadding:3,overflow:'linebreak'},headStyles:{fillColor:[30,29,35]},columnStyles:{0:{cellWidth:37},1:{cellWidth:16},2:{cellWidth:13},3:{cellWidth:18},4:{cellWidth:13}},margin:{top:16,bottom:18,left:14,right:14}});
 y=doc.lastAutoTable.finalY+10;
 const block=(text,size=10,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);const lines=doc.splitTextToSize(txt(text),180);for(const line of lines){if(y>275){doc.addPage();y=20;}doc.text(line,14,y);y+=size*.46+1;}y+=4;};
 block(`Moyenne contrôle continu : ${score(r.cc_average20)} /20`,11,true);
 block(`Moyenne évaluations : ${score(r.evaluation_average20)} /20`,11,true);
 block(`Absences justifiées : ${r.justified_absences} | Non justifiées : ${r.unjustified_absences}`);
 block('SYNTHÈSE DE LA DIRECTION',10,true);block(r.summary);
 if(r.published_by)block(`Publié par ${r.published_by}`,9);
 if(r.correction_reason)block(`Motif de la nouvelle version : ${r.correction_reason}`,9);
 block('CC : moyenne des notes sur 5, convertie sur 20. NE : non évalué, exclu de la moyenne correspondante. Les deux moyennes sont pondérées séparément. Coefficient 0 : moins de 3 cours dispensés dans le trimestre, hors moyenne.',8);
 const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(110);doc.text(`${i} / ${pages} - Document personnel`,14,289);}
 return doc;
}
export function downloadReport(r){const safe=String(r.student_name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]/g,'_');createReportPdf(r).save(`Bulletin_${r.campus}_${safe}_T${r.term}_v${r.version||'apercu'}.pdf`);}
