"""In-memory disaster store with JSON persistence (mock DynamoDB)."""

from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from services.locations import coords_for

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_FILE = DATA_DIR / "disasters.json"
UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"

VALID_STATUSES = frozenset({"Active", "Resolved", "ANALYZED", "ALERT_SENT"})

_lock = threading.Lock()
_records: list[dict[str, Any]] = []


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _enrich(record: dict[str, Any]) -> dict[str, Any]:
    """Ensure record has lat/lng and lifecycle status for older data."""
    out = dict(record)
    loc = out.get("location") or "Unknown"
    if "latitude" not in out or "longitude" not in out:
        lat, lng = coords_for(loc)
        out["latitude"] = lat
        out["longitude"] = lng
    else:
        try:
            out["latitude"] = float(out["latitude"])
            out["longitude"] = float(out["longitude"])
        except (TypeError, ValueError):
            lat, lng = coords_for(loc)
            out["latitude"] = lat
            out["longitude"] = lng
    status = out.get("status") or "ANALYZED"
    if status in ("ANALYZED", "ALERT_SENT") and "lifecycle" not in out:
        out["lifecycle"] = "Active"
    elif "lifecycle" not in out:
        out["lifecycle"] = status if status in ("Active", "Resolved") else "Active"
    return out


def _load() -> None:
    global _records
    if not DATA_FILE.exists():
        _records = []
        return
    try:
        raw = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        _records = [_enrich(r) for r in raw]
    except (json.JSONDecodeError, OSError):
        _records = []


def _save() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = DATA_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(_records, indent=2), encoding="utf-8")
    tmp.replace(DATA_FILE)


def init_store() -> None:
    _load()


def list_all() -> list[dict[str, Any]]:
    with _lock:
        return [_enrich(dict(row)) for row in _records]


def get_by_id(disaster_id: str) -> dict[str, Any] | None:
    with _lock:
        for row in _records:
            if row.get("id") == disaster_id:
                return _enrich(dict(row))
    return None


def add(
    *,
    disaster_type: str,
    confidence: int,
    severity: str,
    location: str,
    status: str,
    image_url: str,
) -> dict[str, Any]:
    lat, lng = coords_for(location or "Unknown")
    lifecycle = "Active"
    record = {
        "id": str(uuid.uuid4()),
        "type": disaster_type,
        "confidence": confidence,
        "severity": severity,
        "location": location,
        "latitude": lat,
        "longitude": lng,
        "status": status,
        "lifecycle": lifecycle,
        "imageUrl": image_url,
        "timestamp": _now_iso(),
    }
    with _lock:
        _records.insert(0, record)
        _save()
    return record


def update_status(disaster_id: str, lifecycle: str) -> dict[str, Any] | None:
    if lifecycle not in ("Active", "Resolved"):
        raise ValueError("Status must be Active or Resolved.")
    with _lock:
        for row in _records:
            if row.get("id") == disaster_id:
                row["lifecycle"] = lifecycle
                _save()
                return _enrich(dict(row))
    return None


def delete_by_id(disaster_id: str) -> bool:
    with _lock:
        for i, row in enumerate(_records):
            if row.get("id") != disaster_id:
                continue
            url = row.get("imageUrl") or ""
            _delete_upload_file(url)
            _records.pop(i)
            _save()
            return True
    return False


def _delete_upload_file(image_url: str) -> None:
    if not image_url or not str(image_url).startswith("/uploads/"):
        return
    path = UPLOADS_DIR / Path(str(image_url)).name
    path.unlink(missing_ok=True)


def clear_all() -> int:
    with _lock:
        count = len(_records)
        for row in _records:
            _delete_upload_file(row.get("imageUrl") or "")
        _records.clear()
        _save()
    return count


def stats() -> dict[str, Any]:
    items = list_all()
    by_type: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    for row in items:
        by_type[row["type"]] = by_type.get(row["type"], 0) + 1
        by_severity[row["severity"]] = by_severity.get(row["severity"], 0) + 1
    return {"total": len(items), "by_type": by_type, "by_severity": by_severity}


def seed_samples() -> int:
    samples = [
        ("Flood", 94, "High", "Kerala", "ALERT_SENT"),
        ("Fire", 91, "High", "Andhra Pradesh", "ALERT_SENT"),
        ("Cyclone", 88, "Medium", "Odisha Coast", "ANALYZED"),
        ("Flood", 76, "Medium", "Assam", "ANALYZED"),
        ("Fire", 82, "Medium", "Tamil Nadu", "ANALYZED"),
        ("Cyclone", 95, "High", "Odisha Coast", "ALERT_SENT"),
        ("Normal", 64, "Low", "Unknown", "ANALYZED"),
        ("Flood", 68, "Low", "Kerala", "ANALYZED"),
    ]
    added = 0
    for disaster_type, confidence, severity, location, status in samples:
        add(
            disaster_type=disaster_type,
            confidence=confidence,
            severity=severity,
            location=location,
            status=status,
            image_url=f"mock://samples/{disaster_type.lower()}_{added + 1}.jpg",
        )
        added += 1
    return added
