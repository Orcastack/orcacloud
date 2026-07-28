#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-$(pwd)}"
OUT_FILE="${2:-}"

if [[ ! -d "$ROOT_DIR" ]]; then
  echo "Root directory not found: $ROOT_DIR" >&2
  exit 1
fi

# Tokens to audit for potential legacy branding.
PATTERN='atonix|Atonix|ATONIX|OrcaCloud-Platform|orcacloud-platform'

# Exclude generated or external content to reduce noise.
EXCLUDE_DIRS=(
  ".git"
  "node_modules"
  ".terraform"
  "dist"
  "build"
  "vendor"
  "__pycache__"
)

EXCLUDE_FILES=(
  "LEGACY_NAME_AUDIT.txt"
  "*.tfstate"
  "*.tfstate.backup"
  "*.png"
  "*.jpg"
  "*.jpeg"
  "*.gif"
  "*.webp"
  "*.pdf"
  "*.gpg"
  "*.tar.gz"
  "*.lock"
)

GREP_ARGS=("-RInE" "$PATTERN")
for d in "${EXCLUDE_DIRS[@]}"; do
  GREP_ARGS+=("--exclude-dir=$d")
done
for f in "${EXCLUDE_FILES[@]}"; do
  GREP_ARGS+=("--exclude=$f")
done

pushd "$ROOT_DIR" >/dev/null

RESULTS_FILE="$(mktemp)"
if grep "${GREP_ARGS[@]}" . >"$RESULTS_FILE" 2>/dev/null; then
  :
else
  echo "No potential legacy-name matches found."
  rm -f "$RESULTS_FILE"
  popd >/dev/null
  exit 0
fi

{
  echo "=== Legacy Name Audit ==="
  echo "Root: $ROOT_DIR"
  echo
  echo "Top directories by match count:"
  awk -F: '{file=$1; sub(/^\.\//, "", file); split(file, a, "/"); top=a[1]; if(top=="") top="(root)"; c[top]++} END{for(k in c) printf("%5d  %s\n", c[k], k)}' "$RESULTS_FILE" | sort -nr
  echo
  echo "Sample matches (first 200):"
  head -n 200 "$RESULTS_FILE"
} | if [[ -n "$OUT_FILE" ]]; then
  tee "$OUT_FILE"
else
  cat
fi

rm -f "$RESULTS_FILE"
popd >/dev/null
