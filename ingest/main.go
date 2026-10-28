package main

import (
	"bytes"
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

const maxBodyBytes = 4 << 20

type config struct {
	endpoint   *url.URL
	instanceID string
	token      string
	ingestKey  string
}

func loadConfig() (config, string, error) {
	rawEndpoint := os.Getenv("GRAFANA_CLOUD_OTLP_ENDPOINT")
	instanceID := os.Getenv("GRAFANA_CLOUD_INSTANCE_ID")
	token := os.Getenv("GRAFANA_CLOUD_TOKEN")
	if rawEndpoint == "" || instanceID == "" || token == "" {
		return config{}, "", errors.New("GRAFANA_CLOUD_OTLP_ENDPOINT, GRAFANA_CLOUD_INSTANCE_ID, and GRAFANA_CLOUD_TOKEN are required")
	}
	endpoint, err := url.Parse(rawEndpoint)
	if err != nil || endpoint.Scheme != "https" || endpoint.Host == "" || endpoint.User != nil || endpoint.RawQuery != "" || endpoint.Fragment != "" {
		return config{}, "", errors.New("GRAFANA_CLOUD_OTLP_ENDPOINT must be an HTTPS base URL without credentials or query parameters")
	}
	listen := os.Getenv("INGEST_LISTEN_ADDR")
	if listen == "" {
		listen = "127.0.0.1:4318"
	}
	host, _, err := net.SplitHostPort(listen)
	if err != nil {
		return config{}, "", fmt.Errorf("invalid INGEST_LISTEN_ADDR: %w", err)
	}
	ingestKey := os.Getenv("INGEST_API_KEY")
	if ingestKey == "" && host != "127.0.0.1" && host != "localhost" && host != "::1" {
		return config{}, "", errors.New("INGEST_API_KEY is required when listening beyond localhost")
	}
	return config{endpoint: endpoint, instanceID: instanceID, token: token, ingestKey: ingestKey}, listen, nil
}

func newHandler(cfg config, client *http.Client) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	forward := func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if cfg.ingestKey != "" && subtle.ConstantTimeCompare([]byte(r.Header.Get("X-SlideFarm-Ingest-Key")), []byte(cfg.ingestKey)) != 1 {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		contentType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
		if err != nil || (contentType != "application/x-protobuf" && contentType != "application/json") {
			w.WriteHeader(http.StatusUnsupportedMediaType)
			return
		}
		encoding := r.Header.Get("Content-Encoding")
		if encoding != "" && encoding != "gzip" {
			w.WriteHeader(http.StatusUnsupportedMediaType)
			return
		}
		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBodyBytes))
		if err != nil {
			w.WriteHeader(http.StatusRequestEntityTooLarge)
			return
		}
		upstream := *cfg.endpoint
		upstream.Path = strings.TrimRight(upstream.Path, "/") + r.URL.Path
		outgoing, err := http.NewRequestWithContext(r.Context(), http.MethodPost, upstream.String(), bytes.NewReader(body))
		if err != nil {
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		outgoing.Header.Set("Content-Type", contentType)
		if encoding == "gzip" {
			outgoing.Header.Set("Content-Encoding", encoding)
		}
		outgoing.SetBasicAuth(cfg.instanceID, cfg.token)
		response, err := client.Do(outgoing)
		if err != nil {
			slog.Warn("OTLP forward failed", "error", err)
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		defer response.Body.Close()
		io.Copy(io.Discard, io.LimitReader(response.Body, 1024))
		if retryAfter := response.Header.Get("Retry-After"); retryAfter != "" {
			w.Header().Set("Retry-After", retryAfter)
		}
		w.WriteHeader(response.StatusCode)
	}
	mux.HandleFunc("/v1/metrics", forward)
	mux.HandleFunc("/v1/traces", forward)
	return mux
}

func main() {
	cfg, listen, err := loadConfig()
	if err != nil {
		slog.Error("invalid ingest configuration", "error", err)
		os.Exit(1)
	}
	server := &http.Server{
		Addr:              listen,
		Handler:           newHandler(cfg, &http.Client{Timeout: 10 * time.Second}),
		ReadHeaderTimeout: 5 * time.Second,
		MaxHeaderBytes:    16 << 10,
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		server.Shutdown(shutdownCtx)
	}()
	slog.Info("OTLP ingest listening", "addr", listen)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("ingest server stopped", "error", err)
		os.Exit(1)
	}
}
