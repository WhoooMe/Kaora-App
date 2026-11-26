from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torchvision.models import MobileNet_V3_Small_Weights, mobilenet_v3_small

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
from app.cocoa_verifier import CLASS_TO_IDX, IMAGE_SIZE, IMAGENET_MEAN, IMAGENET_STD


def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def make_model(pretrained: bool) -> nn.Module:
    weights = MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
    model = mobilenet_v3_small(weights=weights)
    model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, 2)
    return model


def create_loaders(data_dir: Path, batch_size: int, num_workers: int):
    train_tf = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.78, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.ColorJitter(brightness=0.18, contrast=0.18, saturation=0.18, hue=0.04),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])
    eval_tf = transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])

    datasets_by_split = {
        "train": datasets.ImageFolder(data_dir / "train", transform=train_tf),
        "val": datasets.ImageFolder(data_dir / "val", transform=eval_tf),
        "test": datasets.ImageFolder(data_dir / "test", transform=eval_tf),
    }
    for split, dataset in datasets_by_split.items():
        if dataset.class_to_idx != CLASS_TO_IDX:
            raise ValueError(
                f"Folder kelas pada split {split} harus persis {list(CLASS_TO_IDX)}; "
                f"mapping ditemukan: {dataset.class_to_idx}"
            )
        if len(dataset) == 0:
            raise ValueError(f"Dataset {split} kosong.")

    loaders = {
        "train": DataLoader(datasets_by_split["train"], batch_size=batch_size, shuffle=True,
                            num_workers=num_workers, pin_memory=torch.cuda.is_available()),
        "val": DataLoader(datasets_by_split["val"], batch_size=batch_size, shuffle=False,
                          num_workers=num_workers, pin_memory=torch.cuda.is_available()),
        "test": DataLoader(datasets_by_split["test"], batch_size=batch_size, shuffle=False,
                           num_workers=num_workers, pin_memory=torch.cuda.is_available()),
    }
    return datasets_by_split, loaders


def run_epoch(model, loader, criterion, device, optimizer=None):
    train_mode = optimizer is not None
    model.train(train_mode)
    total_loss = 0.0
    total = 0
    y_true, y_pred = [], []
    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        if train_mode:
            optimizer.zero_grad(set_to_none=True)
        with torch.set_grad_enabled(train_mode):
            logits = model(images)
            loss = criterion(logits, labels)
            if train_mode:
                loss.backward()
                optimizer.step()
        batch_size = labels.size(0)
        total_loss += float(loss.item()) * batch_size
        total += batch_size
        y_true.extend(labels.detach().cpu().tolist())
        y_pred.extend(logits.argmax(dim=1).detach().cpu().tolist())
    return {
        "loss": total_loss / max(total, 1),
        "accuracy": float(np.mean(np.asarray(y_true) == np.asarray(y_pred))),
        "macro_f1": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "y_true": y_true,
        "y_pred": y_pred,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Train binary Cocoa / Non-Cocoa verifier.")
    parser.add_argument("--data-dir", type=Path, default=PROJECT_ROOT / "data" / "cocoa_verifier")
    parser.add_argument("--output", type=Path, default=PROJECT_ROOT / "models" / "cocoa_verifier_mobilenet_v3_small.pth")
    parser.add_argument("--epochs", type=int, default=25)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--patience", type=int, default=6)
    parser.add_argument("--threshold", type=float, default=0.70)
    parser.add_argument("--num-workers", type=int, default=2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--no-pretrained", action="store_true", help="Do not initialize from ImageNet weights.")
    args = parser.parse_args()

    if args.epochs < 1 or args.batch_size < 1 or not 0.5 <= args.threshold < 1.0:
        parser.error("epochs/batch-size harus positif dan threshold harus [0.5, 1.0).")
    seed_everything(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    datasets_by_split, loaders = create_loaders(args.data_dir, args.batch_size, args.num_workers)

    model = make_model(pretrained=not args.no_pretrained).to(device)
    counts = np.bincount(datasets_by_split["train"].targets, minlength=2).astype(np.float32)
    class_weights = counts.sum() / (2.0 * np.maximum(counts, 1.0))
    criterion = nn.CrossEntropyLoss(weight=torch.tensor(class_weights, dtype=torch.float32, device=device))
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="max", factor=0.5, patience=2)

    best_f1 = -1.0
    best_epoch = 0
    stale_epochs = 0
    args.output.parent.mkdir(parents=True, exist_ok=True)

    for epoch in range(1, args.epochs + 1):
        train_metrics = run_epoch(model, loaders["train"], criterion, device, optimizer)
        val_metrics = run_epoch(model, loaders["val"], criterion, device)
        scheduler.step(val_metrics["macro_f1"])
        print(
            f"Epoch {epoch:02d}/{args.epochs} | "
            f"train loss={train_metrics['loss']:.4f} acc={train_metrics['accuracy']:.4f} | "
            f"val loss={val_metrics['loss']:.4f} acc={val_metrics['accuracy']:.4f} "
            f"macro_f1={val_metrics['macro_f1']:.4f}"
        )

        if val_metrics["macro_f1"] > best_f1:
            best_f1 = val_metrics["macro_f1"]
            best_epoch = epoch
            stale_epochs = 0
            torch.save({
                "model_arch": "mobilenet_v3_small",
                "model_state_dict": model.state_dict(),
                "class_to_idx": CLASS_TO_IDX,
                "image_size": IMAGE_SIZE,
                "mean": IMAGENET_MEAN,
                "std": IMAGENET_STD,
                "threshold": args.threshold,
                "model_version": "cocoa-verifier-mobilenetv3-small-v1",
                "best_epoch": best_epoch,
                "best_val_macro_f1": best_f1,
                "class_counts_train": {"cocoa": int(counts[0]), "non_cocoa": int(counts[1])},
            }, args.output)
        else:
            stale_epochs += 1
            if stale_epochs >= args.patience:
                print(f"Early stopping pada epoch {epoch}.")
                break

    checkpoint = torch.load(args.output, map_location=device, weights_only=True)
    model.load_state_dict(checkpoint["model_state_dict"])
    test_metrics = run_epoch(model, loaders["test"], criterion, device)
    report = classification_report(
        test_metrics["y_true"], test_metrics["y_pred"],
        labels=[0, 1], target_names=["cocoa", "non_cocoa"], output_dict=True, zero_division=0
    )
    cm = confusion_matrix(test_metrics["y_true"], test_metrics["y_pred"], labels=[0, 1]).tolist()
    summary = {
        "best_epoch": best_epoch,
        "best_validation_macro_f1": best_f1,
        "test_loss": test_metrics["loss"],
        "test_accuracy": test_metrics["accuracy"],
        "test_macro_f1": test_metrics["macro_f1"],
        "confusion_matrix_labels": ["cocoa", "non_cocoa"],
        "confusion_matrix": cm,
        "classification_report": report,
        "checkpoint": str(args.output),
        "device": str(device),
    }
    print("\nTEST SUMMARY\n" + json.dumps(summary, indent=2))
    (args.output.parent / "cocoa_verifier_metrics.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
