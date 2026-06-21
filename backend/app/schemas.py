from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class IssueResponse(BaseModel):
    id: int
    image_path: str
    issue_type: str
    confidence: float
    severity_score: float
    severity_label: str
    latitude: float
    longitude: float
    ward: Optional[str] = None
    address: Optional[str] = None
    status: str
    priority_score: float
    assigned_department: Optional[str] = None
    contractor: Optional[str] = None
    failure_probability_30d: Optional[float] = None
    reporter_note: Optional[str] = None
    report_count: int = 1
    days_until_sla: Optional[int] = None
    sla_breach: Optional[bool] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IssueStatusUpdate(BaseModel):
    status: str  # reported | in_progress | resolved
    contractor: Optional[str] = None


class DashboardStats(BaseModel):
    total_issues: int
    resolved_issues: int
    in_progress_issues: int
    pending_issues: int
    avg_severity: float
    avg_failure_probability: float
    critical_count: int
    by_type: dict
    by_ward: dict
    health_index: float


class WardHealth(BaseModel):
    ward: str
    health_index: float
    total_issues: int
    critical_issues: int
