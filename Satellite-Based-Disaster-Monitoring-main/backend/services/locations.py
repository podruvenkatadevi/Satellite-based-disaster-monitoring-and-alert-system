"""Location name → coordinates for map display (India-focused presets)."""

from __future__ import annotations

# lat, lng
LOCATION_COORDS: dict[str, tuple[float, float]] = {
    "Andhra Pradesh": (15.9129, 79.7400),
    "Kerala": (10.8505, 76.2711),
    "Odisha Coast": (19.8135, 85.8312),
    "Tamil Nadu": (11.1271, 78.6569),
    "Assam": (26.2006, 92.9376),
    "Unknown": (20.5937, 78.9629),
}

DEFAULT_COORDS = (20.5937, 78.9629)  # India center


def coords_for(location: str) -> tuple[float, float]:
    key = (location or "").strip()
    if key in LOCATION_COORDS:
        return LOCATION_COORDS[key]
    for name, c in LOCATION_COORDS.items():
        if name.lower() in key.lower() or key.lower() in name.lower():
            return c
    return DEFAULT_COORDS
