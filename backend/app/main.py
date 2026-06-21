"""
main.py - Bharat Infra Sentinel AI Backend

Run with:  uvicorn app.main:app --reload --port 8000
Docs at:   http://localhost:8000/docs
"""
import os
import uuid
import random
from datetime import datetime, timezone
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func
import math

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

from app.database import init_db, get_db, Issue, Contractor
from app.detection import classify_issue
from app.prediction import predict_failure_probability, compute_priority_score, compute_ward_health_index
from app.routing import get_department
from app.wards import get_ward_for_location, WARDS
from app.schemas import IssueResponse, IssueStatusUpdate, DashboardStats, WardHealth
from app.auth import verify_demo_auth
from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="Bharat Infra Sentinel AI",
    description="Predicting infrastructure failures before citizens suffer.",
    version="0.1.0-mvp",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")



@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def root():
    return {"status": "ok", "service": "Bharat Infra Sentinel AI", "version": "0.1.0-mvp"}

@app.post("/api/auth/login")
def login(req: LoginRequest):
    if req.username == "admin" and req.password == "demo":
        return {"token": "demo-token"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/issues/upload", response_model=IssueResponse)
async def upload_issue(
    file: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: str | None = Form(None),
    reporter_note: str | None = Form(None),
    db: Session = Depends(get_db),
):
    """
    Citizen-facing endpoint: upload an image + location, get back
    AI-detected issue type, severity, predicted failure risk, and
    assigned department — end to end in one call.
    """
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    # --- AI Detection ---
    result = classify_issue(filepath)

    # --- Predictive Maintenance ---
    now = datetime.now(timezone.utc)
    failure_prob = predict_failure_probability(
        issue_type=result.issue_type,
        severity_score=result.severity_score,
        created_at=now,
    )

    priority = compute_priority_score(result.severity_score, failure_prob, age_days=0, report_count=1)
    department = get_department(result.issue_type)
    ward = get_ward_for_location(latitude, longitude)

    # --- Duplicate Detection ---
    # Find existing unresolved issues of the same type
    existing_issues = db.query(Issue).filter(
        Issue.issue_type == result.issue_type,
        Issue.status == "reported"
    ).all()
    
    for ex_issue in existing_issues:
        dist = haversine_distance(latitude, longitude, ex_issue.latitude, ex_issue.longitude)
        if dist <= 100:  # within 100 meters
            ex_issue.report_count += 1
            ex_issue.updated_at = now
            # Recalculate priority
            age_days = max((now - ex_issue.created_at.replace(tzinfo=timezone.utc)).days, 0) if ex_issue.created_at.tzinfo is None else max((now - ex_issue.created_at).days, 0)
            ex_issue.priority_score = compute_priority_score(
                severity_score=ex_issue.severity_score,
                failure_probability=ex_issue.failure_probability_30d or 0,
                age_days=age_days,
                report_count=ex_issue.report_count
            )
            db.commit()
            db.refresh(ex_issue)
            return ex_issue

    issue = Issue(
        image_path=f"/uploads/{filename}",
        issue_type=result.issue_type,
        confidence=result.confidence,
        severity_score=result.severity_score,
        severity_label=result.severity_label,
        latitude=latitude,
        longitude=longitude,
        ward=ward,
        address=address,
        status="reported",
        priority_score=priority,
        assigned_department=department,
        failure_probability_30d=failure_prob,
        reporter_note=reporter_note,
        report_count=1,
        created_at=now,
        updated_at=now,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)

    return issue


@app.get("/api/issues", response_model=list[IssueResponse])
def list_issues(
    status: str | None = None,
    issue_type: str | None = None,
    ward: str | None = None,
    sort_by_priority: bool = True,
    db: Session = Depends(get_db),
    auth: bool = Depends(verify_demo_auth)
):
    """Government dashboard: list/filter issues, sorted by priority by default."""
    query = db.query(Issue)
    if status:
        query = query.filter(Issue.status == status)
    if issue_type:
        query = query.filter(Issue.issue_type == issue_type)
    if ward:
        query = query.filter(Issue.ward == ward)

    if sort_by_priority:
        query = query.order_by(Issue.priority_score.desc())
    else:
        query = query.order_by(Issue.created_at.desc())

    return query.all()


@app.get("/api/issues/{issue_id}", response_model=IssueResponse)
def get_issue(issue_id: int, db: Session = Depends(get_db), auth: bool = Depends(verify_demo_auth)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@app.patch("/api/issues/{issue_id}/status", response_model=IssueResponse)
def update_issue_status(
    issue_id: int, 
    status: str = Form(...),
    contractor: str | None = Form(None),
    after_image: UploadFile | None = File(None),
    db: Session = Depends(get_db), 
    auth: bool = Depends(verify_demo_auth)
):
    """Used by the government dashboard to mark issues in_progress / resolved,
    and to assign a contractor, and optionally attach an after photo."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if contractor and contractor != issue.contractor:
        issue.contractor = contractor
        contractor_record = db.query(Contractor).filter(Contractor.name == contractor).first()
        if contractor_record:
            contractor_record.issues_assigned += 1
            contractor_record.performance_score = round((contractor_record.issues_resolved / contractor_record.issues_assigned) * 100, 1)

    if status == "resolved" and issue.status != "resolved" and issue.contractor:
        contractor_record = db.query(Contractor).filter(Contractor.name == issue.contractor).first()
        if contractor_record:
            contractor_record.issues_resolved += 1
            if contractor_record.issues_assigned < contractor_record.issues_resolved:
                contractor_record.issues_assigned = contractor_record.issues_resolved
            contractor_record.performance_score = round((contractor_record.issues_resolved / contractor_record.issues_assigned) * 100, 1)

    issue.status = status
    if after_image:
        ext = os.path.splitext(after_image.filename)[1] or ".jpg"
        filename = f"after_{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(after_image.file.read())
        issue.after_image_path = f"/uploads/{filename}"

    issue.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(issue)
    return issue


@app.get("/api/dashboard/stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db), auth: bool = Depends(verify_demo_auth)):
    """Aggregate stats for the government dashboard cards/charts."""
    issues = db.query(Issue).all()
    total = len(issues)

    if total == 0:
        return DashboardStats(
            total_issues=0, resolved_issues=0, in_progress_issues=0, pending_issues=0,
            avg_severity=0, avg_failure_probability=0, critical_count=0,
            by_type={}, by_ward={}, health_index=100.0,
        )

    resolved = sum(1 for i in issues if i.status == "resolved")
    in_progress = sum(1 for i in issues if i.status == "in_progress")
    pending = sum(1 for i in issues if i.status == "reported")
    critical = sum(1 for i in issues if i.severity_label == "Critical")

    by_type = {}
    for i in issues:
        by_type[i.issue_type] = by_type.get(i.issue_type, 0) + 1

    by_ward = {}
    for i in issues:
        if i.ward:
            by_ward[i.ward] = by_ward.get(i.ward, 0) + 1

    avg_severity = round(sum(i.severity_score for i in issues) / total, 1)
    avg_fail_prob = round(sum((i.failure_probability_30d or 0) for i in issues) / total, 1)
    health_index = compute_ward_health_index(issues)

    return DashboardStats(
        total_issues=total,
        resolved_issues=resolved,
        in_progress_issues=in_progress,
        pending_issues=pending,
        avg_severity=avg_severity,
        avg_failure_probability=avg_fail_prob,
        critical_count=critical,
        by_type=by_type,
        by_ward=by_ward,
        health_index=health_index,
    )


@app.get("/api/dashboard/ward-health", response_model=list[WardHealth])
def ward_health(db: Session = Depends(get_db), auth: bool = Depends(verify_demo_auth)):
    """Per-ward Infrastructure Health Index — powers the map heat-coloring."""
    results = []
    for ward in WARDS:
        issues = db.query(Issue).filter(Issue.ward == ward).all()
        if not issues:
            results.append(WardHealth(ward=ward, health_index=100.0, total_issues=0, critical_issues=0))
            continue
        health = compute_ward_health_index(issues)
        critical = sum(1 for i in issues if i.severity_label == "Critical")
        results.append(WardHealth(ward=ward, health_index=health, total_issues=len(issues), critical_issues=critical))
    return results

@app.get("/api/dashboard/export/{ward}")
def export_ward_csv(ward: str, db: Session = Depends(get_db), auth: bool = Depends(verify_demo_auth)):
    """Export ward issues as CSV."""
    from fastapi.responses import StreamingResponse
    import io
    import csv

    # Match exact ward string or "all"
    if ward.lower() == "all":
        issues = db.query(Issue).all()
    else:
        issues = db.query(Issue).filter(Issue.ward == ward).all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["ID", "Type", "Severity", "Severity Score", "Status", "Priority Score", "Contractor", "Report Count", "Created At"])
    
    for issue in issues:
        writer.writerow([
            issue.id,
            issue.issue_type,
            issue.severity_label,
            issue.severity_score,
            issue.status,
            issue.priority_score,
            issue.contractor or "Unassigned",
            issue.report_count,
            issue.created_at.strftime("%Y-%m-%d %H:%M:%S")
        ])
        
    output.seek(0)
    
    filename = f"ward_{ward.replace(' ', '_').lower()}_issues.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/api/dashboard/forecast")
def dashboard_forecast(
    days: int = 90, 
    resolve_top_n: int = 10, 
    ward: str | None = None,
    db: Session = Depends(get_db), 
    auth: bool = Depends(verify_demo_auth)
):
    """
    Project the Ward Health Index forward over `days`.
    Simulates the resolution of `resolve_top_n` priority issues at day 0.
    """
    from app.prediction import forecast_health_index
    
    query = db.query(Issue)
    if ward:
        query = query.filter(Issue.ward == ward)
    
    issues = query.all()
    
    # We need to simulate age, so we calculate current age for the predictor
    now = datetime.now(timezone.utc)
    for issue in issues:
        created = issue.created_at.replace(tzinfo=timezone.utc) if issue.created_at.tzinfo is None else issue.created_at
        issue.age_days = (now - created).days

    return forecast_health_index(issues, days=days, resolve_top_n=resolve_top_n)


@app.get("/api/contractors")
def list_contractors(db: Session = Depends(get_db), auth: bool = Depends(verify_demo_auth)):
    return db.query(Contractor).order_by(Contractor.performance_score.desc()).all()


@app.post("/api/seed-demo-data")
def seed_demo_data(db: Session = Depends(get_db)):
    """
    Convenience endpoint for hackathon demos: populates the DB with
    realistic-looking sample issues so the dashboard/map aren't empty
    when judges look at it. NOT for production use.
    """
    import random as _r

    sample_types = list(["pothole", "garbage", "waterlogging", "streetlight", "drainage"])
    base_lat, base_lng = 30.9010, 75.8573  # Ludhiana, matches investor deck's pilot city

    created = []
    for _ in range(25):
        issue_type = _r.choice(sample_types)
        severity = round(_r.uniform(20, 95), 1)
        from app.detection import severity_to_label
        label = severity_to_label(severity)
        now = datetime.now(timezone.utc)
        fail_prob = predict_failure_probability(issue_type, severity, now)
        priority = compute_priority_score(severity, fail_prob, age_days=_r.randint(0, 20), report_count=1)

        issue = Issue(
            image_path="/uploads/demo_placeholder.jpg",
            issue_type=issue_type,
            confidence=round(_r.uniform(0.6, 0.95), 2),
            severity_score=severity,
            severity_label=label,
            latitude=base_lat + _r.uniform(-0.05, 0.05),
            longitude=base_lng + _r.uniform(-0.05, 0.05),
            ward=_r.choice(WARDS),
            address="Sample demo location",
            status=_r.choice(["reported", "in_progress", "resolved"]),
            priority_score=priority,
            assigned_department=get_department(issue_type),
            failure_probability_30d=fail_prob,
            report_count=1,
            created_at=now,
            updated_at=now,
        )
        db.add(issue)
        created.append(issue_type)

    if db.query(Contractor).count() == 0:
        c1 = Contractor(name="Alpha Build Co.", issues_assigned=10, issues_resolved=8, performance_score=80.0)
        c2 = Contractor(name="Ludhiana Roads Ltd.", issues_assigned=15, issues_resolved=14, performance_score=93.3)
        c3 = Contractor(name="Municipal Works Dept", issues_assigned=5, issues_resolved=2, performance_score=40.0)
        db.add_all([c1, c2, c3])

    db.commit()
    return {"message": f"Seeded {len(created)} demo issues."}
