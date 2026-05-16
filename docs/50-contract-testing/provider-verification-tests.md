# Provider Verification Tests

## What is Provider Verification?

Provider verification confirms that your service meets all contracts defined by consumers.

## Basic Provider Test

```go
package myapp_test

import (
    "testing"
    
    "github.com/pact-foundation/pact-go/v2/provider"
)

func TestProviderVerification(t *testing.T) {
    verifier := provider.NewVerifier()
    
    err := verifier.VerifyProvider(t, provider.VerifyRequest{
        ProviderName:    "UserService",
        ProviderVersion: "1.0.0",
        
        // Path to pact files from consumer
        PactFiles: []string{
            "pacts/FrontendApp-UserService.json",
        },
        
        // Provider details
        Provider: "http://localhost:8080",
        
        // Map consumer states to setup functions
        StateHandlers: provider.StateHandlers{
            "user with id 1 exists": func() error {
                return setupUser(1, "John", "john@example.com")
            },
            "multiple users exist": func() error {
                return setupUsers()
            },
        },
    })
    
    if err != nil {
        t.Fatalf("verification failed: %v", err)
    }
}

func setupUser(id int, name, email string) error {
    // Insert test data into database
    db := getTestDB()
    _, err := db.Exec(`
        INSERT INTO users (id, name, email) VALUES ($1, $2, $3)
    `, id, name, email)
    return err
}

func setupUsers() error {
    // Insert multiple test users
    db := getTestDB()
    _, err := db.Exec(`
        INSERT INTO users (id, name, email) VALUES
            (1, 'John', 'john@example.com'),
            (2, 'Jane', 'jane@example.com'),
            (3, 'Bob', 'bob@example.com')
    `)
    return err
}
```

## With Testcontainers

Combine provider verification with Testcontainers for realistic testing:

```go
func TestProviderWithDatabase(t *testing.T) {
    ctx := context.Background()
    
    // Start database container
    container, err := postgres.RunContainer(ctx,
        testcontainers.WithImage("postgres:15"),
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("postgres"),
        postgres.WithPassword("password"),
    )
    if err != nil {
        t.Fatalf("failed to start postgres: %v", err)
    }
    defer container.Terminate(ctx)
    
    connStr, _ := container.ConnectionString(ctx)
    db, _ := sql.Open("postgres", connStr)
    defer db.Close()
    
    // Start API server
    server := startTestServer(db)
    defer server.Close()
    
    // Verify provider
    verifier := provider.NewVerifier()
    
    err = verifier.VerifyProvider(t, provider.VerifyRequest{
        ProviderName: "UserService",
        PactFiles:    []string{"pacts/consumer-userservice.json"},
        Provider:     server.URL,
        StateHandlers: provider.StateHandlers{
            "user with id 1 exists": func() error {
                return db.Exec(`
                    INSERT INTO users (id, name, email)
                    VALUES (1, 'John', 'john@example.com')
                `).Err
            },
        },
    })
    
    if err != nil {
        t.Fatalf("verification failed: %v", err)
    }
}
```

## Multiple Pact Files

```go
verifier := provider.NewVerifier()

err := verifier.VerifyProvider(t, provider.VerifyRequest{
    ProviderName: "UserService",
    Provider:     "http://localhost:8080",
    
    // Multiple consumers' pacts
    PactFiles: []string{
        "pacts/frontend-userservice.json",
        "pacts/mobile-userservice.json",
        "pacts/admin-userservice.json",
    },
    
    StateHandlers: provider.StateHandlers{
        "user exists":       setupUser,
        "users list ready":  setupUsers,
        "user not found":    cleanupUsers,
    },
})
```

## Complex State Handlers

```go
StateHandlers: provider.StateHandlers{
    "user with id 1 exists and has premium status": func() error {
        user := &User{
            ID:     1,
            Name:   "John",
            Email:  "john@example.com",
            Status: "premium",
        }
        return saveUser(user)
    },
    
    "no users exist": func() error {
        return truncateUsersTable()
    },
    
    "orders exist for user 1": func() error {
        if err := setupUser(1, "John", "john@example.com"); err != nil {
            return err
        }
        order := &Order{
            ID:     1,
            UserID: 1,
            Total:  99.99,
        }
        return saveOrder(order)
    },
}
```

## Tags for Versioning

For multiple versions of the same provider:

```go
err := verifier.VerifyProvider(t, provider.VerifyRequest{
    ProviderName:    "UserService",
    ProviderVersion: "2.0.0",
    PactFiles:       []string{"pacts/consumer-userservice.json"},
    Provider:        "http://localhost:8080",
    PublishVerificationResult: true,
    VersionTags:     []string{"2.0.0", "prod"},
})
```

## Best Practices

- Use realistic state handlers
- Clean up data between interactions
- Verify against production-like setup
- Test all consumer pacts
- Include error scenarios
- Document state handler setup
