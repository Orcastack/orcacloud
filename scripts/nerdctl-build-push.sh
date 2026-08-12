# Make script executable by default when created
if [ -w . ]; then
  chmod +x "$0" 2>/dev/null || true
fi

#!/usr/bin/env bash
# scripts/nerdctl-build-push.sh
# Build production images with nerdctl (containerd) and push them to a registry.
# Usage:
#   REGISTRY=registry.example.com NAMESPACE=team PROJECT=orcacloud TAG=ci-1234 ./scripts/nerdctl-build-push.sh
# If TAG is not provided the script uses `git rev-parse --short HEAD` as the tag.

set -euo pipefail
cd "$(dirname "$0")/.." || exit 1

REGISTRY=${REGISTRY:-}
NAMESPACE=${NAMESPACE:-orcacloud}
PROJECT=${PROJECT:-orcacloud}
TAG=${TAG:-}
START=${START:-0}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.yml}
NERDCTL_COMPOSE=${NERDCTL_COMPOSE:-0}

if [ -z "$REGISTRY" ]; then
  echo "ERROR: REGISTRY not set. Example: REGISTRY=registry.example.com"
  exit 2
fi

if [ -z "$TAG" ]; then
  if command -v git >/dev/null 2>&1; then
    TAG=$(git rev-parse --short HEAD || echo "local")
  else
    TAG="local"
  fi
fi

echo "Building images with nerdctl"
echo "Registry: $REGISTRY  Namespace: $NAMESPACE  Project: $PROJECT  Tag: $TAG"

# Helper: build and push
build_and_push() {
  local name="$1"; shift
  local dockerfile_path="$1"; shift
  local context_dir="$1"; shift

  local image="$REGISTRY/$NAMESPACE/$PROJECT-$name:$TAG"
  echo "\n--- Building $name -> $image (Dockerfile: $dockerfile_path)" 

  # Build the image
  nerdctl build -t "$image" -f "$dockerfile_path" "$context_dir"

  # Push the image
  nerdctl push "$image"
  echo "Pushed $image"
}

# Build backend
build_and_push backend backend/Dockerfile backend

# Build frontend (production build using frontend/Dockerfile)
build_and_push frontend frontend/Dockerfile frontend

# Build nginx (our custom image that copies nginx config)
build_and_push nginx docker/nginx/Dockerfile docker/nginx

# Print summary
echo "\nAll images pushed with tag: $TAG"

echo "Images:\n- $REGISTRY/$NAMESPACE/$PROJECT-backend:$TAG\n- $REGISTRY/$NAMESPACE/$PROJECT-frontend:$TAG\n- $REGISTRY/$NAMESPACE/$PROJECT-nginx:$TAG"

# Optionally print how to deploy: update docker-compose env or service image tags.
cat <<EOF
Next steps (examples):

# 1) Update your production compose or Kubernetes manifests to use these images.
#    In compose you can set environment variables or replace the image fields.
#    Example for docker-compose (production): set environment variables and run:
#      export REGISTRY=$REGISTRY
#      export TAG=$TAG
#      # edit or templatize your docker-compose to use ${REGISTRY}/${NAMESPACE}/${PROJECT}-backend:${TAG}

# 2) For Kubernetes, update your Deployments to use the pushed image tags and `kubectl apply`.
EOF

if [ "$START" = "1" ] || [ "$START" = "true" ]; then
  echo "\nSTART requested: bringing up platform using images we just pushed..."

  OVERRIDE_FILE=$(mktemp /tmp/compose.override.XXXX.yml)
  cat > "$OVERRIDE_FILE" <<YAML
version: '3.8'
services:
  backend:
    image: ${REGISTRY}/${NAMESPACE}/${PROJECT}-backend:${TAG}
  frontend:
    image: ${REGISTRY}/${NAMESPACE}/${PROJECT}-frontend:${TAG}
  nginx:
    image: ${REGISTRY}/${NAMESPACE}/${PROJECT}-nginx:${TAG}
YAML

  echo "Using override file: $OVERRIDE_FILE"

  if [ "$NERDCTL_COMPOSE" = "1" ] || command -v nerdctl >/dev/null 2>&1 && [ "$NERDCTL_COMPOSE" != "0" ]; then
    echo "Starting with nerdctl compose: nerdctl compose -f $COMPOSE_FILE -f $OVERRIDE_FILE up -d --no-build"
    nerdctl compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" up -d --no-build
  else
    echo "Starting with docker compose: docker compose -f $COMPOSE_FILE -f $OVERRIDE_FILE up -d --no-build"
    docker compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" up -d --no-build
  fi

  echo "Platform started (compose files: $COMPOSE_FILE + override). Removing override file."
  rm -f "$OVERRIDE_FILE"
fi
