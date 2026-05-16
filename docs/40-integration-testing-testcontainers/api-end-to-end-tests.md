# API End-to-End Tests

API end-to-end (E2E) tests validate complete request flows across transport, business logic, and persistence boundaries. They are the closest automated check to real user-facing API behavior.

In this section, the focus is on high-value workflow validation, not exhaustive edge-case enumeration. E2E tests should prove critical journeys work in realistic conditions.

## Full Stack Integration Test

A true E2E test typically includes:

1. Real HTTP request handling.
2. Real application wiring.
3. Real database interactions.
4. Deterministic setup and cleanup.

### Setup: Server and Database

This setup creates an isolated environment per test run using a containerized Postgres instance and an in-process HTTP server.

```go
import (
    "context"
    "encoding/json"
    "io"
    "net/http"
    "net/http/httptest"
    "testing"
    
    "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func setupAPITest(t *testing.T) (*httptest.Server, func()) {
    ctx := context.Background()
    
    // Start database
    container, err := postgres.RunContainer(ctx,
        testcontainers.WithImage("postgres:15"),
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("postgres"),
        postgres.WithPassword("password"),
    )
    if err != nil {
        t.Fatalf("failed to start postgres: %v", err)
    }
    
    connStr, _ := container.ConnectionString(ctx)
    db, _ := sql.Open("postgres", connStr)
    
    // Initialize database schema
    db.Exec(`
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255) UNIQUE
        )
    `)
    
    // Create API server
    repo := NewUserRepository(db)
    service := NewUserService(repo)
    handler := NewAPIHandler(service)
    
    server := httptest.NewServer(handler)
    
    cleanup := func() {
        server.Close()
        db.Close()
        container.Terminate(ctx)
    }
    
    return server, cleanup
}
```

This gives high confidence while keeping execution local and repeatable.

### End-to-End Test

This test verifies a full lifecycle: create entity, fetch entity, and assert business-visible outcomes.

```go
func TestCreateAndGetUser(t *testing.T) {
    server, cleanup := setupAPITest(t)
    defer cleanup()
    
    // Create user
    createReq := `{"name":"John","email":"john@example.com"}`
    resp, err := http.Post(server.URL+"/users", "application/json", strings.NewReader(createReq))
    if err != nil {
        t.Fatalf("create request failed: %v", err)
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusCreated {
        t.Errorf("status = %d; want %d", resp.StatusCode, http.StatusCreated)
    }
    
    var created User
    json.NewDecoder(resp.Body).Decode(&created)
    
    // Get user
    resp, err = http.Get(server.URL + "/users/" + fmt.Sprint(created.ID))
    if err != nil {
        t.Fatalf("get request failed: %v", err)
    }
    defer resp.Body.Close()
    
    var retrieved User
    json.NewDecoder(resp.Body).Decode(&retrieved)
    
    if retrieved.Name != "John" {
        t.Errorf("name = %s; want John", retrieved.Name)
    }
}
```

Notice the assertion pattern:

- validate status code,
- decode response payload,
- assert business fields,
- ensure follow-up retrieval returns consistent state.

## Testing Multiple Operations

Use subtests to represent multi-step or multi-scenario workflows in one coherent suite.

```go
func TestUserWorkflow(t *testing.T) {
    server, cleanup := setupAPITest(t)
    defer cleanup()
    
    tests := []struct {
        name   string
        method string
        path   string
        body   string
        want   int
    }{
        {"create", "POST", "/users", `{"name":"Alice","email":"alice@example.com"}`, http.StatusCreated},
        {"create duplicate", "POST", "/users", `{"name":"Alice2","email":"alice@example.com"}`, http.StatusConflict},
        {"get", "GET", "/users/1", "", http.StatusOK},
        {"delete", "DELETE", "/users/1", "", http.StatusNoContent},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            var req *http.Request
            var err error
            
            if tt.body != "" {
                req, err = http.NewRequest(tt.method, server.URL+tt.path, strings.NewReader(tt.body))
                req.Header.Set("Content-Type", "application/json")
            } else {
                req, err = http.NewRequest(tt.method, server.URL+tt.path, nil)
            }
            
            if err != nil {
                t.Fatalf("request failed: %v", err)
            }
            
            resp, err := http.DefaultClient.Do(req)
            if err != nil {
                t.Fatalf("do request failed: %v", err)
            }
            defer resp.Body.Close()
            
            if resp.StatusCode != tt.want {
                body, _ := io.ReadAll(resp.Body)
                t.Errorf("status = %d; want %d (body: %s)", resp.StatusCode, tt.want, string(body))
            }
        })
    }
}
```

This style helps compare behavior across related operations and keeps failure output organized.

## Best Practices

- Start with real database and HTTP server
- Test complete workflows
- Verify response status codes and bodies
- Test error conditions
- Use subtests for organization
- Clean up resources properly

Additional guidance:

- Keep test data explicit and scenario-specific.
- Prefer deterministic IDs and ordering where possible.
- Avoid cross-test shared mutable state.
- Include useful failure context (status + body + step name).

## E2E Scope Boundaries

E2E tests should validate critical workflows and contract-level behavior.

Do validate:

- endpoint orchestration,
- status and envelope consistency,
- persistence side effects for key paths.

Do not overuse E2E for:

- every validation permutation,
- low-level domain rule branches,
- exhaustive repository edge cases.

Those belong in unit/integration layers for speed and maintainability.

## Assignment: Bookshelf API End-to-End Test

### Goal
Test the full Bookshelf request lifecycle with real HTTP server and Postgres.

This assignment creates your first realistic API confidence check before scaling to additional integration scenarios.

### Route Prefix Note
Use `/api` for this section's assignment flow. If you are running capstone routes, adapt these to `/api/v1`.

### Workflow to Cover

1. `POST /api/users` -> create user
2. `POST /api/books` -> create book
3. `GET /api/books` -> verify list contains created book

Add explicit assertions for response envelope shape (`success`, `data`, `error`) to lock contract behavior early.

### Test File

Create `tests/integration/api_e2e_test.go` with:

- Container setup helper
- Schema initialization
- App wiring through router + middleware
- Assertions for status code and response payload

### Done Criteria

- E2E test passes locally with `go test ./tests/integration -run TestBookshelfE2E -v`
- Test uses real HTTP calls via `httptest.NewServer`

Also verify test can run repeatedly without state leakage.

## Deep Dive: End-to-End Flow Assertions

### Background

E2E tests should represent user-visible business journeys, not just isolated endpoint checks.

Because these tests are heavier, each case should justify its runtime cost by covering a meaningful journey.

### Strong E2E Pattern

1. Create prerequisite entities.
2. Execute target workflow.
3. Verify API responses.
4. Verify persisted side effects.

Optional 5th step: verify idempotency or duplicate handling for repeat calls where contract requires it.

### Bookshelf Journey Ideas

- Create user -> create book -> add to shelf -> add review -> fetch list with expected aggregation.
- Invalid payload -> expect validation error envelope and no persistence side effect.

### Failure Diagnostics

When asserting status code mismatches, log response body to preserve debugging context in CI output.

Also include step labels in assertion messages so multi-step failures are immediately traceable.

### SDET Tip

Keep E2E suite minimal but critical-path focused. Let unit and integration tests cover edge permutations.

## Common Anti-Patterns

- Treating E2E tests as primary location for all validation checks.
- Sharing one long stateful scenario across many unrelated assertions.
- Using brittle timing assumptions (`sleep`) instead of deterministic checks.
- Failing to clean up containers/resources reliably.

## Quick E2E Quality Checklist

- Does each test represent a real user-visible journey?
- Are status, payload, and side effects all asserted?
- Is setup isolated and deterministic?
- Are diagnostics sufficient for CI triage?
- Can the test run repeatedly without flakes?


