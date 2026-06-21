<div align="center">
  
# 🇮🇳 Bharat Infra Sentinel AI
**Predicting infrastructure failures before citizens suffer.**

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white" alt="OpenCV" />
</p>

### 🏆 Built for Bharat Academix CodeQuest 2026 by Team Cod-X-Titans

</div>

---

## 🚀 The Vision

Urban infrastructure management is fundamentally reactive. Municipalities only fix potholes, blocked drains, and broken streetlights *after* they have caused accidents, traffic jams, or localized flooding. 

**Bharat Infra Sentinel AI** flips this paradigm. We are building a next-generation predictive civic-governance platform. By crowdsourcing citizen reports via a frictionless multilingual interface and processing them through a robust AI computer-vision pipeline, we don't just log complaints—**we predict structural deterioration.**

Our system calculates the 30-day escalation probability of every civic issue and dynamically visualizes a predictive "Ward Health Index" to help municipalities shift from reactive patching to proactive, data-driven maintenance.

---

## 🌟 What Makes This a Winning Project?

### 1. 🗺️ National Scale & Extreme Map Performance
The platform isn't just a prototype for a few streets. Our database scales across **28 cities with over 14,000+ live seeded reports**. 
- To handle this massive scale in the browser without freezing, we implemented **High-Performance Map Clustering** using `chunkedLoading` via `requestAnimationFrame`.
- The Live Dashboard Map automatically clusters dense national data, framing the entirety of India seamlessly.
- **Dynamic Pie-Chart Clusters:** Cluster bubbles use ultra-performant CSS `conic-gradients` to display a real-time proportional mix of *Open, In Progress, and Resolved* issues hidden inside them.

### 2. 🌍 Radical Accessibility (10 Languages)
A citizen portal is useless if citizens can't read it. The frontend is wired with `i18next` to support **10 major Indian languages** natively: *English, Hindi, Bengali, Marathi, Telugu, Tamil, Gujarati, Kannada, Malayalam, and Punjabi.*
- Automatic fallback mechanisms ensure a seamless UI.
- Honest "Translation in Progress" indicators automatically appear for placeholder translations, guaranteeing transparency during live demos.

### 3. 🧠 Hybrid AI Detection & Scoring
- Utilizes a combination of pretrained **YOLOv8 object detection** and a tuned **OpenCV heuristic classifier** (color, texture, contour analysis) to instantly identify Potholes, Garbage, Waterlogging, Streetlights, and Drainage blockages.
- **Instant Severity Scoring**: Automatically assigns a base severity score (0-100) on upload based on visual indicators, removing subjective human bias.

### 4. 📈 Predictive 30-Day Risk Engine
- Our backend risk engine calculates escalation probability by synthesizing visual severity, issue type, geographical age, and seasonal flags (e.g., monsoon multipliers).
- The Command Centre dashboard simulates a 30-day health deterioration curve for the city. It allows officials to simulate resolving the top *N* critical issues to visualize the exact statistical impact on the city's overall Health Index.

### 5. 🚦 Smart Triaging & SLA Accountability
- **Spatial Clustering (Haversine)**: Automatically detects identical issues reported within a 100-meter radius, clustering them to boost the priority score instead of cluttering the queue.
- **Dynamic SLAs**: Enforces strict Service Level Agreements based on urgency (e.g., 7 days for Potholes, 3 days for Waterlogging).

---

## 🏗️ Tech Stack Architecture

**Backend System:**
- **Framework**: FastAPI (Python) for asynchronous, high-throughput API endpoints.
- **Database**: SQLAlchemy ORM with SQLite (Handles 14k+ rows with ~150ms query times; designed for immediate swap to Postgres/PostGIS in production).
- **AI/ML Layer**: OpenCV + Ultralytics YOLOv8.

**Frontend Interface:**
- **Framework**: React.js bundled via Vite.
- **Styling**: Tailwind CSS, heavily utilizing `Space Grotesk` and `Inter` typography for a premium "Command Centre" aesthetic.
- **Mapping & Data**: `react-leaflet-cluster` (for async high-density mapping) and Recharts (for predictive modeling).

---

## ⚙️ Quick Start & Installation

You need two terminal windows to run the stack — one for the backend, one for the frontend.

### 1. Backend Initialization

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

> **Note on AI Weights:** The AI module lazily downloads pretrained YOLOv8 nano weights (~6MB) on the very first image upload. If you lack internet connection during the demo, it gracefully falls back to the robust heuristic-only classifier.

### 2. Frontend Initialization

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. Vite automatically proxies `/api` and `/uploads` to the backend.

### 3. Seed National-Scale Demo Data

The live dashboard looks incredible with populated data. To generate the **14,225 realistic national issues**:
Run the following script in the `backend/` directory:
```bash
python seed.py
```
*(This wipes the current DB and executes a high-speed SQLAlchemy bulk insert, completing in under 6 seconds.)*

---

## 🛣️ The Application Flow

1. **Citizen Portal (`/report`)**: A citizen takes a photo of a civic issue. The UI is seamlessly translated. They confirm the GPS coordinate and hit submit.
2. **AI Pipeline**: The backend classifies the issue, scores visual severity, runs duplicate clustering, predicts the 30-day escalation risk, and assigns a departmental SLA countdown.
3. **Live Command Centre (`/dashboard`)**: Officials analyze the city's predicted trajectory. The 14,000+ points render efficiently via chunked clustering, visually identifying exact problem pockets through color-coded status pie-rings and severity heatmaps.

---

<div align="center">
  <b>Team Cod-X-Titans | Bharat Academix CodeQuest 2026</b><br>
  <i>Securing the foundation of tomorrow's cities, today.</i>
</div>
