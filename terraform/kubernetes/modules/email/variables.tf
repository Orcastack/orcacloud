# Terraform variables for Email module

variable "namespace" {
  description = "Kubernetes namespace for email services"
  type        = string
  default     = "default"
}

variable "environment" {
  description = "Environment (development/production)"
  type        = string
  default     = "development"
  validation {
    condition     = contains(["development", "production"], var.environment)
    error_message = "Environment must be either 'development' or 'production'."
  }
}

variable "hostname" {
  description = "Server hostname for email services"
  type        = string
  default     = "mail.orcacloud.com"
}

variable "domain" {
  description = "Email domain"
  type        = string
  default     = "orcacloud.com"
}

variable "trusted_networks" {
  description = "Trusted networks for Postfix"
  type        = string
  default     = "10.0.0.0/8 172.16.0.0/12 192.168.0.0/16"
}

variable "smtp_relay_host" {
  description = "SMTP relay host"
  type        = string
  default     = "smtp.gmail.com"
}

variable "smtp_relay_port" {
  description = "SMTP relay port"
  type        = number
  default     = 587
}

variable "smtp_username" {
  description = "SMTP username for relay"
  type        = string
  default     = ""
  sensitive   = true
}

variable "smtp_password" {
  description = "SMTP password for relay"
  type        = string
  default     = ""
  sensitive   = true
}

variable "message_size_limit" {
  description = "Maximum message size in bytes"
  type        = number
  default     = 10485760  # 10MB
}

variable "virtual_domains" {
  description = "Virtual domains for Postfix"
  type        = string
  default     = ""
}

variable "storage_class" {
  description = "Storage class for persistent volumes"
  type        = string
  default     = "standard"
}

variable "enable_external_access" {
  description = "Enable external access to email services"
  type        = bool
  default     = false
}

# MailHog Configuration
variable "mailhog_image" {
  description = "MailHog Docker image"
  type        = string
  default     = "mailhog/mailhog:v1.0.1"
}

variable "mailhog_storage_size" {
  description = "Storage size for MailHog data"
  type        = string
  default     = "1Gi"
}

variable "mailhog_web_node_port" {
  description = "NodePort for MailHog web interface"
  type        = number
  default     = 30825
}

variable "mailhog_resources" {
  description = "Resource requests and limits for MailHog"
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
      cpu    = "50m"
<<<<<<< HEAD
      memory = "64Mi"
=======
  memory = "128Mi"
>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
    }
    limits = {
      cpu    = "200m"
      memory = "256Mi"
    }
  }
}

# Postfix Configuration
variable "postfix_image" {
  description = "Postfix Docker image"
  type        = string
  default     = "juanluisbaptiste/postfix:1.4.0"
}

variable "postfix_replicas" {
  description = "Number of Postfix replicas"
  type        = number
  default     = 1
}

variable "postfix_storage_size" {
  description = "Storage size for Postfix data"
  type        = string
  default     = "2Gi"
}

variable "postfix_resources" {
  description = "Resource requests and limits for Postfix"
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
      cpu    = "100m"
      memory = "128Mi"
    }
    limits = {
      cpu    = "500m"
      memory = "512Mi"
    }
  }
}