#!/bin/bash

# OrcaCloud - Tekton CI/CD Setup Script
# This script installs and configures Tekton for the OrcaCloud platform

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEKTON_VERSION="v0.50.5"
TEKTON_TRIGGERS_VERSION="v0.25.3"
TEKTON_DASHBOARD_VERSION="v0.40.1"
NAMESPACE="orcacloud-tekton"
KUBERNETES_CONTEXT=""
DRY_RUN=false
SKIP_DEPS=false

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
OrcaCloud Tekton Setup Script

Usage: $0 [OPTIONS]

Options:
    -n, --namespace NAMESPACE       Kubernetes namespace (default: orcacloud-tekton)
    -c, --context CONTEXT          Kubernetes context to use
    -d, --dry-run                   Perform a dry run without making changes
    -s, --skip-deps                 Skip dependency checks
    -h, --help                      Show this help message

Examples:
    $0                              # Install with default settings
    $0 -n tekton-system            # Install in custom namespace
    $0 -c my-cluster               # Use specific Kubernetes context
    $0 -d                          # Dry run to see what would be installed

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -c|--context)
            KUBERNETES_CONTEXT="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -s|--skip-deps)
            SKIP_DEPS=true
            shift
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
    
    # Check if running as root (needed for some operations)
    if [[ $EUID -eq 0 ]] && [[ "$SKIP_DEPS" == false ]]; then
        log_warning "Running as root. Some operations may require non-root access to Kubernetes."
    fi
    
    # Check required commands
    local required_commands=("kubectl" "curl" "grep" "sed" "awk")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command '$cmd' not found. Please install it and try again."
            exit 1
        fi
    done
    
    # Check kubectl access to cluster
    if [[ -n "$KUBERNETES_CONTEXT" ]]; then
        kubectl config use-context "$KUBERNETES_CONTEXT"
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    # Check if cluster has sufficient permissions
    if ! kubectl auth can-i create namespace &> /dev/null; then
        log_error "Insufficient permissions to create namespaces. Please check your RBAC configuration."
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

# Create namespace
create_namespace() {
    log_info "Creating namespace: $NAMESPACE"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would create namespace: $NAMESPACE"
        return
    fi
    
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warning "Namespace $NAMESPACE already exists"
    else
        kubectl create namespace "$NAMESPACE"
        kubectl label namespace "$NAMESPACE" app.kubernetes.io/name=tekton
        log_success "Namespace $NAMESPACE created"
    fi
}

# Install Tekton Pipelines
install_tekton_pipelines() {
    log_info "Installing Tekton Pipelines $TEKTON_VERSION..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would install Tekton Pipelines $TEKTON_VERSION"
        return
    fi
    
    kubectl apply --filename "https://storage.googleapis.com/tekton-releases/pipeline/releases/$TEKTON_VERSION/release.yaml"
    
    # Wait for Tekton Pipelines to be ready
    log_info "Waiting for Tekton Pipelines to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/part-of=tekton-pipelines -n tekton-pipelines --timeout=300s
    
    log_success "Tekton Pipelines installed successfully"
}

# Install Tekton Triggers
install_tekton_triggers() {
    log_info "Installing Tekton Triggers $TEKTON_TRIGGERS_VERSION..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would install Tekton Triggers $TEKTON_TRIGGERS_VERSION"
        return
    fi
    
    kubectl apply --filename "https://storage.googleapis.com/tekton-releases/triggers/releases/$TEKTON_TRIGGERS_VERSION/release.yaml"
    kubectl apply --filename "https://storage.googleapis.com/tekton-releases/triggers/releases/$TEKTON_TRIGGERS_VERSION/interceptors.yaml"
    
    # Wait for Tekton Triggers to be ready
    log_info "Waiting for Tekton Triggers to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/part-of=tekton-triggers -n tekton-pipelines --timeout=300s
    
    log_success "Tekton Triggers installed successfully"
}

# Install Tekton Dashboard
install_tekton_dashboard() {
    log_info "Installing Tekton Dashboard..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would install Tekton Dashboard"
        return
    fi
    
    # Apply dashboard deployment
    kubectl apply -f infrastructure/tekton/dashboard/dashboard-deployment.yaml
    kubectl apply -f infrastructure/tekton/dashboard/dashboard-extensions.yaml
    
    # Wait for dashboard to be ready
    log_info "Waiting for Tekton Dashboard to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=tekton-dashboard -n tekton-dashboard --timeout=300s
    
    log_success "Tekton Dashboard installed successfully"
}

# Install OrcaCloud Tekton Resources
install_orcacloud_resources() {
    log_info "Installing OrcaCloud Tekton resources..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would install OrcaCloud Tekton resources"
        return
    fi
    
    # Apply all Tekton resources
    log_info "Installing Tasks..."
    kubectl apply -f infrastructure/tekton/tasks/ -n "$NAMESPACE"
    
    log_info "Installing Pipelines..."
    kubectl apply -f infrastructure/tekton/pipelines/ -n "$NAMESPACE"
    
    log_info "Installing Triggers..."
    kubectl apply -f infrastructure/tekton/triggers/ -n "$NAMESPACE"
    
    log_info "Installing Configuration..."
    kubectl apply -f infrastructure/tekton/config/ -n "$NAMESPACE"
    
    log_success "OrcaCloud Tekton resources installed successfully"
}

# Create RBAC and Service Accounts
create_rbac() {
    log_info "Creating RBAC and Service Accounts..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would create RBAC and Service Accounts"
        return
    fi
    
    cat << EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tekton-triggers-sa
  namespace: $NAMESPACE
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tekton-triggers-clusterrole
rules:
- apiGroups: ["triggers.tekton.dev"]
  resources: ["eventlisteners", "triggerbindings", "triggertemplates", "triggers"]
  verbs: ["get", "list", "create", "update", "delete", "patch", "watch"]
- apiGroups: ["tekton.dev"]
  resources: ["pipelineruns", "pipelineresources", "taskruns"]
  verbs: ["get", "list", "create", "update", "delete", "patch", "watch"]
- apiGroups: [""]
  resources: ["configmaps", "secrets", "events"]
  verbs: ["get", "list", "create", "update", "delete", "patch", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: tekton-triggers-binding
subjects:
- kind: ServiceAccount
  name: tekton-triggers-sa
  namespace: $NAMESPACE
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: tekton-triggers-clusterrole
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: orcacloud-pipeline-sa
  namespace: $NAMESPACE
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: orcacloud-pipeline-clusterrole
rules:
- apiGroups: [""]
  resources: ["pods", "services", "endpoints", "persistentvolumeclaims", "events", "configmaps", "secrets"]
  verbs: ["*"]
- apiGroups: ["apps"]
  resources: ["deployments", "daemonsets", "replicasets", "statefulsets"]
  verbs: ["*"]
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: orcacloud-pipeline-binding
subjects:
- kind: ServiceAccount
  name: orcacloud-pipeline-sa
  namespace: $NAMESPACE
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: orcacloud-pipeline-clusterrole
EOF
    
    log_success "RBAC and Service Accounts created successfully"
}

# Setup secrets
setup_secrets() {
    log_info "Setting up secrets..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would setup secrets"
        return
    fi
    
    # Create placeholder secrets (user needs to update these)
    cat << EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: github-secret
  namespace: $NAMESPACE
type: Opaque
data:
  secretToken: $(echo -n "change-me" | base64)
---
apiVersion: v1
kind: Secret
metadata:
  name: docker-registry-secret
  namespace: $NAMESPACE
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: $(echo -n '{"auths":{"quay.io":{"username":"CHANGE_ME","password":"CHANGE_ME","email":"CHANGE_ME","auth":"Q0hBTkdFX01FDQo="}}}' | base64)
---
apiVersion: v1
kind: Secret
metadata:
  name: kubeconfig-secret
  namespace: $NAMESPACE
type: Opaque
data:
  config: $(echo -n "# Add your kubeconfig here" | base64)
EOF
    
    log_warning "Placeholder secrets created. Please update them with real values!"
    log_warning "Update secrets with: kubectl edit secret <secret-name> -n $NAMESPACE"
}

# Verify installation
verify_installation() {
    log_info "Verifying installation..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would verify installation"
        return
    fi
    
    # Check Tekton Pipelines
    if kubectl get pods -n tekton-pipelines | grep -q "Running"; then
        log_success " Tekton Pipelines is running"
    else
        log_error " Tekton Pipelines is not running properly"
    fi
    
    # Check Tekton Dashboard
    if kubectl get pods -n tekton-dashboard | grep -q "Running"; then
        log_success " Tekton Dashboard is running"
    else
        log_error " Tekton Dashboard is not running properly"
    fi
    
    # Check OrcaCloud resources
    local task_count=$(kubectl get tasks -n "$NAMESPACE" --no-headers | wc -l)
    local pipeline_count=$(kubectl get pipelines -n "$NAMESPACE" --no-headers | wc -l)
    local trigger_count=$(kubectl get eventlisteners -n "$NAMESPACE" --no-headers | wc -l)
    
    log_success " Installed $task_count tasks, $pipeline_count pipelines, $trigger_count triggers"
}

# Print access information
print_access_info() {
    log_info "Installation completed! Here's how to access your Tekton setup:"
    
    echo ""
    echo " Access Information:"
    echo "====================="
    
    # Dashboard access
    echo " Tekton Dashboard:"
    echo "   - NodePort: http://localhost:30097"
    echo "   - Port Forward: kubectl port-forward -n tekton-dashboard svc/tekton-dashboard 9097:9097"
    echo "   - Then access: http://localhost:9097"
    
    echo ""
    echo " Namespace: $NAMESPACE"
    echo " Resources installed:"
    echo "   - Tasks: kubectl get tasks -n $NAMESPACE"
    echo "   - Pipelines: kubectl get pipelines -n $NAMESPACE"
    echo "   - Triggers: kubectl get eventlisteners -n $NAMESPACE"
    
    echo ""
    echo "  Next Steps:"
    echo "==============="
    echo "1. Update secrets with real values:"
    echo "   kubectl edit secret github-secret -n $NAMESPACE"
    echo "   kubectl edit secret docker-registry-secret -n $NAMESPACE"
    echo "   kubectl edit secret kubeconfig-secret -n $NAMESPACE"
    echo ""
    echo "2. Configure your Git repository with webhook:"
    echo "   URL: http://your-cluster/hooks"
    echo "   Secret: Use the github-secret token"
    echo ""
    echo "3. Test a pipeline run:"
    echo "   kubectl create -f infrastructure/tekton/examples/test-pipelinerun.yaml"
    echo ""
    echo "4. View pipeline runs:"
    echo "   kubectl get pipelineruns -n $NAMESPACE"
    echo ""
    echo " Documentation: See infrastructure/tekton/README.md for detailed usage"
}

# Main execution
main() {
    echo " OrcaCloud Tekton CI/CD Setup"
    echo "================================="
    echo ""
    
    if [[ "$DRY_RUN" == true ]]; then
        log_warning "DRY RUN MODE - No changes will be made"
        echo ""
    fi
    
    if [[ "$SKIP_DEPS" == false ]]; then
        check_prerequisites
    fi
    
    create_namespace
    install_tekton_pipelines
    install_tekton_triggers
    install_tekton_dashboard
    create_rbac
    install_orcacloud_resources
    setup_secrets
    verify_installation
    print_access_info
    
    echo ""
    log_success " OrcaCloud Tekton setup completed successfully!"
}

# Run main function
main "$@"