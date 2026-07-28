#!/bin/bash

# OrcaCloud Docker Setup Script
# This script sets up the Docker environment for development

set -e

echo " OrcaCloud Docker Setup"
echo "============================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo " Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo " Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo " Docker and Docker Compose are installed"

# Create network if it doesn't exist
if ! docker network inspect orcacloud_net &> /dev/null; then
    echo " Creating Docker network: orcacloud_net"
    docker network create orcacloud_net
else
    echo " Docker network already exists: orcacloud_net"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "  .env file not found. Creating default .env..."
    cat > .env << 'EOF'
# Backend Configuration
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=orcacloud.com,api.orcacloud.com,localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=https://orcacloud.com,https://api.orcacloud.com

# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/orcacloud_db

# Redis
REDIS_URL=redis://redis:6379/0

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Frontend
REACT_APP_API_URL=http://api.orcacloud.com
REACT_APP_ENVIRONMENT=development
REACT_APP_FRONTEND_URL=http://orcacloud.com
EOF
    echo " Created .env file. Please edit it with your configuration."
fi

# Update /etc/hosts for local development
if grep -q "orcacloud.com" /etc/hosts 2>/dev/null; then
    echo " /etc/hosts already configured"
else
    echo " Adding entries to /etc/hosts (requires sudo)..."
    sudo bash -c 'cat >> /etc/hosts << EOF
127.0.0.1 orcacloud.com
127.0.0.1 www.orcacloud.com
127.0.0.1 api.orcacloud.com
127.0.0.1 www.api.orcacloud.com
EOF'
    echo " Updated /etc/hosts"
fi

# Create Apache2 certs directory
mkdir -p docker/apache2/certs
echo " Created Apache2 certificates directory"

# Ask if user wants to generate self-signed certificates
read -p "Do you want to generate self-signed SSL certificates for development? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo " Generating self-signed SSL certificates..."
    
    # Frontend certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout docker/apache2/certs/orcacloud.com.key \
        -out docker/apache2/certs/orcacloud.com.crt \
        -subj "/C=US/ST=State/L=City/O=OrcaCloud/CN=orcacloud.com" \
        2>/dev/null
    echo " Generated frontend certificate"
    
    # API certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout docker/apache2/certs/api.orcacloud.com.key \
        -out docker/apache2/certs/api.orcacloud.com.crt \
        -subj "/C=US/ST=State/L=City/O=OrcaCloud/CN=api.orcacloud.com" \
        2>/dev/null
    echo " Generated API certificate"
fi

echo ""
echo " Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Build the Docker images:"
echo "   docker-compose -f docker-compose.local.main.yml build"
echo "3. Start the services:"
echo "   docker-compose -f docker-compose.local.main.yml up -d"
echo "4. Access the services:"
echo "   - Frontend: http://orcacloud.com"
echo "   - API: http://api.orcacloud.com"
echo "   - Backend Admin: http://api.orcacloud.com/admin/"
echo ""
echo "View logs with:"
echo "   docker-compose -f docker-compose.local.main.yml logs -f"
echo ""
