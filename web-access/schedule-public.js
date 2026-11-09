import {createClient} from '@supabase/supabase-js';
import {key} from './config.js';

const sb = createClient('https://zmzunjphubbdumowcurk.supabase.co', key, {
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
});
const weekdays = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const kinds = {open:'Cours open',workshop:'Stage',camp:'Camp',spectacle:'Spectacle'};
const dates = new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeZone:'UTC'});
const day = value => new Date(value+'T12:00:00Z');
const find = selector => document.querySelector(selector);

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function eventCard(row, heading = 'h2') {
  const card = el('article');
  card.dataset.kind = row.kind;
  const date = row.starts_on === row.ends_on
    ? dates.format(day(row.starts_on))
    : dates.formatRange?.(day(row.starts_on),day(row.ends_on))
      ?? [row.starts_on,row.ends_on].map(value => dates.format(day(value))).join(' – ');
  const link = el('a','Demander les informations ↗');
  link.href = '/#demande';
  card.append(el('small',date+' · '+kinds[row.kind]),el(heading,row.title),el('p',row.hours));
  const details = [row.teacher,row.room].filter(Boolean).join(' · ');
  if (details) card.append(el('p',details));
  if (row.notes) card.append(el('p',row.notes,'note'));
  card.append(link);
  return card;
}

function renderCore(rows) {
  const weekly = rows.filter(row => row.kind === 'weekly');
  const events = rows.filter(row => row.kind !== 'weekly');
  const week = find('.december-week');
  const existing = [...week.querySelectorAll('details')];
  const days = weekdays.map((label,index) => {
    const courses = weekly.filter(row => row.weekday === index+1);
    if (!courses.length) return null;
    const details = el('details');
    details.open = existing.some(item => item.open && item.querySelector('summary').textContent.startsWith(label));
    const summary = el('summary',label+' ');
    summary.append(el('small',courses.length+' cours'));
    const list = el('ul');
    for (const course of courses) {
      const item = el('li');
      const time = el('time',course.hours.replace(/^(\d\d):(\d\d)$/,'$1 h $2'));
      if (/^\d\d:\d\d$/.test(course.hours)) time.dateTime = course.hours;
      const content = el('span');
      const note = [course.teacher,course.room,course.notes].filter(Boolean).join(' · ');
      content.append(el('strong',course.title),note ? ' · '+note : '');
      item.append(time,content);
      list.append(item);
    }
    details.append(summary,list);
    return details;
  }).filter(Boolean);
  week.replaceChildren(...days);
  if (!days.length) week.textContent = 'Aucun cours hebdomadaire annoncé.';
  find('#season-events').replaceChildren(...events.map(row => eventCard(row)));
  find('#kind').dispatchEvent(new Event('change'));
  const december = events.filter(row => row.starts_on <= '2026-12-31' && row.ends_on >= '2026-12-01');
  const decemberCards = find('.december-cards');
  const holiday = find('#december-holiday');
  decemberCards.replaceChildren(...december.map(row => eventCard(row)),holiday);
}

function renderIndustry(rows) {
  const weekly = rows.filter(row => row.kind === 'weekly');
  const events = rows.filter(row => row.kind !== 'weekly');
  const grid = find('#industry-weekly');
  const room = find('#room');
  const selectedRoom = room.value;
  const roomNames = [...new Set(weekly.map(row => row.room).filter(Boolean))].sort();
  room.replaceChildren(new Option('Toutes les salles',''),...roomNames.map(name => new Option(name,name)));
  if (roomNames.includes(selectedRoom)) room.value = selectedRoom;
  grid.replaceChildren(...weekly.map(row => {
    const card = el('article');
    card.dataset.day = row.weekday;
    card.dataset.room = row.room;
    card.append(el('small',[weekdays[row.weekday-1],row.room].filter(Boolean).join(' · ')),
      el('h2',row.title),el('p',row.teacher,'teacher'),el('p',row.hours),el('p',row.notes,'note'));
    return card;
  }));
  room.dispatchEvent(new Event('change'));
  const eventList = find('#industry-events');
  eventList.hidden = !events.length;
  eventList.querySelector('.grid').replaceChildren(...events.map(row => eventCard(row,'h3')));
}

async function load() {
  const industry = !!find('#industry-programme');
  const {data,error} = await sb.from('jds_public_schedule')
    .select('kind,title,teacher,room,weekday,starts_on,ends_on,hours,notes')
    .eq('campus',industry ? 'INDUSTRY' : 'CORE').eq('status','published')
    .order('weekday').order('starts_on').order('hours').order('title');
  if (error) return;
  if (industry) renderIndustry(data);
  else renderCore(data);
}

load().catch(() => {});
