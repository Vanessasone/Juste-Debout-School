import {createClient} from '@supabase/supabase-js';
import {parisDateTime} from '../src/lib/paris-date-time';
import {key} from './config.js';

const sb = createClient('https://zmzunjphubbdumowcurk.supabase.co', key, {
  auth: {storageKey: 'jds-school-auth-v1', detectSessionInUrl: false},
});
const byId = id => document.getElementById(id);
const form = byId('entry');
const fields = form.elements;
const weekdays = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const kinds = {weekly:'Cours hebdomadaire',open:'Cours ponctuel',workshop:'Stage',camp:'Camp',spectacle:'Spectacle'};
const statuses = {draft:'Brouillon',published:'Publié',cancelled:'Annulé'};
const paris = new Intl.DateTimeFormat('sv-SE', {
  timeZone:'Europe/Paris',dateStyle:'short',timeStyle:'short',hourCycle:'h23',
});
let mode = 'public';
let current = null;
let rows = [];
let groups = new Map();
let generation = 0;

function showStatus(id, message, error = false) {
  const node = byId(id);
  node.textContent = message;
  node.classList.toggle('error', error);
}

function visibleFields() {
  const training = mode === 'training';
  const weekly = fields.kind.value === 'weekly';
  for (const [id, hidden] of [
    ['public-fields',training],['training-fields',!training],
    ['weekly-fields',training || !weekly],['date-fields',training || weekly],
    ['hours-field',training],['notes-field',training],
  ]) byId(id).hidden = hidden;
  fields.hours.required = !training;
  fields.starts_on.required = !training && !weekly;
  fields.group_id.required = fields.starts_at.required = fields.ends_at.required = training;
  fields.group_id.disabled = training && !!current;
}

function edit(row = null) {
  current = row;
  form.reset();
  if (row) {
    for (const name of ['campus','kind','weekday','starts_on','ends_on','title','teacher','room','hours','notes','status','group_id']) {
      if (row[name] != null) fields[name].value = row[name];
    }
    if (row.starts_at) {
      fields.starts_at.value = paris.format(new Date(row.starts_at)).replace(' ','T');
      fields.ends_at.value = paris.format(new Date(row.ends_at)).replace(' ','T');
    }
  }
  byId('form-title').textContent = row ? 'Modifier le créneau' : 'Ajouter un créneau';
  byId('reset').hidden = !row;
  visibleFields();
}

function renderRows() {
  const host = byId('entries');
  host.replaceChildren();
  const campus = byId('campus-filter').value;
  const query = byId('search').value.trim().toLocaleLowerCase('fr');
  for (const row of rows) {
    const group = groups.get(row.group_id);
    if (campus && (group?.campus ?? row.campus) !== campus) continue;
    if (query && ![row.title,row.teacher,row.room,group?.name].join(' ').toLocaleLowerCase('fr').includes(query)) continue;
    const card = document.createElement('article');
    const title = document.createElement('strong');
    const detail = document.createElement('p');
    const button = document.createElement('button');
    title.textContent = row.title;
    const when = group
      ? [paris.format(new Date(row.starts_at)),paris.format(new Date(row.ends_at))].join(' → ')
      : [row.weekday ? weekdays[row.weekday-1] : row.starts_on,
        row.ends_on !== row.starts_on ? row.ends_on : null,row.hours].filter(Boolean).join(' · ');
    detail.textContent = [group ? [group.campus,group.name,group.season].join(' ') : row.campus,
      kinds[row.kind],when,row.teacher,row.room,statuses[row.status]].filter(Boolean).join(' · ');
    button.type = 'button';
    button.textContent = 'Modifier';
    button.setAttribute('aria-label', 'Modifier '+row.title);
    button.onclick = () => {
      edit(row);
      showStatus('save-status','');
      fields.title.focus();
    };
    card.append(title,detail,button);
    host.append(card);
  }
  if (!host.childElementCount) host.textContent = 'Aucun créneau correspondant.';
}

async function load() {
  const stamp = ++generation;
  const training = mode === 'training';
  const response = training
    ? await sb.from('jds_training_lessons').select('id,group_id,title,teacher,room,starts_at,ends_at,status').order('starts_at',{ascending:false}).limit(1000)
    : await sb.from('jds_public_schedule').select('*').order('campus').order('weekday',{nullsFirst:true}).order('starts_on',{ascending:false}).order('hours');
  if (stamp !== generation) return;
  if (response.error) throw response.error;
  rows = response.data;
  renderRows();
}

async function switchMode(next) {
  mode = next;
  const training = mode === 'training';
  byId('public-mode').setAttribute('aria-pressed',String(!training));
  byId('training-mode').setAttribute('aria-pressed',String(training));
  byId('scope-note').textContent = training
    ? 'Les séances publiées apparaissent dans le planning privé des élèves de la promotion.'
    : 'Les créneaux publiés apparaissent dans le calendrier public du campus. La publication ne déclenche aucune réservation.';
  edit();
  showStatus('save-status','');
  rows = [];
  byId('entries').textContent = 'Chargement…';
  try { await load(); }
  catch { byId('entries').textContent = 'Chargement impossible. Recharge la page pour réessayer.'; }
}

function trainingTime(value) {
  const [date,time] = value.split('T');
  return parisDateTime(date,time);
}

form.onsubmit = async event => {
  event.preventDefault();
  const training = mode === 'training';
  const fieldset = byId('fields');
  fieldset.disabled = byId('public-mode').disabled = byId('training-mode').disabled = true;
  byId('entries').inert = true;
  showStatus('save-status','Enregistrement…');
  try {
    const row = {title:fields.title.value.trim(),teacher:fields.teacher.value.trim(),
      room:fields.room.value.trim(),status:fields.status.value};
    if (!row.title) throw new Error('Renseigne un intitulé.');
    if (training) {
      Object.assign(row,{starts_at:trainingTime(fields.starts_at.value),ends_at:trainingTime(fields.ends_at.value)});
      if (!current) row.group_id = fields.group_id.value;
      if (row.ends_at <= row.starts_at) throw new Error('L’heure de fin doit suivre l’heure de début.');
    } else {
      const weekly = fields.kind.value === 'weekly';
      Object.assign(row,{campus:fields.campus.value,kind:fields.kind.value,weekday:weekly ? Number(fields.weekday.value) : null,
        starts_on:weekly ? null : fields.starts_on.value,
        ends_on:weekly ? null : fields.ends_on.value || fields.starts_on.value,
        hours:fields.hours.value.trim(),notes:fields.notes.value.trim()});
      if (!row.hours) throw new Error('Renseigne les horaires.');
      if (!weekly && row.ends_on < row.starts_on) throw new Error('La dernière date doit suivre la première.');
    }
    const table = sb.from(training ? 'jds_training_lessons' : 'jds_public_schedule');
    const request = current ? table.update(row).eq('id',current.id) : table.insert(row);
    const {error} = await request.select('id').single();
    if (error) throw error;
    edit();
    showStatus('save-status','Créneau enregistré.');
    try { await load(); }
    catch { showStatus('save-status','Créneau enregistré. Recharge la page pour actualiser la liste.',true); }
  } catch (error) {
    showStatus('save-status',error.message || 'Enregistrement impossible.',true);
  } finally {
    fieldset.disabled = byId('public-mode').disabled = byId('training-mode').disabled = false;
    byId('entries').inert = false;
  }
};

fields.kind.onchange = visibleFields;
byId('public-mode').onclick = () => switchMode('public');
byId('training-mode').onclick = () => switchMode('training');
byId('campus-filter').onchange = renderRows;
byId('search').oninput = renderRows;
byId('reset').onclick = () => { edit(); showStatus('save-status',''); };

async function init() {
  const {data:{session},error:sessionError} = await sb.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) {
    byId('signin').hidden = false;
    showStatus('status','Connecte-toi à ton compte School pour accéder au planning.');
    return;
  }
  const {data:allowed,error} = await sb.rpc('jds_activate_schedule_editor');
  if (error) throw error;
  if (!allowed) {
    showStatus('status','Ce compte School n’a pas accès à la gestion des plannings.',true);
    return;
  }
  const {data,error:groupsError} = await sb.from('jds_training_groups').select('id,campus,name,season').order('campus').order('name');
  if (groupsError) throw groupsError;
  groups = new Map(data.map(group => [group.id,group]));
  fields.group_id.replaceChildren(...data.map(group => new Option([group.campus,group.name,group.season].join(' · '),group.id)));
  showStatus('status','Accès au planning activé.');
  byId('editor').hidden = false;
  await switchMode('public');
}

init().catch(() => showStatus('status','Impossible de vérifier l’accès. Recharge la page pour réessayer.',true));
sb.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_OUT') {
    generation++;
    byId('editor').hidden = true;
    byId('signin').hidden = false;
    showStatus('status','La session School est terminée.');
  }
});
