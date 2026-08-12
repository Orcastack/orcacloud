require './app'
require './api/editorial_api'
require './api/ci_api'

# Mount Grape APIs under /api/v1 and run Sinatra app at root
map '/api/v1' do
	run Rack::URLMap.new(
		'/editorial' => EditorialAPI.new,
		'/ci' => CIApi.new
	)
end

map '/' do
	run OrcaCloudRubyService.new
end
