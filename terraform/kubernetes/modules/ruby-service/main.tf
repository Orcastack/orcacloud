# Ruby Service Module
# Deploys the OrcaCloud Ruby service with Sidekiq workers

terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
  }
}

# Service Account
resource "kubernetes_service_account" "ruby_service" {
  metadata {
    name      = "ruby-service-sa"
    namespace = var.namespace
    labels    = var.labels
  }
}

# ConfigMap for Ruby service configuration
resource "kubernetes_config_map" "ruby_service_config" {
  metadata {
    name      = "ruby-service-config"
    namespace = var.namespace
    labels    = var.labels
  }

  data = {
    "puma.rb" = templatefile("${path.module}/templates/puma.rb.tpl", {
      rack_env     = var.environment
      bind         = var.puma_bind
      port         = var.puma_port
      workers      = var.puma_workers
      min_threads  = var.puma_min_threads
      max_threads  = var.puma_max_threads
      preload_app  = var.puma_preload_app
    })

    "sidekiq.yml" = templatefile("${path.module}/templates/sidekiq.yml.tpl", {
      concurrency = var.sidekiq_concurrency
      timeout     = var.sidekiq_timeout
      queues      = var.sidekiq_queues
      schedule    = var.sidekiq_schedule
    })
  }
}

# Secret for Ruby service
resource "kubernetes_secret" "ruby_service_secrets" {
  metadata {
    name      = "ruby-service-secrets"
    namespace = var.namespace
    labels    = var.labels
  }

  data = {
    "database-url"       = base64encode(var.database_url)
    "redis-url"          = base64encode(var.redis_url)
    "secret-key-base"    = base64encode(var.secret_key_base)
    "sidekiq-username"   = base64encode(var.sidekiq_username)
    "sidekiq-password"   = base64encode(var.sidekiq_password)
    "zookeeper-url"      = base64encode(var.zookeeper_url)
  }

  type = "Opaque"
}

# Deployment for Ruby service web
resource "kubernetes_deployment" "ruby_service_web" {
  metadata {
    name      = "ruby-service"
    namespace = var.namespace
    labels    = merge(var.labels, {
      component = "web"
    })
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app     = "ruby-service"
        component = "web"
      }
    }

    template {
      metadata {
        labels = merge(var.labels, {
          component = "web"
        })
        annotations = merge(var.annotations, {
          "prometheus.io/scrape" = "true"
          "prometheus.io/port"   = var.service_port
          "prometheus.io/path"   = "/metrics"
        })
      }

      spec {
        service_account_name = kubernetes_service_account.ruby_service.metadata[0].name

        container {
          name  = "ruby-service"
          image = "${var.image_registry}/${var.image_repository}:${var.image_tag}"

          port {
            container_port = var.service_port
            name           = "http"
          }

          env {
            name  = "RACK_ENV"
            value = var.environment
          }

          env {
            name  = "PORT"
            value = var.service_port
          }

          env {
            name = "DATABASE_URL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.ruby_service_secrets.metadata[0].name
                key  = "database-url"
              }
            }
          }

          env {
            name = "REDIS_URL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.ruby_service_secrets.metadata[0].name
                key  = "redis-url"
              }
            }
          }

          env {
            name = "SECRET_KEY_BASE"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.ruby_service_secrets.metadata[0].name
                key  = "secret-key-base"
              }
            }
          }

          env {
            name = "ZOOKEEPER_URL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.ruby_service_secrets.metadata[0].name
                key  = "zookeeper-url"
              }
            }
          }

          env {
            name  = "LOG_LEVEL"
            value = var.log_level
          }

          env {
            name  = "ENABLE_SIDEKIQ_SCHEDULER"
            value = var.enable_sidekiq_scheduler
          }

          resources {
            requests = {
              memory = var.resources.requests.memory
              cpu    = var.resources.requests.cpu
            }
            limits = {
              memory = var.resources.limits.memory
              cpu    = var.resources.limits.cpu
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = var.service_port
            }
            initial_delay_seconds = 30
            period_seconds        = 10
            timeout_seconds       = 5
            failure_threshold     = 3
          }

          readiness_probe {
            http_get {
              path = "/health"
              port = var.service_port
            }
            initial_delay_seconds = 5
            period_seconds        = 5
            timeout_seconds       = 3
            failure_threshold     = 3
          }

          volume_mount {
            name       = "logs"
            mount_path = "/app/log"
          }

          volume_mount {
            name       = "config"
            mount_path = "/app/config"
          }
        }

        volume {
          name = "logs"
          empty_dir {}
        }

        volume {
          name = "config"
          config_map {
            name = kubernetes_config_map.ruby_service_config.metadata[0].name
          }
        }
      }
    }
  }
}

# Deployment for Sidekiq workers
resource "kubernetes_deployment" "ruby_service_sidekiq" {
  metadata {
    name      = "ruby-service-sidekiq"
    namespace = var.namespace
    labels    = merge(var.labels, {
      component = "worker"
    })
  }

  spec {
    replicas = var.sidekiq_replicas

    selector {
      match_labels = {
        app       = "ruby-service"
        component = "worker"
      }
    }

    template {
      metadata {
        labels = merge(var.labels, {
          component = "worker"
        })
      }

      spec {
        container {
          name    = "sidekiq"
          image   = "${var.image_registry}/${var.image_repository}:${var.image_tag}"
          command = ["./start-sidekiq.sh"]

          env {
            name  = "RACK_ENV"
            value = var.environment
          }

          env {
            name = "DATABASE_URL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.ruby_service_secrets.metadata[0].name
                key  = "database-url"
              }
            }
          }

          env {
            name = "REDIS_URL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.ruby_service_secrets.metadata[0].name
                key  = "redis-url"
              }
            }
          }

          env {
            name = "SECRET_KEY_BASE"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.ruby_service_secrets.metadata[0].name
                key  = "secret-key-base"
              }
            }
          }

          env {
            name = "ZOOKEEPER_URL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.ruby_service_secrets.metadata[0].name
                key  = "zookeeper-url"
              }
            }
          }

          env {
            name  = "LOG_LEVEL"
            value = var.log_level
          }

          env {
            name  = "ENABLE_SIDEKIQ_SCHEDULER"
            value = var.enable_sidekiq_scheduler
          }

          resources {
            requests = {
              memory = var.sidekiq_resources.requests.memory
              cpu    = var.sidekiq_resources.requests.cpu
            }
            limits = {
              memory = var.sidekiq_resources.limits.memory
              cpu    = var.sidekiq_resources.limits.cpu
            }
          }

          volume_mount {
            name       = "logs"
            mount_path = "/app/log"
          }

          volume_mount {
            name       = "config"
            mount_path = "/app/config"
          }
        }

        volume {
          name = "logs"
          empty_dir {}
        }

        volume {
          name = "config"
          config_map {
            name = kubernetes_config_map.ruby_service_config.metadata[0].name
          }
        }
      }
    }
  }
}

# Service for Ruby web application
resource "kubernetes_service" "ruby_service" {
  metadata {
    name      = "ruby-service"
    namespace = var.namespace
    labels    = var.labels
  }

  spec {
    selector = {
      app       = "ruby-service"
      component = "web"
    }

    port {
      name        = "http"
      port        = 80
      target_port = var.service_port
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

# Service for Sidekiq metrics
resource "kubernetes_service" "ruby_service_sidekiq" {
  metadata {
    name      = "ruby-service-sidekiq"
    namespace = var.namespace
    labels    = var.labels
  }

  spec {
    selector = {
      app       = "ruby-service"
      component = "worker"
    }

    port {
      name        = "metrics"
      port        = 9090
      target_port = 9090
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

# Horizontal Pod Autoscaler
resource "kubernetes_horizontal_pod_autoscaler_v2" "ruby_service_hpa" {
  metadata {
    name      = "ruby-service-hpa"
    namespace = var.namespace
    labels    = var.labels
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = "ruby-service"
    }

    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type               = "Utilization"
          average_utilization = var.cpu_utilization_target
        }
      }
    }

    metric {
      type = "Resource"
      resource {
        name = "memory"
        target {
          type               = "Utilization"
          average_utilization = var.memory_utilization_target
        }
      }
    }

    behavior {
      scale_down {
        stabilization_window_seconds = 300
        policy {
          type          = "Percent"
          value         = 50
          period_seconds = 60
        }
      }
    }
  }
}

# Pod Disruption Budget
resource "kubernetes_pod_disruption_budget_v1" "ruby_service_pdb" {
  metadata {
    name      = "ruby-service-pdb"
    namespace = var.namespace
    labels    = var.labels
  }

  spec {
    min_available = 1

    selector {
      match_labels = {
        app = "ruby-service"
        component = "web"
      }
    }
  }
}
