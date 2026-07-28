#!/bin/bash

# OrcaCloud Startup Script
# This script provides easy commands to start the entire platform

set    echo -e "${RED}[CLEANUP] Cleaning all OrcaCloud services and data...${NC}"-e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}=================================="
    echo -e "[PLATFORM] OrcaCloud Manager"
    echo -e "==================================${NC}"
}

print_usage() {
    echo -e "${YELLOW}Usage: ./start-platform.sh [COMMAND] [OPTIONS]${NC}"
    echo ""
    echo "Commands:"
    echo "  minimal      Start minimal setup (DB, Redis, Backend, Frontend)"
    echo "  full         Start full development environment"
    echo "  production   Start with production services"
    echo "  messaging    Start with messaging services (Kafka, RabbitMQ)"
    echo "  unified      Start unified container (single container)"
    echo "  stop         Stop all services"
    echo "  clean        Stop and remove all containers and volumes"
    echo "  logs         Show logs for all services"
    echo "  status       Show status of all services"
    echo ""
    echo "Options:"
    echo "  -d, --detach    Run in detached mode"
    echo "  -b, --build     Force rebuild containers"
    echo "  --no-deps       Don't start dependencies"
    echo ""
    echo "Examples:"
    echo "  ./start-platform.sh minimal -d"
    echo "  ./start-platform.sh full --build"
    echo "  ./start-platform.sh production"
}

check_requirements() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}[ERROR] Docker is not installed. Please install Docker first.${NC}"
        exit 1
    fi

    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}[ERROR] Docker Compose is not installed. Please install Docker Compose first.${NC}"
        exit 1
    fi

    echo -e "${GREEN}[OK] Docker and Docker Compose are available${NC}"
}

create_env_if_needed() {
    if [ ! -f .env ]; then
        echo -e "${YELLOW}[CONFIG] Creating .env file from template...${NC}"
        cp .env.example .env
        echo -e "${GREEN}[OK] .env file created. Please edit it with your configuration.${NC}"
    fi
}

start_minimal() {
    echo -e "${GREEN}[START] Starting minimal OrcaCloud...${NC}"
    echo "Services: PostgreSQL, Redis, Backend, Frontend"
    
    COMPOSE_CMD="docker-compose -f docker-compose.all-in-one.yml"
    
    $COMPOSE_CMD up $@ db redis backend frontend
}

start_full() {
    echo -e "${GREEN}[START] Starting full OrcaCloud...${NC}"
    echo "Services: All development services"
    
    docker compose -f docker-compose.yml up $@
}

start_production() {
    echo -e "${GREEN}[START] Starting production OrcaCloud...${NC}"
    echo "Services: Production-ready services with Nginx"
    
    COMPOSE_CMD="docker-compose -f docker-compose.all-in-one.yml"
    
    $COMPOSE_CMD --profile production up $@ db redis backend frontend nginx
}

start_messaging() {
    echo -e "${GREEN}[START] Starting OrcaCloud with messaging...${NC}"
    echo "Services: Full stack with Kafka, RabbitMQ, and Celery"
    
    COMPOSE_CMD="docker-compose -f docker-compose.all-in-one.yml"
    
    $COMPOSE_CMD --profile messaging --profile celery up $@
}

start_unified() {
    echo -e "${GREEN}[START] Starting unified OrcaCloud...${NC}"
    echo "Services: Single container with frontend and backend"
    
    docker compose -f docker-compose.unified.yml up $@
}

stop_services() {
    echo -e "${YELLOW} Stopping all OrcaCloud services...${NC}"
    
    docker compose -f docker-compose.yml down 2>/dev/null || true
    docker compose -f docker-compose.all-in-one.yml down 2>/dev/null || true
    docker compose -f docker-compose.unified.yml down 2>/dev/null || true
    docker compose -f docker-compose.production.yml down 2>/dev/null || true
    
    echo -e "${GREEN}[OK] All services stopped${NC}"
}

clean_services() {
    echo -e "${RED} Cleaning all OrcaCloud services and data...${NC}"
    read -p "This will remove all containers and volumes. Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        stop_services
        
        docker compose -f docker-compose.yml down -v --remove-orphans 2>/dev/null || true
        docker compose -f docker-compose.all-in-one.yml down -v --remove-orphans 2>/dev/null || true
        docker compose -f docker-compose.unified.yml down -v --remove-orphans 2>/dev/null || true
        docker compose -f docker-compose.production.yml down -v --remove-orphans 2>/dev/null || true
        
        echo -e "${GREEN}[OK] All services and data cleaned${NC}"
    else
        echo "Cancelled."
    fi
}

show_logs() {
    echo -e "${BLUE}[LOGS] Showing logs for all services...${NC}"
    docker compose -f docker-compose.all-in-one.yml logs -f $@
}

show_status() {
    echo -e "${BLUE}[STATUS] Service Status:${NC}"
    docker compose -f docker-compose.all-in-one.yml ps
    echo ""
    echo -e "${BLUE} Volume Usage:${NC}"
    docker volume ls | grep orcacloud || echo "No OrcaCloud volumes found"
}

print_success_info() {
    echo ""
    echo -e "${GREEN}[SUCCESS] OrcaCloud is starting up!${NC}"
    echo ""
    echo -e "${BLUE}[ACCESS] Access URLs:${NC}"
    echo "  Frontend:          http://localhost:3000"
    echo "  Backend API:       http://localhost:8000"
    echo "  Admin Panel:       http://localhost:8000/admin"
    echo "  API Documentation: http://localhost:8000/api/docs"
    echo ""
    echo -e "${BLUE}[TOOLS] Development Tools:${NC}"
    echo "  PostgreSQL:        localhost:5432 (user: orcacloud_user, db: orcacloud)"
    echo "  Redis:             localhost:6379"
    echo "  MailHog UI:        http://localhost:8025 (if email profile enabled)"
    echo "  RabbitMQ UI:       http://localhost:15672 (if messaging profile enabled)"
    echo "  Kafka UI:          http://localhost:8090 (if using full compose)"
    echo ""
    echo -e "${YELLOW}[TIPS] Tips:${NC}"
    echo "  - Use 'docker compose logs -f [service]' to view specific service logs"
    echo "  - Edit .env file to configure social authentication and other settings"
    echo "  - Run './start-platform.sh stop' to stop all services"
    echo "  - Run './start-platform.sh logs' to view all logs"
}

# Main script
print_header
check_requirements
create_env_if_needed

# Parse command line arguments
DETACH=""
BUILD=""
NO_DEPS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        minimal|full|production|messaging|unified|stop|clean|logs|status)
            COMMAND="$1"
            shift
            ;;
        -d|--detach)
            DETACH="-d"
            shift
            ;;
        -b|--build)
            BUILD="--build"
            shift
            ;;
        --no-deps)
            NO_DEPS="--no-deps"
            shift
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            echo -e "${RED}[ERROR] Unknown option: $1${NC}"
            print_usage
            exit 1
            ;;
    esac
done

# Set default command
COMMAND=${COMMAND:-minimal}

# Combine options
DOCKER_OPTS="$DETACH $BUILD $NO_DEPS"

# Execute command
case $COMMAND in
    minimal)
        start_minimal $DOCKER_OPTS
        print_success_info
        ;;
    full)
        start_full $DOCKER_OPTS
        print_success_info
        ;;
    production)
        start_production $DOCKER_OPTS
        print_success_info
        ;;
    messaging)
        start_messaging $DOCKER_OPTS
        print_success_info
        ;;
    unified)
        start_unified $DOCKER_OPTS
        print_success_info
        ;;
    stop)
        stop_services
        ;;
    clean)
        clean_services
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    *)
        echo -e "${RED}[ERROR] Unknown command: $COMMAND${NC}"
        print_usage
        exit 1
        ;;
esac