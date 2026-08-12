# OrcaCloud MLOps

`scripts/run-mlops.sh` is the only workflow command. It performs ingestion, data validation and content-addressed versioning, deterministic training, metric gating, immutable model registration, deployment-manifest creation, and monitoring evaluation in that order.

Run it locally without a cluster:

```sh
scripts/run-mlops.sh
```

Use `--apply` only with a valid `kubectl` context. The pipeline stores all local state under `mlops/.state`; production should mount the `mlops-state` PVC on durable OrcaCloud storage and set `MLOPS_STATE_ROOT=/state`. Set `MLOPS_INFERENCE_IMAGE` in CI to deploy the code version that built the model.

The inference service accepts `POST /predict` with `{"features": {"tenure_months": 8, "monthly_usage": 20}}`. It writes request outcomes to the mounted event log. `scripts/run-mlops.sh --monitor-only` calculates accuracy, p95 latency, failures, and feature drift, then writes a retraining trigger under `storage/triggers/` when a configured threshold is exceeded. The Argo monitor schedule invokes the same command with `--retrain-if-needed` every fifteen minutes; the CI workflow runs the complete deployment path on relevant source or data changes.

Before applying Argo resources, create the `mlops` namespace, a durable `mlops-state` PVC, and an `mlops-pipeline` service account with Deployment permissions in that namespace. The same claim is mounted read/write by inference pods so versioned artifacts and prediction events persist. Add `monitoring/prometheus/mlops_alerts.yml` to Prometheus `rule_files` alongside the existing alert files.
