"""
auth.py - Simple authentication for the demo MVP.

HONEST DESIGN NOTE:
This is a hardcoded demo gate to show the separation between public and
government surfaces. It does NOT use secure password hashing, JWT signing,
or database-backed users. Do not use this pattern in production!
"""
from fastapi import Header, HTTPException
from typing import Optional

def verify_demo_auth(authorization: Optional[str] = Header(None)):
    if authorization != "Bearer demo-token":
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True
