# Puppet module for Gerrit integration
# Manages Gerrit deployment and configuration through Puppet

class orcacloud::gerrit (
  String $gerrit_version = '3.8',
  String $gerrit_user = 'gerrit',
  String $gerrit_home = '/opt/gerrit',
  String $database_type = 'postgresql',
  String $database_host = 'localhost',
  String $database_name = 'gerrit',
  String $database_user = 'gerrit',
  String $database_password = 'gerrit_pass',
  Boolean $enable_ldap = false,
  Hash $ldap_config = {},
  Array[String] $gerrit_plugins = ['replication', 'webhooks', 'download-commands'],
  Boolean $enable_ssl = false,
  String $canonical_web_url = 'http://localhost:8081',
) {

  # Create gerrit user
  user { $gerrit_user:
    ensure     => present,
    home       => $gerrit_home,
    shell      => '/bin/bash',
    managehome => true,
    system     => true,
  }

  # Create gerrit directories
  file { [$gerrit_home, "${gerrit_home}/bin", "${gerrit_home}/etc", "${gerrit_home}/plugins"]:
    ensure  => directory,
    owner   => $gerrit_user,
    group   => $gerrit_user,
    mode    => '0755',
    require => User[$gerrit_user],
  }

  # Download and install Gerrit
  archive { "${gerrit_home}/gerrit.war":
    ensure       => present,
    source       => "https://gerrit-releases.storage.googleapis.com/gerrit-${gerrit_version}.war",
    user         => $gerrit_user,
    group        => $gerrit_user,
    extract      => false,
    cleanup      => false,
    require      => File[$gerrit_home],
  }

  # Gerrit configuration
  file { "${gerrit_home}/etc/gerrit.config":
    ensure  => file,
    owner   => $gerrit_user,
    group   => $gerrit_user,
    mode    => '0644',
    content => template('orcacloud/gerrit.config.erb'),
    require => File["${gerrit_home}/etc"],
    notify  => Service['gerrit'],
  }

  # Secure configuration
  file { "${gerrit_home}/etc/secure.config":
    ensure  => file,
    owner   => $gerrit_user,
    group   => $gerrit_user,
    mode    => '0600',
    content => template('orcacloud/gerrit.secure.config.erb'),
    require => File["${gerrit_home}/etc"],
    notify  => Service['gerrit'],
  }

  # Install Gerrit plugins
  $gerrit_plugins.each |String $plugin| {
    archive { "${gerrit_home}/plugins/${plugin}.jar":
      ensure  => present,
      source  => "https://gerrit-ci.gerritforge.com/job/plugin-${plugin}-bazel-master/lastSuccessfulBuild/artifact/bazel-bin/plugins/${plugin}/${plugin}.jar",
      user    => $gerrit_user,
      group   => $gerrit_user,
      require => File["${gerrit_home}/plugins"],
      notify  => Service['gerrit'],
    }
  }

  # Initialize Gerrit (only on first install)
  exec { 'gerrit-init':
    command => "java -jar ${gerrit_home}/gerrit.war init -d ${gerrit_home} --batch --no-auto-start",
    user    => $gerrit_user,
    creates => "${gerrit_home}/bin/gerrit.sh",
    require => [Archive["${gerrit_home}/gerrit.war"], File["${gerrit_home}/etc/gerrit.config"]],
  }

  # Systemd service for Gerrit
  file { '/etc/systemd/system/gerrit.service':
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('orcacloud/gerrit.service.erb'),
    notify  => [Exec['systemd-reload-gerrit'], Service['gerrit']],
  }

  # Reload systemd
  exec { 'systemd-reload-gerrit':
    command     => 'systemctl daemon-reload',
    refreshonly => true,
  }

  # Gerrit service
  service { 'gerrit':
    ensure  => running,
    enable  => true,
    require => [
      File['/etc/systemd/system/gerrit.service'],
      Exec['gerrit-init'],
      Exec['systemd-reload-gerrit'],
    ],
  }

  # SSH key generation for Gerrit automation
  exec { 'gerrit-ssh-keygen':
    command => "ssh-keygen -t rsa -b 4096 -f ${gerrit_home}/.ssh/id_rsa -N ''",
    user    => $gerrit_user,
    creates => "${gerrit_home}/.ssh/id_rsa",
    require => User[$gerrit_user],
  }

  # Puppet integration hook
  file { "${gerrit_home}/hooks/puppet-integration.py":
    ensure  => file,
    owner   => $gerrit_user,
    group   => $gerrit_user,
    mode    => '0755',
    content => template('orcacloud/puppet-integration-hook.py.erb'),
    require => File[$gerrit_home],
  }

  # Gerrit project configuration for Puppet
  file { "${gerrit_home}/etc/puppet-projects.config":
    ensure  => file,
    owner   => $gerrit_user,
    group   => $gerrit_user,
    mode    => '0644',
    content => template('orcacloud/puppet-projects.config.erb'),
    require => File["${gerrit_home}/etc"],
  }
}