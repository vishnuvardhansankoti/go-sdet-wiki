# Pact Go Basics

Pact Go turns contract expectations into executable tests and portable pact files. Instead of manually coordinating integration assumptions, consumers define behaviors once and providers verify them continuously.

This section focuses on building high-signal interactions that remain stable as services evolve.

## What is Pact?

Pact is a contract testing framework that enables consumer-driven contract testing.

It provides a consumer-side mock server, contract generation, and provider verification workflow.

## Installation

```bash
go get github.com/pact-foundation/pact-go/v2
```

## Core Concepts

### Pact
Defines interactions between consumer and provider.

### Interaction
A single request-response pair.

### Pact File
JSON file containing all interactions (the "contract").

## Basic Terminology

- **Consumer**: Service that makes requests (e.g., Frontend, Mobile App)
- **Provider**: Service that responds (e.g., API Server)
- **Interaction**: Request/response pair
- **Verification**: Provider confirms it matches contract

## Pact Consumer Test Structure

Think of this structure as four phases: define, execute, assert, and publish.

```go
import "github.com/pact-foundation/pact-go/v2/consumer"

func TestUserServiceConsumer(t *testing.T) {
    // 1. Create pact
    mockProvider := consumer.NewPact(
        "MyConsumer",
        "UserService",
        consumer.WithPort(8080),
    )
    
    // 2. Define expected interactions
    mockProvider.AddInteraction().
        Given("user with id 1 exists").
        UponReceiving("a request for user 1").
        WithRequest("GET", "/users/1").
        WillRespondWith(200, map[string]string{
            "Content-Type": "application/json",
        }).
        WithBody(map[string]interface{}{
            "id":   1,
            "name": "John",
        })
    
    // 3. Run tests with mock
    err := mockProvider.ExecuteTest(t, func(config *consumer.MockServerConfig) error {
        // Use mockProvider URL in tests
        // e.g., http://localhost:8080
        
        client := NewUserClient(config.URL)
        user, err := client.GetUser(1)
        return err
    })
    
    if err != nil {
        t.Fatalf("pact test failed: %v", err)
    }
    
    // 4. Write pact file
    mockProvider.WritePact()
}
```

A strong consumer test validates both client behavior and contract compatibility.

## Key Components

### Consumer Mock Server
Simulates provider responses defined in interactions.

### Matchers
Flexible assertions that allow variations:

```go
body := map[string]interface{}{
    "id":    matchers.Integer(),
    "name":  matchers.String(),
    "email": matchers.Regex(".*@.*\\.com"),
}
```

Prefer matchers for dynamic values to avoid brittle contracts.

### State Management
Setup data states for tests:

```go
mockProvider.
    Given("user with id 1 exists").
    UponReceiving("a request for user 1")
```

## Example Consumer Test

This example demonstrates request headers, mock invocation, and status validation under Pact-managed expectations.

```go
func TestGetUserConsumer(t *testing.T) {
    pact := consumer.NewPact(
        "FrontendApp",
        "UserAPI",
        consumer.WithPort(8081),
    )
    defer pact.WritePact()
    
    pact.AddInteraction().
        Given("user 1 exists").
        UponReceiving("a GET request for user 1").
        WithRequest("GET", "/api/users/1").
        WithHeader("Accept", "application/json").
        WillRespondWith(200).
        WithHeader("Content-Type", "application/json").
        WithBody(map[string]interface{}{
            "id":    1,
            "name":  matchers.String(),
            "email": matchers.String(),
        })
    
    err := pact.ExecuteTest(t, func(config *consumer.MockServerConfig) error {
        client := &http.Client{}
        req, _ := http.NewRequest("GET", config.URL+"/api/users/1", nil)
        req.Header.Set("Accept", "application/json")
        
        resp, err := client.Do(req)
        if err != nil {
            return err
        }
        defer resp.Body.Close()
        
        if resp.StatusCode != 200 {
            return fmt.Errorf("unexpected status: %d", resp.StatusCode)
        }
        
        return nil
    })
    
    if err != nil {
        t.Fatalf("test failed: %v", err)
    }
}
```


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

## Assignment: Create First Bookshelf Pact Consumer Test

### Goal
Generate a pact file from a consumer test for Bookshelf endpoints.

This assignment establishes the baseline contract artifact for downstream provider verification.

### Route Prefix Note
Use the same route prefix as your running service for this stage (`/api` in tutorial sections, `/api/v1` in capstone).

### Tasks

1. Install pact-go:

```bash
go get github.com/pact-foundation/pact-go/v2
```

2. Create `tests/contract/consumer/bookshelf_consumer_test.go`.
3. Define interactions for:
  - `GET /api/books` success
  - `POST /api/users` success
  - `POST /api/users` validation failure

Starter interaction:

```go
pact.AddInteraction().
    Given("books exist").
    UponReceiving("a request to list books").
    WithRequest("GET", "/api/books").
    WillRespondWith(200).
    WithHeader("Content-Type", "application/json").
    WithBody(matchers.EachLike(map[string]interface{}{
        "id":            matchers.String(),
        "title":         matchers.String(),
        "author":        matchers.String(),
        "isbn":          matchers.String(),
        "publishedYear": matchers.Integer(),
    }, 1))
```

4. Run and generate pact files:

```bash
go test ./tests/contract/consumer -v
```

### Done Criteria

- Pact JSON is generated under `pacts/`.
- Interactions map to real Bookshelf endpoints.

Also ensure interaction descriptions are readable in CI output and reports.

## Deep Dive: Pact Modeling Strategy

### Interaction quality checklist

1. Use precise provider states (`books exist`, `no books exist`).
2. Include request headers that matter (`Accept`, `Content-Type`).
3. Prefer matchers for dynamic values (IDs, timestamps, UUIDs).
4. Add both happy-path and validation-path interactions.

### Matcher philosophy

Overly strict payload matching creates fragile contracts. Use type and format matchers so legitimate provider evolution does not break consumers.

### Example matcher intent

```go
"id": matchers.String(),
"publishedYear": matchers.Integer(),
```

This validates interface compatibility while avoiding brittle literal-value checks.

### SDET tip

Keep one behavioral intent per interaction description so pact reports are easy to diagnose in CI.

## Common Anti-Patterns

- Hardcoding dynamic IDs/timestamps instead of using matchers.
- Combining unrelated assertions into one large interaction.
- Omitting request headers that affect provider behavior.
- Writing interactions that do not map to real client calls.

## Quick Pact Authoring Checklist

- Does each interaction represent one clear behavior?
- Are headers and path parameters explicitly modeled?
- Are matchers used for non-deterministic fields?
- Are both success and failure scenarios included?
- Will failure output be understandable to another team?



## Next Step

Continue with [Consumer Contract Tests](consumer-contract-tests.md).
