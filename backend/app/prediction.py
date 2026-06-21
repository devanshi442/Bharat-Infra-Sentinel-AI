"""
prediction.py - Predictive Maintenance Engine

HONEST DESIGN NOTE: A real time-to-failure model (per the pitch deck's
"XGBoost + time-series") needs historical maintenance/failure records,
which don't exist yet for a hackathon MVP. This module implements a
transparent, rule-based risk model using factors that genuinely correlate
with infrastructure degradation risk (severity, issue age, issue type,
and a monsoon/seasonal flag), and exposes the SAME function signature
an XGBoost model would use — so it's a drop-in swap once real historical
data is available (e.g. from a municipal partner during a pilot).

Pitch framing: "Our MVP uses an explainable rule-based risk engine;
production version trains XGBoost on historical repair + weather data
once municipal partnerships provide that data."
"""
from datetime import datetime, timezone
import math

# Relative risk multiplier by issue type (domain-informed, not learned)
TYPE_RISK_MULTIPLIER = {
    "pothole": 1.3,
    "waterlogging": 1.4,
    "drainage": 1.25,
    "garbage": 0.9,
    "streetlight": 0.8,
    "other": 1.0,
}

# Simple seasonal flag — in production this would call a weather API
# (e.g. IMD rainfall forecast) per the deck's "Weather Data" input.
MONSOON_MONTHS = {6, 7, 8, 9}


def predict_failure_probability(
    issue_type: str,
    severity_score: float,
    created_at: datetime,
    is_monsoon_season: bool | None = None,
) -> float:
    """
    Returns predicted probability (0-100%) that this issue escalates into
    a major failure within 30 days if left unaddressed.
    """
    if is_monsoon_season is None:
        is_monsoon_season = datetime.now(timezone.utc).month in MONSOON_MONTHS

    # Age in days since report
    age_days = max((datetime.now(timezone.utc) - created_at.replace(tzinfo=timezone.utc)).days, 0) \
        if created_at.tzinfo is None else max((datetime.now(timezone.utc) - created_at).days, 0)

    type_mult = TYPE_RISK_MULTIPLIER.get(issue_type, 1.0)
    season_mult = 1.25 if is_monsoon_season and issue_type in ("pothole", "waterlogging", "drainage") else 1.0

    # Logistic-style curve: higher severity + more age = sharply rising risk
    raw = (severity_score / 100) * type_mult * season_mult
    age_factor = 1 + (age_days / 60)  # risk compounds over ~2 months
    raw *= age_factor

    # Squash into 0-100 with a soft cap using logistic function
    probability = 100 / (1 + math.exp(-4 * (raw - 0.5)))

    return round(min(max(probability, 2), 97), 1)  # avoid claiming 0% or 100% certainty


def compute_priority_score(severity_score: float, failure_probability: float, age_days: int = 0, report_count: int = 1) -> float:
    """
    Priority queue ranking score (0-100) for the government dashboard —
    combines current severity, predicted escalation risk, how long
    the issue has been waiting, and how many times it was reported.
    """
    wait_boost = min(age_days * 0.5, 15)
    report_boost = min((report_count - 1) * 2.5, 15) # +2.5 per extra report, cap at +15
    score = severity_score * 0.5 + failure_probability * 0.4 + wait_boost + report_boost
    return round(min(score, 100), 1)


def compute_ward_health_index(issues: list) -> float:
    """
    Aggregate Infrastructure Health Index for a ward/district (0-100,
    higher = healthier). Penalizes unresolved high-severity issues,
    normalized by issue count so the score stays meaningful regardless
    of how many total reports exist (a city with 500 mostly-resolved
    issues shouldn't score worse than a city with 5 unresolved ones).
    """
    if not issues:
        return 100.0

    unresolved = [i for i in issues if i.status != "resolved"]
    if not unresolved:
        return 100.0

    weight_map = {"Critical": 12, "High": 7, "Medium": 3, "Low": 1}
    total_penalty = sum(weight_map.get(i.severity_label, 1) for i in unresolved)

    # Average penalty per unresolved issue, scaled to a 0-100 deduction,
    # capped so the index never goes negative.
    avg_penalty = total_penalty / len(unresolved)
    # avg_penalty ranges roughly 1-12; map to a 0-100 deduction band
    deduction = min(avg_penalty * 7, 100)

    score = max(0, 100 - deduction)
    return round(score, 1)


def forecast_health_index(issues: list, days: int = 90, resolve_top_n: int = 0) -> list[dict]:
    """
    Project the Ward Health Index forward over `days`.
    Simulates the resolution of `resolve_top_n` priority issues at day 0.
    Returns a timeseries of {"day": 0, "current": 85.0, "optimized": 92.0}
    """
    if not issues:
        return [{"day": d, "current": 100.0, "optimized": 100.0} for d in range(0, days + 1, 7)]

    # Sort issues by priority to simulate resolving the top N
    sorted_issues = sorted(issues, key=lambda i: i.priority_score, reverse=True)
    
    # We will simulate the raw severity / age scaling from predict_failure_probability
    # but applied across all issues to predict health deterioration.
    
    def simulate_health(day_offset: int, resolve_n: int) -> float:
        simulated_unresolved = []
        for idx, issue in enumerate(sorted_issues):
            if issue.status == "resolved":
                continue
            if idx < resolve_n:
                continue # Simulated as resolved
            
            # Simulate age
            sim_age = issue.age_days + day_offset if hasattr(issue, 'age_days') else day_offset
            
            # Very rough simulation: penalty increases as age increases, bounded.
            base_weight = {"Critical": 12, "High": 7, "Medium": 3, "Low": 1}.get(issue.severity_label, 1)
            age_multiplier = 1 + (sim_age / 60) # compounds over 2 months
            simulated_unresolved.append(base_weight * age_multiplier)
            
        if not simulated_unresolved:
            return 100.0
            
        total_penalty = sum(simulated_unresolved)
        avg_penalty = total_penalty / len(simulated_unresolved)
        deduction = min(avg_penalty * 7, 100)
        return max(0, round(100 - deduction, 1))

    timeseries = []
    # Generate weekly data points
    for d in range(0, days + 1, max(1, days // 10)):
        timeseries.append({
            "day": d,
            "current": simulate_health(d, 0),
            "optimized": simulate_health(d, resolve_top_n)
        })
        
    return timeseries
