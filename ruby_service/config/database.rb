# Database Configuration
# frozen_string_literal: true

require 'sequel'
require 'pg'

# Database connection
database_url = ENV.fetch('DATABASE_URL', 'postgres://localhost/orcacloud_ruby')

DB = Sequel.connect(database_url, logger: SemanticLogger['database'])

# Enable SSL if using external database
if ENV.fetch('DATABASE_SSL', 'false') == 'true'
  DB.extension :pg_streaming
  DB.streaming = true
end

# Connection pool settings (guard for different Sequel pool implementations)
begin
  DB.pool.connection_validation_timeout = 300 if DB.pool.respond_to?(:connection_validation_timeout=)
  DB.pool.max_connections = ENV.fetch('DB_POOL_SIZE', 10).to_i if DB.pool.respond_to?(:max_connections=)
rescue NoMethodError
  # Some Sequel pool implementations don't expose these setter methods; ignore silently
end

# Database extensions
DB.extension :pg_array, :pg_json, :pg_hstore

# Migration support
Sequel.extension :migration

# Model configuration
Sequel::Model.plugin :timestamps
Sequel::Model.plugin :validation_helpers
Sequel::Model.plugin :json_serializer
Sequel::Model.plugin :association_dependencies

# Custom logger for database queries
DB.loggers << SemanticLogger['database']

# Database health check
def database_connected?
  DB.test_connection
  true
rescue StandardError
  false
end

# Graceful shutdown
at_exit do
  DB.disconnect
end