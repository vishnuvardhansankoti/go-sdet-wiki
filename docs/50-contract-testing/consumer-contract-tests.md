# Consumer Contract Tests

## Writing Consumer Contract Tests

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

## Testing Different Scenarios

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

## Table-Driven Consumer Tests

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

## Best Practices

- Define realistic interactions
- Use matchers for flexibility
- Test both success and failure paths
- Keep contracts simple and focused
- Review generated pact files
