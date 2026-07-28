#!/bin/bash
set -e

echo "Starting OrcaCloud..."
echo "Environment: ${ENVIRONMENT:-development}"

# Configure nginx based on environment
if [ "${ENVIRONMENT}" = "production" ]; then
    echo "Setting up production nginx configuration..."
    ln -sf /etc/nginx/sites-available/production /etc/nginx/sites-enabled/default
    
    # Verify SSL certificates exist
    if [ ! -f "/etc/ssl/certs/orcacloud.com.crt" ] || [ ! -f "/etc/ssl/private/orcacloud.com.key" ]; then
        echo "WARNING: Production SSL certificates not found. Nginx may not start properly."
        echo "Please ensure SSL certificates are mounted in the container."
    fi
else
    echo "Setting up development nginx configuration..."
    ln -sf /etc/nginx/sites-available/development /etc/nginx/sites-enabled/default
fi

# Wait for database to be ready (only if not using SQLite)
if [[ "${DATABASE_URL}" != *"sqlite"* ]]; then
  echo "Waiting for database..."
  while ! nc -z ${DATABASE_HOST:-db} ${DATABASE_PORT:-5432}; do
    sleep 1
  done
  echo "Database is ready!"
else
  echo "Using SQLite database - no wait needed"
fi

# Wait for Redis to be ready (only if Redis host is set)
if [ ! -z "$REDIS_HOST" ]; then
  echo "Waiting for Redis..."
  while ! nc -z ${REDIS_HOST} ${REDIS_PORT:-6379}; do
    sleep 1
  done
  echo "Redis is ready!"
else
  echo "Redis not configured - skipping Redis wait"
fi

# Wait for Zookeeper to be ready (optional)
if [ ! -z "$ZOOKEEPER_HOSTS" ]; then
  echo "Waiting for Zookeeper..."
  ZOOKEEPER_HOST=$(echo $ZOOKEEPER_HOSTS | cut -d':' -f1)
  ZOOKEEPER_PORT=$(echo $ZOOKEEPER_HOSTS | cut -d':' -f2)
  while ! nc -z ${ZOOKEEPER_HOST} ${ZOOKEEPER_PORT:-2181}; do
    sleep 1
  done
  echo "Zookeeper is ready!"
fi

# Wait for Kafka to be ready (optional)
if [ ! -z "$KAFKA_BOOTSTRAP_SERVERS" ]; then
  echo "Waiting for Kafka..."
  KAFKA_HOST=$(echo $KAFKA_BOOTSTRAP_SERVERS | cut -d':' -f1)
  KAFKA_PORT=$(echo $KAFKA_BOOTSTRAP_SERVERS | cut -d':' -f2)
  while ! nc -z ${KAFKA_HOST} ${KAFKA_PORT:-9092}; do
    sleep 1
  done
  echo "Kafka is ready!"
fi

# Create required directories
mkdir -p /app/logs /app/static /app/media /app/staticfiles

# Set proper permissions
chown -R app:app /app/logs /app/static /app/media /app/staticfiles

echo "Starting supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf