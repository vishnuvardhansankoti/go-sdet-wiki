# Pact Go Basics

## What is Pact?

Pact is a contract testing framework that enables consumer-driven contract testing.

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

### State Management
Setup data states for tests:

```go
mockProvider.
    Given("user with id 1 exists").
    UponReceiving("a request for user 1")
```

## Example Consumer Test

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
