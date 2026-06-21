# Bharat Infra Sentinel AI — MVP

**Predicting infrastructure failures before citizens suffer.**
Team Cod-X-Titans · Bharat Academix CodeQuest 2026

A predictive civic-governance platform: citizens report potholes, garbage,
waterlogging, broken streetlights and blocked drains by photo; an AI
pipeline classifies and scores severity; a risk engine predicts 30-day
escalation probability; issues are auto-routed to the right municipal
department and surfaced on a live government command-centre dashboard.

---

## Quick start

You need two terminals — one for the backend, one for the frontend.

### 1. Backend (FastAPI)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

> **First-run note:** the AI detection module lazily downloads pretrained
> YOLOv8 nano weights (~6MB) on first image upload. If you have no internet
> at the venue, it will catch the failure and fall back to the heuristic-only
> classifier automatically — the demo will not crash, just slightly less
> rich detection metadata.

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies `/api` and `/uploads` to the
backend automatically (see `vite.config.js`), so just run both servers.

### 3. Seed demo data

The dashboard is much more impressive with data in it. Either:
- Click **"Load Demo Data"** in the dashboard top bar, or
- `curl -X POST http://localhost:8000/api/seed-demo-data`

This populates ~25 realistic sample issues around Ludhiana (matches the
investor deck's pilot city) so the map/charts/queue aren't empty.

---

## Project structure

```
backend/
  app/
    main.py        FastAPI app, all routes
    database.py     SQLAlchemy models (SQLite)
    detection.py    AI issue classification + severity scoring
    prediction.py   30-day failure-risk engine + ward health index
    routing.py      Issue type -> municipal department mapping
    schemas.py      Pydantic request/response models
  requirements.txt

frontend/
  src/
    pages/
      Landing.jsx       Marketing/intro page
      CitizenReport.jsx Upload flow (photo, location, note -> AI result)
      Dashboard.jsx      Government command centre (map, charts, queue)
    api.js              API client
    constants.js        Shared UI metadata (issue types, severity colors)
```

---

## Demo flow (matches MVP guide's "Winning Pitch")

1. Open `/report`, take/upload a photo of a pothole (or any civic issue).
2. Grant location (or it falls back to the Ludhiana pilot coordinates).
3. Submit — AI classifies the issue, scores severity, predicts 30-day
   escalation risk, and routes it to a department, all in one call.
4. Open `/dashboard` — see the new report appear on the live map and in
   the priority queue, ranked alongside seeded demo issues.
5. Click an issue, walk through severity / risk / routing, then change
   its status to show the government workflow (reported → in progress →
   resolved) and watch the ward health index update.

---

## Honest technical notes — read before pitching to judges

A few things worth saying explicitly on stage, because judges respect
honest MVP scoping far more than overclaimed accuracy numbers:

### AI detection
We did **not** train a custom model from scratch — there wasn't a labeled
dataset to do that credibly in a hackathon timeframe. Instead:
- A **pretrained YOLOv8** (COCO weights) provides general object detection
  as a real computer-vision backbone.
- A **lightweight OpenCV heuristic classifier** (color/texture/contour
  analysis) maps visual signal to the specific civic categories (pothole,
  garbage, waterlogging, streetlight, drainage).
- The architecture is modular — `classify_issue()` in `detection.py` is
  the one function you'd swap for a fine-tuned model if you label even a
  small dataset (50-100 images/category goes a long way) before demo day.

**Pitch line:** *"Our MVP uses a hybrid pretrained-detection + tuned
heuristic pipeline; production deployment would fine-tune on a labeled
corpus from municipal partners during the pilot phase."*

### Predictive maintenance
The "30-day failure probability" is a **transparent rule-based risk
model** (severity + issue type + age + seasonal/monsoon flag), not a
trained XGBoost model — there's no historical maintenance/outcome dataset
to train one on yet. The function signature is designed as a drop-in
replacement target for a real trained model later.

**Pitch line:** *"Our MVP risk engine is explainable and rule-based;
production version trains on historical repair and weather data once a
municipal pilot partner provides it."*

### Numbers to NOT repeat from the investor-deck PDF
The "Investor Pitch Deck" in this project's source materials contains
specific statistics — ₹19.9 lakh crore market size, 9,438 pothole deaths,
39% water wastage, 82% cost reduction, 98.2% detection accuracy — that do
**not** appear in the team's original brainstorm or MVP guide and were not
independently verified while building this MVP. Treat them as
AI-generated placeholders, not sourced facts. If you want to cite real
numbers, look up current MoRTH road safety data or ICRIER infrastructure
reports yourself before presenting them as cited statistics — don't repeat
the deck's citations unverified.

### Other things to know
- Ward assignment for new reports is **random** in this MVP (`main.py`,
  `upload_issue`) — production would reverse-geocode lat/lng to the actual
  ward boundary (e.g. via a municipal GIS shapefile).
- Contractor assignment/scoring tables exist in the schema but aren't
  wired into the UI yet — flagged as a natural "what we'd build next"
  talking point if judges ask about the Contractor Performance Agent from
  the pitch deck.
- SQLite is intentional for hackathon simplicity per the MVP guide; the
  data layer (`database.py`) is SQLAlchemy, so swapping to Postgres/PostGIS
  later is a connection-string change, not a rewrite.

---

## API reference (key endpoints)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/issues/upload` | Citizen upload: image + location → full AI pipeline |
| GET | `/api/issues` | List/filter issues, sorted by priority |
| PATCH | `/api/issues/{id}/status` | Update status / assign contractor |
| GET | `/api/dashboard/stats` | Aggregate counts, severity, health index |
| GET | `/api/dashboard/ward-health` | Per-ward health index for map/charts |
| POST | `/api/seed-demo-data` | Populate demo data (remove before real deployment) |

Full interactive docs at `/docs` once the backend is running.
