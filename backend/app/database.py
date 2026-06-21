"""
Database layer for Bharat Infra Sentinel AI.
Uses SQLite for hackathon simplicity (per MVP guide tech stack).
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, text
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone

SQLALCHEMY_DATABASE_URL = "sqlite:///./bharat_infra_v2.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Issue(Base):
    """A single citizen-reported civic infrastructure issue."""
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    image_path = Column(String, nullable=False)
    after_image_path = Column(String, nullable=True)

    # Detection results
    issue_type = Column(String, nullable=False)       # pothole | garbage | waterlogging | streetlight | drainage | other
    confidence = Column(Float, nullable=False)         # 0-1 model confidence
    severity_score = Column(Float, nullable=False)     # 0-100 computed severity
    severity_label = Column(String, nullable=False)    # Low | Medium | High | Critical

    # Location
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    state = Column(String, default="Punjab")
    city = Column(String, default="Ludhiana")
    ward = Column(String, nullable=True)
    address = Column(String, nullable=True)
    
    reporter_note = Column(String, nullable=True)
    original_language = Column(String, default="en")

    # Governance / workflow
    status = Column(String, default="reported")        # reported | in_progress | resolved
    priority_score = Column(Float, default=0.0)        # computed priority for the queue
    assigned_department = Column(String, nullable=True)
    contractor = Column(String, nullable=True)

    # Predictive
    failure_probability_30d = Column(Float, nullable=True)  # predicted % chance of escalation in 30 days

    # Citizen info (minimal, optional)
    reporter_note = Column(Text, nullable=True)
    reporter_phone = Column(String, nullable=True)
    report_count = Column(Integer, default=1)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    @property
    def days_until_sla(self) -> int | None:
        if self.status == "resolved":
            return None
        from app.routing import SLA_DAYS
        sla_limit = SLA_DAYS.get(self.issue_type, 14)
        
        now = datetime.now(timezone.utc)
        created = self.created_at.replace(tzinfo=timezone.utc) if self.created_at.tzinfo is None else self.created_at
        age_days = (now - created).days
        
        return sla_limit - age_days

    @property
    def sla_breach(self) -> bool | None:
        if self.status == "resolved":
            return None
        days = self.days_until_sla
        return days is not None and days < 0


class Contractor(Base):
    """Tracks contractor performance for the governance layer."""
    __tablename__ = "contractors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    issues_assigned = Column(Integer, default=0)
    issues_resolved = Column(Integer, default=0)
    avg_resolution_days = Column(Float, default=0.0)
    performance_score = Column(Float, default=100.0)  # 0-100


class ActivityLog(Base):
    """Tracks audit log of actions on issues."""
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, nullable=False)
    action = Column(String, nullable=False)  # "status_changed" | "contractor_assigned"
    old_value = Column(String, nullable=True)
    new_value = Column(String, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db():
    Base.metadata.create_all(bind=engine)
    # Raw SQL patch to add report_count to existing DB without full wipe
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE issues ADD COLUMN report_count INTEGER DEFAULT 1"))
            conn.commit()
        except Exception:
            pass  # column likely already exists
        try:
            conn.execute(text("ALTER TABLE issues ADD COLUMN reporter_phone VARCHAR"))
            conn.commit()
        except Exception:
            pass  # column likely already exists


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
