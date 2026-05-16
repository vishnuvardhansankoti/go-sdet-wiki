# API End-to-End Tests

## Full Stack Integration Test

### Setup: Server and Database

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

### End-to-End Test

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

## Testing Multiple Operations

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

## Best Practices

- Start with real database and HTTP server
- Test complete workflows
- Verify response status codes and bodies
- Test error conditions
- Use subtests for organization
- Clean up resources properly
