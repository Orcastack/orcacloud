# Terraform variables for RabbitMQ module

variable "namespace" {
  description = "Kubernetes namespace for RabbitMQ deployment"
  type        = string
  default     = "default"
}

variable "service_name" {
  description = "Name of the RabbitMQ service"
  type        = string
  default     = "rabbitmq"
}

variable "rabbitmq_image" {
  description = "RabbitMQ Docker image"
  type        = string
  default     = "rabbitmq:3.12-management-alpine"
}

variable "replicas" {
  description = "Number of RabbitMQ replicas"
  type        = number
  default     = 1
}

variable "rabbitmq_username" {
  description = "RabbitMQ admin username"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "rabbitmq_password" {
  description = "RabbitMQ admin password"
  type        = string
  default     = "rabbitmq_password"
  sensitive   = true
}

variable "erlang_cookie" {
  description = "Erlang cookie for RabbitMQ clustering"
  type        = string
  default     = "SWQOKODSQALRPCLNMEQG"
  sensitive   = true
}

variable "default_vhost" {
  description = "Default virtual host"
  type        = string
  default     = "orcacloud"
}

variable "memory_high_watermark" {
  description = "Memory high watermark (relative)"
  type        = string
  default     = "0.4"
}

variable "disk_free_limit" {
  description = "Disk free limit"
  type        = string
  default     = "2GB"
}

variable "storage_class" {
  description = "Storage class for persistent volumes"
  type        = string
  default     = "standard"
}

variable "storage_size" {
  description = "Storage size for RabbitMQ data"
  type        = string
  default     = "8Gi"
}

variable "enable_external_access" {
  description = "Enable external access to RabbitMQ"
  type        = bool
  default     = false
}

variable "external_service_type" {
  description = "External service type (NodePort, LoadBalancer)"
  type        = string
  default     = "NodePort"
}

variable "amqp_node_port" {
  description = "NodePort for AMQP access"
  type        = number
  default     = 30672
}

variable "management_node_port" {
  description = "NodePort for management UI access"
  type        = number
  default     = 31672
}

variable "enable_monitoring" {
  description = "Enable Prometheus monitoring"
  type        = bool
  default     = true
}

variable "resources" {
  description = "Resource requests and limits for RabbitMQ"
  type = object({
    requests = object({
      cpu    = string
      memory = string
    })
    limits = object({
      cpu    = string
      memory = string
    })
  })
  default = {
    requests = {
      cpu    = "250m"
      memory = "512Mi"
    }
    limits = {
      cpu    = "1"
      memory = "2Gi"
    }
  }
}