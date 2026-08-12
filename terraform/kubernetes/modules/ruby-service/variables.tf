# Ruby Service Module Variables

variable "namespace" {
  description = "Kubernetes namespace for the Ruby service"
  type        = string
}

variable "labels" {
  description = "Labels to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "annotations" {
  description = "Annotations to apply to resources"
  type        = map(string)
  default     = {}
}

# Image configuration
variable "image_registry" {
  description = "Docker registry for the Ruby service image"
  type        = string
  default     = "ghcr.io"
}

variable "image_repository" {
  description = "Docker repository for the Ruby service image"
  type        = string
  default     = "orcacloud/orcacloud-ruby-service"
}

variable "image_tag" {
  description = "Docker image tag for the Ruby service"
  type        = string
  default     = "latest"
}

# Deployment configuration
variable "replicas" {
  description = "Number of Ruby service web replicas"
  type        = number
  default     = 2
}

variable "min_replicas" {
  description = "Minimum number of replicas for HPA"
  type        = number
  default     = 2
}

variable "max_replicas" {
  description = "Maximum number of replicas for HPA"
  type        = number
  default     = 10
}

variable "sidekiq_replicas" {
  description = "Number of Sidekiq worker replicas"
  type        = number
  default     = 1
}

# Service configuration
variable "service_port" {
  description = "Port for the Ruby service"
  type        = number
  default     = 3000
}

# Environment configuration
variable "environment" {
  description = "Environment (development, staging, production)"
  type        = string
  default     = "production"
}

variable "log_level" {
  description = "Log level for the Ruby service"
  type        = string
  default     = "info"
}

variable "enable_sidekiq_scheduler" {
  description = "Enable Sidekiq scheduler"
  type        = string
  default     = "true"
}

# Database configuration
variable "database_url" {
  description = "Database connection URL"
  type        = string
  sensitive   = true
}

# Redis configuration
variable "redis_url" {
  description = "Redis connection URL"
  type        = string
  sensitive   = true
}

# Zookeeper configuration
variable "zookeeper_url" {
  description = "Zookeeper connection URL"
  type        = string
  sensitive   = true
}

# Security configuration
variable "secret_key_base" {
  description = "Secret key base for Rails sessions"
  type        = string
  sensitive   = true
}

variable "sidekiq_username" {
  description = "Username for Sidekiq web interface"
  type        = string
  sensitive   = true
}

variable "sidekiq_password" {
  description = "Password for Sidekiq web interface"
  type        = string
  sensitive   = true
}

# Puma configuration
variable "puma_bind" {
  description = "Puma bind address"
  type        = string
  default     = "tcp://0.0.0.0:3000"
}

variable "puma_port" {
  description = "Puma port"
  type        = number
  default     = 3000
}

variable "puma_workers" {
  description = "Number of Puma workers"
  type        = number
  default     = 2
}

variable "puma_min_threads" {
  description = "Minimum Puma threads per worker"
  type        = number
  default     = 1
}

variable "puma_max_threads" {
  description = "Maximum Puma threads per worker"
  type        = number
  default     = 16
}

variable "puma_preload_app" {
  description = "Preload Puma application"
  type        = string
  default     = "true"
}

# Sidekiq configuration
variable "sidekiq_concurrency" {
  description = "Sidekiq concurrency"
  type        = number
  default     = 25
}

variable "sidekiq_timeout" {
  description = "Sidekiq timeout"
  type        = number
  default     = 25
}

variable "sidekiq_queues" {
  description = "Sidekiq queues configuration"
  type        = list(string)
  default     = ["critical", "editorial", "ci", "default"]
}

variable "sidekiq_schedule" {
  description = "Sidekiq schedule configuration"
  type        = map(any)
  default     = {
    article_indexing = {
      cron  = "*/5 * * * *"
      class = "EditorialWorker"
      args  = ["index_articles"]
      queue = "editorial"
    }
    feed_updates = {
      cron  = "*/15 * * * *"
      class = "EditorialWorker"
      args  = ["update_feeds"]
      queue = "editorial"
    }
    process_build_queue = {
      cron  = "* * * * *"
      class = "CIWorker"
      args  = ["process_build_queue"]
      queue = "ci"
    }
  }
}

# Resource limits
variable "resources" {
  description = "Resource limits for Ruby service web pods"
  type = object({
    requests = object({
      memory = string
      cpu    = string
    })
    limits = object({
      memory = string
      cpu    = string
    })
  })
  default = {
    requests = {
      memory = "256Mi"
      cpu    = "250m"
    }
    limits = {
      memory = "512Mi"
      cpu    = "500m"
    }
  }
}

variable "sidekiq_resources" {
  description = "Resource limits for Sidekiq worker pods"
  type = object({
    requests = object({
      memory = string
      cpu    = string
    })
    limits = object({
      memory = string
      cpu    = string
    })
  })
  default = {
    requests = {
      memory = "256Mi"
      cpu    = "100m"
    }
    limits = {
      memory = "1Gi"
      cpu    = "500m"
    }
  }
}

# HPA configuration
variable "cpu_utilization_target" {
  description = "CPU utilization target for HPA"
  type        = number
  default     = 70
}

variable "memory_utilization_target" {
  description = "Memory utilization target for HPA"
  type        = number
  default     = 80
}
