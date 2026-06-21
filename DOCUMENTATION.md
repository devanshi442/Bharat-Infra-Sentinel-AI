# 🇮🇳 Bharat Infra Sentinel AI — Technical Documentation

This document provides a detailed technical reference for the **Bharat Infra Sentinel AI** system, covering backend architecture, database schemas, AI visual detection pipelines, frontend design tokens, and cloud deployment specifications.

---

## 1. System Architecture Overview

Bharat Infra Sentinel AI is built as a split-architecture system designed for speed, regional localization, and resource efficiency. 

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CITIZEN FRONTEND                              │
│  - React 18 SPA (Vite)                                                 │
│  - Multilingual (10+ Languages) with Web Speech Recognition            │
│  - Dynamic OTP Login & Contribution History                            │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS / JSON & FormData
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           FASTAPI BACKEND                              │
│  - High-performance Async Endpoints                                    │
│  - JWT Bearer Authentication (Admin & Citizen Roles)                   │
│  - Optimized JSON Serialization (bypassing slow schema layers)          │
└──────────────────┬───────────────────────┬─────────────────────────────┘
                   │                       │
                   ▼ Local File IO         ▼ SQLAlchemy ORM
┌───────────────────────┐          ┌─────────────────────────────────────┐
│  AI DETECTION ENGINE  │          │          SQLITE DATABASE            │
│  - YOLOv8 (Objects)   │          │  - `issues` (14k+ Seeded Rows)      │
│  - OpenCV Heuristics  │          │  - `contractors` (Performance stats)│
│  - Threat Scoring     │          │  - `activity_logs` (Audit Trails)   │
└───────────────────────┘          └─────────────────────────────────────┘
```

---

## 2. Database Models & Schema

The data layer uses **SQLite** (configured via SQLAlchemy ORM). The database contains three primary tables:

### 2.1 `issues` Table
Stores citizen-submitted infrastructure failure reports and their calculated severity metadata.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `Integer` (PK) | Auto-incrementing identifier. |
| `image_path` | `String` | Path to the uploaded original report photo. |
| `after_image_path` | `String` (Nullable)| Path to the contractor's verification photo. |
| `issue_type` | `String` | `pothole` \| `garbage` \| `waterlogging` \| `streetlight` \| `drainage` \| `other`. |
| `confidence` | `Float` | AI visual confidence value ($0.0 \rightarrow 1.0$). |
| `severity_score` | `Float` | Calculated structural severity ($0 \rightarrow 100$). |
| `severity_label` | `String` | Classified category: `Low` \| `Medium` \| `High` \| `Critical`. |
| `latitude` | `Float` | Coordinate latitude for spatial rendering. |
| `longitude` | `Float` | Coordinate longitude for spatial rendering. |
| `state` | `String` | State location (defaults to `Punjab`). |
| `city` | `String` | City location (defaults to `Ludhiana`). |
| `ward` | `String` (Nullable) | Ward boundary zone. |
| `address` | `String` (Nullable) | Geocoded street address. |
| `reporter_note` | `Text` (Nullable) | Additional details reported by the citizen. |
| `original_language` | `String` | BCP47 code of submission language (default `en`). |
| `status` | `String` | Workflow state: `reported` \| `in_progress` \| `resolved`. |
| `priority_score` | `Float` | Calculated sorting index for queue triage. |
| `assigned_department`| `String` (Nullable)| Automatically routed department. |
| `contractor` | `String` (Nullable)| Assigned maintenance agency name. |
| `failure_probability_30d` | `Float` (Nullable)| Predictive risk score ($0\% \rightarrow 100\%$). |
| `reporter_phone` | `String` (Nullable)| Masked user phone string for tracking. |
| `report_count` | `Integer` | Counter for duplicate issues merged within 100m. |
| `created_at` | `DateTime` | Timestamp of submission (UTC). |
| `updated_at` | `DateTime` | Timestamp of last status change (UTC). |

### 2.2 `contractors` Table
Tracks third-party performance statistics for the governance dashboard.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `Integer` (PK) | Auto-incrementing identifier. |
| `name` | `String` (Unique) | Name of contracting group. |
| `issues_assigned` | `Integer` | Total tasks allocated. |
| `issues_resolved` | `Integer` | Tasks completed. |
| `avg_resolution_days`| `Float` | Average duration from assignment to fix. |
| `performance_score` | `Float` | Dynamic evaluation score ($0 \rightarrow 100$). |

### 2.3 `activity_logs` Table
A ledger recording all system-wide actions for compliance auditing.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `Integer` (PK) | Auto-incrementing identifier. |
| `issue_id` | `Integer` | Associated issue ID. |
| `action` | `String` | Event type (e.g. `status_changed`, `contractor_assigned`). |
| `old_value` | `String` (Nullable)| Value prior to transaction. |
| `new_value` | `String` (Nullable)| Value updated during transaction. |
| `timestamp` | `DateTime` | Event log time (UTC). |

---

## 3. Core Algorithms & Mathematical Formulas

### 3.1 Severity Score ($S$)
Calculates the structural hazard of a reported issue:

$$S = (B \times 0.5) + (C \times 25) + \min(N \times 3, 15) \pm R$$

* **$B$** = Base Severity Weight per issue type (Pothole: 55, Waterlogging: 60, Drainage: 50, Garbage: 35, Streetlight: 30, Other: 25).
* **$C$** = Image Detection Confidence ($0.0 \rightarrow 1.0$).
* **$N$** = Count of recognized objects within the frame.
* **$R$** = Small random factor ($\pm 2.0$) to prevent identical values on mock records.

### 3.2 Priority Score ($P$)
Determines the issue's ranking position in the dashboard queue:

$$P = S \times \left(1 + \frac{F}{100}\right) + R$$

* **$S$** = Computed Severity Score.
* **$F$** = 30-Day Failure Probability ($0 \rightarrow 100$).
* **$R$** = Random noise factor to prevent sorting collisions.

### 3.3 Ward Health Index ($H$)
Calculates overall civic quality for a group of issues ($I$):

$$H = 100.0 - \left( \frac{\sum_{i \in I} \text{Severity}(i) \times W(i)}{\max(|I|, 1)} \right)$$

* **$W(i)$** = Status-based decay weight:
  * `reported` $\rightarrow 1.0$ (Full penalty)
  * `in_progress` $\rightarrow 0.4$ (Reduced penalty)
  * `resolved` $\rightarrow 0.0$ (Zero penalty)

---

## 4. AI & Image Heuristics Detection

### 4.1 YOLOv8 Object Classification
A lazy-loaded, pre-cached YOLOv8 model runs on incoming image files to extract object bounding boxes (detecting cars, pedestrians, signs, or clutters).

### 4.2 OpenCV Heuristic Classifiers
If a custom-trained model is unavailable, visual cues are parsed dynamically:
* **Waterlogging**: Detects Sky-reflections by analyzing light blue/glare ranges in the HSV spectrum (`H: 90-130`).
* **Potholes**: Analyzes grayscale gradients and uses contour thresholding to locate circular/elliptical dark patches on asphalt.
* **Garbage**: Standard deviation edge-densities via Canny Edge Detection (`thresholds: 80, 180`) serve as a proxy for structural clutter.
* **Streetlights**: Uses Hough Line Transform (`HoughLinesP`) to count vertical edges at angles near $90^\circ$.

---

## 5. REST API Reference

### 5.1 Citizen Endpoints
* **`POST /api/issues/upload`**: Uploads image file and coordinates. Returns detected parameters.
* **`POST /api/auth/citizen/request-otp`**: Requests a login token (OTP simulated).
* **`POST /api/auth/citizen/verify-otp`**: Verifies OTP token and returns Bearer JWT.
* **`GET /api/issues/mine`**: Retrieves logged-in citizen's report history.

### 5.2 Command Dashboard Endpoints
* **`GET /api/issues`**: Lists and filters all reports. Manually serializes queries to skip slow Pydantic layers.
* **`GET /api/dashboard/stats`**: Returns overall count metrics, ward groups, and city health indexes.
* **`GET /api/dashboard/departments`**: Computes department metrics (total, open, resolved, resolution times, SLA breaches).
* **`GET /api/dashboard/activity`**: Streams real-time system audit trails.

---

## 6. Frontend Tokenized Styling System

The user interface implements CSS variable overrides in `index.css` to enable unified styling for light and dark modes:

```css
:root {
  --color-brand-deep: #0f0524;      /* Sleek deep purple background */
  --color-brand-primary: #5b21b6;   /* Vibrant violet accent */
  --color-brand-accent: #ec4899;    /* Bright pink primary CTA */
  --color-brand-yellow: #facc15;    /* Amber indicators */
  
  --color-paper: #fcfbfe;           /* Base background (Light Mode) */
  --color-surface: #ffffff;
  --color-border-muted: #e2dcf2;
}

.dark {
  --color-paper: #090214;           /* Base background (Dark Mode) */
  --color-surface: #120926;
  --color-border-muted: #281747;
}
```
* Custom testimonials, stats panels, maps, and modals pull from these dynamic tokens rather than hardcoded tailwind values to support seamless dark/light modes.
