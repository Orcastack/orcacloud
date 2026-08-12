variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
}

variable "name_prefix" {
  description = "Name prefix for resources"
  type        = string
}

variable "database_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "orcacloud_db"
}

variable "username" {
  description = "PostgreSQL username"
  type        = string
  default     = "orcaclouduser"
}

variable "storage_class" {
  description = "Storage class for persistent volume"
  type        = string
  default     = "standard"
}

variable "storage_size" {
  description = "Storage size for persistent volume"
  type        = string
  default     = "20Gi"
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}

variable "annotations" {
  description = "Annotations to apply to resources"
  type        = map(string)
  default     = {}
}

variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15"
}

variable "backup_enabled" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "enable_monitoring" {
  description = "Enable PostgreSQL monitoring and ServiceMonitor"
  type        = bool
  default     = false
}

variable "resource_limits" {
  description = "Resource limits for PostgreSQL"
  type = object({
    cpu_request    = string
    cpu_limit      = string
    memory_request = string
    memory_limit   = string
  })
  default = {
    cpu_request    = "250m"
    cpu_limit      = "1000m"
    memory_request = "512Mi"
    memory_limit   = "2Gi"
  }
}