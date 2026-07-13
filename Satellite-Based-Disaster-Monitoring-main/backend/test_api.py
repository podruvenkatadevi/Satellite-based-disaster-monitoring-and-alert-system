"""One-shot API integration test — run: python test_api.py"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE = "http://127.0.0.1:8000"
FAILURES: list[str] = []


def req(method: str, path: str, body: dict | None = None, expect: int = 200):
    data = None
    headers = {}
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    r = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw = resp.read()
            status = resp.status
            parsed = json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        status = e.code
        raw = e.read()
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = raw.decode()
    if status != expect:
        FAILURES.append(f"{method} {path} expected {expect}, got {status}: {parsed}")
    return status, parsed


def check(name: str, ok: bool, detail: str = ""):
    if ok:
        print(f"  OK  {name}")
    else:
        msg = f"  FAIL {name}" + (f" — {detail}" if detail else "")
        print(msg)
        FAILURES.append(msg)


def main() -> int:
    print("=== API smoke test ===\n")

    _, health = req("GET", "/api/health")
    check("health", health.get("status") == "ok")
    check("mock_mode bool", isinstance(health.get("mock_mode"), bool))

    _, stats = req("GET", "/api/stats")
    check("stats total", "total" in stats and isinstance(stats["total"], int))

    _, disasters = req("GET", "/api/disasters")
    items = disasters.get("items", [])
    check("disasters list", isinstance(items, list))

    if items:
        rid = items[0]["id"]
        _, one = req("GET", f"/api/disasters/{rid}")
        check("get by id", one.get("id") == rid)
        check("has latitude", "latitude" in one and one["latitude"] is not None)
        check("has lifecycle", one.get("lifecycle") in ("Active", "Resolved"))

        _, patched = req("PATCH", f"/api/disasters/{rid}", {"lifecycle": "Resolved"})
        check("patch resolved", patched.get("lifecycle") == "Resolved")
        req("PATCH", f"/api/disasters/{rid}", {"lifecycle": "Active"})
    else:
        print("  skip record tests (no data)")

    _, bad = req("GET", "/api/disasters/not-a-real-id", expect=404)
    check("404 missing id", bad.get("detail"))

    _, bad_patch = req("PATCH", "/api/disasters/not-a-real-id", {"lifecycle": "Active"}, expect=404)

    if items:
        _, bad_body = req("PATCH", f"/api/disasters/{items[0]['id']}", {}, expect=400)
        _, bad_lifecycle = req("PATCH", f"/api/disasters/{items[0]['id']}", {"lifecycle": "ALERT_SENT"}, expect=400)

    _, alerts = req("GET", "/api/alerts")
    check("alerts list", isinstance(alerts.get("items"), list))
    for a in alerts["items"]:
        check("alert high severity", a.get("severity") == "High", a.get("id", ""))

    # Upload minimal PNG
    png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
        b"\x01\x01\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    boundary = "----testboundary"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="location"\r\n\r\nKerala\r\n'
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="image"; filename="flood_test.png"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode() + png + f"\r\n--{boundary}--\r\n".encode()
    up_req = urllib.request.Request(
        f"{BASE}/api/upload",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(up_req, timeout=180) as resp:
            up = json.loads(resp.read())
        result = up.get("result", {})
        check("upload result", result.get("type") == "Flood", str(result))
        check("upload coords", result.get("latitude") and result.get("longitude"))
        upload_id = result.get("id")
        if upload_id:
            req("DELETE", f"/api/disasters/{upload_id}")
            _, gone = req("GET", f"/api/disasters/{upload_id}", expect=404)
            check("delete works", gone.get("detail"))
    except Exception as e:
        check("upload", False, str(e))

    # Invalid upload
    req("POST", "/api/upload", expect=422)  # missing file

    print(f"\n=== Done: {len(FAILURES)} failure(s) ===")
    for f in FAILURES:
        print(f)
    return 1 if FAILURES else 0


if __name__ == "__main__":
    sys.exit(main())
