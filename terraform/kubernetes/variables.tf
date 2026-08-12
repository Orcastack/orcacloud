# ==========================
# Core Infrastructure Variables
# ==========================

variable "kubeconfig_path" {
  description = "Path to the kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

variable "kubernetes_host" {
  description = "Kubernetes cluster host URL"
  type        = string
  default     = ""
}

variable "kubernetes_token" {
  description = "Kubernetes service account token"
  type        = string
  default     = ""
  sensitive   = true
}

variable "kubernetes_cluster_ca_certificate" {
  description = "Kubernetes cluster CA certificate (base64 encoded)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "project_name" {
  description = "Name of the project"
  type        = string
<<<<<<< HEAD
  default     = "orcacloud"
=======
  default     = "orcacloud"
>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
<<<<<<< HEAD
  
=======

>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "app_version" {
  description = "Application version"
  type        = string
  default     = "1.0.0"
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
<<<<<<< HEAD
  default     = "orcacloud"
=======
  default     = "orcacloud"
>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
}

# ==========================
# Storage Variables
# ==========================

variable "storage_class" {
  description = "Storage class for persistent volumes"
  type        = string
  default     = "standard"
}

variable "postgresql_storage_size" {
  description = "Storage size for PostgreSQL"
  type        = string
  default     = "20Gi"
}

variable "redis_storage_size" {
  description = "Storage size for Redis"
  type        = string
  default     = "5Gi"
}

variable "media_storage_size" {
  description = "Storage size for media files"
  type        = string
  default     = "10Gi"
}

variable "zookeeper_storage_size" {
  description = "Storage size for Zookeeper"
  type        = string
  default     = "10Gi"
}

# ==========================
# Zookeeper Variables
# ==========================

variable "zookeeper_client_port" {
  description = "Zookeeper client port"
  type        = number
  default     = 2181
}

variable "zookeeper_tick_time" {
  description = "Zookeeper tick time in milliseconds"
  type        = number
  default     = 2000
}

variable "zookeeper_init_limit" {
  description = "Zookeeper init limit"
  type        = number
  default     = 5
}

variable "zookeeper_sync_limit" {
  description = "Zookeeper sync limit"
  type        = number
  default     = 2
}

variable "zookeeper_max_client_connections" {
  description = "Maximum client connections for Zookeeper"
  type        = number
  default     = 60
}

variable "zookeeper_autopurge_snap_retain_count" {
  description = "Number of snapshots to retain during autopurge"
  type        = number
  default     = 3
}

variable "zookeeper_autopurge_purge_interval" {
  description = "Autopurge interval in hours"
  type        = number
  default     = 24
}

variable "zookeeper_enable_jmx" {
  description = "Enable JMX for Zookeeper monitoring"
  type        = bool
  default     = true
}

variable "zookeeper_jmx_port" {
  description = "JMX port for Zookeeper monitoring"
  type        = number
  default     = 9999
}

# ==========================
# Database Variables
# ==========================

variable "database_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "orcacloud_db"
}

variable "database_username" {
  description = "PostgreSQL username"
  type        = string
  default     = "orcaclouduser"
}

# ==========================
# Container Registry Variables
# ==========================

variable "image_registry" {
  description = "Container image registry"
  type        = string
  default     = "ghcr.io"
}

variable "backend_image_repository" {
  description = "Backend image repository"
  type        = string
  default     = "orcacloud/platform-backend"
}

variable "backend_image_tag" {
  description = "Backend image tag"
  type        = string
  default     = "latest"
}

variable "frontend_image_repository" {
  description = "Frontend image repository"
  type        = string
<<<<<<< HEAD
  default     = "orcacloud/platform-frontend"
=======
  default     = "orcacloud/orcacloud-frontend"
>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
}

variable "frontend_image_tag" {
  description = "Frontend image tag"
  type        = string
  default     = "latest"
}

# ==========================
# Scaling Variables
# ==========================

variable "backend_replicas" {
  description = "Number of backend replicas"
  type        = number
  default     = 2
}

variable "backend_min_replicas" {
  description = "Minimum number of backend replicas for HPA"
  type        = number
  default     = 1
}

variable "backend_max_replicas" {
  description = "Maximum number of backend replicas for HPA"
  type        = number
  default     = 10
}

variable "frontend_replicas" {
  description = "Number of frontend replicas"
  type        = number
  default     = 2
}

variable "frontend_min_replicas" {
  description = "Minimum number of frontend replicas for HPA"
  type        = number
  default     = 1
}

variable "frontend_max_replicas" {
  description = "Maximum number of frontend replicas for HPA"
  type        = number
  default     = 5
}

variable "celery_worker_replicas" {
  description = "Number of Celery worker replicas"
  type        = number
  default     = 2
}

variable "celery_worker_min_replicas" {
  description = "Minimum number of Celery worker replicas for HPA"
  type        = number
  default     = 1
}

variable "celery_worker_max_replicas" {
  description = "Maximum number of Celery worker replicas for HPA"
  type        = number
  default     = 8
}

# ==========================
# Application Configuration Variables
# ==========================

variable "django_secret_key" {
  description = "Django secret key"
  type        = string
  sensitive   = true
}

variable "allowed_hosts" {
  description = "Django allowed hosts"
  type        = list(string)
  default     = ["*"]
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins"
  type        = list(string)
  default     = ["http://localhost:3000", "https://orcacloud.com"]
}

variable "api_url" {
  description = "Backend API URL for frontend"
  type        = string
  default     = "http://backend:8000"
}

# ==========================
# Ingress Variables
# ==========================

variable "domain_name" {
  description = "Domain name for ingress"
  type        = string
  default     = "orcacloud.com"
}

variable "tls_secret_name" {
  description = "Name of the TLS secret for HTTPS"
  type        = string
  default     = "orcacloud-tls"
}

variable "ingress_class" {
  description = "Ingress class to use"
  type        = string
  default     = "nginx"
}

variable "ingress_annotations" {
  description = "Additional annotations for ingress"
  type        = map(string)
  default = {
    "cert-manager.io/cluster-issuer"                   = "letsencrypt-prod"
    "nginx.ingress.kubernetes.io/ssl-redirect"         = "true"
    "nginx.ingress.kubernetes.io/force-ssl-redirect"   = "true"
    "nginx.ingress.kubernetes.io/proxy-body-size"      = "10m"
    "nginx.ingress.kubernetes.io/proxy-read-timeout"   = "300"
    "nginx.ingress.kubernetes.io/proxy-connect-timeout" = "300"
  }
}

# ==========================
# Feature Toggles
# ==========================

variable "enable_monitoring" {
  description = "Enable monitoring stack (Prometheus, Grafana)"
  type        = bool
  default     = true
}

variable "enable_backup" {
  description = "Enable database backup"
  type        = bool
  default     = true
}

variable "enable_autoscaling" {
  description = "Enable horizontal pod autoscaling"
  type        = bool
  default     = true
}

variable "enable_network_policies" {
  description = "Enable network policies for security"
  type        = bool
  default     = false
}

# ==========================
# Environment-specific Variables
# ==========================

variable "resource_limits" {
  description = "Resource limits for different components"
  type = object({
    backend = object({
      cpu_request    = string
      cpu_limit      = string
      memory_request = string
      memory_limit   = string
    })
    frontend = object({
      cpu_request    = string
      cpu_limit      = string
      memory_request = string
      memory_limit   = string
    })
    celery = object({
      cpu_request    = string
      cpu_limit      = string
      memory_request = string
      memory_limit   = string
    })
    postgresql = object({
      cpu_request    = string
      cpu_limit      = string
      memory_request = string
      memory_limit   = string
    })
    redis = object({
      cpu_request    = string
      cpu_limit      = string
      memory_request = string
      memory_limit   = string
    })
    zookeeper = object({
      cpu_request    = string
      cpu_limit      = string
      memory_request = string
      memory_limit   = string
    })
    kafka = object({
      cpu_request    = string
      cpu_limit      = string
      memory_request = string
      memory_limit   = string
    })
  })
<<<<<<< HEAD
  
=======

>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
  default = {
    backend = {
      cpu_request    = "250m"
      cpu_limit      = "1000m"
      memory_request = "512Mi"
      memory_limit   = "2Gi"
    }
    frontend = {
      cpu_request    = "100m"
      cpu_limit      = "500m"
      memory_request = "256Mi"
      memory_limit   = "1Gi"
    }
    celery = {
      cpu_request    = "250m"
      cpu_limit      = "1000m"
      memory_request = "512Mi"
      memory_limit   = "2Gi"
    }
    postgresql = {
      cpu_request    = "250m"
      cpu_limit      = "1000m"
      memory_request = "512Mi"
      memory_limit   = "2Gi"
    }
    redis = {
      cpu_request    = "100m"
      cpu_limit      = "500m"
      memory_request = "256Mi"
      memory_limit   = "1Gi"
    }
    zookeeper = {
      cpu_request    = "250m"
      cpu_limit      = "1000m"
      memory_request = "512Mi"
      memory_limit   = "2Gi"
    }
    kafka = {
      cpu_request    = "500m"
      cpu_limit      = "2000m"
      memory_request = "1Gi"
      memory_limit   = "4Gi"
    }
<<<<<<< HEAD
=======
    ruby_service = {
      cpu_request    = "250m"
      cpu_limit      = "1000m"
      memory_request = "256Mi"
      memory_limit   = "512Mi"
    }
    ruby_sidekiq = {
      cpu_request    = "100m"
      cpu_limit      = "500m"
      memory_request = "256Mi"
      memory_limit   = "1Gi"
    }
>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
  }
}

# ==========================
# Kafka Configuration Variables
# ==========================

variable "kafka_replicas" {
  description = "Number of Kafka broker replicas"
  type        = number
  default     = 1
}

variable "kafka_replication_factor" {
  description = "Default replication factor for Kafka topics"
  type        = number
  default     = 1
}

variable "kafka_min_isr" {
  description = "Minimum in-sync replicas for Kafka"
  type        = number
  default     = 1
}

variable "kafka_default_partitions" {
  description = "Default number of partitions for Kafka topics"
  type        = number
  default     = 3
}

variable "kafka_log_retention_hours" {
  description = "Kafka log retention in hours"
  type        = number
  default     = 168  # 7 days
}

variable "kafka_log_segment_bytes" {
  description = "Kafka log segment size in bytes"
  type        = number
  default     = 1073741824  # 1GB
}

variable "kafka_message_max_bytes" {
  description = "Maximum Kafka message size in bytes"
  type        = number
  default     = 1000000  # 1MB
}

variable "kafka_auto_create_topics" {
  description = "Enable Kafka auto topic creation"
  type        = bool
  default     = true
}

variable "kafka_storage_size" {
  description = "Storage size for Kafka data"
  type        = string
  default     = "10Gi"
}

variable "kafka_enable_external_access" {
  description = "Enable external access to Kafka"
  type        = bool
  default     = false
}

variable "kafka_external_node_port" {
  description = "NodePort for external Kafka access"
  type        = number
  default     = 30092
<<<<<<< HEAD
}
=======
}

# ==========================
# Ruby Service Variables
# ==========================

variable "ruby_image_repository" {
  description = "Docker repository for the Ruby service image"
  type        = string
  default     = "orcacloud/orcacloud-ruby-service"
}

variable "ruby_image_tag" {
  description = "Docker image tag for the Ruby service"
  type        = string
  default     = "latest"
}

variable "ruby_replicas" {
  description = "Number of Ruby service web replicas"
  type        = number
  default     = 2
}

variable "ruby_min_replicas" {
  description = "Minimum number of Ruby service replicas for HPA"
  type        = number
  default     = 2
}

variable "ruby_max_replicas" {
  description = "Maximum number of Ruby service replicas for HPA"
  type        = number
  default     = 10
}

variable "ruby_sidekiq_replicas" {
  description = "Number of Sidekiq worker replicas"
  type        = number
  default     = 1
}

variable "ruby_secret_key_base" {
  description = "Secret key base for Rails sessions"
  type        = string
  sensitive   = true
}

variable "ruby_sidekiq_username" {
  description = "Username for Sidekiq web interface"
  type        = string
  sensitive   = true
}

variable "ruby_sidekiq_password" {
  description = "Password for Sidekiq web interface"
  type        = string
  sensitive   = true
}

# Optional registry secret to use for pulling private images (kubernetes secret name)
variable "registry_secret_name" {
  description = "Kubernetes secret name to use for imagePullSecrets (optional)"
  type        = string
  default     = ""
}
>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
