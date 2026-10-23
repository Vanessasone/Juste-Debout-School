import {MAX_ROWS,parseCSV,documentProposal} from './import-core.js';
const textLimit=200000;
self.onmessage=async({data:{buffer,name}})=>{try{
 const ext=name.split('.').pop().toLowerCase();let result;
 if(['csv','tsv','txt'].includes(ext)){
  let text=new TextDecoder('utf-8',{fatal:false}).decode(buffer);if(text.includes('\ufffd'))text=new TextDecoder('windows-1252').decode(buffer);
  result=ext==='txt'?{type:'document',text:text.slice(0,textLimit),suggestion:documentProposal(text)}:{type:'table',sheets:[{name:'Tableau',rows:parseCSV(text)}]};
 }else if(ext==='xlsx'){
  const {default:ExcelJS}=await import('exceljs/dist/exceljs.min.js');const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(buffer);
  if(workbook.worksheets.length>20)throw Error('20 feuilles maximum par fichier.');
  const sheets=workbook.worksheets.map(sheet=>{if(sheet.rowCount>MAX_ROWS+20||sheet.columnCount>80)throw Error('Limite : 300 lignes de données et 80 colonnes.');const rows=[];
   sheet.eachRow({includeEmpty:true},row=>{const cells=[];for(let i=1;i<=sheet.columnCount;i++){const v=row.getCell(i).value;let value='';
    if(v instanceof Date)value=v.toISOString().slice(0,10);else if(v&&typeof v==='object'){if('formula'in v||'sharedFormula'in v)value='[FORMULE À VÉRIFIER]';else if(v.richText)value=v.richText.map(x=>x.text).join('');else if(v.text)value=v.text;else value='';}else value=String(v??'');
    if(value.length>20000)throw Error('Cellule trop longue.');cells.push(value);
   }rows.push(cells);});return {name:sheet.name,rows};});result={type:'table',sheets};
 }else if(ext==='pdf'){
  const pdfjs=await import('pdfjs-dist/build/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/app/assets/pdf.worker.min.mjs';const pdfPort=new Worker(pdfjs.GlobalWorkerOptions.workerSrc,{type:'module'});pdfjs.GlobalWorkerOptions.workerPort=pdfPort;
  const task=pdfjs.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,useSystemFonts:false,disableFontFace:true});const pdf=await task.promise;
  try{if(pdf.numPages>30)throw Error('30 pages maximum par PDF.');let text='';for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n),content=await page.getTextContent();text+='\nPage '+n+'\n';let lastY=null;for(const item of content.items){if(!('str'in item))continue;const y=item.transform?.[5];if(lastY!==null&&Math.abs(y-lastY)>3)text+='\n';text+=item.str+(item.hasEOL?'\n':' ');lastY=y;}if(text.length>textLimit)throw Error('Texte du PDF trop volumineux.');}
   if(text.replace(/Page \d+/g,'').trim().length<20)throw Error('Ce PDF ne contient pas assez de texte lisible. Pour un scan ou une photo, utilise la saisie manuelle ou exporte un tableau Excel/CSV.');result={type:'document',text,suggestion:documentProposal(text)};
  }finally{await task.destroy();pdfPort.terminate();pdfjs.GlobalWorkerOptions.workerPort=null;}
 }else throw Error('Formats acceptés : XLSX, CSV, TSV, PDF texte et TXT.');
 self.postMessage({ok:true,result});
}catch(e){self.postMessage({ok:false,error:e.message||'Lecture impossible. Vérifie le format du fichier.'});}};
