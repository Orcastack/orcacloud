#!/bin/bash

# OrcaCloud - Quick Build Core Containers
# This script quickly builds and starts just the core containers (db, redis, backend, frontend)

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_status "Building and starting core OrcaCloud containers..."

# Clean up
print_status "Cleaning up existing containers..."
docker compose -f docker-compose.all-in-one.yml down --remove-orphans 2>/dev/null || true

# Build core services
print_status "Building core containers..."
docker compose -f docker-compose.all-in-one.yml build backend frontend

# Start core services
print_status "Starting core services (db, redis, backend, frontend)..."
docker compose -f docker-compose.all-in-one.yml up -d db redis backend frontend

print_success "Core containers started!"

# Wait a moment and show status
sleep 5
print_status "Container status:"
docker compose -f docker-compose.all-in-one.yml ps

echo ""
print_success "Core platform is starting up!"
echo "[FRONTEND] Frontend: http://localhost:3000"
echo "[API] Backend API: http://localhost:8000/api/"
echo ""
echo "Use 'docker compose -f docker-compose.all-in-one.yml logs -f' to watch logs"