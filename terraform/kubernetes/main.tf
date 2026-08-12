# OrcaCloud - Kubernetes Infrastructure
terraform {
<<<<<<< HEAD
  required_version = ">= 1.0"
  
  cloud {
    organization = "OrcaCloud-Platform"

    workspaces {
      name = "orcacloud-developers"
    }
  }
  
=======
  cloud {

    organization = "OrcaCloud-Platform"

    workspaces {
      name = "orcacloud"
    }
  }
  required_version = ">= 1.0"

  # Note: Terraform Cloud workspace configuration removed for local execution.
  # If you rely on Terraform Cloud, restore the `cloud { ... }` block and
  # run applies through Terraform Cloud; local applies will otherwise run
  # against your local kubeconfig/environment.

>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
  }
}

# Provider Configuration
provider "kubernetes" {
  host                   = var.kubernetes_host != "" ? var.kubernetes_host : null
  token                  = var.kubernetes_token != "" ? var.kubernetes_token : null
  cluster_ca_certificate = var.kubernetes_cluster_ca_certificate != "" ? base64decode(var.kubernetes_cluster_ca_certificate) : null
  config_path            = var.kubernetes_host == "" ? var.kubeconfig_path : null
}

# Local Values
locals {
  name_prefix = "${var.project_name}-${var.environment}"
<<<<<<< HEAD
  
=======

>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
  common_labels = {
    "app.kubernetes.io/name"       = var.project_name
    "app.kubernetes.io/instance"   = var.environment
    "app.kubernetes.io/version"    = var.app_version
    "app.kubernetes.io/component"  = "platform"
<<<<<<< HEAD
    "app.kubernetes.io/part-of"    = "orcacloud"
=======
    "app.kubernetes.io/part-of"    = "orcacloud"
>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
    "app.kubernetes.io/managed-by" = "terraform"
    "environment"                  = var.environment
    "project"                      = var.project_name
  }

  annotations = {
    "terraform.io/managed"          = "true"
    "orcacloud.com/environment"    = var.environment
    "orcacloud.com/version"        = var.app_version
    "orcacloud.com/deployed-by"    = "terraform"
    "orcacloud.com/deployed-at"    = timestamp()
  }
}

# Namespace Module
module "namespace" {
  source = "./modules/namespace"
<<<<<<< HEAD
  
=======

>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
  name        = var.namespace
  labels      = local.common_labels
  annotations = local.annotations
}

# PostgreSQL Module
module "postgresql" {
  source = "./modules/postgresql"
<<<<<<< HEAD
  
  namespace   = module.namespace.name
  name_prefix = local.name_prefix
  
  database_name = var.database_name
  username      = var.database_username
  
  storage_class = var.storage_class
  storage_size  = var.postgresql_storage_size
  
  enable_monitoring = var.enable_monitoring
  
=======

  namespace   = module.namespace.name
  name_prefix = local.name_prefix

  database_name = var.database_name
  username      = var.database_username

  storage_class = var.storage_class
  storage_size  = var.postgresql_storage_size

  enable_monitoring = var.enable_monitoring

>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
  labels      = local.common_labels
  annotations = local.annotations
}

# Redis Module
module "redis" {
  source = "./modules/redis"
<<<<<<< HEAD
  
  namespace   = module.namespace.name
  name_prefix = local.name_prefix
  
  storage_class = var.storage_class
  storage_size  = var.redis_storage_size
  
  enable_monitoring = var.enable_monitoring
  
=======

  namespace   = module.namespace.name
  name_prefix = local.name_prefix

  storage_class = var.storage_class
  storage_size  = var.redis_storage_size

  enable_monitoring = var.enable_monitoring

>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
  labels      = local.common_labels
  annotations = local.annotations
}

# Zookeeper Module
module "zookeeper" {
  source = "./modules/zookeeper"
<<<<<<< HEAD
  
  namespace   = module.namespace.name
  name_prefix = local.name_prefix
  
  storage_class = var.storage_class
  storage_size  = var.zookeeper_storage_size
  
=======

  namespace   = module.namespace.name
  name_prefix = local.name_prefix

  storage_class = var.storage_class
  storage_size  = var.zookeeper_storage_size

>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
  client_port                   = var.zookeeper_client_port
  tick_time                     = var.zookeeper_tick_time
  init_limit                    = var.zookeeper_init_limit
  sync_limit                    = var.zookeeper_sync_limit
  max_client_connections        = var.zookeeper_max_client_connections
  autopurge_snap_retain_count   = var.zookeeper_autopurge_snap_retain_count
  autopurge_purge_interval      = var.zookeeper_autopurge_purge_interval
  enable_jmx                    = var.zookeeper_enable_jmx
  jmx_port                      = var.zookeeper_jmx_port
<<<<<<< HEAD
  
  resource_limits = var.resource_limits.zookeeper
  
=======

  resource_limits = var.resource_limits.zookeeper

>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
  labels      = local.common_labels
  annotations = local.annotations
}

# Kafka Module
module "kafka" {
  source = "./modules/kafka"
<<<<<<< HEAD
  
  namespace = module.namespace.name
  
  zookeeper_connect      = module.zookeeper.connection_string
  zookeeper_service_name = module.zookeeper.service_name
  
=======

  namespace = module.namespace.name

  zookeeper_connect      = module.zookeeper.connection_string
  zookeeper_service_name = module.zookeeper.service_name

>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
  replicas            = var.kafka_replicas
  replication_factor  = var.kafka_replication_factor
  min_isr            = var.kafka_min_isr
  default_partitions = var.kafka_default_partitions
<<<<<<< HEAD
  
=======

>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
  log_retention_hours = var.kafka_log_retention_hours
  log_segment_bytes   = var.kafka_log_segment_bytes
  message_max_bytes   = var.kafka_message_max_bytes
  auto_create_topics  = var.kafka_auto_create_topics
<<<<<<< HEAD
  
  storage_class = var.storage_class
  storage_size  = var.kafka_storage_size
  
  enable_external_access = var.kafka_enable_external_access
  external_node_port     = var.kafka_external_node_port
  enable_monitoring      = var.enable_monitoring
  
=======

  storage_class = var.storage_class
  storage_size  = var.kafka_storage_size

  enable_external_access = var.kafka_enable_external_access
  external_node_port     = var.kafka_external_node_port
  enable_monitoring      = var.enable_monitoring

>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
  resources = {
    requests = {
      cpu    = var.resource_limits.kafka.cpu_request
      memory = var.resource_limits.kafka.memory_request
    }
    limits = {
      cpu    = var.resource_limits.kafka.cpu_limit
      memory = var.resource_limits.kafka.memory_limit
    }
  }
<<<<<<< HEAD
  
=======

>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
  depends_on = [module.zookeeper]
}

# Backend Module
module "backend" {
  source = "./modules/backend"
<<<<<<< HEAD
  
  namespace   = module.namespace.name
  name_prefix = local.name_prefix
  
  image_registry   = var.image_registry
  image_repository = var.backend_image_repository
  image_tag        = var.backend_image_tag
  
  replicas     = var.backend_replicas
  min_replicas = var.backend_min_replicas
  max_replicas = var.backend_max_replicas
  
  database_url  = module.postgresql.connection_url
  redis_url     = module.redis.connection_url
  zookeeper_url = module.zookeeper.connection_string
  
  secret_key      = var.django_secret_key
  allowed_hosts   = var.allowed_hosts
  cors_origins    = var.cors_allowed_origins
  
  storage_class = var.storage_class
  media_size    = var.media_storage_size
  
  resource_limits = var.resource_limits.backend
  environment     = var.environment
  
  labels      = local.common_labels
  annotations = local.annotations
  
=======

  namespace   = module.namespace.name
  name_prefix = local.name_prefix

  image_registry   = var.image_registry
  image_repository = var.backend_image_repository
  image_tag        = var.backend_image_tag

  replicas     = var.backend_replicas
  min_replicas = var.backend_min_replicas
  max_replicas = var.backend_max_replicas

  database_url  = module.postgresql.connection_url
  redis_url     = module.redis.connection_url
  zookeeper_url = module.zookeeper.connection_string

  secret_key      = var.django_secret_key
  allowed_hosts   = var.allowed_hosts
  cors_origins    = var.cors_allowed_origins

  storage_class = var.storage_class
  media_size    = var.media_storage_size

  resource_limits = var.resource_limits.backend
  environment     = var.environment

  labels      = local.common_labels
  annotations = local.annotations

>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
  depends_on = [
    module.postgresql,
    module.redis,
    module.zookeeper
  ]
}

# Frontend Module
module "frontend" {
  source = "./modules/frontend"
<<<<<<< HEAD
  
  namespace   = module.namespace.name
  name_prefix = local.name_prefix
  
  image_registry   = var.image_registry
  image_repository = var.frontend_image_repository
  image_tag        = var.frontend_image_tag
  
  replicas     = var.frontend_replicas
  min_replicas = var.frontend_min_replicas
  max_replicas = var.frontend_max_replicas
  
  api_url     = var.api_url
  environment = var.environment
  
  labels      = local.common_labels
  annotations = local.annotations
=======

  namespace   = module.namespace.name
  name_prefix = local.name_prefix

  image_registry   = var.image_registry
  image_repository = var.frontend_image_repository
  image_tag        = var.frontend_image_tag

  replicas     = var.frontend_replicas
  min_replicas = var.frontend_min_replicas
  max_replicas = var.frontend_max_replicas

  api_url     = var.api_url
  environment = var.environment

  labels      = local.common_labels
  annotations = local.annotations
  # Forward registry secret name to module so pods can use imagePullSecrets
  image_pull_secrets = var.registry_secret_name != "" ? [var.registry_secret_name] : []
>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
}

# Celery Module
module "celery" {
  source = "./modules/celery"
<<<<<<< HEAD
  
  namespace   = module.namespace.name
  name_prefix = local.name_prefix
  
  image_registry   = var.image_registry
  image_repository = var.backend_image_repository
  image_tag        = var.backend_image_tag
  
  worker_replicas     = var.celery_worker_replicas
  worker_min_replicas = var.celery_worker_min_replicas
  worker_max_replicas = var.celery_worker_max_replicas
  
  database_url  = module.postgresql.connection_url
  redis_url     = module.redis.connection_url
  zookeeper_url = module.zookeeper.connection_string
  
  secret_key = var.django_secret_key
  
  resource_limits = var.resource_limits.celery
  
  labels      = local.common_labels
  annotations = local.annotations
  
=======

  namespace   = module.namespace.name
  name_prefix = local.name_prefix

  image_registry   = var.image_registry
  image_repository = var.backend_image_repository
  image_tag        = var.backend_image_tag

  worker_replicas     = var.celery_worker_replicas
  worker_min_replicas = var.celery_worker_min_replicas
  worker_max_replicas = var.celery_worker_max_replicas

  database_url  = module.postgresql.connection_url
  redis_url     = module.redis.connection_url
  zookeeper_url = module.zookeeper.connection_string

  secret_key = var.django_secret_key

  resource_limits = var.resource_limits.celery

  labels      = local.common_labels
  annotations = local.annotations

>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
  depends_on = [
    module.postgresql,
    module.redis,
    module.zookeeper
  ]
}

# Ingress Module
module "ingress" {
  source = "./modules/ingress"
<<<<<<< HEAD
  
  namespace   = module.namespace.name
  name_prefix = local.name_prefix
  
  domain_name    = var.domain_name
  tls_secret     = var.tls_secret_name
  ingress_class  = var.ingress_class
  
  backend_service  = module.backend.service_name
  frontend_service = module.frontend.service_name
  
  labels      = local.common_labels
  annotations = merge(local.annotations, var.ingress_annotations)
}

# Monitoring Module (Optional)
module "monitoring" {
  source = "./modules/monitoring"
  count  = var.enable_monitoring ? 1 : 0
  
  namespace   = module.namespace.name
  name_prefix = local.name_prefix
  
  labels      = local.common_labels
  annotations = local.annotations
}
=======

  namespace   = module.namespace.name
  name_prefix = local.name_prefix

  domain_name    = var.domain_name
  tls_secret     = var.tls_secret_name
  ingress_class  = var.ingress_class

  backend_service  = module.backend.service_name
  frontend_service = module.frontend.service_name
  ruby_service     = module.ruby_service.service_name

  labels      = local.common_labels
  annotations = merge(local.annotations, var.ingress_annotations)
}# Ruby Service Module
module "ruby_service" {
  source = "./modules/ruby-service"

  namespace   = module.namespace.name

  image_registry   = var.image_registry
  image_repository = var.ruby_image_repository
  image_tag        = var.ruby_image_tag

  replicas         = var.ruby_replicas
  min_replicas     = var.ruby_min_replicas
  max_replicas     = var.ruby_max_replicas
  sidekiq_replicas = var.ruby_sidekiq_replicas

  database_url    = module.postgresql.connection_url
  redis_url       = module.redis.connection_url
  zookeeper_url   = module.zookeeper.connection_string

  secret_key_base  = var.ruby_secret_key_base
  sidekiq_username = var.ruby_sidekiq_username
  sidekiq_password = var.ruby_sidekiq_password

  labels      = local.common_labels
  annotations = local.annotations

  depends_on = [
    module.postgresql,
    module.redis,
    module.zookeeper
  ]
}
>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
