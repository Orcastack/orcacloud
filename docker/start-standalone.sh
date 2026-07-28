#!/bin/bash
set -e

echo "Starting OrcaCloud in standalone mode..."

# Create required directories
mkdir -p /app/logs /app/static /app/media

# Copy nginx configuration
cp /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# Set proper permissions
chown -R app:app /app/logs /app/static /app/media

# Use SQLite instead of PostgreSQL for standalone mode
export DATABASE_URL="sqlite:///app/db.sqlite3"
export REDIS_URL="redis://127.0.0.1:6379"

# Create minimal Django settings for standalone mode
export DJANGO_SETTINGS_MODULE="orcacloud.settings"

echo "Starting supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf