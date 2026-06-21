"""
auth.py - Simple authentication for the demo MVP.

HONEST DESIGN NOTE:
This is a hardcoded demo gate to show the separation between public and
government surfaces. It does NOT use secure password hashing, JWT signing,
or database-backed users. Do not use this pattern in production!
"""
from fastapi import Header, HTTPException
from typing import Optional
from datetime import datetime, timedelta, timezone
import secrets

# In-memory OTP store for demo purposes: phone -> { otp, expires_at, name }
OTP_STORE: dict[str, dict] = {}

# In-memory citizen session tokens: token -> { phone, name, expires_at }
CITIZEN_TOKENS: dict[str, dict] = {}

OTP_TTL_SECONDS = 300  # 5 minutes for demo
TOKEN_TTL_SECONDS = 60 * 60 * 24  # 24 hours

def verify_demo_auth(authorization: Optional[str] = Header(None)):
    if authorization != "Bearer demo-token":
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True


def request_otp(name: str, phone: str) -> str:
    """Generate and store a 6-digit OTP for the provided phone (demo mode).
    Returns the OTP so the frontend can display it in demo mode.
    """
    otp = f"{secrets.randbelow(1000000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=OTP_TTL_SECONDS)
    OTP_STORE[phone] = {"otp": otp, "expires_at": expires_at, "name": name}
    return otp


def verify_otp(phone: str, otp: str) -> dict:
    entry = OTP_STORE.get(phone)
    now = datetime.now(timezone.utc)
    if not entry:
        raise HTTPException(status_code=400, detail="No OTP requested for this phone")
    if now > entry["expires_at"]:
        del OTP_STORE[phone]
        raise HTTPException(status_code=400, detail="OTP expired")
    if entry["otp"] != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # Create a session token
    token = "citizen-" + secrets.token_hex(16)
    token_expires = now + timedelta(seconds=TOKEN_TTL_SECONDS)
    CITIZEN_TOKENS[token] = {"phone": phone, "name": entry.get("name"), "expires_at": token_expires}

    # Clean up used OTP
    try:
        del OTP_STORE[phone]
    except KeyError:
        pass

    return {"token": token, "phone": phone, "name": entry.get("name")}


def verify_citizen_auth(authorization: Optional[str] = Header(None)):
    """Dependency to verify citizen token from `Authorization: Bearer <token>` header.
    Returns dict with `phone` and `name` when valid, otherwise raises 401.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1]
    entry = CITIZEN_TOKENS.get(token)
    now = datetime.now(timezone.utc)
    if not entry or now > entry["expires_at"]:
        raise HTTPException(status_code=401, detail="Citizen token invalid or expired")
    return {"phone": entry["phone"], "name": entry.get("name"), "token": token}
