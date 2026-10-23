#!/usr/bin/env python3
"""Read the supplied colour-coded XLSX without editing it or exporting identities.

Two cells represent each room/time: amount and booking. A nonblank value or
formula anywhere in either merged range blocks the entire covered period.
Only the room legend's blue/yellow/green and explicit light blue/yellow qualify.
All other fills and missing cells are unavailable. Output contains no names,
phone numbers, amounts or free-text booking descriptions.
"""
import argparse
import collections
import datetime as dt
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile

NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def column_number(name):
    result = 0
    for char in name:
        result = result * 26 + ord(char) - 64
    return result

def coordinate(ref):
    col, row = re.fullmatch(r'([A-Z]+)(\d+)', ref).groups()
    return int(row), column_number(col)

def column_name(number):
    value = ''
    while number:
        number, rem = divmod(number - 1, 26)
        value = chr(65 + rem) + value
    return value

def read_month(path, sheet_name='NOVEMBRE 26'):
    data = Path(path).read_bytes()
    with ZipFile(path) as book:
        sheets = ET.fromstring(book.read('xl/workbook.xml')).find('s:sheets', NS)
        sheet = next(x for x in sheets if x.attrib['name'] == sheet_name)
        rid = sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
        relationships = ET.fromstring(book.read('xl/_rels/workbook.xml.rels'))
        target = next(x.attrib['Target'] for x in relationships if x.attrib['Id'] == rid)
        sheet_xml = ET.fromstring(book.read('xl/' + target.lstrip('/').removeprefix('xl/')))
        shared = [''.join(x.itertext()) for x in ET.fromstring(book.read('xl/sharedStrings.xml'))]
        styles = ET.fromstring(book.read('xl/styles.xml'))
        fills = styles.find('s:fills', NS)
        cell_styles = styles.find('s:cellXfs', NS)
        cells = {}
        for cell in sheet_xml.findall('.//s:sheetData/s:row/s:c', NS):
            value = cell.find('s:v', NS)
            text = value.text if value is not None else ''
            if cell.attrib.get('t') == 's':
                text = shared[int(text)]
            elif cell.attrib.get('t') == 'inlineStr':
                text = ''.join(cell.find('s:is', NS).itertext())
            cells[coordinate(cell.attrib['r'])] = {
                'fill': int(cell_styles[int(cell.attrib.get('s', '0'))].attrib.get('fillId', '0')),
                'occupied': bool(str(text or '').strip()) or cell.find('s:f', NS) is not None,
                'value': text,
            }
        # Resolve every covered cell to its merged anchor. Its text is never exported.
        anchors = {}
        for merge in sheet_xml.findall('.//s:mergeCells/s:mergeCell', NS):
            first, last = map(coordinate, merge.attrib['ref'].split(':'))
            for row in range(first[0], last[0]+1):
                for col in range(first[1], last[1]+1):
                    anchors[(row, col)] = first

        legend = {cells[(1, 2)]['fill']: 'blue', cells[(1, 4)]['fill']: 'yellow', cells[(1, 6)]['fill']: 'green'}
        assert len(legend) == 3, 'Distinct room colours required.'
        for index, fill in enumerate(fills):
            foreground = fill.find('s:patternFill/s:fgColor', NS)
            if foreground is not None:
                rgb = foreground.attrib.get('rgb', '').upper()
                if rgb == 'FF00B0F0': legend[index] = 'blue'
                if rgb == 'FFFFFF00': legend[index] = 'yellow'
        dates = []
        for (row, col), cell in cells.items():
            if row == 2 and cell['value'] and str(cell['value']).isdigit():
                date = dt.date(1899, 12, 30) + dt.timedelta(days=int(cell['value']))
                if date.year == 2026 and date.month == 11:
                    dates.append((date, col))
        dates.sort()
        assert [d.day for d, c in dates] == list(range(1, 31)), 'November must have 30 source dates.'
        times = []
        previous = -1
        for row in range(3, 41):
            label = cells.get((row, 1), {}).get('value', '')
            match = re.fullmatch(r'(\d{1,2})h(\d{2})?', label)
            assert match, f'Missing time at row {row}.'
            minutes = int(match[1])*60 + int(match[2] or 0)
            if minutes < previous: minutes += 1440
            if previous >= 1440 and minutes < 1440: minutes += 1440
            times.append((row, minutes))
            previous = minutes
        assert all(b[1]-a[1] == 30 for a, b in zip(times, times[1:])), 'Half-hour time grid required.'
        windows, counts = [], collections.Counter()
        points = []
        for date, day_col in dates:
            for room in range(1, 4):
                current = None
                for (row, start), (_, end) in zip(times, times[1:]):
                    cols = [day_col+(room-1)*2, day_col+(room-1)*2+1]
                    pair = [cells.get((row, col)) for col in cols]
                    occupied = any(cells.get(anchors.get((row, col), (row, col)), {}).get('occupied', False) for col in cols)
                    colours = [legend.get(c['fill']) if c else None for c in pair]
                    allowed = not occupied and all(colours)
                    colour = colours[0] if allowed else 'blocked'
                    counts['available_half_hours' if allowed else 'blocked_half_hours'] += 1
                    points.append({'date': str(date), 'room': room, 'start': start, 'end': end, 'available': bool(allowed)})
                    refs = f'{column_name(cols[0])}{row}:{column_name(cols[1])}{row}'
                    if current and current['available'] == bool(allowed) and current['colour'] == colour and current['end_minute'] == start:
                        current['end_minute'] = end
                        current['last_cells'] = refs
                    else:
                        current = {'date': str(date), 'room': room, 'start_minute': start, 'end_minute': end,
                                   'available': bool(allowed), 'colour': colour, 'first_cells': refs, 'last_cells': refs}
                        windows.append(current)
        return {'source_sha256': hashlib.sha256(data).hexdigest(), 'source_sheet': sheet_name,
                'month': '2026-11-01', 'counts': dict(counts), 'windows': windows, 'points': points}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('xlsx')
    parser.add_argument('output_json')
    args = parser.parse_args()
    result = read_month(args.xlsx)
    Path(args.output_json).write_text(json.dumps(result, ensure_ascii=False))
    print(json.dumps({'sheet': result['source_sheet'], 'counts': result['counts'], 'windows': len(result['windows'])}))
