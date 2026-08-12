# Generate Grafana admin password if not provided
resource "random_password" "grafana_admin_password" {
  count   = var.grafana_admin_password == "" ? 1 : 0
  length  = 16
  special = true
}

locals {
  grafana_password = var.grafana_admin_password != "" ? var.grafana_admin_password : random_password.grafana_admin_password[0].result
}

# Prometheus Configuration
resource "kubernetes_config_map" "prometheus_config" {
  metadata {
    name      = "${var.name_prefix}-prometheus-config"
    namespace = var.namespace
    labels    = merge(var.labels, {
      "app.kubernetes.io/component" = "monitoring"
      "app.kubernetes.io/name"      = "prometheus"
    })
    annotations = var.annotations
  }
  
  data = {
    "prometheus.yml" = yamlencode({
      global = {
        scrape_interval     = "15s"
        evaluation_interval = "15s"
      }
      
      rule_files = [
        "/etc/prometheus/rules/*.yml"
      ]
      
      alerting = var.enable_alertmanager ? {
        alertmanagers = [{
          static_configs = [{
            targets = ["${var.name_prefix}-alertmanager:9093"]
          }]
        }]
      } : null
      
      scrape_configs = [
        # Prometheus itself
        {
          job_name = "prometheus"
          static_configs = [{
            targets = ["localhost:9090"]
          }]
        },
        
        # Kubernetes API server
        {
          job_name = "kubernetes-apiservers"
          kubernetes_sd_configs = [{
            role = "endpoints"
          }]
          scheme = "https"
          tls_config = {
            ca_file = "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
          }
          bearer_token_file = "/var/run/secrets/kubernetes.io/serviceaccount/token"
          relabel_configs = [
            {
              source_labels = ["__meta_kubernetes_namespace", "__meta_kubernetes_service_name", "__meta_kubernetes_endpoint_port_name"]
              action = "keep"
              regex = "default;kubernetes;https"
            }
          ]
        },
        
        # Kubernetes nodes
        {
          job_name = "kubernetes-nodes"
          kubernetes_sd_configs = [{
            role = "node"
          }]
          scheme = "https"
          tls_config = {
            ca_file = "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
          }
          bearer_token_file = "/var/run/secrets/kubernetes.io/serviceaccount/token"
          relabel_configs = [
            {
              action = "labelmap"
              regex = "__meta_kubernetes_node_label_(.+)"
            }
          ]
        },
        
        # Kubernetes pods
        {
          job_name = "kubernetes-pods"
          kubernetes_sd_configs = [{
            role = "pod"
          }]
          relabel_configs = [
            {
              source_labels = ["__meta_kubernetes_pod_annotation_prometheus_io_scrape"]
              action = "keep"
              regex = "true"
            },
            {
              source_labels = ["__meta_kubernetes_pod_annotation_prometheus_io_path"]
              action = "replace"
              target_label = "__metrics_path__"
              regex = "(.+)"
            },
            {
              source_labels = ["__address__", "__meta_kubernetes_pod_annotation_prometheus_io_port"]
              action = "replace"
              regex = "([^:]+)(?::\\d+)?;(\\d+)"
              replacement = "$1:$2"
              target_label = "__address__"
            },
            {
              action = "labelmap"
              regex = "__meta_kubernetes_pod_label_(.+)"
            }
          ]
        },
        
        # Application services
        {
          job_name = "orcacloud-backend"
          kubernetes_sd_configs = [{
            role = "service"
            namespaces = {
              names = [var.namespace]
            }
          }]
          relabel_configs = [
            {
              source_labels = ["__meta_kubernetes_service_name"]
              action = "keep"
              regex = "${var.name_prefix}-backend"
            }
          ]
        },
        
        {
          job_name = "orcacloud-frontend"
          kubernetes_sd_configs = [{
            role = "service"
            namespaces = {
              names = [var.namespace]
            }
          }]
          relabel_configs = [
            {
              source_labels = ["__meta_kubernetes_service_name"]
              action = "keep"
              regex = "${var.name_prefix}-frontend"
            }
          ]
        },
        
        {
          job_name = "orcacloud-postgresql"
          kubernetes_sd_configs = [{
            role = "service"
            namespaces = {
              names = [var.namespace]
            }
          }]
          relabel_configs = [
            {
              source_labels = ["__meta_kubernetes_service_name"]
              action = "keep"
              regex = "${var.name_prefix}-postgresql"
            }
          ]
        },
        
        {
          job_name = "orcacloud-redis"
          kubernetes_sd_configs = [{
            role = "service"
            namespaces = {
              names = [var.namespace]
            }
          }]
          relabel_configs = [
            {
              source_labels = ["__meta_kubernetes_service_name"]
              action = "keep"
              regex = "${var.name_prefix}-redis"
            }
          ]
        },
        
        {
          job_name = "orcacloud-celery"
          kubernetes_sd_configs = [{
            role = "service"
            namespaces = {
              names = [var.namespace]
            }
          }]
          relabel_configs = [
            {
              source_labels = ["__meta_kubernetes_service_name"]
              action = "keep"
              regex = "${var.name_prefix}-celery-metrics"
            }
          ]
        },
        
        {
          job_name = "orcacloud-zookeeper"
          kubernetes_sd_configs = [{
            role = "service"
            namespaces = {
              names = [var.namespace]
            }
          }]
          relabel_configs = [
            {
              source_labels = ["__meta_kubernetes_service_name"]
              action = "keep"
              regex = "${var.name_prefix}-zookeeper"
            }
          ]
        }
      ]
    })
  }
}

# Prometheus Rules
resource "kubernetes_config_map" "prometheus_rules" {
  metadata {
    name      = "${var.name_prefix}-prometheus-rules"
    namespace = var.namespace
    labels    = merge(var.labels, {
      "app.kubernetes.io/component" = "monitoring"
      "app.kubernetes.io/name"      = "prometheus"
    })
    annotations = var.annotations
  }
  
  data = {
    "alert-rules.yml" = yamlencode({
      groups = [
        {
<<<<<<< HEAD
          name = "orcacloud"
=======
          name = "orcacloud"
>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
          rules = [
            {
              alert = "HighErrorRate"
              expr = "rate(django_http_responses_total{status=~\"5..\"}[5m]) > 0.1"
              for = "5m"
              labels = {
                severity = "warning"
              }
              annotations = {
                summary = "High error rate detected"
                description = "Error rate is {{ $value }} errors per second"
              }
            },
            {
              alert = "HighLatency"
              expr = "histogram_quantile(0.95, rate(django_http_request_duration_seconds_bucket[5m])) > 1"
              for = "5m"
              labels = {
                severity = "warning"
              }
              annotations = {
                summary = "High latency detected"
                description = "95th percentile latency is {{ $value }} seconds"
              }
            },
            {
              alert = "DatabaseDown"
              expr = "up{job=\"orcacloud-postgresql\"} == 0"
              for = "1m"
              labels = {
                severity = "critical"
              }
              annotations = {
                summary = "PostgreSQL database is down"
                description = "PostgreSQL database has been down for more than 1 minute"
              }
            },
            {
              alert = "RedisDown"
              expr = "up{job=\"orcacloud-redis\"} == 0"
              for = "1m"
              labels = {
                severity = "warning"
              }
              annotations = {
                summary = "Redis cache is down"
                description = "Redis cache has been down for more than 1 minute"
              }
            },
            {
              alert = "ZookeeperDown"
              expr = "up{job=\"orcacloud-zookeeper\"} == 0"
              for = "1m"
              labels = {
                severity = "critical"
              }
              annotations = {
                summary = "Zookeeper service is down"
                description = "Zookeeper service has been down for more than 1 minute"
              }
            },
            {
              alert = "ZookeeperHighConnectionCount"
              expr = "zookeeper_approximate_data_size > 1000000"
              for = "5m"
              labels = {
                severity = "warning"
              }
              annotations = {
                summary = "Zookeeper high connection count"
                description = "Zookeeper has {{ $value }} active connections"
              }
            },
            {
              alert = "ZookeeperHighLatency"
              expr = "zookeeper_avg_request_latency > 100"
              for = "5m"
              labels = {
                severity = "warning"
              }
              annotations = {
                summary = "Zookeeper high latency"
                description = "Zookeeper average request latency is {{ $value }}ms"
              }
            },
            {
              alert = "HighMemoryUsage"
              expr = "(container_memory_working_set_bytes / container_spec_memory_limit_bytes) > 0.9"
              for = "5m"
              labels = {
                severity = "warning"
              }
              annotations = {
                summary = "High memory usage"
                description = "Memory usage is {{ $value | humanizePercentage }}"
              }
            },
            {
              alert = "HighCPUUsage"
              expr = "rate(container_cpu_usage_seconds_total[5m]) > 0.8"
              for = "5m"
              labels = {
                severity = "warning"
              }
              annotations = {
                summary = "High CPU usage"
                description = "CPU usage is {{ $value | humanizePercentage }}"
              }
            }
          ]
        }
      ]
    })
  }
}

# Prometheus Secret for configuration
resource "kubernetes_secret" "prometheus" {
  metadata {
    name      = "${var.name_prefix}-prometheus"
    namespace = var.namespace
    labels    = merge(var.labels, {
      "app.kubernetes.io/component" = "monitoring"
      "app.kubernetes.io/name"      = "prometheus"
    })
    annotations = var.annotations
  }
  
  type = "Opaque"
  
  data = {}
}

# Prometheus PVC
resource "kubernetes_persistent_volume_claim" "prometheus" {
  metadata {
    name      = "${var.name_prefix}-prometheus-data"
    namespace = var.namespace
    labels    = merge(var.labels, {
      "app.kubernetes.io/component" = "monitoring"
      "app.kubernetes.io/name"      = "prometheus"
    })
    annotations = var.annotations
  }
  
  spec {
    access_modes       = ["ReadWriteOnce"]
    storage_class_name = var.storage_class
    
    resources {
      requests = {
        storage = var.prometheus_storage_size
      }
    }
  }
  
  wait_until_bound = false
}

# Prometheus Deployment
resource "kubernetes_deployment" "prometheus" {
  metadata {
    name      = "${var.name_prefix}-prometheus"
    namespace = var.namespace
    labels    = merge(var.labels, {
      "app.kubernetes.io/component" = "monitoring"
      "app.kubernetes.io/name"      = "prometheus"
    })
    annotations = var.annotations
  }
  
  spec {
    replicas = 1
    
    strategy {
      type = "Recreate"
    }
    
    selector {
      match_labels = {
        "app.kubernetes.io/name"      = "prometheus"
        "app.kubernetes.io/instance"  = var.name_prefix
        "app.kubernetes.io/component" = "monitoring"
      }
    }
    
    template {
      metadata {
        labels = merge(var.labels, {
          "app.kubernetes.io/name"      = "prometheus"
          "app.kubernetes.io/instance"  = var.name_prefix
          "app.kubernetes.io/component" = "monitoring"
        })
        annotations = var.annotations
      }
      
      spec {
        service_account_name = kubernetes_service_account.prometheus.metadata[0].name
        
        container {
          name  = "prometheus"
          image = "prom/prometheus:v2.40.0"
          
          args = [
            "--config.file=/etc/prometheus/prometheus.yml",
            "--storage.tsdb.path=/prometheus/",
            "--web.console.libraries=/etc/prometheus/console_libraries",
            "--web.console.templates=/etc/prometheus/consoles",
            "--storage.tsdb.retention.time=${var.prometheus_retention}",
            "--web.enable-lifecycle"
          ]
          
          port {
            name           = "http"
            container_port = 9090
            protocol       = "TCP"
          }
          
          volume_mount {
            name       = "prometheus-config"
            mount_path = "/etc/prometheus"
          }
          
          volume_mount {
            name       = "prometheus-rules"
            mount_path = "/etc/prometheus/rules"
          }
          
          volume_mount {
            name       = "prometheus-data"
            mount_path = "/prometheus"
          }
          
          resources {
            requests = {
              cpu    = "500m"
              memory = "1Gi"
            }
            limits = {
              cpu    = "2"
              memory = "4Gi"
            }
          }
          
          liveness_probe {
            http_get {
              path = "/-/healthy"
              port = 9090
            }
            initial_delay_seconds = 30
            period_seconds        = 30
          }
          
          readiness_probe {
            http_get {
              path = "/-/ready"
              port = 9090
            }
            initial_delay_seconds = 5
            period_seconds        = 5
          }
        }
        
        volume {
          name = "prometheus-config"
          config_map {
            name = kubernetes_config_map.prometheus_config.metadata[0].name
          }
        }
        
        volume {
          name = "prometheus-rules"
          config_map {
            name = kubernetes_config_map.prometheus_rules.metadata[0].name
          }
        }
        
        volume {
          name = "prometheus-data"
          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim.prometheus.metadata[0].name
          }
        }
        
        security_context {
          run_as_user     = 65534
          run_as_group    = 65534
          run_as_non_root = true
          fs_group        = 65534
        }
      }
    }
  }
}

# Prometheus Service
resource "kubernetes_service" "prometheus" {
  metadata {
    name      = "${var.name_prefix}-prometheus"
    namespace = var.namespace
    labels    = merge(var.labels, {
      "app.kubernetes.io/component" = "monitoring"
      "app.kubernetes.io/name"      = "prometheus"
    })
    annotations = var.annotations
  }
  
  spec {
    type = "ClusterIP"
    
    port {
      name        = "http"
      port        = 9090
      target_port = 9090
      protocol    = "TCP"
    }
    
    selector = {
      "app.kubernetes.io/name"      = "prometheus"
      "app.kubernetes.io/instance"  = var.name_prefix
      "app.kubernetes.io/component" = "monitoring"
    }
  }
}

# Grafana Secret
resource "kubernetes_secret" "grafana" {
  metadata {
    name      = "${var.name_prefix}-grafana"
    namespace = var.namespace
    labels    = merge(var.labels, {
      "app.kubernetes.io/component" = "monitoring"
      "app.kubernetes.io/name"      = "grafana"
    })
    annotations = var.annotations
  }
  
  type = "Opaque"
  
  data = {
    admin-user     = base64encode("admin")
    admin-password = base64encode(local.grafana_password)
  }
}

# Service Account for Prometheus
resource "kubernetes_service_account" "prometheus" {
  metadata {
    name      = "${var.name_prefix}-prometheus"
    namespace = var.namespace
    labels    = merge(var.labels, {
      "app.kubernetes.io/component" = "monitoring"
      "app.kubernetes.io/name"      = "prometheus"
    })
    annotations = var.annotations
  }
}

# ClusterRole for Prometheus
resource "kubernetes_cluster_role" "prometheus" {
  metadata {
    name = "${var.name_prefix}-prometheus"
    labels = merge(var.labels, {
      "app.kubernetes.io/component" = "monitoring"
      "app.kubernetes.io/name"      = "prometheus"
    })
  }
  
  rule {
    api_groups = [""]
    resources  = ["nodes", "nodes/metrics", "services", "endpoints", "pods"]
    verbs      = ["get", "list", "watch"]
  }
  
  rule {
    api_groups = ["extensions", "networking.k8s.io"]
    resources  = ["ingresses"]
    verbs      = ["get", "list", "watch"]
  }
}

# ClusterRoleBinding for Prometheus
resource "kubernetes_cluster_role_binding" "prometheus" {
  metadata {
    name = "${var.name_prefix}-prometheus"
    labels = merge(var.labels, {
      "app.kubernetes.io/component" = "monitoring"
      "app.kubernetes.io/name"      = "prometheus"
    })
  }
  
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.prometheus.metadata[0].name
  }
  
  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.prometheus.metadata[0].name
    namespace = var.namespace
  }
}

# This is a simplified monitoring setup. In production, you would typically use
# the Prometheus Operator or kube-prometheus-stack Helm chart for a more
# comprehensive monitoring solution.