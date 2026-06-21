<div align="center">

# 🇮🇳 Bharat Infra Sentinel AI
**Predictive civic infrastructure monitoring — for safer, smarter cities.**

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white" alt="OpenCV" />
</p>

</div>

---

## One-line pitch

Bharat Infra Sentinel AI turns citizen photos into predictive maintenance intelligence — visual detection, 30-day escalation forecasting, and a nation-scale command dashboard that surfaces the highest-impact interventions.

## Why this wins
- Ready-for-scale demo data: >14k realistic seeded reports across multiple cities so judges see a live, data-heavy dashboard.
- Predictive insight: computes a 30-day failure/escalation probability and an actionable Ward Health Index.
- Demo-grade UX: multilingual citizen reporting (10+ languages), high-density map clustering, and fast interactive charts.

## Highlights
- Hybrid detection: YOLOv8 + OpenCV heuristics for robust, fast classification.
- Smart triage: duplicate clustering (100m radius), priority scoring, and SLA-aware routing.
- Forecasting: simulate resolving top-N issues and visualize the city health impact.

## Tech stack
- Backend: FastAPI, SQLAlchemy, SQLite (easy upgrade to Postgres/PostGIS)
- AI: Ultralytics YOLOv8 + OpenCV
- Frontend: React + Vite, Tailwind CSS, react-leaflet-cluster, Recharts

## Quick start (dev)
Run backend and frontend in separate terminals.

Windows (PowerShell):
```powershell
cd backend
.venv\Scripts\activate
pip install -r ..\requirements.txt
uvicorn app.main:app --reload --port 8000

cd ..\frontend
npm install
npm run dev
```

Open http://localhost:5173 and login with demo admin / demo credentials.

## Seed demo data
To populate the demo database with realistic national-scale issues, run from `backend`:

```powershell
python seed.py
```

This script generates the seeded records used by the live dashboard.

## What to demo
1. National live map — clusters and drilldown across thousands of points.
2. Priority queue — see top issues and SLA breaches.
3. Forecast simulation — resolve top N and show health-index improvement.

## Where to look in the repo
- Backend API and models: `backend/app/main.py`, `backend/app/database.py`
- Seed scripts and data: `backend/seed.py`, `backend/data/`
- Frontend dashboard: `frontend/src/pages/Dashboard.jsx`, `frontend/src/api.js`

---

Built for Bharat Academix CodeQuest 2026 — demo-ready, data-first, and judged to impress.
