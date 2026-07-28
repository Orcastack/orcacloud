#!/bin/bash
# Build and run script for OrcaCloud unified container

set -e

echo "[BUILD] OrcaCloud - Unified Container Builder"
echo "=================================================="

# Configuration
REGISTRY="quay.io/atonixdev"
IMAGE_NAME="orcacloud"
LOCAL_TAG="orcacloud:latest"
VERSION="${VERSION:-latest}"
REGISTRY_TAG="${REGISTRY}/${IMAGE_NAME}:${VERSION}"

# Function to show usage
show_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  build      - Build the unified container"
    echo "  run        - Run the unified container with dependencies"
    echo "  dev        - Run in development mode (with code mounting)"
    echo "  stop       - Stop all containers"
    echo "  logs       - Show container logs"
    echo "  clean      - Clean up containers and images"
    echo "  tag        - Tag image for registry (VERSION=v1.0.0)"
    echo "  push       - Push image to Quay.io registry"
    echo "  login      - Login to Quay.io registry"
    echo "  release    - Build, tag and push (VERSION=v1.0.0)"
    echo "  help       - Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  VERSION    - Image version tag (default: latest)"
    echo "  REGISTRY   - Container registry (default: quay.io/atonixdev)"
    echo ""
    echo "Examples:"
    echo "  $0 build                    # Build latest"
    echo "  VERSION=v1.0.0 $0 tag      # Tag with version"
    echo "  VERSION=v1.0.0 $0 push     # Push specific version"
    echo "  VERSION=v1.0.0 $0 release  # Build, tag and push"
    echo ""
}

# Function to build the container
build_container() {
    echo " Building unified container..."
<<<<<<< HEAD
    nerdctl build -f Dockerfile.fullstack -t orcacloud:latest .
=======
    nerdctl build -f Dockerfile.fullstack -t orcacloudvm:latest .
>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
    echo " Container built successfully!"
}

# Function to run the unified stack
run_stack() {
    echo " Starting OrcaCloud..."
    nerdctl compose -f docker-compose.unified.yml up -d
    echo " Platform started successfully!"
    echo ""
    echo " Access URLs:"
    echo "   Frontend + API: http://localhost"
    echo "   Django Admin:   http://localhost/admin/"
    echo "   API Direct:     http://localhost:8000/api/"
    echo "   RabbitMQ UI:    http://localhost:15672 (admin/rabbitmq_password)"
    echo "   MailHog UI:     http://localhost:8025"
    echo "   Health Check:   http://localhost/health/"
}

# Function to run in development mode
run_dev() {
    echo " Starting in development mode..."
    # Create development override
    cat > docker-compose.dev.yml << 'EOF'
version: '3.8'
services:
  app:
    volumes:
      - ./backend:/app:rw
      - ./frontend/src:/app/frontend_src:ro
    environment:
      - DEBUG=True
      - DJANGO_SETTINGS_MODULE=orcacloud.settings
EOF
    
    nerdctl compose -f docker-compose.unified.yml -f docker-compose.dev.yml up -d
    echo " Development environment started!"
}

# Function to stop containers
stop_containers() {
    echo " Stopping containers..."
    nerdctl compose -f docker-compose.unified.yml down
    echo " Containers stopped!"
}

# Function to show logs
show_logs() {
    echo " Showing container logs..."
    nerdctl compose -f docker-compose.unified.yml logs -f "${2:-app}"
}

# Function to clean up
clean_up() {
    echo " Cleaning up..."
    nerdctl compose -f docker-compose.unified.yml down -v
    nerdctl image rm orcacloud:latest 2>/dev/null || true
<<<<<<< HEAD
=======
    nerdctl image rm orcacloudvm:latest 2>/dev/null || true
>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
    echo " Cleanup completed!"
}

# Function to login to registry
registry_login() {
    echo " Logging into Quay.io registry..."
    echo "Please enter your Quay.io credentials:"
    nerdctl login quay.io
    echo " Login successful!"
}

# Function to tag image for registry
tag_image() {
    echo "  Tagging image for registry..."
    echo "Local tag: ${LOCAL_TAG}"
    echo "Registry tag: ${REGISTRY_TAG}"
    
    if ! nerdctl image inspect "${LOCAL_TAG}" &>/dev/null; then
        echo " Local image ${LOCAL_TAG} not found. Run 'build' first."
        exit 1
    fi
    
    nerdctl tag "${LOCAL_TAG}" "${REGISTRY_TAG}"
    echo " Image tagged successfully!"
}

# Function to push image to registry
push_image() {
    echo " Pushing image to registry..."
    echo "Pushing: ${REGISTRY_TAG}"
    
    if ! nerdctl image inspect "${REGISTRY_TAG}" &>/dev/null; then
        echo " Registry tagged image not found. Run 'tag' first."
        exit 1
    fi
    
    nerdctl push "${REGISTRY_TAG}"
    echo " Image pushed successfully!"
    echo " Image available at: ${REGISTRY_TAG}"
}

# Function to build, tag and push (full release)
release_image() {
    echo "[RELEASE] Starting full release process..."
    check_requirements
    build_container
    tag_image
    push_image
    echo " Release completed successfully!"
    echo " Image available at: ${REGISTRY_TAG}"
}

# Function to check requirements
check_requirements() {
    echo " Checking requirements..."
    
    # Check if nerdctl is available
    if ! command -v nerdctl &> /dev/null; then
        echo " nerdctl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if frontend directory exists
    if [ ! -d "frontend" ]; then
        echo " Frontend directory not found"
        exit 1
    fi
    
    # Check if backend directory exists
    if [ ! -d "backend" ]; then
        echo " Backend directory not found"
        exit 1
    fi
    
    echo " Requirements check passed!"
}

# Main script logic
case "${1:-help}" in
    "build")
        check_requirements
        build_container
        ;;
    "run")
        check_requirements
        build_container
        run_stack
        ;;
    "dev")
        check_requirements
        build_container
        run_dev
        ;;
    "stop")
        stop_containers
        ;;
    "logs")
        show_logs "$@"
        ;;
    "clean")
        clean_up
        ;;
    "login")
        registry_login
        ;;
    "tag")
        tag_image
        ;;
    "push")
        push_image
        ;;
    "release")
        release_image
        ;;
    "help"|*)
        show_usage
        ;;
esac