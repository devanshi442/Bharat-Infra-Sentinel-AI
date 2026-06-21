import pytest
from app.prediction import predict_failure_probability, compute_priority_score, compute_ward_health_index, forecast_health_index
from collections import namedtuple

def test_predict_failure_probability():
    # Base failure for pothole is 0.40. With high severity, it should increase.
    prob = predict_failure_probability("pothole", 85)
    assert 0 < prob <= 100
    assert prob > 40

    prob_garbage = predict_failure_probability("garbage", 90)
    assert prob_garbage > 30

def test_compute_priority_score():
    score = compute_priority_score(severity=90, failure_prob=80, age_days=0)
    assert 0 < score <= 100

    # Age should increase priority
    score_old = compute_priority_score(severity=90, failure_prob=80, age_days=10)
    assert score_old > score

    # Report count should increase priority
    score_reports = compute_priority_score(severity=90, failure_prob=80, age_days=0, report_count=3)
    assert score_reports > score

def test_forecast_health_index():
    MockIssue = namedtuple("MockIssue", ["status", "priority_score", "severity_label", "age_days"])
    issues = [
        MockIssue(status="reported", priority_score=90, severity_label="Critical", age_days=5),
        MockIssue(status="reported", priority_score=80, severity_label="High", age_days=10),
        MockIssue(status="reported", priority_score=70, severity_label="Medium", age_days=2),
    ]
    
    timeseries = forecast_health_index(issues, days=30, resolve_top_n=1)
    assert len(timeseries) > 0
    
    day_0 = timeseries[0]
    day_30 = timeseries[-1]
    
    assert day_0["day"] == 0
    assert day_0["current"] <= 100
    assert day_0["optimized"] > day_0["current"]  # Resolving top 1 should improve health
    
    # Health should deteriorate over time (current trajectory)
    assert day_30["current"] < day_0["current"]

def test_compute_ward_health_index():
    issues = [
        # high severity
        {"severity_score": 90, "failure_probability_30d": 80, "age_days": 5},
        # low severity
        {"severity_score": 20, "failure_probability_30d": 10, "age_days": 1}
    ]
    
    # Mix of issues should drop health from 100
    health = compute_ward_health_index(issues)
    assert 0 <= health < 100
    
    # More issues should drop it further
    issues_worse = issues + [{"severity_score": 95, "failure_probability_30d": 90, "age_days": 10}]
    health_worse = compute_ward_health_index(issues_worse)
    assert health_worse < health
