# Provider Verification Tests

Provider verification ensures your service implementation satisfies consumer contracts before release. It is the provider-side compatibility gate that prevents breaking downstream clients.

This page emphasizes deterministic provider state setup and realistic verification execution.

## What is Provider Verification?

Provider verification confirms that your service meets all contracts defined by consumers.

A passing verification means the provider can honor each published interaction under expected states.

## Basic Provider Test

The baseline pattern is: load pact files, expose provider endpoint, map provider states, run verification.

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

State handler quality usually determines whether verification is stable or flaky.

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

This setup is ideal when endpoint behavior depends on real database semantics.

## Multiple Pact Files

As consumer count grows, verifying all relevant pact files becomes a release requirement.

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

Keep handlers focused, deterministic, and isolated to one interaction context.

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

Version and tag metadata improves broker history and deployment decision quality.

## Best Practices

- Use realistic state handlers
- Clean up data between interactions
- Verify against production-like setup
- Test all consumer pacts
- Include error scenarios
- Document state handler setup

Additional guidance:

- Reset mutable tables between state setups.
- Keep test fixture values explicit and stable.
- Ensure provider app configuration matches contract environment assumptions.


## Quick Exercises (SDET Focus)

Try these exercises before moving to the next section.

### Exercise 1: Consumer Contract for Error Cases

Goal: Capture both happy and failure behavior in the contract.

1. Define consumer expectations for one success response.
2. Add at least two error interactions (validation + not found).
3. Verify status code, headers, and payload fields.
4. Publish or store contract artifact.

Stretch: Add backward-compatible optional field and update expectations.

### Exercise 2: Provider Verification in CI Style

Goal: Ensure provider remains contract-compatible.

1. Load latest contract artifact in provider test stage.
2. Verify provider responses satisfy all interactions.
3. Fail verification on payload drift.
4. Print actionable mismatch diagnostics.

Stretch: Add branch-based contract version selection.

## Assignment: Verify Bookshelf Provider Against Consumer Pacts

### Goal
Run provider verification for Bookshelf API against generated pact files.

This assignment creates the provider-side contract gate for Bookshelf release confidence.

### Tasks

1. Create `tests/contract/provider/bookshelf_provider_test.go`.
2. Start Bookshelf API test server in test setup.
3. Wire state handlers for pact states:
  - `books exist`
  - `user can be created`
  - `invalid user payload`
4. Verify pacts from `pacts/`.

Skeleton:

```go
err := verifier.VerifyProvider(t, provider.VerifyRequest{
    ProviderName: "bookshelf-api",
    Provider:     server.URL,
    PactFiles: []string{
        "pacts/reading-ui-bookshelf-api.json",
    },
    StateHandlers: provider.StateHandlers{
        "books exist": func() error {
            return seedBooks(db)
        },
        "user can be created": func() error {
            return clearUsers(db)
        },
        "invalid user payload": func() error {
            return nil
        },
    },
})
```

### Verification

```bash
go test ./tests/contract/provider -v
```

### Done Criteria

- Provider verification passes locally.
- State handlers are deterministic and isolated.

Also verify failures produce enough diagnostics to identify the mismatched interaction quickly.

## Deep Dive: Provider State Handler Discipline

### Why state handlers are critical

Provider verification quality depends on deterministic setup for every interaction. Flaky state setup causes false negatives and erodes trust in contract checks.

### Deterministic handler rules

1. Seed only data needed for one interaction.
2. Reset mutable tables between interactions.
3. Use fixed test values and explicit IDs where possible.
4. Avoid hidden external dependencies in setup logic.

### Verification depth recommendations

- Verify both success and failure interactions.
- Include validation and not-found responses.
- Ensure error envelope structure matches consumer expectations.

### SDET tip

Treat provider verification as a release gate equivalent to integration tests for API compatibility.

## Common Anti-Patterns

- Using state handlers that depend on pre-existing mutable data.
- Verifying only one pact when multiple consumers exist.
- Starting provider with configuration that differs from contract assumptions.
- Ignoring verification output details and rerunning without root-cause analysis.

## Quick Provider Verification Checklist

- Are all relevant consumer pacts included?
- Are state handlers deterministic and isolated?
- Are success and error interactions both verified?
- Is provider startup environment representative?
- Are failures actionable from logs and reports?



## Next Step

Continue with [Pact in CI](pact-in-ci.md).
