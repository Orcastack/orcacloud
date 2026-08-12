# Puma configuration file for OrcaCloud Ruby Service
# frozen_string_literal: true

# Environment
environment ENV.fetch('RACK_ENV', 'development')

# Server configuration
# Bind to the PORT env var (set by docker-compose) to avoid double-binding.
bind "tcp://0.0.0.0:#{ENV.fetch('PORT', ENV.fetch('PUMA_PORT', 3000))}"

# Worker configuration
workers ENV.fetch('PUMA_WORKERS', 2).to_i
threads ENV.fetch('PUMA_MIN_THREADS', 1).to_i, ENV.fetch('PUMA_MAX_THREADS', 16).to_i

# Process management
pidfile ENV.fetch('PUMA_PIDFILE', 'tmp/pids/puma.pid')
state_path ENV.fetch('PUMA_STATE_PATH', 'tmp/pids/puma.state')

# Logging (only redirect if method available)
if respond_to?(:stdout_redirect)
  stdout_redirect(
    ENV.fetch('PUMA_STDOUT', 'log/puma.stdout.log'),
    ENV.fetch('PUMA_STDERR', 'log/puma.stderr.log'),
    true
  )
end

# Do not daemonize inside containers (Puma should run in foreground); keep the option
# but guard against unsupported method calls in certain Puma builds/versions.
if respond_to?(:daemonize)
  daemonize ENV.fetch('PUMA_DAEMONIZE', 'false') == 'true'
end

# Preload application
preload_app! if ENV.fetch('PUMA_PRELOAD', 'true') == 'true'

# Before fork callback
before_fork do
  # Close database connections
  if defined?(Sequel)
    Sequel::DATABASES.each(&:disconnect)
  end

  # Close Redis connections (guarded to support different redis client implementations)
  begin
    if defined?(Redis)
      if Redis.respond_to?(:current) && Redis.current
        # Prefer a documented disconnect/close method; fall back safely.
        if Redis.current.respond_to?(:disconnect)
          Redis.current.disconnect
        elsif Redis.current.respond_to?(:close)
          Redis.current.close
        elsif Redis.current.respond_to?(:_client) && Redis.current._client.respond_to?(:disconnect)
          # redis-rb newer internals expose a client object
          Redis.current._client.disconnect
        end
      elsif defined?(GLOBAL_REDIS) && GLOBAL_REDIS.respond_to?(:disconnect)
        GLOBAL_REDIS.disconnect
      end
    end
  rescue StandardError => e
    # Don't let Redis disconnection errors abort the Puma before_fork hook; log and continue.
    STDERR.puts "WARN: failed to disconnect redis in before_fork: #{e.class}: #{e.message}"
  end

  # Clean up Sidekiq
  if defined?(Sidekiq)
    begin
      Sidekiq.redis(&:disconnect)
    rescue StandardError => e
      STDERR.puts "WARN: failed to disconnect Sidekiq redis connection in before_fork: #{e.class}: #{e.message}"
    end
  end
end

# On worker boot
on_worker_boot do
  # Reconnect database
  if defined?(Sequel)
    require_relative 'config/database'
  end

  # Reconnect Redis
  if defined?(Redis)
    require_relative 'config/redis'
  end

  # Reconnect Sidekiq
  if defined?(Sidekiq)
    require_relative 'config/sidekiq'
  end
end

# On worker shutdown
on_worker_shutdown do
  # Clean shutdown
  if defined?(Sequel)
    Sequel::DATABASES.each(&:disconnect)
  end
end

# Restart workers after this many requests
worker_timeout ENV.fetch('PUMA_WORKER_TIMEOUT', 3600).to_i
worker_boot_timeout ENV.fetch('PUMA_WORKER_BOOT_TIMEOUT', 60).to_i
worker_shutdown_timeout ENV.fetch('PUMA_WORKER_SHUTDOWN_TIMEOUT', 30).to_i

# Restart workers periodically
worker_culling_strategy :youngest if ENV.fetch('PUMA_WORKER_CULLING', 'false') == 'true'

# Allow puma to be restarted by `rails restart` command.
plugin :tmp_restart