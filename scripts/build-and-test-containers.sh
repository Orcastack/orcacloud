#!/bin/bash

# OrcaCloud - Container Build and Test Script
# This script builds all containers and tests that they are working properly

set -e  # Exit on any error

# Colors for output
REDecho "[PLATFORM] Frontend (React):           http://localhost:3000"
echo "[API] Backend API:                http://localhost:8000/api/"
echo "[DOCS] API Documentation:          http://localhost:8000/api/docs/"
echo "[DB] API Admin:                 http://localhost:8000/admin/"
echo "[EMAIL] Email UI (MailHog):         http://localhost:8025"
echo "[MQ] RabbitMQ Management:        http://localhost:15672 (admin/rabbitmq_password)"
echo "[DB] PostgreSQL:                localhost:5432 (orcacloud_user/orcacloud_password)"
echo "[CACHE] Redis:                      localhost:6379 (password: redis_password)";31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a service is healthy
wait_for_service() {
    local service_name=$1
    local max_attempts=60
    local attempt=1
    
    print_status "Waiting for $service_name to be healthy..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker compose -f docker-compose.all-in-one.yml ps --format json | jq -r '.[] | select(.Service=="'$service_name'") | .Health' | grep -q "healthy"; then
            print_success "$service_name is healthy!"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts: $service_name is not ready yet..."
        sleep 5
        ((attempt++))
    done
    
    print_error "$service_name failed to become healthy within timeout"
    return 1
}

# Function to test service endpoint
test_endpoint() {
    local url=$1
    local service_name=$2
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            print_success "$service_name endpoint ($url) is responding"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts: Testing $service_name endpoint..."
        sleep 3
        ((attempt++))
    done
    
    print_error "$service_name endpoint ($url) is not responding"
    return 1
}

# Main script
print_status "Starting OrcaCloud Container Build and Test"
echo "=================================================================="

# 1. Clean up any existing containers
print_status "Cleaning up existing containers..."
docker compose -f docker-compose.all-in-one.yml down -v --remove-orphans 2>/dev/null || true

# 2. Build all containers
print_status "Building all containers..."
docker compose -f docker-compose.all-in-one.yml build --no-cache

print_success "All containers built successfully!"

# 3. Start core services (db, redis, backend, frontend)
print_status "Starting core services..."
docker compose -f docker-compose.all-in-one.yml up -d db redis

# Wait for database and redis
wait_for_service "db"
wait_for_service "redis"

# Start backend
print_status "Starting backend service..."
docker compose -f docker-compose.all-in-one.yml up -d backend

# Wait for backend
wait_for_service "backend"

# Start frontend
print_status "Starting frontend service..."
docker compose -f docker-compose.all-in-one.yml up -d frontend

# 4. Test core services
print_status "Testing core services..."

# Test database
print_status "Testing PostgreSQL database..."
if docker compose -f docker-compose.all-in-one.yml exec -T db psql -U orcacloud_user -d orcacloud -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "PostgreSQL database is working"
else
    print_error "PostgreSQL database test failed"
    exit 1
fi

# Test Redis
print_status "Testing Redis cache..."
if docker compose -f docker-compose.all-in-one.yml exec -T redis redis-cli -a redis_password ping | grep -q "PONG"; then
    print_success "Redis cache is working"
else
    print_error "Redis cache test failed"
    exit 1
fi

# Test backend API
print_status "Testing backend API..."
sleep 10  # Give backend a moment to fully start
test_endpoint "http://localhost:8000/api/health/" "Backend API"

# Test specific API endpoints
print_status "Testing API endpoints..."
test_endpoint "http://localhost:8000/api/" "API Root"
test_endpoint "http://localhost:8000/api/projects/" "Projects API"

# Test frontend
print_status "Testing frontend..."
sleep 15  # Give frontend time to compile
test_endpoint "http://localhost:3000" "Frontend"

# 5. Optional services test
print_status "Testing optional services..."

# Test with email service (MailHog)
print_status "Starting email service (MailHog)..."
docker compose -f docker-compose.all-in-one.yml --profile email up -d mailhog
sleep 10
test_endpoint "http://localhost:8025" "MailHog Email Service"

# Test with messaging services
print_status "Starting messaging services..."
docker compose -f docker-compose.all-in-one.yml --profile messaging up -d zookeeper kafka rabbitmq

# Wait for messaging services
sleep 30  # Messaging services take longer to start

# Test RabbitMQ
if curl -f -s "http://localhost:15672" > /dev/null 2>&1; then
    print_success "RabbitMQ Management UI is responding"
else
    print_warning "RabbitMQ Management UI is not responding (this may be normal if still starting)"
fi

# Test Zookeeper
if docker compose -f docker-compose.all-in-one.yml exec -T zookeeper bash -c "echo ruok | nc localhost 2181" | grep -q "imok"; then
    print_success "Zookeeper is working"
else
    print_warning "Zookeeper test failed (this may be normal if still starting)"
fi

# 6. Show container status
print_status "Container Status:"
echo "=================================================================="
docker compose -f docker-compose.all-in-one.yml ps

# 7. Show logs for any failed services
print_status "Checking for failed services..."
failed_services=$(docker compose -f docker-compose.all-in-one.yml ps --format json | jq -r '.[] | select(.Health=="unhealthy" or .State=="exited") | .Service' 2>/dev/null || echo "")

if [ -n "$failed_services" ]; then
    print_warning "Found failed services: $failed_services"
    for service in $failed_services; do
        print_status "Logs for $service:"
        docker compose -f docker-compose.all-in-one.yml logs --tail 20 "$service"
        echo "=================================="
    done
fi

# 8. Display access URLs
print_success "All core containers are built and tested successfully!"
echo ""
echo "=================================================================="
echo " ACCESS URLS:"
echo "=================================================================="
echo " Frontend (React):           http://localhost:3000"
echo " Backend API:                http://localhost:8000/api/"
echo " API Documentation:          http://localhost:8000/api/docs/"
echo "  API Admin:                 http://localhost:8000/admin/"
echo " Email UI (MailHog):         http://localhost:8025"
echo " RabbitMQ Management:        http://localhost:15672 (admin/rabbitmq_password)"
echo "  PostgreSQL:                localhost:5432 (orcacloud_user/orcacloud_password)"
echo " Redis:                      localhost:6379 (password: redis_password)"
echo "=================================================================="
echo ""
print_success "Container build and test completed!"
echo ""
echo "To stop all services: docker compose -f docker-compose.all-in-one.yml down"
echo "To view logs: docker compose -f docker-compose.all-in-one.yml logs -f [service_name]"
echo "To rebuild: docker compose -f docker-compose.all-in-one.yml build --no-cache"