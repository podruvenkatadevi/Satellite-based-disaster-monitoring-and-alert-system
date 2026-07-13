"""
Satellite Disaster Monitoring — FastAPI backend.

Mock mode (default): local JSON store + filesystem uploads.
Run: uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import threading
import uuid
from pathlib import Path

from fastapi import Body, FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from services.alerts import send_high_severity_alert
from services.classifier import classify, is_warmup_complete, model_info, model_ready, warmup
from services import store

ROOT = Path(__file__).resolve().parent
UPLOADS_DIR = ROOT / "uploads"
FRONTEND_DIST = ROOT.parent / "frontend" / "dist"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

MOCK_MODE = False
AWS_REGION = "eu-north-1"
S3_BUCKET = "1amazonbucket1332"
DDB_TABLE = "disateralert"
SNS_CONFIGURED = True
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB

app = FastAPI(title="Satellite Disaster Monitoring API", version="1.0.0")

# Allow localhost + LAN IPs so teammates can access from other machines on the network.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    store.init_store()
    threading.Thread(target=warmup, daemon=True).start()


@app.get("/api/health")
def health():
    meta = model_info()
    return {
        "service": "satellite-disaster-monitoring",
        "status": "ok",
        "mock_mode": MOCK_MODE,
        "region": AWS_REGION,
        "s3_bucket": S3_BUCKET if not MOCK_MODE else f"{S3_BUCKET} (mock)",
        "ddb_table": DDB_TABLE if not MOCK_MODE else f"{DDB_TABLE} (mock)",
        "sns_configured": SNS_CONFIGURED,
        "ml_model_loaded": model_ready(),
        "ml_val_accuracy": meta.get("val_accuracy"),
        "ml_num_images": meta.get("num_images"),
        "clip_index_size": meta.get("clip_index_size"),
        "classifier": meta.get("ensemble", "ai-ensemble"),
        "ml_warmup_complete": is_warmup_complete(),
        "ai_backend": meta.get("ai_backend"),
        "ai_error": meta.get("ai_error"),
    }


@app.get("/api/stats")
def get_stats():
    return store.stats()


@app.get("/api/disasters")
def get_disasters():
    return {"items": store.list_all()}


@app.get("/api/disasters/{disaster_id}")
def get_disaster(disaster_id: str):
    record = store.get_by_id(disaster_id)
    if not record:
        return JSONResponse(status_code=404, content={"detail": "Disaster record not found."})
    return record


@app.patch("/api/disasters/{disaster_id}")
def patch_disaster(disaster_id: str, body: dict = Body(...)):
    lifecycle = body.get("lifecycle")
    if not lifecycle:
        legacy = body.get("status")
        if legacy in ("Active", "Resolved"):
            lifecycle = legacy
    if not lifecycle:
        return JSONResponse(status_code=400, content={"detail": "Missing lifecycle (Active or Resolved)."})
    try:
        record = store.update_status(disaster_id, lifecycle)
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"detail": str(exc)})
    if not record:
        return JSONResponse(status_code=404, content={"detail": "Disaster record not found."})
    return record


@app.delete("/api/disasters/{disaster_id}")
def remove_disaster(disaster_id: str):
    if not store.delete_by_id(disaster_id):
        return JSONResponse(status_code=404, content={"detail": "Disaster record not found."})
    return {"message": "Record deleted.", "id": disaster_id}


@app.get("/api/alerts")
def get_alerts():
    items = [r for r in store.list_all() if r.get("severity") == "High"]
    return {"items": items}


@app.post("/api/seed")
def seed_data():
    count = store.seed_samples()
    return {"message": f"Loaded {count} sample disaster records."}


@app.post("/api/clear")
def clear_data():
    count = store.clear_all()
    return {"message": f"Cleared {count} disaster record(s)."}


@app.post("/api/upload")
async def upload_image(
    image: UploadFile = File(...),
    location: str = Form("Unknown"),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        return JSONResponse(status_code=400, content={"detail": "File must be an image."})

    body = await image.read()
    if not body:
        return JSONResponse(status_code=400, content={"detail": "Empty image file."})
    if len(body) > MAX_UPLOAD_BYTES:
        return JSONResponse(status_code=400, content={"detail": "Image too large (max 15 MB)."})

    filename = image.filename or "upload.jpg"
    ext = Path(filename).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}:
        ext = ".jpg"
    saved_name = f"{uuid.uuid4().hex}{ext}"
    saved_path = UPLOADS_DIR / saved_name
    saved_path.write_bytes(body)

    try:
        prediction = classify(filename, body)
    except ValueError as exc:
        saved_path.unlink(missing_ok=True)
        return JSONResponse(status_code=400, content={"detail": str(exc)})
    except Exception as exc:
        import traceback

        traceback.print_exc()
        saved_path.unlink(missing_ok=True)
        return JSONResponse(
            status_code=503,
            content={"detail": f"Analysis failed unexpectedly: {type(exc).__name__}: {exc}"},
        )
    severity = prediction["severity"]
    status = "ALERT_SENT" if severity == "High" else "ANALYZED"
    image_url = f"/uploads/{saved_name}" if MOCK_MODE else f"s3://{S3_BUCKET}/{saved_name}"

    record = store.add(
        disaster_type=prediction["type"],
        confidence=prediction["confidence"],
        severity=severity,
        location=location or "Unknown",
        status=status,
        image_url=image_url,
    )

    if severity == "High":
        send_high_severity_alert(record)

    return {"result": record}


# Serve uploaded images and optional production frontend build.
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

if FRONTEND_DIST.is_dir():
    from fastapi.responses import FileResponse

    _ASSETS_DIR = FRONTEND_DIST / "assets"
    if _ASSETS_DIR.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_ASSETS_DIR)), name="assets")

    _INDEX_FILE = FRONTEND_DIST / "index.html"
    _DIST_ROOT = FRONTEND_DIST.resolve()

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # API/uploads are handled by routes/mounts above; never mask them with HTML.
        if full_path.startswith(("api/", "uploads/")):
            return JSONResponse(status_code=404, content={"detail": "Not found."})

        # Serve a real static file if it exists (favicon, icons), else fall back to
        # index.html so client-side routes (/reports, /map, /reports/:id) work on
        # refresh and direct links when the backend serves the build.
        if full_path:
            candidate = (FRONTEND_DIST / full_path).resolve()
            try:
                candidate.relative_to(_DIST_ROOT)
            except ValueError:
                return JSONResponse(status_code=404, content={"detail": "Not found."})
            if candidate.is_file():
                return FileResponse(str(candidate))
        return FileResponse(str(_INDEX_FILE))
