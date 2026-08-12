# OrcaCloud Monitoring module
# Manages monitoring infrastructure for Puppet, Gerrit, and CNI

class orcacloud::monitoring (
  Boolean $enable_prometheus = true,
  Boolean $enable_grafana = true,
  Boolean $enable_alertmanager = true,
  Boolean $enable_loki = true,
  String $prometheus_version = '2.45.0',
  String $grafana_version = '10.0.0',
  Hash $alert_rules = {},
  Array[String] $notification_channels = [],
) {

  # Create monitoring user
  user { 'monitoring':
    ensure     => present,
    home       => '/opt/monitoring',
    shell      => '/bin/bash',
    managehome => true,
    system     => true,
  }

  # Create monitoring directories
  file { ['/opt/monitoring', '/opt/monitoring/data', '/opt/monitoring/config', '/opt/monitoring/logs']:
    ensure  => directory,
    owner   => 'monitoring',
    group   => 'monitoring',
    mode    => '0755',
    require => User['monitoring'],
  }

  # Prometheus configuration
  if $enable_prometheus {
    include orcacloud::monitoring::prometheus
  }

  # Grafana configuration
  if $enable_grafana {
    include orcacloud::monitoring::grafana
  }

  # Alertmanager configuration
  if $enable_alertmanager {
    include orcacloud::monitoring::alertmanager
  }

  # Loki for log aggregation
  if $enable_loki {
    include orcacloud::monitoring::loki
  }

  # Monitoring dashboards
  file { '/opt/monitoring/config/dashboards':
    ensure  => directory,
    owner   => 'monitoring',
    group   => 'monitoring',
    mode    => '0755',
    require => File['/opt/monitoring/config'],
  }

  # Copy dashboard configurations
  file { '/opt/monitoring/config/dashboards/orcacloud-overview.json':
    ensure  => file,
    owner   => 'monitoring',
    group   => 'monitoring',
    mode    => '0644',
    content => template('orcacloud/monitoring/dashboard-overview.json.erb'),
    require => File['/opt/monitoring/config/dashboards'],
  }

  file { '/opt/monitoring/config/dashboards/puppet-dashboard.json':
    ensure  => file,
    owner   => 'monitoring',
    group   => 'monitoring',
    mode    => '0644',
    content => template('orcacloud/monitoring/dashboard-puppet.json.erb'),
    require => File['/opt/monitoring/config/dashboards'],
  }

  file { '/opt/monitoring/config/dashboards/gerrit-dashboard.json':
    ensure  => file,
    owner   => 'monitoring',
    group   => 'monitoring',
    mode    => '0644',
    content => template('orcacloud/monitoring/dashboard-gerrit.json.erb'),
    require => File['/opt/monitoring/config/dashboards'],
  }

  file { '/opt/monitoring/config/dashboards/cni-dashboard.json':
    ensure  => file,
    owner   => 'monitoring',
    group   => 'monitoring',
    mode    => '0644',
    content => template('orcacloud/monitoring/dashboard-cni.json.erb'),
    require => File['/opt/monitoring/config/dashboards'],
  }

  # Monitoring exporters
  include orcacloud::monitoring::exporters

  # Log rotation for monitoring
  file { '/etc/logrotate.d/orcacloud-monitoring':
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('orcacloud/monitoring/logrotate.conf.erb'),
  }
}

# Prometheus monitoring
class orcacloud::monitoring::prometheus {
  
  # Download and install Prometheus
  archive { '/opt/monitoring/prometheus.tar.gz':
    ensure       => present,
    source       => "https://github.com/prometheus/prometheus/releases/download/v${orcacloud::monitoring::prometheus_version}/prometheus-${orcacloud::monitoring::prometheus_version}.linux-amd64.tar.gz",
    extract      => true,
    extract_path => '/opt/monitoring',
    user         => 'monitoring',
    group        => 'monitoring',
    require      => File['/opt/monitoring'],
  }

  # Prometheus configuration
  file { '/opt/monitoring/config/prometheus.yml':
    ensure  => file,
    owner   => 'monitoring',
    group   => 'monitoring',
    mode    => '0644',
    content => template('orcacloud/monitoring/prometheus.yml.erb'),
    require => File['/opt/monitoring/config'],
    notify  => Service['prometheus'],
  }

  # Prometheus alert rules
  file { '/opt/monitoring/config/alert-rules.yml':
    ensure  => file,
    owner   => 'monitoring',
    group   => 'monitoring',
    mode    => '0644',
    content => template('orcacloud/monitoring/alert-rules.yml.erb'),
    require => File['/opt/monitoring/config'],
    notify  => Service['prometheus'],
  }

  # Systemd service for Prometheus
  file { '/etc/systemd/system/prometheus.service':
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('orcacloud/monitoring/prometheus.service.erb'),
    notify  => [Exec['systemd-reload-prometheus'], Service['prometheus']],
  }

  exec { 'systemd-reload-prometheus':
    command     => 'systemctl daemon-reload',
    refreshonly => true,
  }

  service { 'prometheus':
    ensure  => running,
    enable  => true,
    require => [
      File['/etc/systemd/system/prometheus.service'],
      File['/opt/monitoring/config/prometheus.yml'],
      Archive['/opt/monitoring/prometheus.tar.gz'],
    ],
  }
}

# Monitoring exporters for various components
class orcacloud::monitoring::exporters {
  
  # Node exporter for system metrics
  archive { '/opt/monitoring/node_exporter.tar.gz':
    ensure       => present,
    source       => 'https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz',
    extract      => true,
    extract_path => '/opt/monitoring',
    user         => 'monitoring',
    group        => 'monitoring',
    require      => File['/opt/monitoring'],
  }

  # Puppet exporter for Puppet metrics
  file { '/opt/monitoring/puppet-exporter.py':
    ensure  => file,
    owner   => 'monitoring',
    group   => 'monitoring',
    mode    => '0755',
    content => template('orcacloud/monitoring/puppet-exporter.py.erb'),
    require => File['/opt/monitoring'],
  }

  # Gerrit exporter for Gerrit metrics
  file { '/opt/monitoring/gerrit-exporter.py':
    ensure  => file,
    owner   => 'monitoring',
    group   => 'monitoring',
    mode    => '0755',
    content => template('orcacloud/monitoring/gerrit-exporter.py.erb'),
    require => File['/opt/monitoring'],
  }

  # CNI network metrics exporter
  file { '/opt/monitoring/cni-exporter.py':
    ensure  => file,
    owner   => 'monitoring',
    group   => 'monitoring',
    mode    => '0755',
    content => template('orcacloud/monitoring/cni-exporter.py.erb'),
    require => File['/opt/monitoring'],
  }

  # Systemd services for exporters
  file { '/etc/systemd/system/node-exporter.service':
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('orcacloud/monitoring/node-exporter.service.erb'),
    notify  => [Exec['systemd-reload-exporters'], Service['node-exporter']],
  }

  file { '/etc/systemd/system/puppet-exporter.service':
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('orcacloud/monitoring/puppet-exporter.service.erb'),
    notify  => [Exec['systemd-reload-exporters'], Service['puppet-exporter']],
  }

  exec { 'systemd-reload-exporters':
    command     => 'systemctl daemon-reload',
    refreshonly => true,
  }

  service { 'node-exporter':
    ensure  => running,
    enable  => true,
    require => [
      File['/etc/systemd/system/node-exporter.service'],
      Archive['/opt/monitoring/node_exporter.tar.gz'],
    ],
  }

  service { 'puppet-exporter':
    ensure  => running,
    enable  => true,
    require => [
      File['/etc/systemd/system/puppet-exporter.service'],
      File['/opt/monitoring/puppet-exporter.py'],
    ],
  }
}