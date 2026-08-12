#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."
exec python3 mlops/pipeline.py --config mlops/pipeline-config.json "$@"
