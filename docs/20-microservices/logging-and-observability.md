# Logging and Observability

## Structured Logging

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

## Popular Logging Libraries

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

## Observability Pillars

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

### 2. Traces
Track requests across distributed systems.

```go
import "go.opentelemetry.io/otel"

tracer := otel.Tracer("myapp")
ctx, span := tracer.Start(ctx, "process_order")
defer span.End()
```

### 3. Logs
Record events for debugging and analysis.

## Correlation IDs

Use correlation IDs to trace requests across services:

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
