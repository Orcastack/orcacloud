#!/bin/bash

# OrcaCloud - Kubernetes Deployment Script
# This script helps initialize and deploy the platform to Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-dev}"
TFVARS_FILE="terraform.tfvars.${ENVIRONMENT}"

# Functions
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

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check terraform
    if ! command -v terraform &> /dev/null; then
        log_error "terraform is not installed or not in PATH"
        exit 1
    fi
    
    # Check kubectl connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Check your kubeconfig."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

generate_django_secret() {
    log_info "Generating Django secret key..."
    
    if command -v python3 &> /dev/null; then
        DJANGO_SECRET_KEY=$(python3 -c "
import secrets
import string
alphabet = string.ascii_letters + string.digits + '!@#$%^&*(-_=+)'
secret_key = ''.join(secrets.choice(alphabet) for _ in range(50))
print(secret_key)
")
    elif command -v python &> /dev/null; then
        DJANGO_SECRET_KEY=$(python -c "
import random
import string
alphabet = string.ascii_letters + string.digits + '!@#$%^&*(-_=+)'
secret_key = ''.join(random.choice(alphabet) for _ in range(50))
print(secret_key)
")
    else
        DJANGO_SECRET_KEY=$(openssl rand -base64 32)
        log_warning "Python not found, using openssl for secret generation"
    fi
    
    export TF_VAR_django_secret_key="$DJANGO_SECRET_KEY"
    log_success "Django secret key generated and exported"
}

check_kubernetes_requirements() {
    log_info "Checking Kubernetes cluster requirements..."
    
    # Check for nginx ingress controller
    if ! kubectl get ingressclass nginx &> /dev/null; then
        log_warning "Nginx Ingress Controller not found"
        log_info "Install with: kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml"
    fi
    
    # Check for cert-manager (for production)
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        if ! kubectl get crd certificates.cert-manager.io &> /dev/null; then
            log_warning "cert-manager not found (required for production SSL)"
            log_info "Install with: kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml"
        fi
    fi
    
    log_success "Kubernetes requirements check completed"
}

init_terraform() {
    log_info "Initializing Terraform..."
    
    cd "$SCRIPT_DIR"
    
    if [[ ! -f ".terraform.lock.hcl" ]]; then
        terraform init
        log_success "Terraform initialized"
    else
        log_info "Terraform already initialized"
    fi
}

validate_config() {
    log_info "Validating Terraform configuration..."
    
    if [[ ! -f "$TFVARS_FILE" ]]; then
        log_error "Configuration file $TFVARS_FILE not found"
        log_info "Copy terraform.tfvars.example to $TFVARS_FILE and configure it"
        exit 1
    fi
    
    terraform validate
    log_success "Configuration validation passed"
}

plan_deployment() {
    log_info "Planning deployment for environment: $ENVIRONMENT"
    
    terraform plan -var-file="$TFVARS_FILE" -out="tfplan-$ENVIRONMENT"
    log_success "Deployment plan created: tfplan-$ENVIRONMENT"
}

apply_deployment() {
    log_info "Applying deployment for environment: $ENVIRONMENT"
    
    if [[ ! -f "tfplan-$ENVIRONMENT" ]]; then
        log_error "No plan file found. Run plan first."
        exit 1
    fi
    
    terraform apply "tfplan-$ENVIRONMENT"
    log_success "Deployment applied successfully!"
    
    # Clean up plan file
    rm -f "tfplan-$ENVIRONMENT"
}

show_access_info() {
    log_info "Deployment completed! Access information:"
    
    # Get ingress information
    NAMESPACE=$(terraform output -raw namespace_name 2>/dev/null || echo "orcacloud-$ENVIRONMENT")
    
    if kubectl get ingress -n "$NAMESPACE" &> /dev/null; then
        echo ""
        log_info "Ingress Resources:"
        kubectl get ingress -n "$NAMESPACE"
        
        echo ""
        log_info "Application URLs:"
        terraform output -json connection_info 2>/dev/null | jq -r '.external_urls | to_entries[] | "\(.key): \(.value)"' || true
    fi
    
    echo ""
    log_info "Useful commands:"
    echo "  # Watch pods:"
    echo "  kubectl get pods -n $NAMESPACE -w"
    echo ""
    echo "  # Check logs:"
    echo "  kubectl logs -f deployment/orcacloud-backend -n $NAMESPACE"
    echo ""
    echo "  # Port forward for local access:"
    echo "  kubectl port-forward svc/orcacloud-frontend 8080:80 -n $NAMESPACE"
}

show_help() {
    echo "OrcaCloud - Kubernetes Deployment Script"
    echo ""
    echo "Usage: $0 [ENVIRONMENT] [COMMAND]"
    echo ""
    echo "Environments:"
    echo "  dev     - Development environment (default)"
    echo "  prod    - Production environment"
    echo ""
    echo "Commands:"
    echo "  deploy  - Full deployment (check, plan, apply)"
    echo "  plan    - Plan deployment only"
    echo "  apply   - Apply existing plan"
    echo "  destroy - Destroy infrastructure"
    echo "  check   - Check prerequisites only"
    echo "  help    - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 dev deploy    # Deploy to development"
    echo "  $0 prod plan     # Plan production deployment"
    echo "  $0 dev destroy   # Destroy development environment"
}

destroy_deployment() {
    log_warning "This will destroy all resources for environment: $ENVIRONMENT"
    read -p "Are you sure? Type 'yes' to continue: " -r
    
    if [[ $REPLY == "yes" ]]; then
        terraform destroy -var-file="$TFVARS_FILE"
        log_success "Infrastructure destroyed"
    else
        log_info "Destruction cancelled"
    fi
}

# Main execution
main() {
    local command="${2:-deploy}"
    
    case "$command" in
        "deploy")
            check_prerequisites
            generate_django_secret
            check_kubernetes_requirements
            init_terraform
            validate_config
            plan_deployment
            apply_deployment
            show_access_info
            ;;
        "plan")
            check_prerequisites
            generate_django_secret
            init_terraform
            validate_config
            plan_deployment
            ;;
        "apply")
            check_prerequisites
            generate_django_secret
            init_terraform
            apply_deployment
            show_access_info
            ;;
        "destroy")
            check_prerequisites
            generate_django_secret
            init_terraform
            destroy_deployment
            ;;
        "check")
            check_prerequisites
            check_kubernetes_requirements
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    log_info "Valid environments: dev, staging, prod"
    exit 1
fi

# Run main function
main "$@"