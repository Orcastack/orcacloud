#!/usr/bin/env ruby
# frozen_string_literal: true

require 'bundler/setup'
require 'sinatra/base'
require 'sinatra/json'
require 'sinatra/namespace'
require 'grape'
require 'grape-entity'
require 'sidekiq'
require 'sidekiq-scheduler'
require 'semantic_logger'
require 'prometheus/client'
require 'redis'
require 'sequel'
require 'dotenv/load'
require_relative 'config/database'
require_relative 'config/redis'
require_relative 'config/sidekiq'
require_relative 'config/zookeeper'
require_relative 'lib/workers/editorial_worker'
require_relative 'lib/workers/ci_worker'
require_relative 'api/editorial_api'
require_relative 'api/ci_api'

# Configure Semantic Logger
SemanticLogger.default_level = ENV.fetch('LOG_LEVEL', 'info').to_sym
SemanticLogger.add_appender(file_name: 'log/app.log', formatter: :json)

# Main Application Class
class OrcaCloudRubyService < Sinatra::Base
  # Ensure sinatra-namespace is registered so `namespace` is available
  register Sinatra::Namespace
  use Rack::Protection
  use Rack::Protection::AuthenticityToken

  # Configure Sinatra
  configure do
    set :server, :puma
    set :bind, ENV.fetch('BIND', '0.0.0.0')
    set :port, ENV.fetch('PORT', 3000).to_i
    set :show_exceptions, development?
    set :dump_errors, development?

    # Register service with Zookeeper
    begin
      OrcaCloud::Zookeeper.register_service(
        'ruby-service',
        ENV.fetch('BIND', '0.0.0.0'),
        ENV.fetch('PORT', 3000).to_i,
        {
          version: ENV.fetch('APP_VERSION', '1.0.0'),
          environment: ENV.fetch('RACK_ENV', 'development'),
          type: 'web'
        }
      )
    rescue => e
      puts "Failed to register service with Zookeeper: #{e.message}"
    end

    # Enable logging if SemanticLogger Rack middleware is available
    begin
      if defined?(SemanticLogger) && SemanticLogger.respond_to?(:const_defined?) &&
         SemanticLogger.const_defined?(:Rack) && SemanticLogger::Rack.const_defined?(:Logger)
        use SemanticLogger::Rack::Logger,
            application: 'orcacloud-ruby-service',
            log_headers: true
      else
        # Fallback: use Rack's CommonLogger writing to STDOUT so requests are logged
        require 'logger'
        use Rack::CommonLogger, Logger.new(STDOUT)
      end
    rescue NameError
      # If any constant resolution fails unexpectedly, fall back to CommonLogger
      require 'logger'
      use Rack::CommonLogger, Logger.new(STDOUT)
    end

    # Health check endpoint
    get '/health' do
      content_type :json
      {
        status: 'healthy',
        timestamp: Time.now.iso8601,
        version: ENV.fetch('APP_VERSION', '1.0.0'),
        environment: ENV.fetch('RACK_ENV', 'development'),
        redis_connected: redis_connected?,
        zookeeper_connected: OrcaCloud::Zookeeper.connected?
      }.to_json
    end

    # Metrics endpoint for Prometheus
    get '/metrics' do
      content_type 'text/plain'
      Prometheus::Client::Registry.instance.to_s
    end
  end

  # API Routes
  # Grape APIs are mounted via Rack in config.ru. Keep only internal Sinatra endpoints here.
  namespace '/api/v1' do
    # System info
    get '/info' do
      content_type :json
      {
        service: 'orcacloud-ruby-service',
        version: ENV.fetch('APP_VERSION', '1.0.0'),
        uptime: Process.clock_gettime(Process::CLOCK_MONOTONIC),
        ruby_version: RUBY_VERSION,
        environment: ENV.fetch('RACK_ENV', 'development'),
        sidekiq_processes: Sidekiq::ProcessSet.new.size,
        redis_connected: redis_connected?
      }.to_json
    end
  end

  # Error handling
  error 400..499 do
    content_type :json
    status response.status
    {
      error: 'Client Error',
      message: env['sinatra.error']&.message || 'Bad Request',
      status: response.status
    }.to_json
  end

  error 500..599 do
    content_type :json
    status response.status
    {
      error: 'Server Error',
      message: env['sinatra.error']&.message || 'Internal Server Error',
      status: response.status
    }.to_json
  end

  private

  def redis_connected?
    Redis.current.ping == 'PONG'
  rescue StandardError
    false
  end
end

# Run the application if this file is executed directly
if __FILE__ == $PROGRAM_NAME
  # Start Sidekiq scheduler if enabled
  if ENV.fetch('ENABLE_SIDEKIQ_SCHEDULER', 'true') == 'true'
    require 'sidekiq/scheduler'
    Sidekiq::Scheduler.enabled = true
  end

  OrcaCloudRubyService.run!
end
