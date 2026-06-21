"""
routing.py - Maps detected issue types to the responsible municipal department.
Mirrors the "Governance Layer" / dynamic routing described in the pitch deck.
"""

DEPARTMENT_MAP = {
    "pothole": "Roads & Public Works Department",
    "waterlogging": "Drainage & Flood Control Department",
    "drainage": "Drainage & Flood Control Department",
    "garbage": "Solid Waste Management Department",
    "streetlight": "Electrical & Street Lighting Department",
    "other": "General Civic Grievance Cell",
}

SLA_DAYS = {
    "pothole": 7,
    "waterlogging": 3,
    "drainage": 5,
    "garbage": 2,
    "streetlight": 3,
    "other": 14,
}


def get_department(issue_type: str) -> str:
    return DEPARTMENT_MAP.get(issue_type, "General Civic Grievance Cell")
