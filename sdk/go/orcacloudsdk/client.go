package orcacloudsdk

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	BaseURL string
	Token   string
	http    *http.Client
}

func NewClient(baseURL, token string) *Client {
	return &Client{
		BaseURL: baseURL,
		Token:   token,
		http:    &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) do(method, path string, payload any) ([]byte, error) {
	var body io.Reader
	if payload != nil {
		b, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		body = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Token "+c.Token)

	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	data, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.StatusCode >= 400 {
		return nil, fmt.Errorf("orcacloud api error: %s", string(data))
	}
	return data, nil
}

func (c *Client) ListInstances() ([]byte, error) {
	return c.do(http.MethodGet, "/api/services/instances/", nil)
}

func (c *Client) ComplianceControls(framework string) ([]byte, error) {
	if framework == "" {
		framework = "soc2"
	}
	return c.do(http.MethodGet, "/api/services/compliance/control_status/?framework="+framework, nil)
}

func (c *Client) CollectEvidence(framework string) ([]byte, error) {
	if framework == "" {
		framework = "soc2"
	}
	return c.do(http.MethodPost, "/api/services/compliance/collect_evidence/", map[string]string{"framework": framework})
}

func (c *Client) GraphQL(query string, variables map[string]any) ([]byte, error) {
	if variables == nil {
		variables = map[string]any{}
	}
	return c.do(http.MethodPost, "/api/graphql/", map[string]any{"query": query, "variables": variables})
}
