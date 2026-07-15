# Satellite-Based Disaster Monitoring and alert system

Cloud-ready disaster monitoring platform: upload satellite images, classify disasters (Flood / Fire / Cyclone), view dashboard, reports, and alerts.

## Quick start (every team member)

### Option A — Each person runs locally (recommended)

**1. Install once:**
```powershell
cd backend
python -m pip install -r requirements.txt

cd ../frontend
npm install
```

**2. Start both servers** (from project root):
```powershell
.\run.ps1
```
Or double-click `run.bat`.

Or manually in **two terminals**:

```powershell
# Terminal 1 — backend (must be inside backend/ folder)
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — frontend
cd frontend
npm run dev
```

**3. Open:** http://localhost:5173

The frontend proxies `/api` to the backend automatically — no IP configuration needed.

---

### Option B — One person hosts, others open in browser (demo)

On the host machine:
```powershell
cd frontend
npm run build
cd ../backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Find host IP: `ipconfig` → IPv4 (e.g. `192.168.1.5`)

Everyone opens: **http://192.168.1.5:8000**

---

### Fix "Failed to fetch" / "Backend not reachable"

| Cause | Fix |
|-------|-----|
| Backend not running | Start backend from `backend/` folder (see above) |
| Wrong folder | Do **not** run uvicorn from project root |
| Port 8000 busy | `netstat -ano \| findstr :8000` then `taskkill /PID <id> /F` |
| First upload slow | Wait up to 2 min (AI models loading) |
| Missing Python deps | `pip install -r backend/requirements.txt` |
| Upload → "Analysis failed" | First upload downloads the CLIP model (~600 MB) from HuggingFace. Needs internet **once**. See below. |

### "Analysis failed" on upload (AI model download)

The AI ensemble uses OpenAI CLIP, which is **downloaded once (~600 MB)** from HuggingFace
the first time you analyze an image. If a teammate is offline, behind a proxy/firewall,
or the download is slow, that first upload can fail.

The app now **degrades gracefully** instead of hard-failing:

1. **CLIP ensemble** — best accuracy (needs the one-time download).
2. **Local MobileNet** — offline, ships in the repo (`backend/models/disaster_model.pt`).
3. **Color heuristic** — always works, no ML stack needed.

Check which backend is active: open http://127.0.0.1:8000/api/health and look at
`"ai_backend"` (`clip-ensemble`, `mobilenet`, or `heuristic`) and `"ai_error"`.

**Force fast offline mode** (skip the CLIP download entirely) — set before starting the backend:

```powershell
$env:DISABLE_AI = "1"
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

The backend terminal now prints the **real error** (full traceback) when the AI stack
can't load, so you can see the actual cause instead of a generic message.

Test backend directly: http://127.0.0.1:8000/api/health — should return JSON `"status":"ok"`.

**Automated API test:**
```powershell
cd backend
python test_api.py
```
Should print `0 failure(s)`.

---

### Train AI model (first time / after adding images)

```powershell
cd backend
python train_classifier.py
```

`train_classifier.py` auto-labels images from your dataset folder (set `DISASTER_DATASET_DIR` or use default). Re-run when you add images.

**For best accuracy:** add non-disaster photos to `backend/dataset/normal/` (15+ images), then retrain.

---

### Demo logins

| Role | Email | Password |
|------|-------|----------|
| User | `user@demo.com` | `User@123` |
| Admin | `admin@demo.com` | `Admin@123` |

---

## Phase 1 features (complete)

- **Interactive map** (`/map`) — Leaflet map with markers for Flood / Fire / Cyclone by location
- **Disaster detail** (`/reports/:id`) — full record view with image, coordinates, lifecycle
- **Admin CRUD** — update lifecycle (Active / Resolved), delete records, view details
- **Location presets** — Andhra Pradesh, Kerala, Odisha Coast, Tamil Nadu, Assam (lat/lng on backend)
- **Reports** — clickable rows, CSV export includes coordinates and lifecycle

Phase 2 (teammate): AWS via Terraform — S3, Lambda, DynamoDB, SNS; set `MOCK_MODE=false` in backend.

---

## API (backend)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Service status |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/disasters` | All disaster records |
| GET | `/api/disasters/{id}` | Single record |
| PATCH | `/api/disasters/{id}` | Update lifecycle (`Active` / `Resolved`) |
| DELETE | `/api/disasters/{id}` | Delete record |
| GET | `/api/alerts` | High-severity records |
| POST | `/api/upload` | Upload image + location |
| POST | `/api/seed` | Load sample data |
| POST | `/api/clear` | Clear all records |

## Project layout

```
backend/          FastAPI API + image classifier (mock AWS mode)
frontend/         React dashboard
```
