"""
test_prediction.py - Tests for the predictive maintenance engine.

Covers failure probability, priority scoring, health index, and forecast.
"""
import pytest
from datetime import datetime, timezone
from collections import namedtuple
from app.prediction import (
    predict_failure_probability,
    compute_priority_score,
    compute_ward_health_index,
    forecast_health_index,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now():
    return datetime.now(timezone.utc)


MockIssue = namedtuple(
    "MockIssue",
    ["status", "priority_score", "severity_label", "age_days"],
)


class DictIssue:
    """Minimal object that satisfies compute_ward_health_index's attribute access."""
    def __init__(self, status, severity_label):
        self.status = status
        self.severity_label = severity_label


# ---------------------------------------------------------------------------
# predict_failure_probability
# ---------------------------------------------------------------------------

def test_predict_failure_probability_returns_valid_range():
    prob = predict_failure_probability("pothole", severity_score=50, created_at=_now())
    assert 0 < prob <= 100, f"Expected (0, 100], got {prob}"


def test_predict_failure_probability_high_severity_higher_than_low():
    prob_high = predict_failure_probability("pothole", severity_score=90, created_at=_now())
    prob_low  = predict_failure_probability("pothole", severity_score=20, created_at=_now())
    assert prob_high > prob_low, "Higher severity should yield higher failure probability"


def test_predict_failure_probability_monsoon_boost_for_waterlogging():
    prob_monsoon    = predict_failure_probability("waterlogging", severity_score=60, created_at=_now(), is_monsoon_season=True)
    prob_no_monsoon = predict_failure_probability("waterlogging", severity_score=60, created_at=_now(), is_monsoon_season=False)
    assert prob_monsoon > prob_no_monsoon, "Monsoon season should increase waterlogging risk"


def test_predict_failure_probability_no_certainty():
    """Model must not claim 0% or 100% certainty."""
    for issue_type in ["pothole", "garbage", "streetlight"]:
        for severity in [5, 50, 95]:
            prob = predict_failure_probability(issue_type, severity_score=severity, created_at=_now())
            assert 1 < prob < 99, f"Unexpected certainty for {issue_type} s={severity}: {prob}"


# ---------------------------------------------------------------------------
# compute_priority_score
# ---------------------------------------------------------------------------

def test_compute_priority_score_valid_range():
    score = compute_priority_score(severity_score=80, failure_probability=70, age_days=5, report_count=1)
    assert 0 < score <= 100


def test_compute_priority_score_age_increases_priority():
    score_new = compute_priority_score(severity_score=80, failure_probability=70, age_days=0, report_count=1)
    score_old = compute_priority_score(severity_score=80, failure_probability=70, age_days=15, report_count=1)
    assert score_old > score_new, "Older issues should score higher priority"


def test_compute_priority_score_report_count_increases_priority():
    score_single = compute_priority_score(severity_score=80, failure_probability=70, age_days=0, report_count=1)
    score_multi  = compute_priority_score(severity_score=80, failure_probability=70, age_days=0, report_count=5)
    assert score_multi > score_single, "More reports should increase priority"


def test_compute_priority_score_capped_at_100():
    score = compute_priority_score(severity_score=100, failure_probability=100, age_days=60, report_count=20)
    assert score <= 100


# ---------------------------------------------------------------------------
# compute_ward_health_index
# ---------------------------------------------------------------------------

def test_compute_ward_health_index_all_resolved():
    """All resolved issues → perfect health."""
    issues = [DictIssue("resolved", "Critical"), DictIssue("resolved", "High")]
    assert compute_ward_health_index(issues) == 100.0


def test_compute_ward_health_index_unresolved_reduces_health():
    issues = [DictIssue("reported", "Critical"), DictIssue("reported", "High")]
    health = compute_ward_health_index(issues)
    assert 0 <= health < 100


def test_compute_ward_health_index_empty():
    assert compute_ward_health_index([]) == 100.0


def test_compute_ward_health_index_critical_worse_than_low():
    critical_issues = [DictIssue("reported", "Critical")] * 3
    low_issues      = [DictIssue("reported", "Low")]      * 3
    assert compute_ward_health_index(critical_issues) < compute_ward_health_index(low_issues)


# ---------------------------------------------------------------------------
# forecast_health_index
# ---------------------------------------------------------------------------

def test_forecast_health_index_empty_issues():
    result = forecast_health_index([], days=30, resolve_top_n=0)
    assert len(result) > 0
    assert all(r["current"] == 100.0 for r in result)


def test_forecast_health_index_structure():
    issues = [
        MockIssue(status="reported", priority_score=90, severity_label="Critical", age_days=5),
        MockIssue(status="reported", priority_score=70, severity_label="High",     age_days=3),
    ]
    result = forecast_health_index(issues, days=30, resolve_top_n=0)
    assert len(result) > 0
    assert result[0]["day"] == 0
    for r in result:
        assert "day"       in r
        assert "current"   in r
        assert "optimized" in r
        assert 0 <= r["current"]   <= 100
        assert 0 <= r["optimized"] <= 100


def test_forecast_health_index_resolving_improves_health():
    issues = [
        MockIssue(status="reported", priority_score=90, severity_label="Critical", age_days=5),
        MockIssue(status="reported", priority_score=80, severity_label="High",     age_days=10),
        MockIssue(status="reported", priority_score=70, severity_label="Medium",   age_days=2),
    ]
    result = forecast_health_index(issues, days=30, resolve_top_n=1)
    day_0 = result[0]
    assert day_0["optimized"] >= day_0["current"], "Resolving top issues must not worsen health"


def test_forecast_health_index_health_deteriorates_over_time():
    """Without intervention, health should worsen (or stay flat) over time."""
    issues = [
        MockIssue(status="reported", priority_score=80, severity_label="High",   age_days=5),
        MockIssue(status="reported", priority_score=70, severity_label="Medium", age_days=3),
    ]
    result = forecast_health_index(issues, days=90, resolve_top_n=0)
    day_0  = result[0]["current"]
    day_90 = result[-1]["current"]
    assert day_90 <= day_0, "Health should not improve without intervention"