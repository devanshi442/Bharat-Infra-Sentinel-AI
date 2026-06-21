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

from app.database import init_db, get_db, Issue, Contractor, SessionLocal, ActivityLog
from app.detection import classify_issue
from app.prediction import predict_failure_probability, compute_priority_score, compute_ward_health_index
from app.routing import get_department
from app.wards import get_location_details, get_all_wards
from app.schemas import IssueResponse, IssueStatusUpdate, DashboardStats, WardHealth, DepartmentStats, ActivityLogResponse
from app.auth import verify_demo_auth, request_otp as auth_request_otp, verify_otp as auth_verify_otp, verify_citizen_auth
from pydantic import BaseModel
from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str


class TranslateRequest(BaseModel):
    text: str
    target_lang: str


class CitizenRequest(BaseModel):
    name: str
    phone: str


class CitizenVerify(BaseModel):
    phone: str
    otp: str
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
    import traceback
    try:
        with open("diag_output.txt", "w", encoding="utf-8") as f:
            f.write("=== BACKEND DIAG_START ===\n")
            try:
                db = SessionLocal()
                issues_cnt = db.query(Issue).count()
                contractors_cnt = db.query(Contractor).count()
                f.write(f"Database Connect: OK\n")
                f.write(f"Issues Count: {issues_cnt}\n")
                f.write(f"Contractors Count: {contractors_cnt}\n")
                first_issue = db.query(Issue).first()
                if first_issue:
                    f.write(f"First Issue ID: {first_issue.id}\n")
                    f.write(f"First Issue created_at: {first_issue.created_at}\n")
                    f.write(f"First Issue latitude: {first_issue.latitude}\n")
                    f.write(f"First Issue longitude: {first_issue.longitude}\n")
                else:
                    f.write("First Issue: None\n")
                db.close()
            except Exception as e:
                f.write(f"Database Connect: FAIL\n")
                f.write(f"Error: {str(e)}\n")
                f.write(traceback.format_exc())
    except Exception:
        pass
    init_db()


@app.get("/")
def root():
    return {"status": "ok", "service": "Bharat Infra Sentinel AI", "version": "0.1.0-mvp"}

@app.get("/api/db_count")
def db_count(db: Session = Depends(get_db)):
    return {"issues_count": db.query(Issue).count()}
# Force Uvicorn Reload
@app.get("/api/seed")
def run_seed_standalone():
    import subprocess
    import sys
    import os
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    try:
        proc = subprocess.run([sys.executable, "perf.py"], cwd=backend_dir, capture_output=True, text=True, timeout=120)
        return {"returncode": proc.returncode, "stdout": proc.stdout[-1000:], "stderr": proc.stderr}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/fix_locales")
def fix_locales():
    import json
    import os
    import glob
    import traceback
    try:
        base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend', 'src', 'locales')
        en_file = os.path.join(base_dir, 'en', 'translation.json')
        with open(en_file, 'r', encoding='utf-8') as f:
            en_data = json.load(f)
        
        results = []
        for lang_dir in glob.glob(os.path.join(base_dir, '*')):
            if not os.path.isdir(lang_dir) or os.path.basename(lang_dir) == 'en':
                continue
            lang_file = os.path.join(lang_dir, 'translation.json')
            try:
                with open(lang_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                updated = False
                for k, v in en_data.items():
                    if k not in data:
                        data[k] = v
                        updated = True
                
                if updated:
                    with open(lang_file, 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                    results.append(os.path.basename(lang_dir) + " updated")
                else:
                    results.append(os.path.basename(lang_dir) + " OK")
            except Exception as e:
                results.append(os.path.basename(lang_dir) + " ERROR: " + str(e))
        
        return {"results": results, "base_dir": base_dir, "en_file": en_file}
    except Exception as e:
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}

@app.post("/api/auth/login")
def login(req: LoginRequest):
    if req.username == "admin" and req.password == "demo":
        return {"token": "demo-token"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

def translate_issue_stub(text: str, source_lang: str, target_lang: str) -> str:
    """
    Mock stub for Translation Service.
    TODO: Integrate with Google Cloud Translate API or AWS Translate.
    """
    if not text or source_lang == target_lang:
        return text
    return f"[MT] {text}"

@app.post("/api/issues/upload", response_model=IssueResponse)
async def upload_issue(
    file: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: str | None = Form(None),
    reporter_note: str | None = Form(None),
    reporter_phone: str | None = Form(None),
    original_language: str = Form("en"),
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
    state, city, ward = get_location_details(latitude, longitude)

    # --- Duplicate Detection ---
    # Find existing unresolved issues of the same type
    existing_issues = db.query(Issue).filter(
        Issue.issue_type == result.issue_type,
        Issue.status == "reported",
        Issue.city == city
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
        state=state,
        city=city,
        ward=ward,
        address=address,
        reporter_note=reporter_note,
        reporter_phone=reporter_phone,
        original_language=original_language,
        status="reported",
        priority_score=priority,
        assigned_department=department,
        failure_probability_30d=failure_prob,
        report_count=1,
        created_at=now,
        updated_at=now,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)

    return issue


@app.post("/api/auth/citizen/request-otp")
def citizen_request_otp(req: CitizenRequest):
    otp = auth_request_otp(req.name, req.phone)
    return {"otp": otp, "note": "DEMO MODE: real deployment would SMS this via a provider like MSG91/Twilio, not return it in the response"}


@app.post("/api/auth/citizen/verify-otp")
def citizen_verify_otp(req: CitizenVerify):
    resp = auth_verify_otp(req.phone, req.otp)
    return {"token": resp["token"], "name": resp["name"], "phone": resp["phone"]}


@app.get("/api/issues/mine", response_model=list[IssueResponse])
def my_issues(db: Session = Depends(get_db), citizen: dict = Depends(verify_citizen_auth)):
    phone = citizen.get("phone")
    issues = db.query(Issue).filter(Issue.reporter_phone == phone).order_by(Issue.created_at.desc()).all()
    return issues


@app.get("/api/issues", response_model=list[IssueResponse])
def list_issues(
    status: str | None = None,
    issue_type: str | None = None,
    state: str | None = None,
    city: str | None = None,
    ward: str | None = None,
    search: str | None = None,
    lang: str = "en",
    sort_by_priority: bool = True,
    db: Session = Depends(get_db),
    auth: bool = Depends(verify_demo_auth)
):
    """Government dashboard: list/filter issues, sorted by priority by default.
       If search is provided, it mocks translating the search query across all languages."""
    query = db.query(Issue)
    if status:
        query = query.filter(Issue.status == status)
    if issue_type:
        query = query.filter(Issue.issue_type == issue_type)
    if state:
        query = query.filter(Issue.state == state)
    if city:
        query = query.filter(Issue.city == city)
    if ward:
        query = query.filter(Issue.ward == ward)

    if sort_by_priority:
        query = query.order_by(Issue.priority_score.desc())
    else:
        query = query.order_by(Issue.created_at.desc())

    issues = query.all()
    
    # Apply search filter manually to demonstrate the architecture 
    # (Citizen submits in Language A, Official searches in Language B)
    if search:
        filtered_issues = []
        for issue in issues:
            if issue.reporter_note:
                # We "translate" the official's search query into the issue's original language to check for a match.
                # In a real app, either issues are pre-translated, or semantic search is used.
                translated_search = translate_issue_stub(search, lang, issue.original_language)
                if translated_search.lower() in issue.reporter_note.lower():
                    filtered_issues.append(issue)
        issues = filtered_issues

    # Translate notes into official's display language
    for issue in issues:
        if issue.reporter_note:
            issue.reporter_note = translate_issue_stub(issue.reporter_note, issue.original_language, lang)

    return issues


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

    old_status = issue.status
    old_contractor = issue.contractor

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

    # Write log entries
    if old_status != status:
        log_status = ActivityLog(
            issue_id=issue.id,
            action="status_changed",
            old_value=old_status,
            new_value=status,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(log_status)

    if contractor and old_contractor != contractor:
        log_contractor = ActivityLog(
            issue_id=issue.id,
            action="contractor_assigned",
            old_value=old_contractor or "Unassigned",
            new_value=contractor,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(log_contractor)

    issue.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(issue)
    return issue


@app.get("/api/dashboard/stats", response_model=DashboardStats)
def dashboard_stats(state: str | None = None, city: str | None = None, db: Session = Depends(get_db), auth: bool = Depends(verify_demo_auth)):
    """Aggregate stats for the government dashboard cards/charts."""
    query = db.query(Issue)
    if state:
        query = query.filter(Issue.state == state)
    if city:
        query = query.filter(Issue.city == city)
    issues = query.all()
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
            key = f"{i.city} - {i.ward}" if i.city else str(i.ward)
            by_ward[key] = by_ward.get(key, 0) + 1

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
def ward_health(state: str | None = None, city: str | None = None, db: Session = Depends(get_db), auth: bool = Depends(verify_demo_auth)):
    """Per-ward Infrastructure Health Index — powers the map heat-coloring."""
    results = []
    for s, c, w in get_all_wards():
        if state and s != state: continue
        if city and c != city: continue
        
        issues = db.query(Issue).filter(Issue.state == s, Issue.city == c, Issue.ward == w).all()
        if not issues:
            results.append(WardHealth(state=s, city=c, ward=w, health_index=100.0, total_issues=0, critical_issues=0))
            continue
        health = compute_ward_health_index(issues)
        critical = sum(1 for i in issues if i.severity_label == "Critical")
        results.append(WardHealth(state=s, city=c, ward=w, health_index=health, total_issues=len(issues), critical_issues=critical))
    return results

@app.get("/api/dashboard/export/{ward}")
def export_ward_csv(ward: str, city: str | None = None, db: Session = Depends(get_db), auth: bool = Depends(verify_demo_auth)):
    """Export ward issues as CSV."""
    from fastapi.responses import StreamingResponse
    import io
    import csv

    # Match exact ward string or "all"
    query = db.query(Issue)
    if city:
        query = query.filter(Issue.city == city)
        
    if ward.lower() != "all":
        query = query.filter(Issue.ward == ward)
        
    issues = query.all()

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
    state: str | None = None,
    city: str | None = None,
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
    if state:
        query = query.filter(Issue.state == state)
    if city:
        query = query.filter(Issue.city == city)
    if ward:
        query = query.filter(Issue.ward == ward)
    
    issues = query.all()
    
    # We need to simulate age, so we calculate current age for the predictor
    now = datetime.now(timezone.utc)
    for issue in issues:
        created = issue.created_at.replace(tzinfo=timezone.utc) if issue.created_at.tzinfo is None else issue.created_at
        issue.age_days = (now - created).days

    return forecast_health_index(issues, days=days, resolve_top_n=resolve_top_n)


@app.get("/api/dashboard/departments", response_model=list[DepartmentStats])
def get_departments_stats(db: Session = Depends(get_db), auth: bool = Depends(verify_demo_auth)):
    issues = db.query(Issue).all()
    
    depts = [
        "Roads & Public Works Department",
        "Drainage & Flood Control Department",
        "Solid Waste Management Department",
        "Electrical & Street Lighting Department",
        "General Civic Grievance Cell"
    ]
    
    stats = {
        dept: {
            "name": dept,
            "total_issues": 0,
            "resolved_count": 0,
            "in_progress_count": 0,
            "open_count": 0,
            "avg_resolution_time": 0.0,
            "sla_breach_count": 0,
            "_resolution_times": [],
        }
        for dept in depts
    }
    
    for issue in issues:
        dept = issue.assigned_department or "General Civic Grievance Cell"
        if dept not in stats:
            stats[dept] = {
                "name": dept,
                "total_issues": 0,
                "resolved_count": 0,
                "in_progress_count": 0,
                "open_count": 0,
                "avg_resolution_time": 0.0,
                "sla_breach_count": 0,
                "_resolution_times": [],
            }
            
        stats[dept]["total_issues"] += 1
        
        if issue.status == "resolved":
            stats[dept]["resolved_count"] += 1
            if issue.updated_at and issue.created_at:
                diff = issue.updated_at - issue.created_at
                days = diff.total_seconds() / 86400.0
                stats[dept]["_resolution_times"].append(days)
        elif issue.status == "in_progress":
            stats[dept]["in_progress_count"] += 1
        elif issue.status == "reported":
            stats[dept]["open_count"] += 1
            
        if issue.status != "resolved" and issue.sla_breach:
            stats[dept]["sla_breach_count"] += 1
            
    results = []
    for dept, data in stats.items():
        times = data["_resolution_times"]
        if times:
            data["avg_resolution_time"] = round(sum(times) / len(times), 1)
        else:
            data["avg_resolution_time"] = 0.0
        del data["_resolution_times"]
        results.append(data)
        
    return results


@app.get("/api/dashboard/activity", response_model=list[ActivityLogResponse])
def get_activity_log(db: Session = Depends(get_db), auth: bool = Depends(verify_demo_auth)):
    results = (
        db.query(
            ActivityLog.id,
            ActivityLog.issue_id,
            ActivityLog.action,
            ActivityLog.old_value,
            ActivityLog.new_value,
            ActivityLog.timestamp,
            Issue.issue_type,
            Issue.ward
        )
        .join(Issue, ActivityLog.issue_id == Issue.id)
        .order_by(ActivityLog.timestamp.desc())
        .limit(50)
        .all()
    )
    
    return [
        ActivityLogResponse(
            id=r[0],
            issue_id=r[1],
            action=r[2],
            old_value=r[3],
            new_value=r[4],
            timestamp=r[5],
            issue_type=r[6],
            ward=r[7]
        )
        for r in results
    ]


@app.get("/api/contractors")
def list_contractors(db: Session = Depends(get_db), auth: bool = Depends(verify_demo_auth)):
    return db.query(Contractor).order_by(Contractor.performance_score.desc()).all()


@app.post('/api/translate')
def translate_text(req: TranslateRequest):
    """Server-side translation endpoint using Google Cloud Translate (v2 wrapper).

    Setup:
      - Install dependency: `pip install google-cloud-translate`
      - Enable Cloud Translation API in Google Cloud project.
      - Create a service account, download JSON key, set env var:
          `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`
    """
    try:
        from google.cloud import translate_v2 as translate
    except Exception:
        raise HTTPException(status_code=500, detail=(
            "Translation client not available. Ensure `google-cloud-translate` is installed "
            "and the environment variable GOOGLE_APPLICATION_CREDENTIALS is configured."))

    client = translate.Client()
    try:
        resp = client.translate(req.text, target_language=req.target_lang)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {e}")

    return {"translatedText": resp.get('translatedText'), "detectedSource": resp.get('detectedSourceLanguage')}


