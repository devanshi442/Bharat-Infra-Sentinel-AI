<div align="center">
  
# Bharat Infra Sentinel AI

**Predicting infrastructure failures before citizens suffer.**

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white" alt="OpenCV" />
</p>

</div>

---

## The Vision

Urban infrastructure management is fundamentally reactive. Municipalities only fix potholes, blocked drains, and broken streetlights *after* they have caused accidents, traffic jams, or localized flooding. 

**Bharat Infra Sentinel AI** flips this paradigm. We are building a next-generation predictive civic-governance platform. By crowdsourcing citizen reports via a frictionless multilingual interface and processing them through a robust AI computer-vision pipeline, we don't just log complaints—we predict structural deterioration.

Our system calculates the 30-day escalation probability of every civic issue and dynamically visualizes a predictive "Ward Health Index" to help municipalities shift from reactive patching to proactive, data-driven maintenance.

---

## Core Platform Capabilities

### 1. Automated AI Image Classification
- **Hybrid Pipeline**: Utilizes a combination of pretrained YOLOv8 object detection and a tuned OpenCV heuristic classifier (color, texture, and contour analysis) to instantly identify Potholes, Garbage, Waterlogging, Streetlights, and Drainage blockages.
- **Instant Severity Scoring**: Automatically assigns a base severity score (0-100) on upload based on visual indicators, rather than relying on subjective citizen input.

### 2. Frictionless, Multilingual Citizen Reporting
- **Voice-to-Text Reporting**: Citizens can describe issues via voice, utilizing localized Web Speech APIs for maximum accessibility.
- **Hyper-Localized Support**: The entire citizen portal operates seamlessly in **English, Hindi, and Punjabi**, ensuring widespread adoption across demographics.
- **Offline-First Resilience**: Upload queues cache reports locally when offline, automatically syncing to the servers once a connection is re-established.

### 3. Predictive Infrastructure Analytics
- **30-Day Failure Risk Engine**: Not all potholes are created equal. Our risk engine calculates escalation probability by synthesizing visual severity, issue type, geographical age, and seasonal flags (e.g., monsoon multipliers).
- **Trajectory Forecasting**: The Command Centre dashboard simulates a 30-day health deterioration curve for the city. It allows officials to simulate resolving the top *N* critical issues to visualize the exact statistical impact on the city's overall Health Index.

### 4. Intelligent Triaging & Duplicate Detection
- **Spatial Clustering via Haversine**: Automatically detects identical issues reported within a 100-meter radius. Instead of cluttering the queue with duplicates, it clusters them, dynamically boosting the original issue's priority score.
- **Automated Department Routing**: Bypasses the municipal switchboard by analyzing the issue type and routing it directly to the exact department (e.g., PWD, Water & Sanitation) responsible.

### 5. Accountability & SLA Enforcement
- **Dynamic SLAs**: Enforces strict Service Level Agreements based on urgency (e.g., 7 days for Potholes, 3 days for Waterlogging).
- **Contractor Leaderboards**: Tracks resolution metrics and ranks assigned contractors by a transparent performance score (`issues_resolved / issues_assigned`).
- **Exportable Ward Reports**: One-click generation of fully compiled, ward-level CSV reports for municipal audits.

---

## Tech Stack Architecture

Our architecture is designed for speed, modularity, and rapid deployment on standard municipal hardware.

**Backend System:**
- **Framework**: FastAPI (Python) for asynchronous, high-throughput API endpoints.
- **Database**: SQLAlchemy ORM with a lightweight SQLite engine (designed for immediate swap to Postgres/PostGIS in production).
- **AI/ML Layer**: OpenCV + Ultralytics YOLOv8.

**Frontend Interface:**
- **Framework**: React.js bundled via Vite.
- **Styling**: Tailwind CSS, heavily utilizing customized `Space Grotesk` and `Inter` typography for a premium, civic "Command Centre" aesthetic.
- **Data Visualization**: Recharts (for predictive modeling) and Leaflet (for geographic mapping).

---

## Quick Start & Installation

You need two terminal windows to run the stack — one for the backend, one for the frontend.

### 1. Backend Initialization

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

*Access the interactive API documentation at: http://localhost:8000/docs*

> **Note on AI Weights:** The AI detection module lazily downloads pretrained YOLOv8 nano weights (~6MB) on the very first image upload. If you lack an internet connection during the demo, the system gracefully catches the timeout and falls back to the robust heuristic-only classifier so your demo will never crash.

### 2. Frontend Initialization

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. Vite automatically proxies `/api` and `/uploads` to the backend.

### 3. Seed Demo Data

The live dashboard is built to handle dense information and looks incredible with populated data. To generate realistic reports:
- Click **"Load Demo Data"** in the top navigation bar of the dashboard, or
- Run the following command:
  ```bash
  curl -X POST http://localhost:8000/api/seed-demo-data
  ```

This populates ~25 realistic sample issues (featuring Ludhiana, Punjab coordinates) so the interactive map, SLA countdowns, and priority queues are immediately engaging.

---

## The Application Flow

1. **Citizen Portal (`/report`)**: A citizen takes a photo of a civic issue. The UI is completely translated into their native language. They provide a quick voice note, confirm the GPS coordinate, and hit submit.
2. **AI Analysis Pipeline**: The backend classifies the issue, scores its baseline severity, runs the geographic duplicate check (Haversine), predicts the 30-day escalation risk, and assigns a departmental SLA countdown.
3. **Command Centre Gateway (`/login`)**: Municipal officials log in via a secured, glassmorphic portal to access the dashboard.
4. **Live Dashboard (`/dashboard`)**: The government official sees the new report appear on the live 3D map and priority queue. They analyze the city's 90-day predicted health trajectory and assign contractors to the highest-risk anomalies.

---

## API Reference (Key Endpoints)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/issues/upload` | Base entry point. Citizen upload: image + location → full AI pipeline |
| `GET` | `/api/issues` | List/filter issues, sorted by priority & SLA |
| `PATCH` | `/api/issues/{id}/status` | Update status (`reported` → `resolved`) / assign contractor |
| `GET` | `/api/dashboard/stats` | Aggregate counts, severity, global health index |
| `GET` | `/api/dashboard/ward-health` | Per-ward health index for geospatial heatmapping |
| `GET` | `/api/dashboard/forecast` | Timeseries prediction data of City Health Index (Current vs Optimized) |
| `GET` | `/api/dashboard/export/{ward}` | Stream a compiled, structured CSV report of the specified ward |
| `POST` | `/api/seed-demo-data` | Populate demo data (For demonstration purposes) |

---
<div align="center">
  <i>Securing the foundation of tomorrow's cities, today.</i>
</div>
