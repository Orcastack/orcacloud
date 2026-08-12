<<<<<<< HEAD
# OrcaCloud Security module
=======
# Atoni Security module
>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
# Manages security configuration and hardening

class orcacloud::security (
  Boolean $enable_firewall = true,
  Boolean $enable_fail2ban = true,
  Boolean $enable_selinux = false,
  Array[String] $allowed_ssh_users = ['orcacloud'],
  Hash $firewall_rules = {},
) {

  # Install security packages
  ensure_packages([
    'ufw',
    'fail2ban',
    'lynis',
    'rkhunter',
    'chkrootkit',
  ])

  # Configure UFW firewall
  if $enable_firewall {
    service { 'ufw':
      ensure  => running,
      enable  => true,
      require => Package['ufw'],
    }

    # Default firewall rules
    exec { 'ufw-default-deny':
      command => 'ufw --force default deny incoming',
      unless  => 'ufw status | grep "Default: deny (incoming)"',
      require => Package['ufw'],
      notify  => Service['ufw'],
    }

    exec { 'ufw-default-allow-outgoing':
      command => 'ufw --force default allow outgoing',
      unless  => 'ufw status | grep "Default: allow (outgoing)"',
      require => Package['ufw'],
      notify  => Service['ufw'],
    }

    # Allow SSH
    exec { 'ufw-allow-ssh':
      command => 'ufw --force allow ssh',
      unless  => 'ufw status | grep "22/tcp"',
      require => Package['ufw'],
      notify  => Service['ufw'],
    }

    # Allow HTTP and HTTPS
    exec { 'ufw-allow-http':
      command => 'ufw --force allow 80/tcp',
      unless  => 'ufw status | grep "80/tcp"',
      require => Package['ufw'],
      notify  => Service['ufw'],
    }

    exec { 'ufw-allow-https':
      command => 'ufw --force allow 443/tcp',
      unless  => 'ufw status | grep "443/tcp"',
      require => Package['ufw'],
      notify  => Service['ufw'],
    }

    # Allow platform port
    exec { 'ufw-allow-platform':
      command => 'ufw --force allow 8080/tcp',
      unless  => 'ufw status | grep "8080/tcp"',
      require => Package['ufw'],
      notify  => Service['ufw'],
    }

    # Enable firewall
    exec { 'ufw-enable':
      command => 'ufw --force enable',
      unless  => 'ufw status | grep "Status: active"',
      require => [
        Exec['ufw-allow-ssh'],
        Exec['ufw-allow-http'],
        Exec['ufw-allow-https'],
        Exec['ufw-allow-platform'],
      ],
    }
  }

  # Configure Fail2Ban
  if $enable_fail2ban {
    service { 'fail2ban':
      ensure  => running,
      enable  => true,
      require => Package['fail2ban'],
    }

    file { '/etc/fail2ban/jail.local':
      ensure  => file,
      owner   => 'root',
      group   => 'root',
      mode    => '0644',
      content => template('orcacloud/fail2ban.jail.local.erb'),
      require => Package['fail2ban'],
      notify  => Service['fail2ban'],
    }
  }

  # SSH hardening
  file { '/etc/ssh/sshd_config':
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('orcacloud/sshd_config.erb'),
    notify  => Service['ssh'],
  }

  service { 'ssh':
    ensure  => running,
    enable  => true,
    require => File['/etc/ssh/sshd_config'],
  }

  # Security scanning scripts
  file { '/usr/local/bin/security-scan':
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0755',
    content => template('orcacloud/security-scan.sh.erb'),
  }

  # Weekly security scan
  cron { 'security-scan':
    command => '/usr/local/bin/security-scan',
    user    => 'root',
    hour    => '02',
    minute  => '00',
    weekday => '0',  # Sunday
    require => File['/usr/local/bin/security-scan'],
  }

  # System hardening
  file { '/etc/sysctl.d/99-orcacloud-security.conf':
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('orcacloud/sysctl-security.conf.erb'),
    notify  => Exec['sysctl-reload'],
  }

  exec { 'sysctl-reload':
    command     => 'sysctl -p /etc/sysctl.d/99-orcacloud-security.conf',
    refreshonly => true,
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> 12bd998bda7cee255affa733e542706dbab8dcfb
