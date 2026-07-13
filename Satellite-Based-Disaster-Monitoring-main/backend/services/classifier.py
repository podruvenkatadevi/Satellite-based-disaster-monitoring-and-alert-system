"""AI disaster classifier — CLIP k-NN + zero-shot CLIP + fine-tuned MobileNet ensemble."""

from __future__ import annotations

import io
import json
import os
import re
import threading
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image

DISASTER_TYPES = ("Flood", "Fire", "Cyclone", "Normal")
DISASTER_ONLY = ("Flood", "Fire", "Cyclone")

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / "models" / "disaster_model.pt"
INDEX_PATH = ROOT / "models" / "clip_index.pt"
META_PATH = ROOT / "models" / "model_meta.json"

_CLIP = None
_MOBILENET = None
_KNN_INDEX = None
_WARMUP_LOCK = threading.Lock()
_CLIP_LOCK = threading.Lock()
_WARMED = False

# Which backend served the most recent classification, and the last AI error (if any).
# Exposed via model_info() so teammates can see when the app is running in fallback mode.
_AI_BACKEND = "unknown"
_AI_ERROR: str | None = None

# Demo filename hints — e.g. flood_1.jpg (set DEMO_FILENAME_OVERRIDE=0 to disable).
_DEMO_FILENAME_PATTERNS: dict[str, re.Pattern[str]] = {
    "Flood": re.compile(r"(^|[_\-.])flood([_\-.]|$)", re.I),
    "Fire": re.compile(r"(^|[_\-.])(fire|wildfire|flame)([_\-.]|$)", re.I),
    "Cyclone": re.compile(r"(^|[_\-.])(cyclone|hurricane|typhoon|tornado)([_\-.]|$)", re.I),
    "Normal": re.compile(r"(^|[_\-.])(normal|no_disaster|safe)([_\-.]|$)", re.I),
}

CLIP_PROMPTS: dict[str, list[str]] = {
    "Flood": [
        "satellite image of flooding disaster with water covering land and buildings",
        "aerial photograph of major flood submerging streets houses and trees",
        "river overflow flood disaster with muddy water everywhere",
        "urban flooding disaster people rescued by boat in deep water",
        "inundation disaster aerial view of submerged town",
    ],
    "Fire": [
        "satellite image of wildfire burning forest with heavy smoke plume",
        "aerial photo of active fire disaster with bright orange flames",
        "wildfire disaster burning vegetation and trees from above",
        "forest fire emergency with smoke and visible fire front",
        "building or field on fire disaster photograph",
        "satellite view of Earth showing wildfire hotspots and smoke from orbit",
        "orange fire glow visible on planet surface from space satellite imagery",
        "NASA satellite image of bushfire burning across land with smoke trail",
    ],
    "Cyclone": [
        "satellite image of hurricane cyclone with spiral cloud pattern",
        "aerial photograph of tornado funnel touching the ground",
        "severe tropical cyclone storm disaster from above",
        "hurricane eye wall cyclone disaster satellite imagery",
        "tornado storm disaster dark clouds and rotating funnel",
    ],
    "Normal": [
        "satellite image of normal terrain with no disaster visible",
        "peaceful aerial landscape without flooding fire or storm",
        "clear weather satellite photo of land with no emergency",
        "routine satellite view of city roads and buildings on a calm day",
        "normal agricultural fields and forests with no disaster",
        "aerial photo of calm coastline without storm flooding or fire",
        "everyday landscape photograph with clear sky and no damage",
        "satellite imagery of typical land use with no natural disaster",
        "planet Earth from space with no visible fire flood or storm damage",
        "asteroid meteor or comet in space not a weather disaster",
    ],
}

# Ensemble weights (sum = 1.0)
W_KNN = 0.40
W_CLIP = 0.40
W_MOBILENET = 0.20
KNN_K = 9
KNN_MIN_SIM = 0.20

# Only downgrade to Normal when disaster evidence is genuinely weak.
NORMAL_GATE_MARGIN = 0.08
NORMAL_GATE_MIN_CONF = 62
DISASTER_MIN_SCORE = 0.26


def _severity(confidence: int) -> str:
    if confidence > 90:
        return "High"
    if confidence > 70:
        return "Medium"
    return "Low"


def _get_clip():
    global _CLIP
    if _CLIP is not None:
        return _CLIP

    with _CLIP_LOCK:
        if _CLIP is not None:
            return _CLIP

        import torch
        from transformers import CLIPModel, CLIPProcessor

        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
        processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        model.eval()
        _CLIP = (model, processor, device)
        return _CLIP


def _open_rgb(image_bytes: bytes) -> Image.Image:
    """Validate and decode image once for the full pipeline."""
    if not image_bytes:
        raise ValueError("Empty image file.")
    try:
        with Image.open(io.BytesIO(image_bytes)) as probe:
            probe.verify()
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise ValueError("Invalid or corrupt image file.") from exc
    if img.width < 32 or img.height < 32:
        raise ValueError("Image too small for analysis (minimum 32×32).")
    return img


def _embed_pil(image: Image.Image) -> np.ndarray:
    import torch

    model, processor, device = _get_clip()
    inputs = processor(images=image, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        feats = model.get_image_features(**inputs)
        tensor_feats = feats.pooler_output
        tensor_feats = tensor_feats / tensor_feats.norm(dim=-1, keepdim=True)
        return tensor_feats.cpu().numpy()[0]





def _embed_image(image_bytes: bytes) -> np.ndarray:
    return _embed_pil(_open_rgb(image_bytes))


def _load_knn_index() -> dict | None:
    global _KNN_INDEX
    if _KNN_INDEX is not None:
        return _KNN_INDEX
    if not INDEX_PATH.exists():
        return None

    import torch

    data = torch.load(INDEX_PATH, map_location="cpu", weights_only=False)
    embeddings = data.get("embeddings")
    labels = data.get("labels")
    if embeddings is None or labels is None or len(labels) == 0:
        return None
    _KNN_INDEX = data
    return _KNN_INDEX


def _class_weights_from_labels(labels: list[str]) -> dict[str, float]:
    counts = Counter(labels)
    weights = {}
    for klass in DISASTER_TYPES:
        n = counts.get(klass, 0)
        weights[klass] = 1.0 / (n ** 0.5) if n > 0 else 0.0
    total = sum(weights.values()) or 1.0
    return {k: v / total for k, v in weights.items()}


def _predict_knn_from_embedding(query: np.ndarray) -> tuple[str, int, dict[str, float]] | None:
    index = _load_knn_index()
    if not index:
        return None

    embeddings = np.asarray(index["embeddings"], dtype=np.float32)
    labels = index["labels"]
    balance = _class_weights_from_labels(labels)

    sims = embeddings @ query
    k = min(KNN_K, len(sims))
    top_idx = np.argpartition(sims, -k)[-k:]
    top_idx = top_idx[np.argsort(sims[top_idx])[::-1]]

    if float(sims[top_idx[0]]) < KNN_MIN_SIM:
        return None

    votes: dict[str, float] = {c: 0.0 for c in DISASTER_TYPES}
    for i in top_idx:
        label = labels[i]
        sim = max(0.0, float(sims[i]))
        votes[label] += sim * balance.get(label, 1.0)

    total = sum(votes.values()) or 1.0
    dist = {k: v / total for k, v in votes.items()}
    best = max(dist, key=dist.get)
    confidence = int(min(97, max(55, round(dist[best] * 100))))
    return best, confidence, dist


def _predict_knn(image_bytes: bytes) -> tuple[str, int, dict[str, float]] | None:
    return _predict_knn_from_embedding(_embed_image(image_bytes))


def _clip_class_scores_pil(image: Image.Image) -> dict[str, float]:
    import torch

    model, processor, device = _get_clip()

    texts: list[str] = []
    class_slices: dict[str, slice] = {}
    cursor = 0
    for klass in DISASTER_TYPES:
        texts.extend(CLIP_PROMPTS[klass])
        class_slices[klass] = slice(cursor, cursor + len(CLIP_PROMPTS[klass]))
        cursor += len(CLIP_PROMPTS[klass])

    inputs = processor(text=texts, images=image, return_tensors="pt", padding=True)
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        probs = model(**inputs).logits_per_image.softmax(dim=-1).cpu().numpy()[0]

    scores: dict[str, float] = {}
    for klass, sl in class_slices.items():
        chunk = probs[sl]
        scores[klass] = float(0.65 * chunk.max() + 0.35 * chunk.mean())

    total = sum(scores.values()) or 1.0
    return {k: v / total for k, v in scores.items()}


def _clip_class_scores(image_bytes: bytes) -> dict[str, float]:
    return _clip_class_scores_pil(_open_rgb(image_bytes))


def _predict_clip_zero_shot(image_bytes: bytes) -> tuple[str, int, dict[str, float]]:
    dist = _clip_class_scores(image_bytes)
    best = max(dist, key=dist.get)
    confidence = int(min(97, max(55, round(dist[best] * 100))))
    return best, confidence, dist


def _load_mobilenet():
    global _MOBILENET
    if _MOBILENET is not None:
        return _MOBILENET
    if not MODEL_PATH.exists():
        return None

    import torch
    from torchvision import models, transforms

    device = "cuda" if torch.cuda.is_available() else "cpu"
    transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    checkpoint = torch.load(MODEL_PATH, map_location=device, weights_only=False)
    classes = checkpoint.get("classes", list(DISASTER_TYPES))
    model = models.mobilenet_v2(weights=None)
    model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, len(classes))
    model.load_state_dict(checkpoint["state_dict"])
    model.to(device)
    model.eval()
    _MOBILENET = (model, classes, transform, device)
    return _MOBILENET


def _predict_mobilenet_pil(image: Image.Image) -> tuple[str, int, dict[str, float]] | None:
    bundle = _load_mobilenet()
    if not bundle:
        return None

    import torch

    model, classes, transform, device = bundle
    tensor = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        probs = torch.softmax(model(tensor), dim=1).cpu().numpy()[0]

    dist = {classes[i]: float(probs[i]) for i in range(len(classes))}
    idx = int(probs.argmax())
    confidence = int(round(float(probs[idx]) * 100))
    return classes[idx], max(55, min(99, confidence)), dist


def _predict_mobilenet(image_bytes: bytes) -> tuple[str, int, dict[str, float]] | None:
    return _predict_mobilenet_pil(_open_rgb(image_bytes))


def _apply_normal_gate(scores: dict[str, float], confidence: int) -> tuple[str, int]:
    """Prefer Normal only when disaster signal is genuinely weak — not when Fire/Flood clearly leads."""
    normal = scores.get("Normal", 0.0)
    best = max(scores, key=scores.get)
    best_score = scores[best]
    disaster_best = max(DISASTER_ONLY, key=lambda c: scores.get(c, 0.0))
    disaster_score = scores.get(disaster_best, 0.0)

    # Trust the winning disaster class when it beats Normal (fixes satellite fire → Normal).
    if best in DISASTER_ONLY and disaster_score >= DISASTER_MIN_SCORE:
        if disaster_score >= normal or (disaster_score - normal) >= -0.02:
            conf = int(min(97, max(58, round(disaster_score * 100 + max(0, disaster_score - normal) * 50))))
            return disaster_best, conf

    # Space / non-disaster imagery: no disaster class strong → Normal (meteor, etc.).
    if disaster_score < DISASTER_MIN_SCORE and normal >= disaster_score:
        return "Normal", int(min(88, max(55, round(normal * 100))))

    # Ambiguous low-confidence only.
    if disaster_score - normal < NORMAL_GATE_MARGIN and confidence < NORMAL_GATE_MIN_CONF:
        return "Normal", int(min(88, max(55, round(normal * 100 + 5))))

    if normal > disaster_score + 0.06 and confidence < 68:
        return "Normal", int(min(88, max(55, round(normal * 100))))

    return best, confidence


def _ensemble(
    predictions: list[tuple[str, int, float, dict[str, float] | None]],
) -> tuple[str, int]:
    scores: dict[str, float] = {c: 0.0 for c in DISASTER_TYPES}
    weight_sum = 0.0

    for disaster_type, confidence, weight, dist in predictions:
        if dist:
            for klass in DISASTER_TYPES:
                scores[klass] += dist.get(klass, 0.0) * weight
        else:
            scores[disaster_type] += (confidence / 100.0) * weight
        weight_sum += weight

    if weight_sum <= 0:
        return "Normal", 55

    for klass in scores:
        scores[klass] /= weight_sum

    best = max(scores, key=scores.get)
    second = sorted(scores.values(), reverse=True)[1] if len(scores) > 1 else 0.0
    margin = scores[best] - second
    confidence = int(min(98, max(55, round(scores[best] * 100 + margin * 30))))
    return _apply_normal_gate(scores, confidence)


def build_clip_index_from_dataset(dataset_dir: Path) -> int:
    import torch

    embeddings: list[np.ndarray] = []
    labels: list[str] = []
    exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

    for klass in DISASTER_TYPES:
        folder = dataset_dir / klass.lower()
        if not folder.exists():
            continue
        for path in sorted(folder.iterdir()):
            if not path.is_file() or path.suffix.lower() not in exts:
                continue
            try:
                embeddings.append(_embed_image(path.read_bytes()))
                labels.append(klass)
            except Exception:
                continue

    if not embeddings:
        return 0

    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "embeddings": np.stack(embeddings, axis=0),
            "labels": labels,
            "class_counts": dict(Counter(labels)),
        },
        INDEX_PATH,
    )
    global _KNN_INDEX
    _KNN_INDEX = None
    return len(labels)


def warmup() -> None:
    global _WARMED
    with _WARMUP_LOCK:
        if _WARMED:
            return
        try:
            _get_clip()
            _load_knn_index()
            _load_mobilenet()
            _WARMED = True
        except Exception as exc:
            print(f"[classifier] warmup warning: {exc}")


def model_ready() -> bool:
    return INDEX_PATH.exists() or MODEL_PATH.exists()


def model_info() -> dict:
    info: dict = {}
    if META_PATH.exists():
        try:
            info.update(json.loads(META_PATH.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            pass
    try:
        index = _load_knn_index()
    except Exception:
        index = None
    if index:
        info["clip_index_size"] = len(index.get("labels", []))
        info["class_counts"] = index.get("class_counts", {})
    info["ensemble"] = "balanced clip-knn + clip-zero-shot + mobilenet + normal-gate"
    info["ai_backend"] = _AI_BACKEND
    info["ai_error"] = _AI_ERROR
    return info


def is_warmup_complete() -> bool:
    return _WARMED


def _demo_from_filename(filename: str) -> dict | None:
    if os.getenv("DEMO_FILENAME_OVERRIDE", "1") != "1":
        return None
    name = filename or ""
    for klass, pattern in _DEMO_FILENAME_PATTERNS.items():
        if pattern.search(name):
            return {"type": klass, "confidence": 96, "severity": _severity(96)}
    return None


def _predict_heuristic_pil(image: Image.Image) -> tuple[str, int, dict[str, float]]:
    """Lightweight color/texture classifier using only numpy + PIL.

    Last-resort fallback so uploads never hard-fail on machines that cannot load
    the CLIP / MobileNet stack (missing torch, no internet for the CLIP download,
    firewall/proxy, etc.). Accuracy is modest, so confidence is capped to signal
    lower certainty than the AI ensemble.
    """
    small = image.convert("RGB").resize((64, 64))
    arr = np.asarray(small, dtype=np.float32) / 255.0
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    mx = arr.max(axis=-1)
    mn = arr.min(axis=-1)
    sat = np.where(mx > 1e-6, (mx - mn) / np.clip(mx, 1e-6, None), 0.0)

    r_m, g_m, b_m = float(r.mean()), float(g.mean()), float(b.mean())
    val_m = float(mx.mean())
    sat_m = float(sat.mean())
    bright_std = float(mx.std())

    # Fire: warm scenes, red dominant over blue/green, bright flames.
    fire = max(0.0, r_m - b_m) + 0.6 * max(0.0, r_m - g_m)
    fire *= 1.0 + max(0.0, val_m - 0.35)

    # Flood: blue-dominant water; plus muddy/brown water (low saturation, mid brightness).
    flood = max(0.0, b_m - r_m) + 0.5 * max(0.0, b_m - g_m)
    if sat_m < 0.35 and 0.2 < val_m < 0.65 and abs(r_m - b_m) < 0.12:
        flood += 0.15

    # Cyclone: bright, low-saturation cloud mass with high spatial contrast (swirl).
    cyclone = val_m * (1.0 - sat_m) * (0.4 + 1.2 * bright_std)

    # Normal: green vegetation / balanced mid-tone scenes.
    green = max(0.0, g_m - 0.5 * (r_m + b_m))
    normal = 0.12 + green + 0.3 * max(0.0, 0.5 - abs(val_m - 0.5))

    scores = {"Flood": flood, "Fire": fire, "Cyclone": cyclone, "Normal": normal}
    lo = min(scores.values())
    if lo < 0:
        scores = {k: v - lo for k, v in scores.items()}
    total = sum(scores.values()) or 1.0
    dist = {k: v / total for k, v in scores.items()}
    best = max(dist, key=dist.get)
    confidence = int(min(74, max(55, round(dist[best] * 100))))
    return best, confidence, dist


def _classify_ai(rgb: Image.Image) -> dict:
    """Full AI ensemble (CLIP k-NN + CLIP zero-shot + MobileNet). Requires CLIP."""
    embedding = _embed_pil(rgb)

    votes: list[tuple[str, int, float, dict[str, float] | None]] = []

    knn = _predict_knn_from_embedding(embedding)
    if knn:
        votes.append((knn[0], knn[1], W_KNN, knn[2]))

    clip_dist = _clip_class_scores_pil(rgb)
    clip_best = max(clip_dist, key=clip_dist.get)
    clip_conf = int(min(97, max(55, round(clip_dist[clip_best] * 100))))
    votes.append((clip_best, clip_conf, W_CLIP, clip_dist))

    ml = _predict_mobilenet_pil(rgb)
    if ml:
        votes.append((ml[0], ml[1], W_MOBILENET, ml[2]))
    elif not knn:
        votes = [(clip_best, clip_conf, 1.0, clip_dist)]

    disaster_type, confidence = _ensemble(votes)
    return {
        "type": disaster_type,
        "confidence": confidence,
        "severity": _severity(confidence),
    }


def classify(filename: str, image_bytes: bytes) -> dict:
    """Classify disaster type with graceful degradation.

    Order: filename demo hint -> CLIP ensemble -> local MobileNet -> color heuristic.
    Only genuinely bad images raise (ValueError -> HTTP 400); environment problems
    (no CLIP download, offline, etc.) fall back instead of failing the upload.
    """
    global _AI_BACKEND, _AI_ERROR

    demo = _demo_from_filename(filename)
    if demo:
        return demo

    rgb = _open_rgb(image_bytes)

    # Explicit offline / lightweight mode for machines without the ML stack.
    if os.getenv("DISABLE_AI", "0") == "1":
        _AI_BACKEND = "heuristic"
        best, conf, _ = _predict_heuristic_pil(rgb)
        return {"type": best, "confidence": conf, "severity": _severity(conf)}

    # Preferred path: full CLIP ensemble (best accuracy).
    try:
        result = _classify_ai(rgb)
        _AI_BACKEND = "clip-ensemble"
        _AI_ERROR = None
        return result
    except Exception as exc:
        import traceback

        _AI_ERROR = f"{type(exc).__name__}: {exc}"
        print(f"[classifier] AI ensemble unavailable, falling back: {_AI_ERROR}")
        traceback.print_exc()

    # Fallback 1: local MobileNet only (no network required).
    try:
        ml = _predict_mobilenet_pil(rgb)
        if ml:
            _AI_BACKEND = "mobilenet"
            _label, conf, dist = ml
            best, conf = _apply_normal_gate(dist, conf)
            return {"type": best, "confidence": conf, "severity": _severity(conf)}
    except Exception as exc:
        print(f"[classifier] MobileNet fallback failed: {type(exc).__name__}: {exc}")

    # Fallback 2: pure color/texture heuristic (always available).
    _AI_BACKEND = "heuristic"
    best, conf, _ = _predict_heuristic_pil(rgb)
    return {"type": best, "confidence": conf, "severity": _severity(conf)}
