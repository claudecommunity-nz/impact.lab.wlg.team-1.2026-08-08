import csv
import json
import os

INPUT  = os.path.join(os.path.dirname(__file__), 'synthetic_tickets_1000.csv')
OUTPUT = os.path.join(os.path.dirname(__file__), '../map/public/incidents.json')

CATEGORY_MAP = {
    'flooding':    'flooding',
    'slips':       'slips',
    'weather event': 'weather',
    'road and footpath maintence': 'roads',
}

HIGH_KEYWORDS = ['burst', 'gale', 'hail', 'rising', 'covering', 'dangerous',
                 'unsafe', 'emergency', 'blocking', 'collapsed', 'swept',
                 'overflowing', 'fallen onto', 'close to falling']
LOW_KEYWORDS  = ['minor', 'slight', 'small', 'cracked', 'overgrown',
                 'flickering', 'tripping hazard', 'pothole', 'uneven']

def infer_severity(detail):
    d = detail.lower()
    if any(k in d for k in HIGH_KEYWORDS): return 'high'
    if any(k in d for k in LOW_KEYWORDS):  return 'low'
    return 'medium'

def split_corrupted(detail):
    d = detail.lower()
    if any(k in d for k in ['water', 'tap', 'mains', 'supply', 'chlorine', 'cloudy']):
        return 'water'
    return 'trees'

def make_description(category_id, address):
    labels = {
        'flooding': 'Flooding',
        'slips':    'Slip',
        'weather':  'Weather event',
        'roads':    'Road/footpath issue',
        'water':    'Water quality',
        'trees':    'Dangerous tree',
    }
    return f"{labels[category_id]} — {address}"

incidents = []

with open(INPUT, newline='', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        service = row['SERVICE_ITEM'].strip()
        service_lower = service.lower()

        if service_lower in CATEGORY_MAP:
            category_id = CATEGORY_MAP[service_lower]
        elif service == 'Drinking or Tap waterReport a fallen or dangerous tree':
            category_id = split_corrupted(row['TICKET_DETAIL'])
        else:
            continue

        try:
            lat = float(row['GEO_LAT'])
            lng = float(row['GEO_LONG'])
        except ValueError:
            continue

        incidents.append({
            'type':        category_id,
            'severity':    infer_severity(row['TICKET_DETAIL']),
            'timestamp':   row['TICKET_CREATED_TS'],
            'lat':         lat,
            'lng':         lng,
            'description': make_description(category_id, row['INCIDENT_ADDRESS'].strip()),
            'detail':      row['TICKET_DETAIL'].strip(),
        })

incidents.sort(key=lambda i: i['timestamp'])

with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(incidents, f, indent=2, ensure_ascii=False)

print(f"Written {len(incidents)} incidents to {OUTPUT}")

cats = {}
for i in incidents:
    cats[i['type']] = cats.get(i['type'], 0) + 1
for k, v in sorted(cats.items()):
    print(f"  {k}: {v}")
