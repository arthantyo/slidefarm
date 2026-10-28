package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestForwardsOTLPWithServerCredentials(t *testing.T) {
	var gotPath, gotType, gotBody, gotUser, gotPassword string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotType = r.Header.Get("Content-Type")
		body, _ := io.ReadAll(r.Body)
		gotBody = string(body)
		gotUser, gotPassword, _ = r.BasicAuth()
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()
	endpoint, _ := url.Parse(upstream.URL + "/otlp")
	handler := newHandler(config{endpoint: endpoint, instanceID: "stack-id", token: "secret-token", ingestKey: "client-key"}, upstream.Client())
	request := httptest.NewRequest(http.MethodPost, "/v1/metrics", strings.NewReader("otlp-payload"))
	request.Header.Set("Content-Type", "application/x-protobuf")
	request.Header.Set("X-SlideFarm-Ingest-Key", "client-key")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusOK || gotPath != "/otlp/v1/metrics" || gotType != "application/x-protobuf" || gotBody != "otlp-payload" || gotUser != "stack-id" || gotPassword != "secret-token" {
		t.Fatalf("unexpected forward: status=%d path=%q type=%q body=%q user=%q", response.Code, gotPath, gotType, gotBody, gotUser)
	}
}

func TestRejectsUnauthenticatedAndInvalidRequests(t *testing.T) {
	endpoint, _ := url.Parse("https://example.invalid/otlp")
	handler := newHandler(config{endpoint: endpoint, ingestKey: "client-key"}, http.DefaultClient)
	for _, test := range []struct {
		method, path, key, contentType string
		want                           int
	}{
		{http.MethodGet, "/v1/traces", "client-key", "application/x-protobuf", http.StatusMethodNotAllowed},
		{http.MethodPost, "/v1/traces", "wrong", "application/x-protobuf", http.StatusUnauthorized},
		{http.MethodPost, "/v1/traces", "client-key", "text/plain", http.StatusUnsupportedMediaType},
		{http.MethodPost, "/v1/logs", "client-key", "application/x-protobuf", http.StatusNotFound},
	} {
		request := httptest.NewRequest(test.method, test.path, nil)
		request.Header.Set("X-SlideFarm-Ingest-Key", test.key)
		request.Header.Set("Content-Type", test.contentType)
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != test.want {
			t.Errorf("%s %s: got %d, want %d", test.method, test.path, response.Code, test.want)
		}
	}
}
