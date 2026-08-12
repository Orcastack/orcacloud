# Zookeeper Configuration for Ruby Service
# This file configures Zookeeper client for distributed coordination

require 'zookeeper'
require 'json'

module OrcaCloud
  module Zookeeper
    class Client
      attr_reader :zk, :connected

      def initialize
        @zk_hosts = ENV.fetch('ZOOKEEPER_URL', 'zookeeper:2181')
        @app_namespace = "/orcacloud/#{ENV.fetch('RACK_ENV', 'development')}"
        @zk = nil
        @connected = false
        connect
      end

      def connect
        return if @connected

        begin
          @zk = ::Zookeeper.new(@zk_hosts)
          @zk.create(:path => @app_namespace) rescue nil # Create namespace if it doesn't exist
          @connected = true
          puts "Connected to Zookeeper at #{@zk_hosts}"
        rescue => e
          puts "Failed to connect to Zookeeper: #{e.message}"
          @connected = false
        end
      end

      def disconnect
        return unless @connected

        @zk.close if @zk
        @connected = false
        puts "Disconnected from Zookeeper"
      end

      def connected?
        @connected && @zk && @zk.connected?
      end

      # Configuration Management
      def set_config(key, value)
        return false unless connected?

        path = "#{@app_namespace}/config/#{key}"
        data = JSON.generate(value)

        begin
          if @zk.exists?(:path => path)
            @zk.set(:path => path, :data => data)
          else
            @zk.create(:path => path, :data => data)
          end
          puts "Set config #{key} in Zookeeper"
          true
        rescue => e
          puts "Failed to set config #{key}: #{e.message}"
          false
        end
      end

      def get_config(key, default = nil)
        return default unless connected?

        path = "#{@app_namespace}/config/#{key}"

        begin
          data, _ = @zk.get(:path => path)
          JSON.parse(data)
        rescue ::Zookeeper::Exceptions::NoNode => e
          puts "Config #{key} not found in Zookeeper"
          default
        rescue => e
          puts "Failed to get config #{key}: #{e.message}"
          default
        end
      end

      # Service Discovery
      def register_service(service_name, host, port, metadata = {})
        return false unless connected?

        service_data = {
          host: host,
          port: port,
          metadata: metadata,
          registered_at: Time.now.iso8601
        }.to_json

        path = "#{@app_namespace}/services/#{service_name}"

        begin
          @zk.create(
            :path => "#{path}/instance-",
            :data => service_data,
            :ephemeral => true,
            :sequence => true
          )
          puts "Registered service #{service_name} at #{host}:#{port}"
          true
        rescue => e
          puts "Failed to register service #{service_name}: #{e.message}"
          false
        end
      end

      def discover_services(service_name)
        return [] unless connected?

        path = "#{@app_namespace}/services/#{service_name}"

        begin
          children = @zk.get_children(:path => path)
          services = []

          children.each do |instance|
            begin
              data, _ = @zk.get(:path => "#{path}/#{instance}")
              service_info = JSON.parse(data)
              services << service_info
            rescue => e
              puts "Failed to get service instance #{instance}: #{e.message}"
            end
          end

          services
        rescue ::Zookeeper::Exceptions::NoNode
          []
        rescue => e
          puts "Failed to discover service #{service_name}: #{e.message}"
          []
        end
      end

      # Distributed Locking
      def acquire_lock(lock_name, timeout = 30)
        return nil unless connected?

        begin
          lock_path = "#{@app_namespace}/locks/#{lock_name}"
          # Note: Ruby Zookeeper gem doesn't have built-in lock recipe
          # This is a simplified implementation
          lock_node = "#{lock_path}/lock-"

          @zk.create(:path => lock_node, :ephemeral => true, :sequence => true)
        rescue => e
          puts "Failed to acquire lock #{lock_name}: #{e.message}"
          nil
        end
      end

      def release_lock(lock)
        # Simplified lock release
        # In production, you'd want proper lock management
        true
      end
    end

    # Global client instance
    @@client = nil

    def self.client
      @@client ||= Client.new
    end

    def self.connect
      client.connect
    end

    def self.disconnect
      client.disconnect if @@client
    end

    def self.connected?
      @@client&.connected?
    end

    # Delegate methods to client
    def self.set_config(key, value)
      client.set_config(key, value)
    end

    def self.get_config(key, default = nil)
      client.get_config(key, default)
    end

    def self.register_service(service_name, host, port, metadata = {})
      client.register_service(service_name, host, port, metadata)
    end

    def self.discover_services(service_name)
      client.discover_services(service_name)
    end
  end
end

# Initialize Zookeeper connection
at_exit do
  OrcaCloud::Zookeeper.disconnect
end
