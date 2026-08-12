# Terraform variables for OrcaCloud Platform on single-node Kubernetes

# Core Configuration
<<<<<<< HEAD
project_name = "orcacloud-platform"
environment = "dev"
app_version = "1.0.0"
namespace = "orcacloud-platform"
=======
project_name = "orcacloud"
environment = "dev"
app_version = "1.0.0"
namespace = "orcacloud"
>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb

# Kubernetes Configuration
kubeconfig_path = "~/.kube/config"

# Storage Configuration
storage_class = "standard"
postgresql_storage_size = "5Gi"
redis_storage_size = "2Gi"
zookeeper_storage_size = "2Gi"
kafka_storage_size = "3Gi"
media_storage_size = "2Gi"

# Database Configuration
database_name = "orcacloud"
database_username = "orcacloud"

# Image Configuration
image_registry = "docker.io"
backend_image_repository = "nginx"
backend_image_tag = "latest"
frontend_image_repository = "nginx"
frontend_image_tag = "latest"

# Scaling Configuration (single node - keep low)
backend_replicas = 1
backend_min_replicas = 1
backend_max_replicas = 2

frontend_replicas = 1
frontend_min_replicas = 1
frontend_max_replicas = 2

celery_worker_replicas = 1
celery_worker_min_replicas = 1
celery_worker_max_replicas = 2

# Kafka Configuration (single node)
kafka_replicas = 1
kafka_replication_factor = 1
kafka_min_isr = 1

# Network Configuration
<<<<<<< HEAD
allowed_hosts = ["localhost", "127.0.0.1", "orcacloud.org", "api.orcacloud.org"]
cors_allowed_origins = ["https://orcacloud.org", "https://www.orcacloud.org", "http://localhost:3000"]
api_url = "http://api.orcacloud.org"
allowed_hosts = ["localhost", "127.0.0.1", "orcacloud.org", "api.orcacloud.org", "www.orcacloud.org"]
cors_allowed_origins = ["http://orcacloud.org", "http://www.orcacloud.org", "http://localhost:3000"]
=======
# Consolidated allowed hosts and CORS origins (deduplicated). Keep both https origins and http localhost for dev.
allowed_hosts = ["localhost", "127.0.0.1", "orcacloud.org", "api.orcacloud.org", "www.orcacloud.org"]
cors_allowed_origins = ["https://orcacloud.org", "https://www.orcacloud.org", "http://orcacloud.org", "http://www.orcacloud.org", "http://localhost:3000"]
api_url = "http://api.orcacloud.org"
>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb

# Domain Configuration
domain_name = "orcacloud.org"
ingress_class = "nginx"

# Disable TLS/cert-manager for now
tls_secret_name = ""

# Security Configuration
django_secret_key = "EOnU#!aut7u37F&A790-E3w(k2mu5bO#uHjE0*%=Pxzhjp*pev"

# Optional Features
enable_monitoring = false
kafka_enable_external_access = false

# Disable cert-manager and monitoring for now
ingress_annotations = {}

# Disable JMX to avoid ServiceMonitor CRD requirement
zookeeper_enable_jmx = false