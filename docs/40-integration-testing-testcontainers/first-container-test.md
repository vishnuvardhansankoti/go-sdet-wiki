# First Container Test

## Your First Container Test

### Step 1: Basic PostgreSQL Container

```go
package myapp_test

import (
    "context"
    "testing"
    
    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/wait"
)

func TestPostgresContainer(t *testing.T) {
    ctx := context.Background()
    
    req := testcontainers.ContainerRequest{
        Image:        "postgres:15",
        ExposedPorts: []string{"5432/tcp"},
        Env: map[string]string{
            "POSTGRES_PASSWORD": "password",
            "POSTGRES_DB":       "testdb",
        },
        WaitingFor: wait.ForLog("database system is ready to accept connections"),
    }
    
    container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: req,
        Started:          true,
    })
    if err != nil {
        t.Fatalf("failed to start container: %v", err)
    }
    defer container.Terminate(ctx)
    
    // Get connection details
    host, err := container.Host(ctx)
    if err != nil {
        t.Fatalf("failed to get host: %v", err)
    }
    
    port, err := container.MappedPort(ctx, "5432")
    if err != nil {
        t.Fatalf("failed to get port: %v", err)
    }
    
    t.Logf("Database available at %s:%s", host, port.Port())
}
```

### Step 2: Using a Module (Recommended)

```go
import "github.com/testcontainers/testcontainers-go/modules/postgres"

func TestWithPostgresModule(t *testing.T) {
    ctx := context.Background()
    
    container, err := postgres.RunContainer(ctx,
        testcontainers.WithImage("postgres:15"),
        postgres.WithInitScripts(/* scripts */),
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("postgres"),
        postgres.WithPassword("password"),
    )
    if err != nil {
        t.Fatalf("failed to start container: %v", err)
    }
    defer container.Terminate(ctx)
    
    connStr, err := container.ConnectionString(ctx)
    if err != nil {
        t.Fatalf("failed to get connection string: %v", err)
    }
    
    t.Logf("Connection string: %s", connStr)
}
```

### Step 3: Integration Test Helper

```go
func setupPostgres(t *testing.T) *sql.DB {
    ctx := context.Background()
    
    container, err := postgres.RunContainer(ctx,
        testcontainers.WithImage("postgres:15"),
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("postgres"),
        postgres.WithPassword("password"),
    )
    if err != nil {
        t.Fatalf("failed to start postgres: %v", err)
    }
    
    t.Cleanup(func() {
        if err := container.Terminate(ctx); err != nil {
            t.Logf("failed to terminate container: %v", err)
        }
    })
    
    connStr, err := container.ConnectionString(ctx)
    if err != nil {
        t.Fatalf("failed to get connection string: %v", err)
    }
    
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        t.Fatalf("failed to open database: %v", err)
    }
    
    return db
}

func TestDatabase(t *testing.T) {
    db := setupPostgres(t)
    defer db.Close()
    
    // Run your test
}
```

## Key Points

- Containers start automatically with `Started: true`
- Use `defer container.Terminate(ctx)` for cleanup
- Mapped ports connect containers to host
- Module helpers simplify setup
