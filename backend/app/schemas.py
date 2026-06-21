from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class IssueResponse(BaseModel):
    id: int
    image_path: str
    after_image_path: Optional[str] = None
    issue_type: str
    confidence: float
    severity_score: float
    severity_label: str
    latitude: float
    longitude: float
    state: Optional[str] = None
    city: Optional[str] = None
    ward: Optional[str] = None
    address: Optional[str] = None
    status: str
    priority_score: float
    assigned_department: Optional[str] = None
    contractor: Optional[str] = None
    failure_probability_30d: Optional[float] = None
    reporter_note: Optional[str] = None
    reporter_phone: Optional[str] = None
    original_language: str = "en"
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
    state: str
    city: str
    ward: str
    health_index: float
    total_issues: int
    critical_issues: int


class DepartmentStats(BaseModel):
    name: str
    total_issues: int
    resolved_count: int
    in_progress_count: int
    open_count: int
    avg_resolution_time: float
    sla_breach_count: int


class ActivityLogResponse(BaseModel):
    id: int
    issue_id: int
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    timestamp: datetime
    issue_type: str
    ward: Optional[str] = None

    class Config:
        from_attributes = True

