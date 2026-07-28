#!/bin/bash

# OrcaCloud - Concourse CI Setup Script
# This script sets up Concourse CI for the OrcaCloud platform

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONCOURSE_DIR="infrastructure/concourse"
FLY_CLI_VERSION="7.11.2"
CONCOURSE_URL="http://localhost:8080"
TEAM="main"
USERNAME="admin"
PASSWORD="atonix2024!"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Usage function
usage() {
    cat << EOF
OrcaCloud Concourse Setup Script

Usage: $0 [OPTIONS]

Options:
    -u, --url URL                   Concourse URL (default: http://localhost:8080)
    -t, --team TEAM                 Concourse team (default: main)
    --username USERNAME             Admin username (default: admin)
    --password PASSWORD             Admin password (default: atonix2024!)
    -h, --help                      Show this help message

Examples:
    $0                              # Setup with default settings
    $0 -u http://concourse.local    # Setup with custom URL

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            CONCOURSE_URL="$2"
            shift 2
            ;;
        -t|--team)
            TEAM="$2"
            shift 2
            ;;
        --username)
            USERNAME="$2"
            shift 2
            ;;
        --password)
            PASSWORD="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "curl" "ssh-keygen")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command '$cmd' not found. Please install it and try again."
            exit 1
        fi
    done
    
    log_success "Prerequisites check completed"
}

# Generate Concourse keys
generate_keys() {
    log_info "Generating Concourse keys..."
    
    cd "$CONCOURSE_DIR"
    chmod +x config/generate-keys.sh
    ./config/generate-keys.sh
    cd ../..
    
    log_success "Concourse keys generated"
}

# Download Fly CLI
download_fly_cli() {
    log_info "Downloading Fly CLI..."
    
    # Detect OS and architecture
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    case $ARCH in
        x86_64) ARCH="amd64" ;;
        arm64|aarch64) ARCH="arm64" ;;
        *) log_error "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    
    FLY_URL="https://github.com/concourse/concourse/releases/download/v${FLY_CLI_VERSION}/fly-${FLY_CLI_VERSION}-${OS}-${ARCH}.tgz"
    
    # Download and install fly CLI
    curl -L "$FLY_URL" | tar -xz
    chmod +x fly
    sudo mv fly /usr/local/bin/
    
    log_success "Fly CLI downloaded and installed"
}

# Start Concourse stack
start_concourse() {
    log_info "Starting Concourse stack..."
    
    cd "$CONCOURSE_DIR"
    
    # Create necessary directories
    mkdir -p config/web
    
    # Start Concourse
    docker-compose up -d
    
    cd ../..
    
    # Wait for Concourse to be ready
    log_info "Waiting for Concourse to be ready..."
    timeout=120
    while ! curl -s "$CONCOURSE_URL/api/v1/info" > /dev/null && [ $timeout -gt 0 ]; do
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        log_error "Concourse failed to start within timeout"
        exit 1
    fi
    
    log_success "Concourse started successfully"
}

# Login to Concourse
login_to_concourse() {
    log_info "Logging into Concourse..."
    
    # Login with fly CLI
    fly -t orcacloud login \
        -c "$CONCOURSE_URL" \
        -u "$USERNAME" \
        -p "$PASSWORD" \
        -n "$TEAM"
    
    log_success "Logged into Concourse successfully"
}

# Set pipeline
set_pipeline() {
    log_info "Setting up OrcaCloud pipeline..."
    
    # Create secrets file
    cat > /tmp/concourse-secrets.yml << EOF
git-private-key: |
  # Add your Git private key here
  # Generate with: ssh-keygen -t rsa -b 4096 -C "concourse@orcacloud.com"
  
docker-registry-username: "your-registry-username"
docker-registry-password: "your-registry-password"
webhook-token: "your-webhook-token"
slack-webhook-url: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
EOF

    log_warning "Please update /tmp/concourse-secrets.yml with your actual secrets"
    
    # Set the pipeline
    fly -t orcacloud set-pipeline \
        -p orcacloud \
        -c "$CONCOURSE_DIR/pipelines/orcacloud.yml" \
        -l /tmp/concourse-secrets.yml
    
    # Unpause the pipeline
    fly -t orcacloud unpause-pipeline -p orcacloud
    
    log_success "Pipeline set up successfully"
}

# Create additional pipelines
create_additional_pipelines() {
    log_info "Creating additional pipelines..."
    
    # Security pipeline
    cat > "$CONCOURSE_DIR/pipelines/security-pipeline.yml" << 'EOF'
---
resources:
  - name: security-timer
    type: time
    source:
      interval: 24h

jobs:
  - name: daily-security-scan
    plan:
      - get: security-timer
        trigger: true
      - task: comprehensive-scan
        config:
          platform: linux
          image_resource:
            type: docker-image
            source:
              repository: aquasec/trivy
              tag: latest
          run:
            path: sh
            args:
              - -c
              - |
                echo "Running daily security scan..."
                # Add comprehensive security scanning logic here
EOF

    fly -t orcacloud set-pipeline \
        -p security-scans \
        -c "$CONCOURSE_DIR/pipelines/security-pipeline.yml"
    
    fly -t orcacloud unpause-pipeline -p security-scans
    
    log_success "Additional pipelines created"
}

# Setup monitoring integration
setup_monitoring() {
    log_info "Setting up monitoring integration..."
    
    # Create Prometheus scrape config for Concourse
    cat > "$CONCOURSE_DIR/config/prometheus-concourse.yml" << EOF
# Add this to your Prometheus configuration
scrape_configs:
  - job_name: 'concourse-web'
    static_configs:
      - targets: ['concourse-web:9391']
    scrape_interval: 30s

  - job_name: 'concourse-worker'
    static_configs:
      - targets: ['concourse-worker:9391']
    scrape_interval: 30s
EOF

    # Create Grafana dashboard config
    cat > "$CONCOURSE_DIR/config/grafana-dashboard.json" << 'EOF'
{
  "dashboard": {
    "title": "Concourse CI/CD Metrics",
    "panels": [
      {
        "title": "Pipeline Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(concourse_builds_finished_total{status=\"succeeded\"}[5m]) / rate(concourse_builds_finished_total[5m]) * 100"
          }
        ]
      },
      {
        "title": "Build Duration",
        "type": "graph",
        "targets": [
          {
            "expr": "concourse_builds_duration_seconds"
          }
        ]
      },
      {
        "title": "Active Workers",
        "type": "stat",
        "targets": [
          {
            "expr": "concourse_workers_total"
          }
        ]
      }
    ]
  }
}
EOF

    log_success "Monitoring integration configured"
}

# Print access information
print_access_info() {
    log_info "Concourse setup completed! Here's how to access your CI/CD system:"
    
    echo ""
    echo " Access Information:"
    echo "====================="
    echo "  Concourse Web UI:   $CONCOURSE_URL"
    echo " Username:           $USERNAME"
    echo " Password:           $PASSWORD"
    echo "  Team:              $TEAM"
    echo ""
    echo "  Fly CLI Commands:"
    echo "====================="
    echo " List pipelines:     fly -t orcacloud pipelines"
    echo "  Trigger build:      fly -t orcacloud trigger-job -j orcacloud/ci-pipeline"
    echo " Watch build:        fly -t orcacloud watch -j orcacloud/ci-pipeline"
    echo " Get pipeline:       fly -t orcacloud get-pipeline -p orcacloud"
    echo ""
    echo " Pipeline Files:"
    echo "=================="
    echo "  Main pipeline:     $CONCOURSE_DIR/pipelines/orcacloud.yml"
    echo " Security pipeline:  $CONCOURSE_DIR/pipelines/security-pipeline.yml"
    echo " Task definitions:   $CONCOURSE_DIR/tasks/"
    echo ""
    echo "  Next Steps:"
    echo "==============="
    echo "1. Update secrets in /tmp/concourse-secrets.yml"
    echo "2. Configure Git repository webhooks pointing to Concourse"
    echo "3. Set up Slack notifications (update webhook URL)"
    echo "4. Configure Docker registry credentials"
    echo "5. Test pipeline: fly -t orcacloud trigger-job -j orcacloud/ci-pipeline"
    echo ""
    echo " Integration:"
    echo "==============="
    echo "- OpenTelemetry tracing enabled for pipeline visibility"
    echo "- Prometheus metrics available for monitoring"
    echo "- Grafana dashboards configured"
    echo "- Vault integration available for secrets management"
    echo ""
    echo " Documentation:"
    echo "=================="
    echo "- Concourse docs: https://concourse-ci.org/docs.html"
    echo "- Fly CLI reference: https://concourse-ci.org/fly.html"
    echo "- Pipeline examples: $CONCOURSE_DIR/pipelines/"
}

# Main execution
main() {
    echo " OrcaCloud Concourse CI Setup"
    echo "================================="
    echo ""
    
    check_prerequisites
    generate_keys
    download_fly_cli
    start_concourse
    login_to_concourse
    set_pipeline
    create_additional_pipelines
    setup_monitoring
    print_access_info
    
    echo ""
    log_success " Concourse CI setup completed successfully!"
}

# Run main function
main "$@"