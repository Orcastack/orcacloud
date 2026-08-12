# Kubernetes Service Module - main.tf

## Description
Deploys a containerized service to Kubernetes cluster with:
- Deployment (with replicas, resource limits, health checks)
- Service (ClusterIP or LoadBalancer)
- ConfigMap (for configuration)
- HorizontalPodAutoscaler (optional)
- NetworkPolicy (optional)

terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
  }
}

# Namespace
resource "kubernetes_namespace" "service" {
  count = var.create_namespace ? 1 : 0

  metadata {
    name = var.namespace
    labels = {
      "app.kubernetes.io/name"       = var.service_name
      "app.kubernetes.io/managed-by" = "terraform"
      "environment"                  = var.environment
    }
    annotations = {
      "orcacloud.com/monitored" = "true"
    }
  }
}

# ConfigMap for environment variables
resource "kubernetes_config_map" "service" {
  metadata {
    name      = "${var.service_name}-config"
    namespace = var.namespace
    labels = {
      "app.kubernetes.io/name"       = var.service_name
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }

  data = var.env_vars

  depends_on = [kubernetes_namespace.service]
}

# Deployment
resource "kubernetes_deployment" "service" {
  metadata {
    name      = var.service_name
    namespace = var.namespace
    labels = {
      "app.kubernetes.io/name"       = var.service_name
      "app.kubernetes.io/version"    = var.service_version
      "app.kubernetes.io/managed-by" = "terraform"
      "environment"                  = var.environment
    }
    annotations = {
      "prometheus.io/scrape" = "true"
      "prometheus.io/port"   = "8080"
      "prometheus.io/path"   = "/metrics"
    }
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app = var.service_name
      }
    }

    strategy {
      type = "RollingUpdate"

      rolling_update {
        max_surge            = "1"
        max_unavailable      = "0"
      }
    }

    template {
      metadata {
        labels = {
          app                = var.service_name
          version            = var.service_version
          "app.kubernetes.io/name" = var.service_name
        }
        annotations = {
          "prometheus.io/scrape" = "true"
          "prometheus.io/port"   = "8080"
          "prometheus.io/path"   = "/metrics"
        }
      }

      spec {
        service_account_name = kubernetes_service_account.service.metadata[0].name

        # Security context
        security_context {
          run_as_non_root = true
          run_as_user     = 1000
          fsGroup         = 1000
          seccomp_profile {
            type = "RuntimeDefault"
          }
        }

        # Init containers (optional)
        dynamic "init_container" {
          for_each = var.init_containers
          content {
            name  = init_container.value.name
            image = init_container.value.image

            resources {
              requests = {
                cpu    = init_container.value.cpu_request
                memory = init_container.value.memory_request
              }
              limits = {
                cpu    = init_container.value.cpu_limit
                memory = init_container.value.memory_limit
              }
            }
          }
        }

        # Application container
        container {
          name  = var.service_name
          image = "${var.image_registry}/${var.service_name}:${var.service_version}"
          image_pull_policy = "Always"

          # Ports
          port {
            name           = "http"
            container_port = var.http_port
            protocol       = "TCP"
          }

          port {
            name           = "metrics"
            container_port = var.metrics_port
            protocol       = "TCP"
          }

          # Environment variables from ConfigMap
          dynamic "env_from" {
            for_each = length(var.env_vars) > 0 ? [1] : []
            content {
              config_map_ref {
                name = kubernetes_config_map.service.metadata[0].name
              }
            }
          }

          # Additional environment variables
          dynamic "env" {
            for_each = var.additional_env
            content {
              name  = env.key
              value = env.value
            }
          }

          # Secrets from environment
          dynamic "env" {
            for_each = var.secrets
            content {
              name = env.key
              value_from {
                secret_key_ref {
                  name = env.value.secret_name
                  key  = env.value.secret_key
                }
              }
            }
          }

          # Resource limits
          resources {
            requests = {
              cpu    = var.cpu_request
              memory = var.memory_request
            }
            limits = {
              cpu    = var.cpu_limit
              memory = var.memory_limit
            }
          }

          # Liveness probe
          liveness_probe {
            http_get {
              path   = var.health_check_path
              port   = var.http_port
              scheme = "HTTP"
            }
            initial_delay_seconds = var.liveness_initial_delay
            period_seconds        = var.liveness_period
            timeout_seconds       = var.liveness_timeout
            failure_threshold     = var.liveness_failure_threshold
          }

          # Readiness probe
          readiness_probe {
            http_get {
              path   = var.readiness_check_path
              port   = var.http_port
              scheme = "HTTP"
            }
            initial_delay_seconds = var.readiness_initial_delay
            period_seconds        = var.readiness_period
            timeout_seconds       = var.readiness_timeout
            failure_threshold     = var.readiness_failure_threshold
          }

          # Startup probe (K8s 1.18+)
          dynamic "startup_probe" {
            for_each = var.enable_startup_probe ? [1] : []
            content {
              http_get {
                path   = var.health_check_path
                port   = var.http_port
                scheme = "HTTP"
              }
              initial_delay_seconds = var.startup_initial_delay
              period_seconds        = var.startup_period
              timeout_seconds       = var.startup_timeout
              failure_threshold     = var.startup_failure_threshold
            }
          }

          # Volume mounts
          dynamic "volume_mount" {
            for_each = var.volume_mounts
            content {
              name       = volume_mount.value.name
              mount_path = volume_mount.value.mount_path
              read_only  = lookup(volume_mount.value, "read_only", false)
            }
          }

          # Security context
          security_context {
            allow_privilege_escalation = false
            privileged                 = false
            read_only_root_filesystem  = true
            run_as_non_root            = true
            run_as_user                = 1000
            capabilities {
              drop = ["ALL"]
            }
          }

          # Lifecycle hooks
          lifecycle {
            pre_stop {
              exec {
                command = ["/bin/sh", "-c", "sleep 15"]
              }
            }
          }
        }

        # Volumes
        dynamic "volume" {
          for_each = var.volumes
          content {
            name = volume.value.name

            dynamic "config_map" {
              for_each = can(volume.value.config_map) ? [volume.value.config_map] : []
              content {
                name = config_map.value
              }
            }

            dynamic "secret" {
              for_each = can(volume.value.secret) ? [volume.value.secret] : []
              content {
                secret_name = secret.value
              }
            }

            dynamic "persistent_volume_claim" {
              for_each = can(volume.value.pvc_name) ? [volume.value.pvc_name] : []
              content {
                claim_name = persistent_volume_claim.value
              }
            }

            dynamic "empty_dir" {
              for_each = can(volume.value.empty_dir) ? [volume.value.empty_dir] : []
              content {
              }
            }
          }
        }

        # Affinity
        affinity {
          pod_anti_affinity {
            preferred_during_scheduling_ignored_during_execution {
              weight = 100
              pod_affinity_term {
                label_selector {
                  match_expressions {
                    key      = "app"
                    operator = "In"
                    values   = [var.service_name]
                  }
                }
                topology_key = "kubernetes.io/hostname"
              }
            }
          }
        }

        # Restart policy
        restart_policy = "Always"

        # DNS policy
        dns_policy = "ClusterFirst"

        # Termination grace period
        termination_grace_period_seconds = 30
      }
    }
  }

  depends_on = [kubernetes_service_account.service]
}

# Service
resource "kubernetes_service" "service" {
  metadata {
    name      = var.service_name
    namespace = var.namespace
    labels = {
      "app.kubernetes.io/name"       = var.service_name
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }

  spec {
    type            = var.service_type
    session_affinity = var.session_affinity

    selector = {
      app = var.service_name
    }

    port {
      name        = "http"
      port        = var.http_port
      target_port = var.http_port
      protocol    = "TCP"
    }

    port {
      name        = "metrics"
      port        = var.metrics_port
      target_port = var.metrics_port
      protocol    = "TCP"
    }

    # Load balancer configuration
    dynamic "load_balancer_source_ranges" {
      for_each = var.load_balancer_source_ranges
      content {
        value = load_balancer_source_ranges.value
      }
    }
  }

  depends_on = [kubernetes_deployment.service]
}

# ServiceAccount
resource "kubernetes_service_account" "service" {
  metadata {
    name      = var.service_name
    namespace = var.namespace
    labels = {
      "app.kubernetes.io/name"       = var.service_name
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

# HorizontalPodAutoscaler
resource "kubernetes_horizontal_pod_autoscaler" "service" {
  count = var.enable_autoscaling ? 1 : 0

  metadata {
    name      = "${var.service_name}-hpa"
    namespace = var.namespace
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.service.metadata[0].name
    }

    min_replicas = var.autoscaling_min_replicas
    max_replicas = var.autoscaling_max_replicas

    target_cpu_utilization_percentage    = var.autoscaling_target_cpu
    target_memory_utilization_percentage = var.autoscaling_target_memory
  }
}

# NetworkPolicy (optional)
resource "kubernetes_network_policy" "service" {
  count = var.enable_network_policy ? 1 : 0

  metadata {
    name      = "${var.service_name}-netpol"
    namespace = var.namespace
  }

  spec {
    pod_selector {
      match_labels = {
        app = var.service_name
      }
    }

    policy_types = ["Ingress", "Egress"]

    # Allow ingress from specific namespaces/pods
    ingress {
      from {
        namespace_selector {
          match_labels = var.allowed_ingress_namespaces
        }
      }
      ports {
        port     = "http"
        protocol = "TCP"
      }
    }

    # Allow egress (restrict as needed)
    egress {
      to {
        namespace_selector {
        }
      }
    }
  }
}

# PodDisruptionBudget
resource "kubernetes_pod_disruption_budget" "service" {
  count = var.enable_pdb ? 1 : 0

  metadata {
    name      = "${var.service_name}-pdb"
    namespace = var.namespace
  }

  spec {
    min_available = max(1, var.replicas - 1)

    selector {
      match_labels = {
        app = var.service_name
      }
    }
  }
}
