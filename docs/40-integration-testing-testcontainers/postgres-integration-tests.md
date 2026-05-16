# PostgreSQL Integration Tests

## Setting Up PostgreSQL Container

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

## Testing Database Operations

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

## Table-Driven Integration Tests

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

## Testing Transactions

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

## Best Practices

- Use init scripts for schema setup
- Clean up data between tests
- Use table-driven tests for similar scenarios
- Test both success and failure cases
- Keep database setup time minimal
