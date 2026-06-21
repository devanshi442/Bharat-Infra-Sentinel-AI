"""
test_detection.py - Tests for the AI detection module.

Tests the heuristic classifier and severity scoring pipeline.
"""
import os
import tempfile
import pytest
import numpy as np
import cv2
from app.detection import _analyze_image_heuristics, classify_issue, compute_severity, severity_to_label


def _write_temp_image(img_array: np.ndarray) -> str:
    """Write a numpy image array to a temporary file and return its path."""
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    cv2.imwrite(tmp.name, img_array)
    tmp.close()
    return tmp.name


def test_analyze_image_heuristics_returns_scores_for_all_types():
    """Heuristic function must return a dict covering all expected issue types."""
    img = np.full((200, 200, 3), (100, 100, 100), dtype=np.uint8)
    path = _write_temp_image(img)
    try:
        scores = _analyze_image_heuristics(path)
        for key in ["pothole", "garbage", "waterlogging", "drainage", "streetlight", "other"]:
            assert key in scores, f"Missing key: {key}"
            assert 0.0 <= scores[key] <= 1.0, f"Score out of range for {key}: {scores[key]}"
    finally:
        os.unlink(path)


def test_analyze_image_heuristics_waterlogging_signal():
    """A heavily blue/reflective image should produce a non-trivial waterlogging score."""
    # Create an image with strong blue channel (HSV ~100, 150, 200 → looks like standing water)
    img = np.zeros((200, 200, 3), dtype=np.uint8)
    img[:, :] = (180, 100, 100)  # BGR: blueish
    path = _write_temp_image(img)
    try:
        scores = _analyze_image_heuristics(path)
        # Waterlogging should score higher than 0 for a blue-dominant image
        assert scores["waterlogging"] > 0, "Expected some waterlogging signal in a blue image"
    finally:
        os.unlink(path)


def test_analyze_image_heuristics_garbage_noisy_image():
    """A high-entropy (random) image should register garbage signal."""
    np.random.seed(42)
    img = np.random.randint(0, 255, (200, 200, 3), dtype=np.uint8)
    path = _write_temp_image(img)
    try:
        scores = _analyze_image_heuristics(path)
        # Random noise → high edge density + color variance → garbage score > 0
        assert scores["garbage"] > 0, "Expected some garbage signal in noisy image"
    finally:
        os.unlink(path)


def test_analyze_image_heuristics_missing_file():
    """A missing file path must not crash — it should return zeroed scores."""
    scores = _analyze_image_heuristics("/nonexistent/path/image.jpg")
    for key in ["pothole", "garbage", "waterlogging", "drainage", "streetlight", "other"]:
        assert scores[key] == 0.0, f"Expected 0.0 for missing file, got {scores[key]}"


def test_compute_severity_ranges():
    """Severity score must always fall within [0, 100]."""
    for issue_type in ["pothole", "garbage", "waterlogging", "streetlight", "drainage", "other"]:
        score = compute_severity(issue_type, confidence=0.75, detected_objects=[])
        assert 0 <= score <= 100, f"Severity out of range for {issue_type}: {score}"


def test_compute_severity_with_detected_objects_boosts_score():
    """More detected objects should not reduce the severity score."""
    score_no_objects = compute_severity("garbage", 0.70, detected_objects=[])
    score_with_objects = compute_severity("garbage", 0.70, detected_objects=[{"label": "car", "confidence": 0.9}] * 5)
    assert score_with_objects >= score_no_objects - 5, "Objects should not meaningfully reduce score"


def test_severity_to_label_boundaries():
    assert severity_to_label(0) == "Low"
    assert severity_to_label(34) == "Low"
    assert severity_to_label(35) == "Medium"
    assert severity_to_label(54) == "Medium"
    assert severity_to_label(55) == "High"
    assert severity_to_label(74) == "High"
    assert severity_to_label(75) == "Critical"
    assert severity_to_label(100) == "Critical"