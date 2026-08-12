# Kubernetes Service Module - variables.tf

variable "service_name" {
  description = "Name of the service"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
  default     = "orcacloud"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "production"
}

variable "service_version" {
  description = "Service version/tag"
  type        = string
  default     = "latest"
}

variable "image_registry" {
  description = "Container image registry"
  type        = string
  default     = "orcacloud"
}

variable "replicas" {
  description = "Number of pod replicas"
  type        = number
  default     = 2
  validation {
    condition     = var.replicas >= 1
    error_message = "Replicas must be at least 1"
  }
}

variable "http_port" {
  description = "HTTP port number"
  type        = number
  default     = 8080
}

variable "metrics_port" {
  description = "Metrics port number (Prometheus)"
  type        = number
  default     = 9090
}

variable "cpu_request" {
  description = "CPU request (e.g., '500m', '1')"
  type        = string
  default     = "250m"
}

variable "cpu_limit" {
  description = "CPU limit"
  type        = string
  default     = "500m"
}

variable "memory_request" {
  description = "Memory request (e.g., '256Mi', '1Gi')"
  type        = string
  default     = "256Mi"
}

variable "memory_limit" {
  description = "Memory limit"
  type        = string
  default     = "512Mi"
}

variable "env_vars" {
  description = "Environment variables as key-value pairs"
  type        = map(string)
  default     = {}
}

variable "additional_env" {
  description = "Additional environment variables"
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secret references {ENV_VAR: {secret_name, secret_key}}"
  type        = map(object({
    secret_name = string
    secret_key  = string
  }))
  default = {}
}

variable "health_check_path" {
  description = "HTTP path for liveness probe"
  type        = string
  default     = "/health"
}

variable "readiness_check_path" {
  description = "HTTP path for readiness probe"
  type        = string
  default     = "/ready"
}

variable "liveness_initial_delay" {
  description = "Liveness probe initial delay seconds"
  type        = number
  default     = 30
}

variable "liveness_period" {
  description = "Liveness probe period seconds"
  type        = number
  default     = 30
}

variable "liveness_timeout" {
  description = "Liveness probe timeout seconds"
  type        = number
  default     = 5
}

variable "liveness_failure_threshold" {
  description = "Liveness probe failure threshold"
  type        = number
  default     = 3
}

variable "readiness_initial_delay" {
  description = "Readiness probe initial delay seconds"
  type        = number
  default     = 10
}

variable "readiness_period" {
  description = "Readiness probe period seconds"
  type        = number
  default     = 10
}

variable "readiness_timeout" {
  description = "Readiness probe timeout seconds"
  type        = number
  default     = 5
}

variable "readiness_failure_threshold" {
  description = "Readiness probe failure threshold"
  type        = number
  default     = 3
}

variable "enable_startup_probe" {
  description = "Enable startup probe"
  type        = bool
  default     = false
}

variable "startup_initial_delay" {
  description = "Startup probe initial delay seconds"
  type        = number
  default     = 0
}

variable "startup_period" {
  description = "Startup probe period seconds"
  type        = number
  default     = 10
}

variable "startup_timeout" {
  description = "Startup probe timeout seconds"
  type        = number
  default     = 5
}

variable "startup_failure_threshold" {
  description = "Startup probe failure threshold"
  type        = number
  default     = 30
}

variable "volume_mounts" {
  description = "Volume mounts [{name, mount_path, read_only}]"
  type = list(object({
    name       = string
    mount_path = string
    read_only  = optional(bool, false)
  }))
  default = []
}

variable "volumes" {
  description = "Volumes to mount"
  type = list(object({
    name     = string
    config_map = optional(string)
    secret   = optional(string)
    pvc_name = optional(string)
    empty_dir = optional(bool)
  }))
  default = []
}

variable "init_containers" {
  description = "Init containers"
  type = list(object({
    name           = string
    image          = string
    cpu_request    = optional(string, "100m")
    cpu_limit      = optional(string, "200m")
    memory_request = optional(string, "128Mi")
    memory_limit   = optional(string, "256Mi")
  }))
  default = []
}

variable "service_type" {
  description = "Kubernetes service type (ClusterIP, LoadBalancer, NodePort)"
  type        = string
  default     = "ClusterIP"
  validation {
    condition     = contains(["ClusterIP", "LoadBalancer", "NodePort"], var.service_type)
    error_message = "Service type must be ClusterIP, LoadBalancer, or NodePort"
  }
}

variable "session_affinity" {
  description = "Session affinity (None or ClientIP)"
  type        = string
  default     = "None"
}

variable "load_balancer_source_ranges" {
  description = "Load balancer source IP ranges"
  type        = list(string)
  default     = []
}

variable "enable_autoscaling" {
  description = "Enable HorizontalPodAutoscaler"
  type        = bool
  default     = true
}

variable "autoscaling_min_replicas" {
  description = "Minimum replicas for autoscaling"
  type        = number
  default     = 2
}

variable "autoscaling_max_replicas" {
  description = "Maximum replicas for autoscaling"
  type        = number
  default     = 10
}

variable "autoscaling_target_cpu" {
  description = "Target CPU utilization percentage"
  type        = number
  default     = 70
}

variable "autoscaling_target_memory" {
  description = "Target memory utilization percentage"
  type        = number
  default     = 80
}

variable "enable_network_policy" {
  description = "Enable NetworkPolicy"
  type        = bool
  default     = false
}

variable "allowed_ingress_namespaces" {
  description = "Labels for allowed ingress namespaces"
  type        = map(string)
  default     = {}
}

variable "enable_pdb" {
  description = "Enable PodDisruptionBudget"
  type        = bool
  default     = true
}

variable "create_namespace" {
  description = "Create namespace if it doesn't exist"
  type        = bool
  default     = true
}
