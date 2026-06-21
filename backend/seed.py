import time
import sys
import os
import json
import random
from datetime import datetime, timedelta, timezone

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

from app.database import SessionLocal, Issue, Contractor, init_db


ISSUE_TYPES = [
    'pothole', 'garbage', 'waterlogging', 'streetlight', 'drainage', 'other'
]

TYPE_TO_IMAGE = {
    'pothole': 'seed_pothole_before.jpg',
    'garbage': 'seed_garbage_before.jpg',
    'waterlogging': 'seed_waterlogging_before.jpg',
    'streetlight': 'seed_streetlight_before.jpg',
    'drainage': 'seed_drainage_before.jpg',
    'other': 'seed_other_before.jpg',
}

TYPE_TO_AFTER_IMAGE = {
    'pothole': 'seed_pothole_after.jpg',
    'garbage': 'seed_garbage_after.jpg',
    'waterlogging': 'seed_waterlogging_after.jpg',
    'streetlight': 'seed_streetlight_after.jpg',
    'drainage': 'seed_drainage_after.jpg',
    'other': 'seed_other_after.jpg',
}

DEPARTMENT_MAP = {
    'pothole': 'Public Works',
    'garbage': 'Sanitation',
    'waterlogging': 'Drainage',
    'streetlight': 'Electricity',
    'drainage': 'Drainage',
    'other': 'Municipal Services',
}

LANGUAGES = ['en', 'hi', 'bn', 'mr', 'te', 'ta', 'gu', 'kn', 'ml', 'pa']


def severity_label(score: float) -> str:
    if score <= 25:
        return 'Low'
    if score <= 60:
        return 'Medium'
    if score <= 85:
        return 'High'
    return 'Critical'


def generate_issue_records(locations, count=14225):
    records = []
    now = datetime.now(timezone.utc)
    all_wards = []
    for state, cities in locations.items():
        for city, meta in cities.items():
            wards = meta.get('wards', [])
            for w in wards:
                all_wards.append((state, city, w))

    if not all_wards:
        raise RuntimeError('No wards found in locations data')

    for i in range(count):
        state, city, ward = random.choice(all_wards)
        lat = random.uniform(ward['min_lat'], ward['max_lat'])
        lng = random.uniform(ward['min_lng'], ward['max_lng'])

        issue_type = random.choices(ISSUE_TYPES, weights=[30,25,15,10,10,10], k=1)[0]
        severity = max(5, min(99, int(random.gauss(55, 20))))
        s_label = severity_label(severity)

        # failure probability proportional to severity with noise
        failure_prob = round(min(100, max(0, severity * random.uniform(0.5, 0.9) + random.uniform(-5, 5))), 1)

        # status distribution: more reported than resolved
        status = random.choices(['reported', 'in_progress', 'resolved'], weights=[60,25,15], k=1)[0]

        # created_at spread over last 180 days
        days_ago = random.randint(0, 180)
        created_at = now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))

        # priority score heuristic
        priority = round(severity * (1 + failure_prob / 100.0) + random.uniform(-5, 5), 1)

        img_before = TYPE_TO_IMAGE.get(issue_type, 'seed_other_before.jpg')
        img_after = TYPE_TO_AFTER_IMAGE.get(issue_type)

        # after-image only for non-reported items (some fraction)
        after_image_path = None
        if status in ('in_progress', 'resolved'):
            after_image_path = f"/uploads/{img_after}" if img_after and random.random() < 0.85 else None

        rec = Issue(
            image_path=f"/uploads/{img_before}",
            after_image_path=after_image_path,
            issue_type=issue_type,
            confidence=round(random.uniform(0.6, 0.99), 2),
            severity_score=float(severity),
            severity_label=s_label,
            latitude=lat,
            longitude=lng,
            state=state,
            city=city,
            ward=ward.get('name'),
            address=f"Near {ward.get('name')}, {city}",
            reporter_note=random.choice(['', 'Citizen reported visible damage', 'Water pooling after rains', 'Road collapsed near drain', 'No streetlight for 3 nights']),
            original_language=random.choice(LANGUAGES),
            status=status,
            priority_score=priority,
            assigned_department=DEPARTMENT_MAP.get(issue_type),
            contractor=None,
            failure_probability_30d=failure_prob,
            report_count=random.randint(1, 4),
            created_at=created_at,
            updated_at=created_at,
        )
        records.append(rec)

    return records


def run_seed(count: int = 14225, wipe_first: bool = True):
    start = time.time()
    init_db()
    db = SessionLocal()

    try:
        if wipe_first:
            print('Clearing existing Issue and Contractor rows...')
            db.query(Issue).delete()
            db.query(Contractor).delete()
            db.commit()

        # load locations
        loc_path = os.path.join(os.path.dirname(__file__), 'app', 'data', 'india_locations.json')
        with open(loc_path, 'r', encoding='utf-8') as f:
            locations = json.load(f)

        print(f'Generating {count} issue records...')
        issues = generate_issue_records(locations, count=count)

        # bulk insert issues
        print('Inserting issues (bulk)...')
        db.bulk_save_objects(issues)
        db.commit()

        # seed contractors
        contractor_names = ['Alpha Contractors', 'Metro Maintainers', 'CityWorks Ltd', 'Green Sanitation', 'PowerGrid Ops']
        contractors = [Contractor(name=n, issues_assigned=0, issues_resolved=0, avg_resolution_days=0.0, performance_score=round(random.uniform(70, 100),1)) for n in contractor_names]
        db.bulk_save_objects(contractors)
        db.commit()

        issues_count = db.query(Issue).count()
        contractors_count = db.query(Contractor).count()

        took = time.time() - start
        print(f'Seed complete — Issues: {issues_count}, Contractors: {contractors_count}, Time: {took:.1f}s')

    finally:
        db.close()


if __name__ == '__main__':
    # Allow optional args: count, --no-wipe
    arg_count = 14225
    wipe = True
    if len(sys.argv) > 1:
        try:
            arg_count = int(sys.argv[1])
        except Exception:
            pass
    if '--no-wipe' in sys.argv:
        wipe = False
    run_seed(count=arg_count, wipe_first=wipe)
