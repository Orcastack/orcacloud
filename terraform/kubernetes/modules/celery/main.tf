# Secret for Celery configuration (reuse backend secret if needed)
resource "kubernetes_secret" "celery" {
  metadata {
    name      = "${var.name_prefix}-celery"
    namespace = var.namespace
    labels    = merge(var.labels, {
      "app.kubernetes.io/component" = "worker"
      "app.kubernetes.io/name"      = "celery"
    })
    annotations = var.annotations
  }
  
  type = "Opaque"
  
  data = {
    SECRET_KEY    = var.secret_key
    DATABASE_URL  = var.database_url
    REDIS_URL     = var.redis_url
    ZOOKEEPER_URL = var.zookeeper_url
  }
}

# ConfigMap for Celery configuration
resource "kubernetes_config_map" "celery" {
  metadata {
    name      = "${var.name_prefix}-celery-config"
    namespace = var.namespace
    labels    = merge(var.labels, {
      "app.kubernetes.io/component" = "worker"
      "app.kubernetes.io/name"      = "celery"
    })
    annotations = var.annotations
  }
  
  data = {
    # Celery Worker Settings
    CELERY_BROKER_URL               = var.redis_url
    CELERY_RESULT_BACKEND           = var.redis_url
    CELERY_TASK_SERIALIZER          = "json"
    CELERY_RESULT_SERIALIZER        = "json"
    CELERY_ACCEPT_CONTENT           = "json"
    CELERY_TIMEZONE                 = "UTC"
    CELERY_ENABLE_UTC               = "true"
    CELERY_WORKER_CONCURRENCY       = tostring(var.worker_concurrency)
    CELERY_WORKER_LOG_LEVEL         = var.worker_log_level
    CELERY_WORKER_HIJACK_ROOT_LOGGER = "false"
    CELERY_WORKER_LOG_FORMAT        = "[%(asctime)s: %(levelname)s/%(processName)s] %(message)s"
    CELERY_WORKER_TASK_LOG_FORMAT   = "[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s"
    
    # Task Settings
    CELERY_TASK_ALWAYS_EAGER        = "false"
    CELERY_TASK_EAGER_PROPAGATES    = "true"
    CELERY_TASK_IGNORE_RESULT       = "false"
    CELERY_TASK_STORE_EAGER_RESULT  = "true"
    CELERY_RESULT_EXPIRES           = "3600"
    CELERY_TASK_RESULT_EXPIRES      = "3600"
    
    # Connection Settings
    CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = "true"
    CELERY_BROKER_CONNECTION_RETRY = "true"
    CELERY_BROKER_CONNECTION_MAX_RETRIES = "100"
    
    # Performance Settings
    CELERY_WORKER_PREFETCH_MULTIPLIER = "1"
    CELERY_TASK_ACKS_LATE = "true"
    CELERY_WORKER_MAX_TASKS_PER_CHILD = "1000"
    
    # Monitoring
    CELERY_SEND_TASK_EVENTS = "true"
    CELERY_SEND_EVENTS = "true"
    CELERY_WORKER_SEND_TASK_EVENTS = "true"
    
    # Beat Schedule Settings (for scheduler)
    CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
    CELERY_BEAT_SCHEDULE_FILENAME = "/tmp/celerybeat-schedule"
  }
}

# Celery Worker Deployment
resource "kubernetes_deployment" "celery_worker" {
  metadata {
    name      = "${var.name_prefix}-celery-worker"
    namespace = var.namespace
    labels    = merge(var.labels, {
      "app.kubernetes.io/component" = "worker"
      "app.kubernetes.io/name"      = "celery"
    })
    annotations = var.annotations
  }
  
  spec {
    replicas = var.worker_replicas
    
    strategy {
      type = "RollingUpdate"
      rolling_update {
        max_unavailable = "25%"
        max_surge       = "25%"
      }
    }
    
    selector {
      match_labels = {
        "app.kubernetes.io/name"      = "celery"
        "app.kubernetes.io/instance"  = var.name_prefix
        "app.kubernetes.io/component" = "worker"
      }
    }
    
    template {
      metadata {
        labels = merge(var.labels, {
          "app.kubernetes.io/name"      = "celery"
          "app.kubernetes.io/instance"  = var.name_prefix
          "app.kubernetes.io/component" = "worker"
        })
        annotations = merge(var.annotations, {
          "prometheus.io/scrape" = "true"
          "prometheus.io/port"   = "8080"
        })
      }
      
      spec {
        container {
          name  = "celery-worker"
          image = "${var.image_registry}/${var.image_repository}:${var.image_tag}"
          
          command = [
            "celery",
            "-A",
            "orcacloud",
            "worker",
            "--loglevel=${var.worker_log_level}",
            "--concurrency=${var.worker_concurrency}",
            "--max-tasks-per-child=1000",
            "--prefetch-multiplier=1"
          ]
          
          env_from {
            secret_ref {
              name = kubernetes_secret.celery.metadata[0].name
            }
          }
          
          env_from {
            config_map_ref {
              name = kubernetes_config_map.celery.metadata[0].name
            }
          }
          
          env {
            name = "POD_NAME"
            value_from {
              field_ref {
                field_path = "metadata.name"
              }
            }
          }
          
          env {
            name = "POD_NAMESPACE"
            value_from {
              field_ref {
                field_path = "metadata.namespace"
              }
            }
          }
          
          env {
            name  = "C_FORCE_ROOT"
            value = "1"
          }
          
          resources {
            requests = {
              cpu    = var.resource_limits.cpu_request
              memory = var.resource_limits.memory_request
            }
            limits = {
              cpu    = var.resource_limits.cpu_limit
              memory = var.resource_limits.memory_limit
            }
          }
          
          liveness_probe {
            exec {
              command = [
                "celery",
                "-A",
                "orcacloud",
                "inspect",
                "ping"
              ]
            }
            initial_delay_seconds = 30
            period_seconds        = 30
            timeout_seconds       = 10
            failure_threshold     = 3
          }
          
          readiness_probe {
            exec {
              command = [
                "celery",
                "-A",
                "orcacloud",
                "inspect",
                "ping"
              ]
            }
            initial_delay_seconds = 10
            period_seconds        = 10
            timeout_seconds       = 5
            failure_threshold     = 3
          }
        }
        
        # Celery Exporter for Prometheus monitoring
        container {
          name  = "celery-exporter"
          image = "danihodovic/celery-exporter:latest"
          
          port {
            name           = "metrics"
            container_port = 8080
            protocol       = "TCP"
          }
          
          env {
            name  = "CELERY_EXPORTER_BROKER_URL"
            value = var.redis_url
          }
          
          env {
            name  = "CELERY_EXPORTER_LOG_LEVEL"
            value = "INFO"
          }
          
          resources {
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
          
          liveness_probe {
            http_get {
              path = "/metrics"
              port = 8080
            }
            initial_delay_seconds = 30
            period_seconds        = 30
          }
        }
        
        security_context {
          run_as_user     = 1000
          run_as_group    = 1000
          fs_group        = 1000
          run_as_non_root = true
        }
        
        restart_policy = "Always"
      }
    }
  }
}

# Celery Beat (Scheduler) Deployment
resource "kubernetes_deployment" "celery_beat" {
  metadata {
    name      = "${var.name_prefix}-celery-beat"
    namespace = var.namespace
    labels    = merge(var.labels, {
      "app.kubernetes.io/component" = "scheduler"
      "app.kubernetes.io/name"      = "celery-beat"
    })
    annotations = var.annotations
  }
  
  spec {
    replicas = 1  # Only one beat scheduler should run
    
    strategy {
      type = "Recreate"  # Ensure only one instance runs at a time
    }
    
    selector {
      match_labels = {
        "app.kubernetes.io/name"      = "celery-beat"
        "app.kubernetes.io/instance"  = var.name_prefix
        "app.kubernetes.io/component" = "scheduler"
      }
    }
    
    template {
      metadata {
        labels = merge(var.labels, {
          "app.kubernetes.io/name"      = "celery-beat"
          "app.kubernetes.io/instance"  = var.name_prefix
          "app.kubernetes.io/component" = "scheduler"
        })
        annotations = var.annotations
      }
      
      spec {
        container {
          name  = "celery-beat"
          image = "${var.image_registry}/${var.image_repository}:${var.image_tag}"
          
          command = [
            "celery",
            "-A",
            "orcacloud",
            "beat",
            "--loglevel=INFO",
            "--scheduler=django_celery_beat.schedulers:DatabaseScheduler"
          ]
          
          env_from {
            secret_ref {
              name = kubernetes_secret.celery.metadata[0].name
            }
          }
          
          env_from {
            config_map_ref {
              name = kubernetes_config_map.celery.metadata[0].name
            }
          }
          
          env {
            name = "POD_NAME"
            value_from {
              field_ref {
                field_path = "metadata.name"
              }
            }
          }
          
          env {
            name = "POD_NAMESPACE"
            value_from {
              field_ref {
                field_path = "metadata.namespace"
              }
            }
          }
          
          env {
            name  = "C_FORCE_ROOT"
            value = "1"
          }
          
          volume_mount {
            name       = "beat-schedule"
            mount_path = "/tmp"
          }
          
          resources {
            requests = {
              cpu    = "100m"
              memory = "256Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "1Gi"
            }
          }
        }
        
        volume {
          name = "beat-schedule"
          empty_dir {}
        }
        
        security_context {
          run_as_user     = 1000
          run_as_group    = 1000
          fs_group        = 1000
          run_as_non_root = true
        }
        
        restart_policy = "Always"
      }
    }
  }
}

# Service for Celery monitoring
resource "kubernetes_service" "celery_metrics" {
  metadata {
    name      = "${var.name_prefix}-celery-metrics"
    namespace = var.namespace
    labels    = merge(var.labels, {
      "app.kubernetes.io/component" = "worker"
      "app.kubernetes.io/name"      = "celery"
    })
    annotations = merge(var.annotations, {
      "prometheus.io/scrape" = "true"
      "prometheus.io/port"   = "8080"
      "prometheus.io/path"   = "/metrics"
    })
  }
  
  spec {
    type = "ClusterIP"
    
    port {
      name        = "metrics"
      port        = 8080
      target_port = 8080
      protocol    = "TCP"
    }
    
    selector = {
      "app.kubernetes.io/name"      = "celery"
      "app.kubernetes.io/instance"  = var.name_prefix
      "app.kubernetes.io/component" = "worker"
    }
  }
}

# Horizontal Pod Autoscaler for Celery Workers
resource "kubernetes_horizontal_pod_autoscaler_v2" "celery_worker" {
  metadata {
    name      = "${var.name_prefix}-celery-worker-hpa"
    namespace = var.namespace
    labels    = merge(var.labels, {
      "app.kubernetes.io/component" = "worker"
      "app.kubernetes.io/name"      = "celery"
    })
  }
  
  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.celery_worker.metadata[0].name
    }
    
    min_replicas = var.worker_min_replicas
    max_replicas = var.worker_max_replicas
    
    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }
    
    metric {
      type = "Resource"
      resource {
        name = "memory"
        target {
          type                = "Utilization"
          average_utilization = 80
        }
      }
    }
    
    behavior {
      scale_up {
        stabilization_window_seconds = 60
        select_policy = "Max"
        policy {
          type          = "Percent"
          value         = 100
          period_seconds = 15
        }
        policy {
          type          = "Pods"
          value         = 2
          period_seconds = 60
        }
      }
      
      scale_down {
        stabilization_window_seconds = 300
        select_policy = "Min"
        policy {
          type          = "Percent"
          value         = 10
          period_seconds = 60
        }
        policy {
          type          = "Pods"
          value         = 1
          period_seconds = 60
        }
      }
    }
  }
}