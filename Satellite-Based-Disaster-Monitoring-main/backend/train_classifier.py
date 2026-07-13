"""
Train disaster classifier from images in DISASTER_DATASET_DIR (flat or class folders).

Usage (run once after adding/updating dataset images):
  cd backend
  python train_classifier.py

Labels flat folders with CLIP, copies into dataset/, fine-tunes MobileNetV2, saves model.
"""

from __future__ import annotations

import json
import os
import random
import shutil
from pathlib import Path

from collections import Counter

import torch
import torch.nn as nn
from PIL import Image
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler, random_split
from torchvision import models, transforms

ROOT = Path(__file__).resolve().parent
DEFAULT_SOURCE = Path(r"C:\Users\bv793\Downloads\images")
DATASET_DIR = ROOT / "dataset"
MODEL_DIR = ROOT / "models"
MODEL_PATH = MODEL_DIR / "disaster_model.pt"
META_PATH = MODEL_DIR / "model_meta.json"
INDEX_PATH = MODEL_DIR / "clip_index.pt"

CLASSES = ("Flood", "Fire", "Cyclone", "Normal")
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

from services.classifier import CLIP_PROMPTS, build_clip_index_from_dataset, _clip_class_scores

MIN_PER_CLASS = 12
NORMAL_TARGET = 15


def source_dir() -> Path:
    raw = os.getenv("DISASTER_DATASET_DIR", "").strip()
    return Path(raw) if raw else DEFAULT_SOURCE


def _list_images(folder: Path) -> list[Path]:
    return sorted(
        p for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in _IMAGE_EXTS
    )


def _has_class_folders(folder: Path) -> bool:
    return any((folder / name.lower()).is_dir() for name in CLASSES)


def _clip_label(image_path: Path) -> tuple[str, float]:
    scores = _clip_class_scores(image_path.read_bytes())
    best = max(scores, key=scores.get)
    second = sorted(scores.values(), reverse=True)[1]
    margin = scores[best] - second
    # Uncertain images → Normal (reduces false disaster alerts).
    if margin < 0.04 and scores.get("Normal", 0) >= scores.get(best, 0) - 0.02:
        return "Normal", round(scores["Normal"] * 100, 1)
    return best, round(scores[best] * 100, 1)


def _supplement_normal_images(source: Path) -> int:
    """Find extra normal-looking images from source to balance the dataset."""
    normal_dir = DATASET_DIR / "normal"
    normal_dir.mkdir(parents=True, exist_ok=True)
    current = len(_list_images(normal_dir))
    if current >= NORMAL_TARGET:
        return 0

    candidates: list[tuple[float, Path]] = []
    for img in _list_images(source):
        try:
            scores = _clip_class_scores(img.read_bytes())
            normal_score = scores.get("Normal", 0.0)
            disaster_max = max(scores.get(c, 0.0) for c in ("Flood", "Fire", "Cyclone"))
            if normal_score >= disaster_max + 0.03:
                candidates.append((normal_score, img))
        except Exception:
            continue

    candidates.sort(reverse=True, key=lambda x: x[0])
    added = 0
    for score, img in candidates:
        if current + added >= NORMAL_TARGET:
            break
        dest = normal_dir / f"normal_boost_{added}_{img.name}"
        if not dest.exists():
            shutil.copy2(img, dest)
            added += 1
            print(f"  + normal boost: {img.name} (score={score:.2f})")
    return added


def prepare_dataset(source: Path) -> dict[str, int]:
    if _has_class_folders(source):
        counts: dict[str, int] = {k: 0 for k in CLASSES}
        for klass in CLASSES:
            src = source / klass.lower()
            dst = DATASET_DIR / klass.lower()
            dst.mkdir(parents=True, exist_ok=True)
            for img in _list_images(src):
                shutil.copy2(img, dst / img.name)
                counts[klass] += 1
        boosted = _supplement_normal_images(source)
        counts["Normal"] += boosted
        return counts

    print("Flat folder detected — auto-labeling with CLIP...")
    for klass in CLASSES:
        (DATASET_DIR / klass.lower()).mkdir(parents=True, exist_ok=True)

    counts = {k: 0 for k in CLASSES}
    images = _list_images(source)
    if not images:
        raise SystemExit(f"No images found in {source}")

    for i, img in enumerate(images, 1):
        try:
            label, _ = _clip_label(img)
            dest = DATASET_DIR / label.lower() / f"{img.stem}_{i}{img.suffix.lower()}"
            shutil.copy2(img, dest)
            counts[label] += 1
            print(f"  [{i}/{len(images)}] {img.name} -> {label}")
        except Exception as exc:
            print(f"  skip {img.name}: {exc}")

    boosted = _supplement_normal_images(source)
    if boosted:
        counts["Normal"] += boosted
    return counts


class DisasterDataset(Dataset):
    def __init__(self, root: Path, transform):
        self.items: list[tuple[Path, int]] = []
        self.transform = transform
        for idx, klass in enumerate(CLASSES):
            folder = root / klass.lower()
            if not folder.exists():
                continue
            for img in _list_images(folder):
                self.items.append((img, idx))

    def __len__(self):
        return len(self.items)

    def __getitem__(self, i):
        path, label = self.items[i]
        return self.transform(Image.open(path).convert("RGB")), label


def train_model() -> None:
    transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(12),
        transforms.ColorJitter(0.15, 0.15, 0.15, 0.05),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    eval_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    full_eval = DisasterDataset(DATASET_DIR, eval_transform)
    if len(full_eval) < 8:
        raise SystemExit(f"Need at least 8 labeled images, found {len(full_eval)}")

    full_class_counts = {CLASSES[i]: 0 for i in range(len(CLASSES))}
    for _, label_idx in full_eval.items:
        full_class_counts[CLASSES[label_idx]] += 1

    val_size = max(2, int(len(full_eval) * 0.2))
    train_size = len(full_eval) - val_size
    train_ds, val_ds = random_split(
        full_eval,
        [train_size, val_size],
        generator=torch.Generator().manual_seed(42),
    )

    train_with_aug = DisasterDataset(DATASET_DIR, transform)
    train_ds = torch.utils.data.Subset(train_with_aug, train_ds.indices)

    # Balanced sampling so Normal is not ignored.
    labels = [train_with_aug.items[i][1] for i in train_ds.indices]
    counts = Counter(labels)
    sample_weights = [1.0 / counts[label] for label in labels]
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)

    train_loader = DataLoader(train_ds, batch_size=8, sampler=sampler)
    val_loader = DataLoader(val_ds, batch_size=8)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, len(CLASSES))
    model = model.to(device)

    # Penalize missing the minority class (especially Normal).
    total = sum(counts.values())
    class_weights = torch.tensor(
        [total / (len(CLASSES) * max(1, counts[i])) for i in range(len(CLASSES))],
        dtype=torch.float32,
        device=device,
    )
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = torch.optim.Adam(model.parameters(), lr=8e-5)

    best_acc = 0.0
    for epoch in range(1, 21):
        model.train()
        train_loss = 0.0
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            loss = criterion(model(x), y)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        model.eval()
        correct = total = 0
        with torch.no_grad():
            for x, y in val_loader:
                x, y = x.to(device), y.to(device)
                pred = model(x).argmax(1)
                correct += (pred == y).sum().item()
                total += y.size(0)
        acc = correct / max(1, total)
        print(f"Epoch {epoch:02d}  loss={train_loss / max(1, len(train_loader)):.4f}  val_acc={acc:.2%}")
        if acc >= best_acc:
            best_acc = acc
            MODEL_DIR.mkdir(parents=True, exist_ok=True)
            torch.save({"state_dict": model.state_dict(), "classes": list(CLASSES)}, MODEL_PATH)
            META_PATH.write_text(
                json.dumps(
                    {
                        "val_accuracy": acc,
                        "num_images": len(full_eval),
                        "class_counts": full_class_counts,
                    },
                    indent=2,
                )
            )

    print(f"\nSaved model to {MODEL_PATH}  (best val acc: {best_acc:.2%})")


def main() -> None:
    source = source_dir()
    if not source.exists():
        raise SystemExit(f"Dataset folder not found: {source}")

    print(f"Source: {source}")
    if DATASET_DIR.exists():
        shutil.rmtree(DATASET_DIR)
    counts = prepare_dataset(source)
    print("Dataset counts:", counts)

    # Boost normal class if still underrepresented.
    extra = _supplement_normal_images(source)
    if extra:
        counts["Normal"] = counts.get("Normal", 0) + extra
        print(f"Added {extra} normal images. New Normal count: {counts['Normal']}")

    train_model()

    print("\nBuilding CLIP embedding index for k-NN retrieval...")
    indexed = build_clip_index_from_dataset(DATASET_DIR)
    print(f"CLIP index size: {indexed} embeddings -> {INDEX_PATH}")


if __name__ == "__main__":
    main()
