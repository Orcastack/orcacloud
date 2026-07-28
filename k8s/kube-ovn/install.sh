#!/bin/bash

# Kube-OVN Installation Script for OrcaCloud
# This script installs Kube-OVN networking plugin

set -e

echo " Installing Kube-OVN networking plugin..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}${NC} $1"
}

print_error() {
    echo -e "${RED}${NC} $1"
}

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl not found. Please install kubectl first."
    exit 1
fi

# Check cluster connectivity
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

echo " Applying Kube-OVN manifests..."

# Apply manifests in order
manifests=(
    "01-rbac.yaml"
    "02-crds.yaml"
    "04-ovn-central.yaml"
    "05-ovn-controller.yaml"
    "03-operator.yaml"
    "06-subnet.yaml"
)

for manifest in "${manifests[@]}"; do
    echo "Applying $manifest..."
    if kubectl apply -f "k8s/kube-ovn/$manifest"; then
        print_status "$manifest applied successfully"
    else
        print_error "Failed to apply $manifest"
        exit 1
    fi
done

echo ""
print_status "Kube-OVN installation completed!"
echo ""
print_warning "Important next steps:"
echo "1. Wait for all pods to be ready:"
echo "   kubectl get pods -n kube-system -l component=network"
echo ""
echo "2. Verify subnet creation:"
echo "   kubectl get subnet"
echo ""
echo "3. Check node network status:"
echo "   kubectl get nodes -o wide"
echo ""
echo "4. Test network connectivity:"
echo "   kubectl run test-pod --image=busybox --restart=Never -- sleep 3600"
echo "   kubectl exec -it test-pod -- ping 10.16.0.1"
echo ""
print_warning "Note: Existing pods may need to be restarted to use the new network plugin."
echo "You can restart deployments with: kubectl rollout restart deployment <name>"