#!/bin/bash
# OrcaCloud Backend Startup Script
set -e

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BACKEND_DIR"

echo "=== OrcaCloud Backend ==="

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 not found. Please install Python 3.10+"
  exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  echo "[1/4] Creating Python virtual environment..."
  python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies
echo "[2/4] Installing dependencies..."
pip install -q -r requirements.txt

# Run migrations
echo "[3/4] Running database migrations..."
python manage.py migrate --noinput

# Create default superuser if none exists
python manage.py shell -c "
from django.contrib.auth.models import User
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@orcacloud.com', 'admin123')
    print('Created superuser: admin / admin123')
else:
    print('Superuser already exists')
" 2>/dev/null || true

echo "[4/4] Starting backend on http://localhost:8000 ..."
echo ""
echo "  API Health:  http://localhost:8000/api/health/"
echo "  Admin Panel: http://localhost:8000/admin/"
echo "  Login API:   POST http://localhost:8000/api/auth/login/"
echo ""
echo "  Default credentials: admin / admin123"
echo ""

exec gunicorn orcacloud.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 3 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
