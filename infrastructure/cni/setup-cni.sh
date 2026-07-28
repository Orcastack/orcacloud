#!/bin/bash
# CNI Setup Script for OrcaCloud

set -euo pipefail

# Configuration
CNI_VERSION="v1.3.0"
CNI_DIR="/opt/cni/bin"
CNI_CONFIG_DIR="/etc/cni/net.d"
CNI_PLUGINS_URL="https://github.com/containernetworking/plugins/releases/download"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
}

# Install CNI plugins
install_cni_plugins() {
    log "Installing CNI plugins version ${CNI_VERSION}..."
    
    # Create CNI directories
    mkdir -p "${CNI_DIR}"
    mkdir -p "${CNI_CONFIG_DIR}"
    
    # Download and extract CNI plugins
    local temp_dir=$(mktemp -d)
    cd "${temp_dir}"
    
    wget "${CNI_PLUGINS_URL}/${CNI_VERSION}/cni-plugins-linux-amd64-${CNI_VERSION}.tgz"
    tar -xzf "cni-plugins-linux-amd64-${CNI_VERSION}.tgz" -C "${CNI_DIR}"
    
    # Set permissions
    chmod +x "${CNI_DIR}"/*
    
    # Cleanup
    rm -rf "${temp_dir}"
    
    log "CNI plugins installed successfully"
}

# Setup network namespaces
setup_namespaces() {
    log "Setting up network namespaces..."
    
    # Enable IP forwarding
    echo 'net.ipv4.ip_forward = 1' > /etc/sysctl.d/99-cni-forwarding.conf
    echo 'net.ipv6.conf.all.forwarding = 1' >> /etc/sysctl.d/99-cni-forwarding.conf
    sysctl -p /etc/sysctl.d/99-cni-forwarding.conf
    
    # Create bridge for container networking
    if ! ip link show atonix-br0 &>/dev/null; then
        ip link add name atonix-br0 type bridge
        ip addr add 10.100.0.1/16 dev atonix-br0
        ip link set atonix-br0 up
        log "Created bridge atonix-br0"
    else
        warn "Bridge atonix-br0 already exists"
    fi
    
    # Setup iptables rules for NAT
    iptables -t nat -A POSTROUTING -s 10.100.0.0/16 ! -o atonix-br0 -j MASQUERADE
    iptables -A FORWARD -i atonix-br0 -j ACCEPT
    iptables -A FORWARD -o atonix-br0 -j ACCEPT
    
    log "Network namespaces configured"
}

# Install CNI configuration files
install_cni_configs() {
    log "Installing CNI configuration files..."
    
    # Copy configuration files
    cp "$(dirname "$0")/10-orcacloud-network.conflist" "${CNI_CONFIG_DIR}/"
    cp "$(dirname "$0")/20-orcacloud-production.conflist" "${CNI_CONFIG_DIR}/"
    
    # Set appropriate permissions
    chmod 644 "${CNI_CONFIG_DIR}"/*.conflist
    
    log "CNI configuration files installed"
}

# Create CNI management script
create_management_script() {
    log "Creating CNI management script..."
    
    cat > /usr/local/bin/orcacloud-cni-manage << 'EOF'
#!/bin/bash
# OrcaCloud CNI Management Script

CNI_DIR="/opt/cni/bin"
CNI_CONFIG_DIR="/etc/cni/net.d"

case "$1" in
    status)
        echo "CNI Status:"
        echo "==========="
        echo "CNI Directory: ${CNI_DIR}"
        echo "Config Directory: ${CNI_CONFIG_DIR}"
        echo
        echo "Installed Plugins:"
        ls -la "${CNI_DIR}"
        echo
        echo "Active Configurations:"
        ls -la "${CNI_CONFIG_DIR}"
        echo
        echo "Bridge Status:"
        ip link show type bridge
        echo
        echo "Network Namespaces:"
        ip netns list
        ;;
    restart)
        echo "Restarting CNI networking..."
        # Restart container runtime to pick up new CNI config
        systemctl restart containerd || systemctl restart docker
        echo "CNI networking restarted"
        ;;
    test)
        echo "Testing CNI configuration..."
        # Test CNI plugins
        echo '{"cniVersion":"1.0.0","name":"test","type":"bridge"}' | ${CNI_DIR}/bridge
        echo "CNI test completed"
        ;;
    logs)
        echo "CNI Logs:"
        journalctl -u containerd -f --no-pager | grep -i cni
        ;;
    *)
        echo "Usage: $0 {status|restart|test|logs}"
        exit 1
        ;;
esac
EOF

    chmod +x /usr/local/bin/orcacloud-cni-manage
    log "CNI management script created at /usr/local/bin/orcacloud-cni-manage"
}

# Setup systemd service for persistent networking
create_systemd_service() {
    log "Creating systemd service for CNI networking..."
    
    cat > /etc/systemd/system/orcacloud-cni.service << EOF
[Unit]
Description=OrcaCloud CNI Network Setup
After=network.target
Before=containerd.service docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/bash -c 'ip link add name atonix-br0 type bridge 2>/dev/null || true; ip addr add 10.100.0.1/16 dev atonix-br0 2>/dev/null || true; ip link set atonix-br0 up'
ExecStop=/bin/bash -c 'ip link del atonix-br0 2>/dev/null || true'

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable orcacloud-cni.service
    systemctl start orcacloud-cni.service
    
    log "Systemd service created and started"
}

# Validate installation
validate_installation() {
    log "Validating CNI installation..."
    
    # Check CNI plugins
    if [[ ! -d "${CNI_DIR}" ]] || [[ -z "$(ls -A ${CNI_DIR})" ]]; then
        error "CNI plugins not found in ${CNI_DIR}"
    fi
    
    # Check CNI configs
    if [[ ! -d "${CNI_CONFIG_DIR}" ]] || [[ -z "$(ls -A ${CNI_CONFIG_DIR})" ]]; then
        error "CNI configurations not found in ${CNI_CONFIG_DIR}"
    fi
    
    # Check bridge
    if ! ip link show atonix-br0 &>/dev/null; then
        error "CNI bridge atonix-br0 not found"
    fi
    
    log "CNI installation validated successfully"
}

# Main installation function
main() {
    log "Starting OrcaCloud CNI setup..."
    
    check_root
    install_cni_plugins
    setup_namespaces
    install_cni_configs
    create_management_script
    create_systemd_service
    validate_installation
    
    log "OrcaCloud CNI setup completed successfully!"
    log "Use 'orcacloud-cni-manage status' to check CNI status"
    log "Use 'orcacloud-cni-manage restart' to restart CNI networking"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi