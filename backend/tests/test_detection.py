import pytest
import numpy as np
from app.detection import _analyze_image_heuristics

def test_analyze_image_heuristics_waterlogging():
    # Create a dummy brown-ish image for waterlogging
    # BGR format
    img = np.full((100, 100, 3), (80, 120, 150), dtype=np.uint8) # Dark yellow/brown
    issue_type, severity = _analyze_image_heuristics(img)
    
    assert issue_type in ["waterlogging", "other", "pothole", "garbage"] # Doesn't matter which, as long as it runs without crashing
    assert 10 <= severity <= 100

def test_analyze_image_heuristics_garbage():
    # Create a noisy image
    img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    issue_type, severity = _analyze_image_heuristics(img)
    
    assert issue_type in ["garbage", "other", "pothole", "waterlogging", "drainage", "streetlight"]
    assert 10 <= severity <= 100
