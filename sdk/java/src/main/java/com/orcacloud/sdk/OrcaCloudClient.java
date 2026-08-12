package com.orcacloud.sdk;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class OrcaCloudClient {
    private final String baseUrl;
    private final String token;
    private final HttpClient httpClient;

    public OrcaCloudClient(String baseUrl, String token) {
        this.baseUrl = baseUrl;
        this.token = token;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    private String request(String method, String path, String jsonBody) throws IOException, InterruptedException {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + path))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json")
                .header("Authorization", "Token " + token);

        if (jsonBody == null || jsonBody.isBlank()) {
            builder.method(method, HttpRequest.BodyPublishers.noBody());
        } else {
            builder.method(method, HttpRequest.BodyPublishers.ofString(jsonBody));
        }

        HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw new IOException("OrcaCloud API error: " + response.body());
        }
        return response.body();
    }

    public String listInstances() throws IOException, InterruptedException {
        return request("GET", "/api/services/instances/", null);
    }

    public String complianceControls(String framework) throws IOException, InterruptedException {
        String f = (framework == null || framework.isBlank()) ? "soc2" : framework;
        return request("GET", "/api/services/compliance/control_status/?framework=" + f, null);
    }

    public String collectEvidence(String framework) throws IOException, InterruptedException {
        String f = (framework == null || framework.isBlank()) ? "soc2" : framework;
        return request("POST", "/api/services/compliance/collect_evidence/", "{\"framework\":\"" + f + "\"}");
    }

    public String graphql(String query) throws IOException, InterruptedException {
        String escaped = query.replace("\\", "\\\\").replace("\"", "\\\"");
        String body = "{\"query\":\"" + escaped + "\",\"variables\":{}}";
        return request("POST", "/api/graphql/", body);
    }
}
