"""Extract weekly templates; never generate dated lessons or attendance records."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DAYS = {name: i for i, name in enumerate(
    ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'], 1)}


def extract(posts):
    slots = []
    for post in posts:
        match = re.fullmatch(r'INDUSTRY (P[12]) · Trimestre ([123]) · Planning prévisionnel', post['title'])
        if not match:
            raise ValueError('Unexpected source title: ' + post['title'])
        promotion, term = match.groups()
        day = None
        per_day = {}
        for line in post['body'].splitlines():
            if line in DAYS:
                day = DAYS[line]
                per_day[day] = 0
                continue
            timing = re.fullmatch(r'(\d{1,2})h–(\d{1,2})h : (.+)', line)
            if not timing:
                if day is not None and line.strip():
                    raise ValueError('Unrecognized timetable row: ' + line)
                continue
            start, end, label = timing.groups()
            if day is None or not 0 <= int(start) < int(end) <= 23:
                raise ValueError('Invalid slot: ' + line)
            if label == 'REPAS':
                continue
            parts = label.split(' · ')
            free = parts[-1] == 'Libre'
            unknown = parts[-1] == 'Intervenant à venir'
            ambiguous_duration = '1H module Coaching' in label
            slots.append({
                'id': f'industry-{promotion.lower()}-t{term}-d{day}-{start.zfill(2)}',
                'group_id': post['group_id'], 'source_post_id': post['id'],
                'campus': 'INDUSTRY', 'promotion': promotion, 'term': int(term),
                'iso_weekday': day, 'starts_local': start.zfill(2) + ':00',
                'ends_local': end.zfill(2) + ':00', 'timezone': 'Europe/Paris',
                'source_label': label,
                'title': ' · '.join(parts[:-1]),
                'teacher_display': None if free or unknown else parts[-1],
                'teacher_profile_id': None,
                'kind': 'free_training' if free else 'teaching',
                'duration_minutes': 60 if ambiguous_duration else (int(end)-int(start))*60,
                'exact_time_confirmed': not ambiguous_duration,
                'venue': None, 'valid_from': None, 'valid_until': None,
                'holiday_calendar_confirmed': False,
                'needs_review': ['venue', 'term_dates', 'holiday_calendar']
                    + (['teacher'] if unknown else [])
                    + (['exact_time'] if ambiguous_duration else []),
            })
            per_day[day] += 1
        if per_day != {day: 3 for day in DAYS.values()}:
            raise ValueError('Expected three non-meal slots per weekday')
    if len(slots) != 90 or len({s['id'] for s in slots}) != len(slots):
        raise ValueError('Expected 90 unique weekly slots')
    return {'season': '2026-2027', 'type': 'weekly_templates',
            'dated_lessons_created': False, 'slots': slots}


if __name__ == '__main__':
    source = ROOT / 'docs/industry-planning-intake.json'
    target = ROOT / 'docs/industry-weekly-templates.json'
    result = extract(json.loads(source.read_text()))
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    slots = result['slots']
    print(json.dumps({'weekly_slots': len(slots),
        'free_training': sum(s['kind'] == 'free_training' for s in slots),
        'teacher_to_confirm': sum('teacher' in s['needs_review'] for s in slots),
        'exact_time_to_confirm': sum(not s['exact_time_confirmed'] for s in slots)}))
