# Puppet site manifest for OrcaCloud Platform
# Main entry point for Puppet configuration

# Global defaults
Exec {
  path => ['/usr/local/bin', '/usr/bin', '/bin', '/usr/local/sbin', '/usr/sbin', '/sbin'],
}

# Node classifications
node default {
  include orcacloud::platform
  include orcacloud::security
  include orcacloud::monitoring
}

# Development environment nodes
node /^dev-.*/ {
  $environment = 'development'
  include orcacloud::platform
  include orcacloud::security
  
  # Development-specific configurations
  class { 'orcacloud::platform':
    debug_mode => true,
    log_level  => 'debug',
  }
}

# Production environment nodes
node /^prod-.*/ {
  $environment = 'production'
  include orcacloud::platform
  include orcacloud::security
  include orcacloud::monitoring
  
  # Production-specific configurations
  class { 'orcacloud::platform':
    debug_mode       => false,
    log_level        => 'warning',
    enable_ssl       => true,
    backup_enabled   => true,
  }
}

# Staging environment nodes
node /^staging-.*/ {
  $environment = 'staging'
  include orcacloud::platform
  include orcacloud::security
  
  class { 'orcacloud::platform':
    debug_mode => false,
    log_level  => 'info',
    enable_ssl => true,
  }
}