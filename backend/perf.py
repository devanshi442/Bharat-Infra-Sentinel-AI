import time
import sys
import os

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

from app.database import SessionLocal, Issue
from sqlalchemy.orm import Session

def run_perf():
    db = SessionLocal()
    t0 = time.time()
    count = db.query(Issue).count()
    t1 = time.time()
    print(f"Total Rows: {count}")
    print(f"Count Query Time: {(t1 - t0)*1000:.2f} ms")

    t0 = time.time()
    issues = db.query(Issue).order_by(Issue.priority_score.desc()).limit(100).all()
    t1 = time.time()
    print(f"Top 100 Priority Issues Query Time: {(t1 - t0)*1000:.2f} ms")

    t0 = time.time()
    issues = db.query(Issue).order_by(Issue.priority_score.desc()).all()
    t1 = time.time()
    print(f"Load ALL {count} issues (Priority Queue full load) Time: {(t1 - t0)*1000:.2f} ms")

if __name__ == "__main__":
    run_perf()
