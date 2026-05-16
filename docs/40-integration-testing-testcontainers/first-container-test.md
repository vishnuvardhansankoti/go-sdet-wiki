# First Container Test

Your first container test is the gateway to reliable integration testing. It proves that your test process can boot real infrastructure, connect to it, and clean up correctly.

This section focuses on one critical outcome: establish a deterministic, repeatable database test harness before writing heavier repository and API integration tests.

## Your First Container Test

The recommended progression is:

1. Start container successfully.
2. Resolve host/port or connection string.
3. Open DB connection and verify readiness.
4. Ensure cleanup always runs.

### Step 1: Basic PostgreSQL Container

This raw `GenericContainer` approach helps you understand the core mechanics and lifecycle.

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

Use this style when you need maximum flexibility over container request fields.

### Step 2: Using a Module (Recommended)

Module helpers reduce boilerplate and encode common best practices for popular infrastructure dependencies.

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

For most teams, module helpers improve readability and reduce setup mistakes.

### Step 3: Integration Test Helper

Shared setup helpers keep test code DRY and make integration suites easier to maintain.

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

If multiple tests use this helper, keep behavior deterministic and avoid hidden global state.

## Key Points

- Containers start automatically with `Started: true`
- Use `defer container.Terminate(ctx)` for cleanup
- Mapped ports connect containers to host
- Module helpers simplify setup

Additional guidance:

- Prefer explicit image tags to avoid surprise upgrades.
- Include `sslmode=disable` when local setup requires it.
- Keep startup timeout bounded to prevent hanging CI jobs.

## Container Test Lifecycle

Every container-backed test should follow a predictable lifecycle:

1. Provision container.
2. Wait for readiness signal.
3. Create app connection.
4. Run assertions.
5. Tear down resources.

A stable lifecycle is the foundation for reliable downstream integration suites.

## Assignment: First Bookshelf Postgres Container Test

### Goal
Write your first real container-backed test for Bookshelf.

This assignment builds the minimal confidence gate required before repository and API E2E tests.

### Tasks

1. Create `tests/integration/first_container_test.go`.
2. Start postgres container using module helper.
3. Open SQL connection and verify `db.Ping()` succeeds.

Also ensure cleanup executes even when assertions fail.

Starter:

```go
func TestBookshelfPostgresContainer_Starts(t *testing.T) {
    ctx := context.Background()
    c, err := postgres.RunContainer(ctx,
        testcontainers.WithImage("postgres:15-alpine"),
        postgres.WithDatabase("bookshelf_test"),
        postgres.WithUsername("testuser"),
        postgres.WithPassword("testpass"),
    )
    if err != nil {
        t.Fatalf("start container: %v", err)
    }
    defer c.Terminate(ctx)

    connStr, err := c.ConnectionString(ctx, "sslmode=disable")
    if err != nil {
        t.Fatalf("connection string: %v", err)
    }

    db, err := sql.Open("postgres", connStr)
    if err != nil {
        t.Fatalf("open db: %v", err)
    }
    defer db.Close()

    if err := db.Ping(); err != nil {
        t.Fatalf("ping db: %v", err)
    }
}
```

## Deep Dive: First-Test Quality Checklist

### What to verify beyond startup

1. Container can produce connection string reliably.
2. `sql.Open` succeeds and `db.Ping` confirms readiness.
3. Cleanup always executes even on failures (`defer` or `t.Cleanup`).
4. Test timeout prevents hanging pipelines.

Add one negative sanity check too (for example, invalid connection option) so you validate error-path diagnostics.

### Hardened Pattern

```go
func TestContainerWithTimeout(t *testing.T) {
    t.Helper()
    ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
    defer cancel()
    // start container with ctx
}
```

### SDET Tip

Treat this first test as a smoke gate. If it fails, skip expensive downstream integration suites and fail fast.

## Common Anti-Patterns

- Using floating image tags like `latest` in integration tests.
- Skipping readiness checks and relying on fixed sleeps.
- Forgetting cleanup on failed setup paths.
- Hiding connection/build errors with weak assertion messages.

## Quick Reliability Checklist

- Is container startup bounded by timeout?
- Is readiness verified before DB operations?
- Does cleanup always run?
- Are error logs detailed enough for CI triage?
- Can the test pass repeatedly without flakes?


