// Command reminder-worker periodically pings the app's reminder dispatch
// endpoint. Every interval it POSTs to DISPATCH_URL with the shared CRON_SECRET;
// the endpoint does the actual work of finding due reminders and sending pushes.
//
// It's a long-running process with its own ticker — run it once and leave it up
// (systemd, a container, Fly/Railway, etc.). No external cron required.
package main

import (
	"bufio"
	"bytes"
	"context"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"
)

func main() {
	loadEnvFile(".env")

	url := mustEnv("DISPATCH_URL")
	secret := mustEnv("CRON_SECRET")
	interval := envDuration("INTERVAL", time.Minute)
	timeout := envDuration("TIMEOUT", 30*time.Second)

	client := &http.Client{Timeout: timeout}

	// Cancel the current request and exit cleanly on Ctrl-C / SIGTERM.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	log.Printf("reminder-worker: POST %s every %s (request timeout %s)", url, interval, timeout)

	// Fire once immediately so a restart doesn't idle for a whole interval.
	dispatch(ctx, client, url, secret)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("reminder-worker: shutting down")
			return
		case <-ticker.C:
			dispatch(ctx, client, url, secret)
		}
	}
}

func dispatch(ctx context.Context, client *http.Client, url, secret string) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, nil)
	if err != nil {
		log.Printf("build request: %v", err)
		return
	}
	req.Header.Set("Authorization", "Bearer "+secret)

	resp, err := client.Do(req)
	if err != nil {
		// A shutdown mid-request surfaces as a context error — don't shout.
		if ctx.Err() != nil {
			return
		}
		log.Printf("dispatch error: %v", err)
		return
	}
	defer resp.Body.Close()

	body := bytes.TrimSpace(readBody(resp.Body))
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		log.Printf("ok %d: %s", resp.StatusCode, body)
	} else {
		log.Printf("non-2xx %d: %s", resp.StatusCode, body)
	}
}

func readBody(r io.Reader) []byte {
	b, _ := io.ReadAll(io.LimitReader(r, 4096))
	return b
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("missing required env %s", key)
	}
	return v
}

// envDuration accepts a Go duration ("90s", "2m") or a bare integer of seconds.
func envDuration(key string, def time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	if d, err := time.ParseDuration(v); err == nil {
		return d
	}
	if n, err := strconv.Atoi(v); err == nil {
		return time.Duration(n) * time.Second
	}
	log.Printf("invalid %s=%q, using %s", key, v, def)
	return def
}

// loadEnvFile does a minimal KEY=VALUE load for local runs. Missing file is
// fine, and existing environment variables always win.
func loadEnvFile(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = strings.Trim(strings.TrimSpace(val), `"'`)
		if _, exists := os.LookupEnv(key); !exists {
			os.Setenv(key, val)
		}
	}
}
