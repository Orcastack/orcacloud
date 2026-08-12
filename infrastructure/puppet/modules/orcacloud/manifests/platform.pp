# OrcaCloud Platform main module
# Manages the core platform deployment and configuration

class orcacloud::platform (
  Boolean $debug_mode = false,
  String $log_level = 'info',
  Boolean $enable_ssl = false,
  Boolean $backup_enabled = false,
  String $platform_version = 'latest',
  String $database_password = 'orcacloudpass',
  Hash $environment_vars = {},
) {

  # Ensure required packages are installed
  ensure_packages([
    'docker.io',
    'docker-compose',
    'git',
    'curl',
    'wget',
    'unzip',
  ])

  # Create platform user
  user { 'orcacloud':
    ensure     => present,
    home       => '/opt/orcacloud',
    shell      => '/bin/bash',
    managehome => true,
    system     => true,
  }

  # Create platform directories
  file { ['/opt/orcacloud', '/opt/orcacloud/platform', '/opt/orcacloud/logs', '/opt/orcacloud/data']:
    ensure  => directory,
    owner   => 'orcacloud',
    group   => 'orcacloud',
    mode    => '0755',
    require => User['orcacloud'],
  }

  # Deploy platform repository
  vcsrepo { '/opt/orcacloud/platform':
    ensure   => present,
    provider => git,
    source   => 'https://github.com/orcacloud/orcacloud-platform.git',
    user     => 'orcacloud',
    require  => [User['orcacloud'], File['/opt/orcacloud/platform']],
  }

  # Platform environment configuration
  file { '/opt/orcacloud/platform/.env':
    ensure  => file,
    owner   => 'orcacloud',
    group   => 'orcacloud',
    mode    => '0600',
    content => template('orcacloud/platform.env.erb'),
    require => Vcsrepo['/opt/orcacloud/platform'],
    notify  => Service['orcacloud-platform'],
  }

  # Docker Compose configuration
  file { '/opt/orcacloud/platform/docker-compose.production.yml':
    ensure  => file,
    owner   => 'orcacloud',
    group   => 'orcacloud',
    mode    => '0644',
    content => template('orcacloud/docker-compose.production.yml.erb'),
    require => Vcsrepo['/opt/orcacloud/platform'],
    notify  => Service['orcacloud-platform'],
  }

  # Systemd service for platform
  file { '/etc/systemd/system/orcacloud-platform.service':
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('orcacloud/orcacloud-platform.service.erb'),
    notify  => [Exec['systemd-reload'], Service['orcacloud-platform']],
  }

  # Reload systemd
  exec { 'systemd-reload':
    command     => 'systemctl daemon-reload',
    refreshonly => true,
  }

  # Platform service
  service { 'orcacloud-platform':
    ensure  => running,
    enable  => true,
    require => [
      File['/etc/systemd/system/orcacloud-platform.service'],
      File['/opt/orcacloud/platform/.env'],
      Exec['systemd-reload'],
    ],
  }

  # Backup configuration
  if $backup_enabled {
    include orcacloud::backup
  }

  # SSL configuration
  if $enable_ssl {
    include orcacloud::ssl
  }

  # Log rotation
  file { '/etc/logrotate.d/orcacloud-platform':
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('orcacloud/logrotate.conf.erb'),
  }

  # Health check script
  file { '/usr/local/bin/orcacloud-health-check':
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0755',
    content => template('orcacloud/health-check.sh.erb'),
  }

  # Cron job for health checks
  cron { 'orcacloud-health-check':
    command => '/usr/local/bin/orcacloud-health-check',
    user    => 'orcacloud',
    minute  => '*/5',  # Every 5 minutes
    require => File['/usr/local/bin/orcacloud-health-check'],
  }
}