# Consumer Contract Tests

Consumer contract tests validate whether a client can safely integrate with a provider contract before provider deployment. They protect the consumer experience by checking API assumptions close to client code.

Treat this suite as consumer behavior verification, not as a replacement for full API integration tests.

## Writing Consumer Contract Tests

A reliable consumer suite should include deterministic interaction setup, meaningful assertion messages, and reusable client helpers.

### Setup

```go
package myapp_test

import (
    "context"
    "fmt"
    "net/http"
    "testing"
    
    "github.com/pact-foundation/pact-go/v2/consumer"
    "github.com/pact-foundation/pact-go/v2/matchers"
)

func TestUserServiceConsumerContract(t *testing.T) {
    pact := consumer.NewPact(
        "FrontendApp",
        "UserService",
        consumer.WithPort(8082),
    )
    defer pact.WritePact()
    
    // Define all interactions
    defineUserServiceInteractions(pact)
    
    // Execute test against mock provider
    err := pact.ExecuteTest(t, func(cfg *consumer.MockServerConfig) error {
        client := NewUserServiceClient(cfg.URL)
        
        // Test 1: Get user
        user, err := client.GetUser(1)
        if err != nil {
            return fmt.Errorf("GetUser failed: %w", err)
        }
        if user.Name == "" {
            return fmt.Errorf("user name is empty")
        }
        
        // Test 2: List users
        users, err := client.ListUsers()
        if err != nil {
            return fmt.Errorf("ListUsers failed: %w", err)
        }
        if len(users) == 0 {
            return fmt.Errorf("users list is empty")
        }
        
        return nil
    })
    
    if err != nil {
        t.Fatalf("consumer test failed: %v", err)
    }
}

func defineUserServiceInteractions(pact *consumer.Pact) {
    // Interaction 1: Get user
    pact.AddInteraction().
        Given("user with id 1 exists").
        UponReceiving("a request to get user 1").
        WithRequest("GET", "/api/users/1").
        WithHeader("Accept", "application/json").
        WillRespondWith(200).
        WithHeader("Content-Type", "application/json").
        WithBody(map[string]interface{}{
            "id":    matchers.Integer(),
            "name":  matchers.String(),
            "email": matchers.String(),
        })
    
    // Interaction 2: List users
    pact.AddInteraction().
        Given("multiple users exist").
        UponReceiving("a request to list all users").
        WithRequest("GET", "/api/users").
        WillRespondWith(200).
        WithHeader("Content-Type", "application/json").
        WithBody(matchers.EachLike(map[string]interface{}{
            "id":    matchers.Integer(),
            "name":  matchers.String(),
            "email": matchers.String(),
        }, 1))
}
```

Keep interaction descriptions human-readable because they become part of triage output.

## Testing Different Scenarios

Cover one happy path and at least one failure path per endpoint family.

### Success Cases

```go
pact.AddInteraction().
    Given("valid user data").
    UponReceiving("a POST request to create user").
    WithRequest("POST", "/api/users").
    WithHeader("Content-Type", "application/json").
    WithBody(map[string]string{
        "name":  "John",
        "email": "john@example.com",
    }).
    WillRespondWith(201).
    WithBody(map[string]interface{}{
        "id":    matchers.Integer(),
        "name":  "John",
        "email": "john@example.com",
    })
```

### Error Cases

```go
pact.AddInteraction().
    Given("user not found").
    UponReceiving("a GET request for non-existent user").
    WithRequest("GET", "/api/users/999").
    WillRespondWith(404).
    WithBody(map[string]interface{}{
        "error": matchers.String(),
    })

pact.AddInteraction().
    Given("invalid input").
    UponReceiving("a POST request with invalid data").
    WithRequest("POST", "/api/users").
    WithBody(map[string]string{
        "name": "",
    }).
    WillRespondWith(400).
    WithBody(map[string]interface{}{
        "error": matchers.String(),
    })
```

## Using Matchers

```go
matchers.Integer()           // Matches any integer
matchers.String()            // Matches any string
matchers.Boolean()           // Matches any boolean
matchers.Decimal()           // Matches decimal numbers
matchers.Regex(".*@.*")      // Matches regex pattern
matchers.Equality("exact")   // Exact match
matchers.IncludesKey("id")   // Map includes key
matchers.EachLike(...)       // Array of similar items
matchers.Uuid()              // UUID format
```

Use strict equality only when exact values are part of the API guarantee.

## Table-Driven Consumer Tests

Table-driven style can reduce repetition, but keep behavior boundaries clear.

```go
func TestUserServiceConsumerInteractions(t *testing.T) {
    pact := consumer.NewPact(
        "FrontendApp",
        "UserService",
        consumer.WithPort(8083),
    )
    defer pact.WritePact()
    
    tests := []struct {
        name     string
        setup    func(*consumer.Pact)
        test     func(string) error
    }{
        {
            name: "get user",
            setup: func(p *consumer.Pact) {
                p.AddInteraction().
                    Given("user exists").
                    UponReceiving("get user").
                    WithRequest("GET", "/api/users/1").
                    WillRespondWith(200).
                    WithBody(map[string]interface{}{
                        "id":   1,
                        "name": matchers.String(),
                    })
            },
            test: func(baseURL string) error {
                client := NewUserServiceClient(baseURL)
                _, err := client.GetUser(1)
                return err
            },
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            tt.setup(pact)
        })
    }
    
    pact.ExecuteTest(t, func(cfg *consumer.MockServerConfig) error {
        for _, tt := range tests {
            if err := tt.test(cfg.URL); err != nil {
                return fmt.Errorf("%s failed: %w", tt.name, err)
            }
        }
        return nil
    })
}
```

If tables become too large, split by endpoint group for maintainability.

## Best Practices

- Define realistic interactions
- Use matchers for flexibility
- Test both success and failure paths
- Keep contracts simple and focused
- Review generated pact files

Additional guidance:

- Prefer endpoint-specific helpers over global interaction builders.
- Include validation and authorization failures where relevant.
- Keep provider states explicit and deterministic.


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

## Assignment: Consumer Contract Suite for Bookshelf

### Goal
Create an incremental consumer contract suite aligned to the tutorial app features.

### Test Plan

1. `GET /api/books` returns list.
2. `POST /api/users` creates a user.
3. `POST /api/books` creates a book.
4. `POST /api/users` invalid body returns `400`.

### File Layout

```text
tests/
    contract/
        consumer/
            bookshelf_consumer_test.go
            test_client.go
```

### Suggested Subtests

```go
t.Run("list books", ...)
t.Run("create user", ...)
t.Run("create book", ...)
t.Run("create user invalid payload", ...)
```

### Verification

```bash
go test ./tests/contract/consumer -v
```

### Done Criteria

- At least 4 interactions generated.
- Matchers are used instead of hardcoding dynamic values.

Also verify pact files are committed or published according to team workflow.

## Deep Dive: Building Reliable Consumer Suites

### Background

Consumer tests should verify what the consuming client actually needs to function. They are not full API tests; they are dependency behavior tests.

### Practical suite design

1. Start with critical user journeys (list books, create user).
2. Add one negative path per endpoint family.
3. Keep interaction naming consistent and human-readable.
4. Avoid duplicating interaction setup logic by extracting helpers.

### Failure diagnosis pattern

When a consumer test fails, determine whether it is:

- A client-side request mismatch (wrong path/header/body), or
- A provider expectation mismatch (status/body shape).

This classification speeds up ownership and triage between teams.

### SDET practice

Run consumer contract tests in PR checks for any client-side code changes that touch API integrations.

## Common Anti-Patterns

- Asserting only status code without response shape expectations.
- Reusing generic provider states that hide data intent.
- Creating interactions for endpoints the client does not actually call.
- Letting pact files drift from current client behavior.

## Quick Consumer Suite Checklist

- Are critical client journeys represented?
- Are request and response expectations explicit?
- Are dynamic values modeled with matchers?
- Are negative interactions present for key endpoints?
- Is pact output reviewed in CI or code review?



## Next Step

Continue with [Provider Verification Tests](provider-verification-tests.md).
