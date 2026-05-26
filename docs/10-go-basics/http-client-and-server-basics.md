# HTTP Client and Server Basics

HTTP is the backbone of most modern service-to-service and client-to-service communication. For SDETs, understanding HTTP behavior is essential because API quality, reliability, and automation all depend on it.

In this section, you will learn:

- How a Go HTTP server receives and responds to requests.
- How a Go HTTP client sends requests and reads responses.
- How to handle headers, body payloads, status codes, and timeouts.
- How to write patterns that are test-friendly and production-safe.

## HTTP Request-Response Lifecycle

At a high level, every HTTP interaction follows this flow:

1. Client sends a request with method, URL, headers, and optional body.
2. Server routes the request to a handler.
3. Handler validates input and runs business logic.
4. Handler writes status code, headers, and response body.
5. Client reads response and decides next action.

<div class="mermaid">
graph LR
    C[Client] --> S[Server]
    S --> H[Handler]
    H --> R[Response]
    R --> C
</div>

When you understand this lifecycle, test design becomes easier because you can assert each step explicitly.

## HTTP Server

An HTTP server is responsible for accepting requests and returning responses. In Go, the standard net/http package provides everything you need to build this with minimal setup.

### Simple Server

This example shows a minimal handler function and server startup. It demonstrates routing, request access, and writing a response.

```go
func handler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, %s!", r.URL.Path[1:])
}

func main() {
    http.HandleFunc("/", handler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

<div class="go-playground">
  <textarea class="go-code" rows="12">func handler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, %s!", r.URL.Path[1:])
}

func main() {
    http.HandleFunc("/", handler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


Key ideas:

- http.HandleFunc binds a URL pattern to a handler function.
- The ResponseWriter is how you send headers, status, and body.
- The Request contains method, path, headers, query params, and body.

### Using Struct-based Handlers

Struct-based handlers are better for real systems because they let you inject dependencies such as databases, services, loggers, and configuration.

```go
type Handler struct {
    db *sql.DB
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // Handle request
}

func main() {
    h := &Handler{db: db}
    http.ListenAndServe(":8080", h)
}
```

<div class="go-playground">
  <textarea class="go-code" rows="12">type Handler struct {
    db *sql.DB
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // Handle request
}

func main() {
    h := &Handler{db: db}
    http.ListenAndServe(":8080", h)
}
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


This pattern improves testability because your handler can be created with mock or fake dependencies in unit tests.

## HTTP Client

An HTTP client sends outbound requests to APIs. In automation, clients are used for health checks, contract checks, integration tests, and service orchestration.

### Basic Request

Use this for simple GET calls. Always handle errors and close the response body to prevent resource leaks.

```go
resp, err := http.Get("https://example.com")
if err != nil {
    log.Fatal(err)
}
defer resp.Body.Close()

body, err := io.ReadAll(resp.Body)
fmt.Println(string(body))
```

Important:

- Closing the body is mandatory.
- You should usually check resp.StatusCode before trusting response content.

### POST Request

This example sends form data using application/x-www-form-urlencoded encoding.

```go
data := url.Values{}
data.Set("name", "John")

resp, err := http.PostForm("https://example.com/form", data)
if err != nil {
    log.Fatal(err)
}
defer resp.Body.Close()
```

Use this pattern when the server expects form-encoded payloads rather than JSON.

### Custom Client

A custom client is recommended for production and test automation because it gives you explicit control over timeout behavior.

```go
client := &http.Client{
    Timeout: 10 * time.Second,
}

req, _ := http.NewRequest("GET", "https://example.com", nil)
resp, err := client.Do(req)
```

Creating many ad-hoc clients can increase connection overhead. Reuse a configured client when possible.

## Request Body

For JSON APIs, you typically create a request body, attach it to a request, and set appropriate headers.

```go
body := []byte(`{"name":"John"}`)
req, _ := http.NewRequest("POST", "https://example.com/api", bytes.NewBuffer(body))
req.Header.Set("Content-Type", "application/json")
```

Good practice is to marshal JSON from typed structs instead of hardcoding raw strings, which reduces formatting mistakes and improves maintainability.

## Deep Dive: HTTP Fundamentals for SDET Workflows

### Background

Most modern test automation interacts with HTTP APIs. Understanding request lifecycle, status codes, headers, and timeouts is essential.

For SDETs, HTTP knowledge is not only about sending requests. It is about validating behavior contracts:

- Is the status code correct for each scenario?
- Is the response structure stable?
- Are error conditions represented consistently?
- Does timeout behavior match reliability expectations?

### Status Codes and Assertion Strategy

Treat status codes as part of the API contract:

- 2xx indicates success and should include expected response payload.
- 4xx indicates client-side issues such as validation failures.
- 5xx indicates server-side failures and should be observable and diagnosable.

In tests, assert both:

1. HTTP status code
2. Response payload semantics (fields, error code, message)

### Headers and Content Negotiation

Headers are often overlooked but are critical in automated checks:

- Content-Type controls parsing behavior.
- Accept indicates what response format client expects.
- Authorization carries credentials in protected endpoints.

Missing or incorrect headers are common root causes of integration failures.

### Timeouts, Retries, and Resilience

A no-timeout client can hang indefinitely. For reliability:

- Set client-level timeout.
- Use request context timeouts for finer control.
- Retry only transient failures (for example, 502/503/504), not validation errors.

### Observability Tips for HTTP Tests

When a test fails, log enough detail to diagnose quickly:

- method and URL
- request body (safe/redacted)
- response status and body
- elapsed duration

This is especially useful in CI where interactive debugging is limited.

### Server-Side Best Practices

1. Validate request input early.
2. Return consistent JSON envelopes.
3. Set `Content-Type` explicitly.
4. Propagate request context for cancellation and timeouts.

Example handler skeleton:

```go
func CreateUserHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    w.Write([]byte(`{"data":{"message":"created"}}`))
}
```

### Client-Side Best Practices

1. Reuse `http.Client` to avoid socket exhaustion.
2. Set per-request deadlines with context.
3. Always close response bodies.
4. Assert on both status code and payload in tests.

```go
client := &http.Client{Timeout: 5 * time.Second}
req, _ := http.NewRequest(http.MethodGet, "https://example.com/health", nil)
resp, err := client.Do(req)
if err != nil {
    return
}
defer resp.Body.Close()
```

### Practical Exercise

Create:
- one handler that returns a JSON success response
- one handler that returns validation error response
- one client helper that retries transient 5xx errors

## Quick Exercises

Try these short exercises before moving to the next chapter.

### Exercise 1: Build a Minimal JSON API Handler

Goal: Practice request validation, status codes, and consistent JSON responses.

1. Create handler `CreateBookHandler(w http.ResponseWriter, r *http.Request)`.
2. Accept only `POST`; return `405` for other methods.
3. Parse JSON body with fields `title` and `author`.
4. If either field is empty, return `400` with JSON error payload.
5. On success, return `201` with JSON data payload.

Stretch: Add a request ID response header (`X-Request-ID`) and include it in logs.

### Exercise 2: Implement a Resilient HTTP Client Helper

Goal: Practice timeout control, retry policy, and response handling.

1. Create function `GetWithRetry(url string, attempts int) ([]byte, int, error)`.
2. Use a reusable `http.Client` with timeout.
3. Retry only on transient statuses (`502`, `503`, `504`) and network errors.
4. Do not retry on `4xx` validation/client errors.
5. Always close `resp.Body` and return both body and status code.

Stretch: Add exponential backoff between retries and make backoff configurable.

## Common Anti-Patterns

- Reading `resp.Body` without deferring `resp.Body.Close()`, causing connection leaks.
- Ignoring non-2xx status codes without returning an error to the caller.
- Hardcoding timeouts in HTTP clients, making them impossible to override in tests.
- Mixing business logic directly inside HTTP handler functions.

## Quick HTTP Client Checklist

- Is `resp.Body.Close()` deferred immediately after every successful `http.Get`/`http.Do` call?
- Do handlers validate method and path before processing the request body?
- Are request body parsing errors returned as 400, not 500?
- Is client timeout configurable and set to a sensible default?
- Are error responses mapped to consistent status codes across all endpoints?



## Next Step

Continue with [Unit Testing in Go](unit-testing-in-go.md).
