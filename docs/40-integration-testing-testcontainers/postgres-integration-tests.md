# PostgreSQL Integration Tests

PostgreSQL integration tests validate real database semantics that unit tests cannot faithfully simulate. This is where you confirm SQL behavior under realistic conditions: constraints, transactions, query ordering, and error mapping.

In this page, the goal is to build predictable, high-signal integration tests that fail for meaningful reasons.

## Setting Up PostgreSQL Container

Start with a reusable setup function that provisions containerized Postgres, opens a real SQL connection, and exposes explicit cleanup.

```go
import (
    "context"
    "database/sql"
    "testing"
    
    _ "github.com/lib/pq"
    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/modules/postgres"
    "github.com/testcontainers/testcontainers-go/wait"
)

func setupPostgres(t *testing.T) (*sql.DB, func()) {
    ctx := context.Background()
    
    container, err := postgres.RunContainer(ctx,
        testcontainers.WithImage("postgres:15-alpine"),
        postgres.WithInitScripts("./testdata/init.sql"),
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("testuser"),
        postgres.WithPassword("testpass"),
    )
    if err != nil {
        t.Fatalf("failed to start postgres: %v", err)
    }
    
    connStr, err := container.ConnectionString(ctx)
    if err != nil {
        t.Fatalf("failed to get connection string: %v", err)
    }
    
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        t.Fatalf("failed to open database: %v", err)
    }
    
    if err = db.Ping(); err != nil {
        t.Fatalf("failed to ping database: %v", err)
    }
    
    cleanup := func() {
        db.Close()
        if err := container.Terminate(ctx); err != nil {
            t.Logf("failed to terminate container: %v", err)
        }
    }
    
    return db, cleanup
}
```

This helper establishes a repeatable baseline for repository and persistence-level tests.

## Testing Database Operations

These tests verify write/read behavior against real storage, not in-memory assumptions.

```go
func TestInsertUser(t *testing.T) {
    db, cleanup := setupPostgres(t)
    defer cleanup()
    
    query := `INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id`
    var userID int
    
    err := db.QueryRow(query, "John", "john@example.com").Scan(&userID)
    if err != nil {
        t.Fatalf("failed to insert user: %v", err)
    }
    
    if userID <= 0 {
        t.Errorf("expected positive user ID, got %d", userID)
    }
}

func TestGetUser(t *testing.T) {
    db, cleanup := setupPostgres(t)
    defer cleanup()
    
    // Insert first
    db.Exec(`INSERT INTO users (name, email) VALUES ($1, $2)`, "Jane", "jane@example.com")
    
    var name, email string
    err := db.QueryRow(`SELECT name, email FROM users WHERE email = $1`, "jane@example.com").Scan(&name, &email)
    
    if err != nil {
        t.Fatalf("failed to get user: %v", err)
    }
    
    if name != "Jane" {
        t.Errorf("expected Jane, got %s", name)
    }
}
```

Keep assertions focused on business-visible outcomes and persistence correctness.

## Table-Driven Integration Tests

Table-driven style works well when validating the same operation across multiple data variants.

```go
func TestUserOperations(t *testing.T) {
    db, cleanup := setupPostgres(t)
    defer cleanup()
    
    tests := []struct {
        name  string
        email string
        user  struct{ name, email string }
    }{
        {"valid user", "test1@example.com", struct{ name, email string }{"User 1", "test1@example.com"}},
        {"another user", "test2@example.com", struct{ name, email string }{"User 2", "test2@example.com"}},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            db.Exec(`INSERT INTO users (name, email) VALUES ($1, $2)`, tt.user.name, tt.user.email)
            
            var retrieved string
            err := db.QueryRow(`SELECT name FROM users WHERE email = $1`, tt.email).Scan(&retrieved)
            
            if err != nil {
                t.Errorf("failed to retrieve user: %v", err)
            }
            
            if retrieved != tt.user.name {
                t.Errorf("expected %s, got %s", tt.user.name, retrieved)
            }
        })
    }
}
```

Avoid combining unrelated behaviors in one table to keep failures easy to triage.

## Testing Transactions

Transaction tests are critical because rollback/commit semantics are often a source of production bugs.

```go
func TestUserTransactionRollback(t *testing.T) {
    db, cleanup := setupPostgres(t)
    defer cleanup()
    
    tx, err := db.Begin()
    if err != nil {
        t.Fatalf("failed to begin transaction: %v", err)
    }
    
    tx.Exec(`INSERT INTO users (name, email) VALUES ($1, $2)`, "Temp", "temp@example.com")
    tx.Rollback()
    
    var count int
    db.QueryRow(`SELECT COUNT(*) FROM users WHERE email = $1`, "temp@example.com").Scan(&count)
    
    if count != 0 {
        t.Errorf("expected 0 users after rollback, got %d", count)
    }
}
```

When possible, assert both immediate query result and final persisted state.

## Best Practices

- Use init scripts for schema setup
- Clean up data between tests
- Use table-driven tests for similar scenarios
- Test both success and failure cases
- Keep database setup time minimal

Additional guidance:

- Pin image versions for deterministic behavior.
- Keep schema setup in migration/init scripts under version control.
- Prefer explicit test names that describe database behavior being verified.

## Integration Scope Boundaries

Use Postgres integration tests for behavior that depends on the real database engine.

Good candidates:

- unique/foreign-key constraint behavior,
- SQL query semantics,
- transaction guarantees,
- repository-to-database mapping correctness.

Do not overload this layer with pure domain logic that unit tests can validate faster.


## Quick Exercises (SDET Focus)

Try these exercises before moving to the next section.

### Exercise 1: Containerized Dependency Sanity Test

Goal: Validate app behavior against a real dependency in a container.

1. Start a dependency container (for example PostgreSQL) in test setup.
2. Run migration/init step.
3. Execute one create + one read test case.
4. Tear down container cleanly after test run.

Stretch: Add a test that verifies behavior when container startup is delayed.

### Exercise 2: Test Isolation and Cleanup Validation

Goal: Prevent flaky integration tests.

1. Seed test data with unique IDs per test case.
2. Ensure each test cleans up created records/resources.
3. Run tests multiple times and assert stable outcomes.
4. Add one assertion for no leaked state between tests.

Stretch: Run tests in parallel with isolated resources.

## Assignment: Repository Integration Tests for Bookshelf

### Goal
Verify real PostgreSQL behavior for repository operations.

This assignment establishes the persistence confidence layer for Bookshelf before API-level E2E expansion.

### Tasks

1. Create migration script in `tests/integration/testdata/init.sql`:

```sql
CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT UNIQUE NOT NULL,
    published_year INT NOT NULL
);
```

2. Implement `pkg/repository/postgres/book_repository.go` with `Save`, `FindByID`, `List`.
3. Add integration tests in `tests/integration/book_repository_test.go`:
    - `TestBookRepository_SaveAndFindByID`
    - `TestBookRepository_List`
    - `TestBookRepository_FindByID_NotFound`

### Done Criteria

- Tests run against containerized Postgres
- NotFound path maps to `domain.NotFoundError`

Also verify tests are deterministic across repeated local runs and CI executions.

## Deep Dive: Verifying Real Database Semantics

### Background

Integration tests are where you validate behavior impossible to trust in mocks: constraints, indexes, transactions, and SQL-level error behavior.

The value of this layer is realism with control: production-like behavior in disposable test infrastructure.

### High-Value Cases

1. Unique constraint violations (`isbn`, `email`).
2. Foreign key integrity checks.
3. Transaction rollback guarantees.
4. Query ordering and pagination behavior.

### Practical Assertion Advice

- Assert on both functional result and persisted database state.
- Use explicit SQL checks after writes/rollbacks.
- Keep one behavior focus per test case for clearer failures.

Include error-path assertions for common failures (duplicate keys, not found, invalid transitions).

### Example: Unique Violation Test

```go
// Insert same ISBN twice; second insert should fail.
```

### SDET Benefit

These tests form the confidence layer between domain logic and production database reality.

## Common Anti-Patterns

- Validating only happy paths and ignoring constraint failures.
- Reusing mutable data across tests without reset strategy.
- Treating `db.Ping()` as sufficient integration coverage.
- Asserting too many independent behaviors in one test.

## Quick Postgres Integration Checklist

- Does setup create deterministic schema/data state?
- Are success and failure paths both validated?
- Are transaction semantics explicitly tested?
- Are errors mapped to domain-level expectations?
- Can tests run repeatedly without flakes?




## Next Step

Continue with [API End-to-End Tests](api-end-to-end-tests.md).
