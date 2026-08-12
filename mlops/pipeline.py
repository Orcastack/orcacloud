#!/usr/bin/env python3
"""OrcaCloud's single, reproducible MLOps pipeline entry point."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
import random
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent


def read_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def digest_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def pipeline_id(config: dict[str, Any]) -> str:
    return hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()[:12]


def load_clean_rows(source: Path, label_column: str) -> tuple[list[str], list[dict[str, str]], int]:
    with source.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or label_column not in reader.fieldnames:
            raise ValueError(f"data must contain a '{label_column}' column")
        feature_names = [name for name in reader.fieldnames if name != label_column]
        if not feature_names:
            raise ValueError("data must contain at least one feature column")
        rows: list[dict[str, str]] = []
        rejected = 0
        for row in reader:
            try:
                cleaned = {name: f"{float(row[name]):.12g}" for name in feature_names}
                label = int(float(row[label_column]))
                if label not in (0, 1):
                    raise ValueError("label must be 0 or 1")
                cleaned[label_column] = str(label)
                rows.append(cleaned)
            except (KeyError, TypeError, ValueError):
                rejected += 1
    if len(rows) < 4:
        raise ValueError("need at least four valid binary-labelled rows after validation")
    return feature_names, rows, rejected


def ingest(config: dict[str, Any], root: Path) -> dict[str, Any]:
    source = Path(config["data_source"]).expanduser()
    features, rows, rejected = load_clean_rows(source, config["label_column"])
    canonical = "\n".join(
        ",".join(row[column] for column in [*features, config["label_column"]]) for row in rows
    ) + "\n"
    version = hashlib.sha256(canonical.encode()).hexdigest()
    dataset_dir = root / "storage" / "datasets" / version
    dataset_dir.mkdir(parents=True, exist_ok=True)
    cleaned_data = dataset_dir / "data.csv"
    if not cleaned_data.exists():
        with cleaned_data.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=[*features, config["label_column"]])
            writer.writeheader()
            writer.writerows(rows)
    metadata = {
        "dataset_version": version,
        "source_sha256": digest_file(source),
        "feature_names": features,
        "label_column": config["label_column"],
        "accepted_rows": len(rows),
        "rejected_rows": rejected,
        "pipeline_id": pipeline_id(config),
    }
    write_json(dataset_dir / "metadata.json", metadata)
    return metadata


def sigmoid(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(min(value, 500), -500)))


def train(config: dict[str, Any], root: Path, dataset: dict[str, Any]) -> dict[str, Any]:
    dataset_dir = root / "storage" / "datasets" / dataset["dataset_version"]
    with (dataset_dir / "data.csv").open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    features = dataset["feature_names"]
    labels = [int(row[config["label_column"]]) for row in rows]
    values = [[float(row[name]) for name in features] for row in rows]
    means = [sum(row[index] for row in values) / len(values) for index in range(len(features))]
    scales = [max(math.sqrt(sum((row[index] - means[index]) ** 2 for row in values) / len(values)), 1e-12)
              for index in range(len(features))]
    normalized = [[(row[index] - means[index]) / scales[index] for index in range(len(features))]
                  for row in values]
    indices = list(range(len(rows)))
    random.Random(config["training"]["seed"]).shuffle(indices)
    test_size = max(1, round(len(indices) * config["training"]["test_fraction"]))
    test_indices, train_indices = indices[:test_size], indices[test_size:]
    weights = [0.0] * len(features)
    bias = 0.0
    learning_rate = config["training"]["learning_rate"]
    for _ in range(config["training"]["epochs"]):
        gradient = [0.0] * len(features)
        bias_gradient = 0.0
        for index in train_indices:
            probability = sigmoid(bias + sum(weight * value for weight, value in zip(weights, normalized[index])))
            error = probability - labels[index]
            bias_gradient += error
            for feature_index, value in enumerate(normalized[index]):
                gradient[feature_index] += error * value
        scale = learning_rate / len(train_indices)
        weights = [weight - scale * value for weight, value in zip(weights, gradient)]
        bias -= scale * bias_gradient
    correct = sum(
        int(sigmoid(bias + sum(weight * value for weight, value in zip(weights, normalized[index]))) >= 0.5) == labels[index]
        for index in test_indices
    )
    accuracy = correct / len(test_indices)
    model = {"algorithm": "binary_logistic_regression", "feature_names": features, "means": means,
             "scales": scales, "weights": weights, "bias": bias, "threshold": 0.5}
    artifact_payload = json.dumps(model, sort_keys=True).encode()
    model_sha = hashlib.sha256(artifact_payload).hexdigest()
    artifact_dir = root / "storage" / "artifacts" / model_sha
    artifact_dir.mkdir(parents=True, exist_ok=True)
    (artifact_dir / "model.json").write_bytes(artifact_payload)
    result = {"model_sha256": model_sha, "artifact_path": str(artifact_dir / "model.json"),
              "metrics": {"accuracy": accuracy, "test_samples": len(test_indices), "training_samples": len(train_indices)},
              "feature_statistics": {name: {"mean": means[index], "stddev": scales[index]}
                                     for index, name in enumerate(features)}}
    write_json(artifact_dir / "training-result.json", result)
    return result


def register(config: dict[str, Any], root: Path, dataset: dict[str, Any], training: dict[str, Any]) -> dict[str, Any]:
    minimum = config["registry"]["minimum_accuracy"]
    if training["metrics"]["accuracy"] < minimum:
        raise RuntimeError(f"model accuracy {training['metrics']['accuracy']:.4f} is below promotion threshold {minimum:.4f}")
    version = training["model_sha256"][:12]
    record = {"model_name": config["model_name"], "version": version, "dataset_version": dataset["dataset_version"],
              "artifact_sha256": training["model_sha256"], "artifact_path": training["artifact_path"],
              "metrics": training["metrics"], "feature_statistics": training["feature_statistics"],
              "pipeline_id": pipeline_id(config), "status": "approved"}
    registry_path = root / "storage" / "registry" / config["model_name"] / f"{version}.json"
    write_json(registry_path, record)
    write_json(registry_path.parent / "latest.json", record)
    return record


def deployment_manifest(config: dict[str, Any], registry: dict[str, Any]) -> dict[str, Any]:
    image = config["deployment"]["image"]
    state_claim = config["deployment"]["state_claim"]
    model_path = f"/state/storage/artifacts/{registry['artifact_sha256']}/model.json"
    event_path = f"/state/storage/events/{config['model_name']}/predictions.jsonl"
    return {"apiVersion": "apps/v1", "kind": "Deployment", "metadata": {"name": f"{config['model_name']}-inference", "namespace": config["deployment"]["namespace"], "labels": {"app": config["model_name"], "model-version": registry["version"]}}, "spec": {"replicas": config["deployment"]["replicas"], "selector": {"matchLabels": {"app": config["model_name"]}}, "template": {"metadata": {"labels": {"app": config["model_name"], "model-version": registry["version"]}}, "spec": {"securityContext": {"runAsUser": 10001, "runAsGroup": 10001, "fsGroup": 10001}, "containers": [{"name": "inference", "image": image, "imagePullPolicy": "IfNotPresent", "args": ["--model", model_path, "--events", event_path], "env": [{"name": "MODEL_VERSION", "value": registry["version"]}], "resources": {"requests": {"cpu": "100m", "memory": "128Mi"}, "limits": {"cpu": "1", "memory": "512Mi"}}, "securityContext": {"runAsNonRoot": True, "allowPrivilegeEscalation": False, "readOnlyRootFilesystem": True, "capabilities": {"drop": ["ALL"]}}, "ports": [{"containerPort": 8080}], "livenessProbe": {"httpGet": {"path": "/healthz", "port": 8080}}, "readinessProbe": {"httpGet": {"path": "/readyz", "port": 8080}}, "volumeMounts": [{"name": "state", "mountPath": "/state"}]}], "volumes": [{"name": "state", "persistentVolumeClaim": {"claimName": state_claim}}]}}}}


def deploy(config: dict[str, Any], root: Path, registry: dict[str, Any], apply: bool) -> dict[str, Any]:
    output_dir = root / "generated" / "deployments" / config["model_name"] / registry["version"]
    output_dir.mkdir(parents=True, exist_ok=True)
    (root / "storage" / "events" / config["model_name"]).mkdir(parents=True, exist_ok=True)
    manifest = output_dir / "model-deployment.json"
    manifest.write_text(json.dumps(deployment_manifest(config, registry), indent=2) + "\n", encoding="utf-8")
    if apply:
        subprocess.run(["kubectl", "apply", "-f", str(manifest)], check=True)
    return {"manifest": str(manifest), "applied": apply, "model_version": registry["version"]}


def monitor(config: dict[str, Any], root: Path, registry: dict[str, Any]) -> dict[str, Any]:
    events = root / "storage" / "events" / config["model_name"] / "predictions.jsonl"
    observations: list[dict[str, Any]] = []
    if events.exists():
        observations = [json.loads(line) for line in events.read_text(encoding="utf-8").splitlines() if line.strip()]
    latencies = [float(item["latency_ms"]) for item in observations if "latency_ms" in item]
    failures = sum(1 for item in observations if item.get("status") == "error")
    accuracy_rows = [item for item in observations if "actual" in item and "prediction" in item]
    accuracy = sum(int(item["actual"] == item["prediction"]) for item in accuracy_rows) / len(accuracy_rows) if accuracy_rows else None
    drift = 0.0
    for feature, stats in registry["feature_statistics"].items():
        values = [float(item["features"][feature]) for item in observations if item.get("features", {}).get(feature) is not None]
        if values:
            drift = max(drift, abs((sum(values) / len(values) - stats["mean"]) / max(stats["stddev"], 1e-12)) )
    latency_p95 = sorted(latencies)[max(0, math.ceil(len(latencies) * .95) - 1)] if latencies else 0.0
    thresholds = config["monitoring"]
    alerts = []
    if accuracy is not None and accuracy < thresholds["minimum_accuracy"]:
        alerts.append("accuracy_degraded")
    if latency_p95 > thresholds["maximum_p95_latency_ms"]:
        alerts.append("latency_degraded")
    if drift > thresholds["maximum_feature_drift_zscore"]:
        alerts.append("feature_drift")
    if failures > thresholds["maximum_failures"]:
        alerts.append("inference_failures")
    report = {"model_version": registry["version"], "observations": len(observations), "accuracy": accuracy,
              "p95_latency_ms": latency_p95, "failures": failures, "max_feature_drift_zscore": drift, "alerts": alerts}
    write_json(root / "storage" / "monitoring" / config["model_name"] / "latest.json", report)
    if alerts:
        write_json(root / "storage" / "triggers" / config["model_name"] / "retrain.json", report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=ROOT / "pipeline-config.json")
    parser.add_argument("--apply", action="store_true", help="Apply the generated deployment manifest with kubectl")
    parser.add_argument("--monitor-only", action="store_true")
    parser.add_argument("--retrain-if-needed", action="store_true")
    args = parser.parse_args()
    config = read_json(args.config)
    if not Path(config["data_source"]).is_absolute():
        config["data_source"] = str((args.config.parent / config["data_source"]).resolve())
    config["deployment"]["image"] = os.environ.get(
        "MLOPS_INFERENCE_IMAGE", config["deployment"]["image"]
    )
    root = Path(os.environ.get("MLOPS_STATE_ROOT", config.get("state_root", ROOT / ".state"))).expanduser()
    if args.monitor_only:
        registry = read_json(root / "storage" / "registry" / config["model_name"] / "latest.json")
        monitoring = monitor(config, root, registry)
        result = {"monitoring": monitoring}
        if args.retrain_if_needed and monitoring["alerts"]:
            dataset = ingest(config, root)
            training = train(config, root, dataset)
            refreshed_registry = register(config, root, dataset, training)
            result["retraining"] = {"dataset": dataset, "training": training, "registry": refreshed_registry,
                                    "deployment": deploy(config, root, refreshed_registry, args.apply)}
    else:
        dataset = ingest(config, root)
        training = train(config, root, dataset)
        registry = register(config, root, dataset, training)
        result = {"dataset": dataset, "training": training, "registry": registry,
                  "deployment": deploy(config, root, registry, args.apply), "monitoring": monitor(config, root, registry)}
    write_json(root / "runs" / f"{int(time.time())}-{pipeline_id(config)}.json", result)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"pipeline failed: {error}", file=sys.stderr)
        raise SystemExit(1)
