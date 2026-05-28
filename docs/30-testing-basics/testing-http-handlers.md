# Testing HTTP Handlers

HTTP handler tests verify your API transport layer behaves correctly: method handling, request parsing, status codes, headers, and response shape. They are a critical safety net between business logic and external clients.

For SDET workflows, handler tests provide high-value coverage with relatively low runtime cost.

## net/http/httptest Package

Go's `httptest` package provides tools to test handlers without running a real network server.

Core components:

- `httptest.NewRequest(...)` to build synthetic requests.
- `httptest.NewRecorder()` to capture response status/body/headers.
- Direct handler invocation via `ServeHTTP`.

### Testing a Handler

This pattern validates both status code and response body for a simple endpoint.

`hello.go` (actual package)

```go
package handlers

import "net/http"

func HelloHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    _, _ = w.Write([]byte("Hello, World!"))
}
```

`hello_test.go` (test file)

```go
package handlers

import (
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestHelloHandler(t *testing.T) {
    handler := http.HandlerFunc(HelloHandler)

    req := httptest.NewRequest("GET", "/hello", nil)
    w := httptest.NewRecorder()

    handler.ServeHTTP(w, req)

    if w.Code != http.StatusOK {
        t.Errorf("status = %d; want %d", w.Code, http.StatusOK)
    }

    if w.Body.String() != "Hello, World!" {
        t.Errorf("body = %s; want Hello, World!", w.Body.String())
    }
}
```

Use this structure as your baseline for most handler unit tests.

## Testing Middleware

Middleware tests should verify that wrapper behavior does not break downstream handler behavior and applies expected side effects.

`middleware.go` (actual package)

```go
package handlers

import "net/http"

func loggingMiddleware(logf func(string, ...any), next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        logf("%s %s", r.Method, r.URL.Path)
        next.ServeHTTP(w, r)
    })
}
```

`middleware_test.go` (test file)

```go
package handlers

import (
    "fmt"
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"
)

func TestLoggingMiddleware(t *testing.T) {
    var logOutput strings.Builder

    handler := loggingMiddleware(
        func(format string, args ...any) {
            _, _ = fmt.Fprintf(&logOutput, format, args...)
        },
        http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            w.WriteHeader(http.StatusOK)
        }),
    )

    req := httptest.NewRequest("GET", "/test", nil)
    w := httptest.NewRecorder()

    handler.ServeHTTP(w, req)

    if w.Code != http.StatusOK {
        t.Errorf("status = %d; want %d", w.Code, http.StatusOK)
    }

    if !strings.Contains(logOutput.String(), "GET /test") {
        t.Errorf("log output = %q; want to contain GET /test", logOutput.String())
    }
}
```

Depending on middleware type, also assert headers, context values, authentication outcomes, or panic recovery behavior.

## Testing JSON Endpoints

JSON handler tests should validate decoding, input validation, and response serialization.

`users.go` (actual package)

```go
package handlers

import (
    "encoding/json"
    "net/http"
)

type User struct {
    Name string `json:"name"`
    Age  int    `json:"age"`
}

func CreateUserHandler(w http.ResponseWriter, r *http.Request) {
    var input User
    if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
        http.Error(w, `{"error":"invalid JSON"}`+"\n", http.StatusBadRequest)
        return
    }

    if input.Name == "" || input.Age <= 0 {
        http.Error(w, `{"error":"invalid user payload"}`+"\n", http.StatusBadRequest)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    _ = json.NewEncoder(w).Encode(input)
}
```

`users_test.go` (test file)

```go
package handlers

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"
)

func TestCreateUserHandler(t *testing.T) {
    body := `{"name":"John","age":30}`

    req := httptest.NewRequest("POST", "/users", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")

    w := httptest.NewRecorder()

    CreateUserHandler(w, req)

    if w.Code != http.StatusCreated {
        t.Errorf("status = %d; want %d", w.Code, http.StatusCreated)
    }

    var result User
    if err := json.NewDecoder(w.Body).Decode(&result); err != nil {
        t.Fatalf("decode response: %v", err)
    }

    if result.Name != "John" {
        t.Errorf("name = %s; want John", result.Name)
    }
}
```

Always check:

- status code,
- `Content-Type`,
- response body contract fields.

## Testing with Custom Client

`httptest.NewServer` is useful when you want end-to-end HTTP behavior (real round-trip) while staying in-process.

```go
import (
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestWithCustomServer(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("Hello"))
    }))
    defer server.Close()
    
    resp, err := http.Get(server.URL)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusOK {
        t.Errorf("status = %d; want %d", resp.StatusCode, http.StatusOK)
    }
}
```

This style is ideal for testing client behavior, redirects, middleware chaining, or integration-style handler interactions.


## Quick Exercises (SDET Focus)

Try these exercises before moving to the next section.

### Exercise 1: Table-Driven Boundary Tests

Goal: Improve correctness coverage with compact test cases.

1. Select one function with input validation.
2. Write table-driven tests for min, max, empty, and invalid values.
3. Assert expected result and expected error path.
4. Add case names that clearly describe intent.

Stretch: Add fuzz-style randomized inputs for one field.

### Exercise 2: Replace Real Dependency with Test Double

Goal: Make tests deterministic and fast.

1. Introduce a small interface for one external dependency.
2. Implement fake/stub behavior for success and failure paths.
3. Assert function behavior for both paths.
4. Ensure tests run without network/database access.

Stretch: Measure and compare runtime before/after dependency isolation.

## Assignment: Test Bookshelf HTTP Handlers

### Goal
Add handler-level tests for the Bookshelf REST API.

The objective is to lock down API transport contract behavior before adding deeper integration tests.

### Tasks

1. Create `pkg/handler/handlers_test.go`.
2. Test `CreateUser` success case (`201 Created`).
3. Test invalid JSON request (`400 Bad Request`).
4. Test validation error (`400 Bad Request`) for invalid email.

Starter test:

```go
func TestCreateUserHandler_Success(t *testing.T) {
    h := newTestHandler(t)
    body := `{"email":"reader@example.com","password":"StrongPass123"}`

    req := httptest.NewRequest(http.MethodPost, "/api/users", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()

    h.CreateUser(w, req)

    if w.Code != http.StatusCreated {
        t.Fatalf("status=%d want=%d body=%s", w.Code, http.StatusCreated, w.Body.String())
    }
}
```

Expand from this starter by adding explicit body and error-envelope assertions for both success and failure scenarios.

### Done Criteria

- At least 3 handler tests pass
- JSON response body is asserted in success path

Include at least one negative-path test that checks machine-readable error code in JSON.

## Deep Dive: Handler Testing Without Over-Mocking

### Background

Handler tests should validate transport concerns: method handling, JSON parsing, status codes, and response shape. Business logic should remain in service tests.

Keeping this boundary clear prevents brittle tests and reduces duplication across layers.

### What to Validate in Handler Tests

1. Method and route behavior
2. Header requirements (`Content-Type`)
3. Request decode failures
4. Domain validation mapping to HTTP errors
5. Response envelope and content type

Also validate deterministic error mapping from domain/service errors to HTTP status and API error code.

### Suggested Case Matrix

- Valid request -> `201`
- Malformed JSON -> `400`
- Validation error -> `400`
- Not found error -> `404`
- Internal unexpected error -> `500`

Add method-not-allowed (`405`) when handlers enforce method semantics explicitly.

### Example Error Assertion

```go
if got := w.Header().Get("Content-Type"); got != "application/json" {
    t.Fatalf("content-type=%s", got)
}
if !strings.Contains(w.Body.String(), "VALIDATION_ERROR") {
    t.Fatalf("body=%s", w.Body.String())
}
```

### SDET Tip

Keep handler tests fast and deterministic by using in-memory fakes for service dependencies.

## Common Anti-Patterns

- Asserting only status code without checking response body contract.
- Mocking too deep into domain logic from handler tests.
- Repeating heavy setup in every test case without helper builders.
- Coupling tests to exact log text instead of behavior/output.

## Quick Handler Test Checklist

- Are request method/path/content-type cases covered?
- Are both success and failure JSON envelopes asserted?
- Are error code and status mappings validated?
- Do tests avoid real network/database dependencies?
- Are failure messages detailed enough for CI triage?




## Next Step

Continue with [Testing Database Code with Fakes](testing-database-code-with-fakes.md).
