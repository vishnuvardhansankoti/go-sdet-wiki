# Logging and Observability

Logging and observability are essential for operating microservices with confidence. They help you answer three critical questions quickly: what happened, why it happened, and where to fix it.

For SDET and backend workflows, good observability directly improves:

- failure diagnosis speed,
- test reliability analysis,
- and production incident response.

## Structured Logging

Structured logging records events as key-value fields instead of unstructured text. This makes logs easier to search, filter, and aggregate across services.

Use JSON-based structured logging for production:

```go
import "log/slog"

logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

logger.Info("user created",
    "user_id", userID,
    "email", email,
)

logger.Error("failed to create user",
    "error", err,
    "email", email,
)
```

Why this helps:

- consistent log schema across handlers,
- easier correlation by `request_id` or `path`,
- faster triage in centralized log platforms.

## Popular Logging Libraries

Go supports multiple strong logging options. `slog` (standard library), `zerolog`, and `zap` all provide structured logging capabilities.

Pick one approach and keep it consistent across services.

### zerolog
```bash
go get github.com/rs/zerolog
```

```go
logger := zerolog.New(os.Stderr).With().Timestamp().Logger()
logger.Info().
    Str("email", "user@example.com").
    Msg("user created")
```

`zerolog` is optimized for low allocation and high-throughput logging paths.

### zap
```bash
go get go.uber.org/zap
```

```go
logger, _ := zap.NewProduction()
defer logger.Sync()

logger.Info("user created",
    zap.String("email", email),
    zap.Int64("user_id", userID),
)
```

`zap` is widely used in production systems and offers strong typed-field ergonomics.

## Observability Pillars

Logs alone are not enough for production diagnostics. Strong observability combines metrics, traces, and logs so each signal complements the others.

### 1. Metrics
Track system behavior and performance.

```go
import "github.com/prometheus/client_golang/prometheus"

requestsTotal := prometheus.NewCounterVec(
    prometheus.CounterOpts{
        Name: "http_requests_total",
    },
    []string{"method", "endpoint"},
)
```

Metrics are best for trend analysis, SLO tracking, and alerting.

### 2. Traces
Track requests across distributed systems.

```go
import "go.opentelemetry.io/otel"

tracer := otel.Tracer("myapp")
ctx, span := tracer.Start(ctx, "process_order")
defer span.End()
```

Traces are best for understanding where latency or failures occur across service boundaries.

### 3. Logs
Record events for debugging and analysis.

Logs are best for detailed event context and root-cause investigation.


## Quick Exercises (SDET Focus)

Try these exercises before moving to the next section.

### Exercise 1: Config + Health Validation

Goal: Verify service startup behavior under real config conditions.

1. Create two env profiles: valid and invalid (missing required key).
2. Start service and assert startup succeeds only for valid profile.
3. Call `/health` and assert status and response shape.
4. Add one negative test for malformed env value.

Stretch: Capture startup logs and assert a clear config error message.

### Exercise 2: API Contract Smoke for One Endpoint

Goal: Validate one endpoint end-to-end with deterministic assertions.

1. Pick one endpoint (for example create/list/get flow).
2. Write tests for success, validation error, and not-found path.
3. Assert status code, JSON schema shape, and key business fields.
4. Verify error payload stays stable across runs.

Stretch: Add idempotency or duplicate-request case.

## Assignment: Add Structured Logging

### Goal
Implement structured JSON logging with request tracing.

This assignment establishes a practical observability baseline: request lifecycle logs, handler-level domain events, and startup diagnostics.

### Tasks

#### 1. Enhance Logging Middleware

Middleware is the right place to capture request entry/exit logs consistently for every endpoint.

Update `pkg/middleware/logging.go`:

```go
package middleware

import (
	"log/slog"
	"net/http"
	"time"
)

func LoggingMiddleware(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			
			logger.Info("request received",
				"method", r.Method,
				"path", r.URL.Path,
				"remote_addr", r.RemoteAddr,
			)
			
			wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			next.ServeHTTP(wrapped, r)
			
			duration := time.Since(start)
			logger.Info("request completed",
				"method", r.Method,
				"path", r.URL.Path,
				"status", wrapped.statusCode,
				"duration_ms", duration.Milliseconds(),
			)
		})
	}
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
```

The wrapped writer pattern is important because `http.ResponseWriter` does not expose final status code by default.

#### 2. Add Logging to Handlers

Handler logs should capture meaningful domain events (validation failure, entity creation, dependency error) with safe contextual fields.

In `pkg/handler/handlers.go`:

```go
func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("failed to decode request",
			"error", err,
			"path", r.URL.Path,
		)
		// ...
		return
	}
	
	user, err := domain.NewUser(req.Email, req.Password)
	if err != nil {
		h.logger.Warn("validation error",
			"error", err,
			"email", req.Email,
		)
		// ...
		return
	}
	
	h.logger.Info("user created",
		"email", user.Email,
		"id", user.ID,
	)
	
	WriteJSON(w, http.StatusCreated, SuccessResponse(FromDomainUser(user)))
}
```

#### 3. Update main.go

Startup logs should include environment, port, and major initialization milestones.

```go
// In cmd/server/main.go

func main() {
	cfg := config.Load()
	log := logger.NewLogger(cfg.Logging.Level)
	
	// ...
	
	loggingMiddleware := middleware.LoggingMiddleware(log)
	server := loggingMiddleware(router)
	
	log.Info("starting server",
		"port", cfg.Server.Port,
		"env", cfg.App.Env,
	)
	
	if err := http.ListenAndServe(":" + cfg.Server.Port, server); err != nil {
		log.Error("server error", "error", err)
		os.Exit(1)
	}
}
```


### Example Log Output

```json
{"time":"2024-01-15T10:30:00Z","level":"INFO","msg":"starting server","port":"8080","env":"development"}
{"time":"2024-01-15T10:30:01Z","level":"INFO","msg":"request received","method":"POST","path":"/api/users"}
{"time":"2024-01-15T10:30:01Z","level":"INFO","msg":"user created","email":"test@example.com"}
{"time":"2024-01-15T10:30:01Z","level":"INFO","msg":"request completed","status":201,"duration_ms":5}
```

## Correlation IDs

Use correlation IDs to trace requests across services:

Correlation IDs are critical for distributed debugging. If absent in inbound request headers, generate one and propagate it to downstream calls and all request-scoped logs.

```go
correlationID := r.Header.Get("X-Correlation-ID")
if correlationID == "" {
    correlationID = uuid.New().String()
}

logger := logger.With("correlation_id", correlationID)
```

## Best Practices

- Use appropriate log levels (Debug, Info, Warn, Error)
- Include context (user ID, request ID, correlation ID)
- Avoid logging sensitive data
- Use structured logging (JSON output)
- Aggregate logs centrally
- Use stable field names across handlers/services
- Include status and duration for every completed request
- Keep messages concise and operationally actionable

## Deep Dive: Observability for Fast Debugging

### Background

Logs alone are not enough. Production diagnostics improves when logs, metrics, and traces are designed together.

Each signal answers a different question:

- Metrics: Is this issue trending or isolated?
- Traces: Where in the request path is time/failure happening?
- Logs: What exactly happened for this specific request?

### Request Lifecycle Visibility

Each request should be observable with:

1. Request ID or correlation ID
2. Method and route
3. Status code
4. Duration
5. Error details (safe/non-sensitive)

### Example: Useful Structured Fields

```go
logger.Info("request completed",
	"request_id", requestID,
	"route", "/api/users",
	"status", 201,
	"duration_ms", 12,
)
```

### Metrics Pairing

Pair logs with counters and latency histograms:

- `http_requests_total{method,route,status}`
- `http_request_duration_ms{method,route}`

Together, these enable both alerting and regression detection.

### SDET Use Cases

- Quickly isolate flaky integration tests by request ID.
- Identify latency regressions in CI performance runs.
- Detect incorrect error mapping (for example, 500 instead of 400).

## Common Anti-Patterns

- Logging secrets or personally sensitive payloads.
- Inconsistent field naming (`path` vs `route` vs `endpoint`) across log events.
- Missing request completion logs (status code and duration absent).
- Excessive noise at `Info` level that hides real issues.

## Quick Observability Checklist

- Do all requests have start and completion log events?
- Are status code and duration always recorded?
- Are correlation IDs present and propagated through service calls?
- Are error logs actionable and sanitized of sensitive data?
- Are metrics and traces aligned with log field dimensions?



## Next Step

Continue with [Testing Package Basics](../30-testing-basics/testing-package-basics.md).
