# Contract Testing Strategy

## Consumer Contracts

For the Bookshelf API, define contracts between:
- Frontend (Consumer) ↔ API (Provider)
- Other Services (Consumers) ↔ Bookshelf API (Provider)

## Setting Up Pact

```bash
go get github.com/pact-foundation/pact-go/v2
```

## Consumer Contract: Frontend Expects

### Frontend User Registration

```go
// tests/contract/consumer_user_test.go

func TestUserRegistrationConsumer(t *testing.T) {
    pact := consumer.NewPact(
        "FrontendApp",
        "BookshelfAPI",
        consumer.WithPort(8081),
    )
    defer pact.WritePact()
    
    pact.AddInteraction().
        Given("no user with email exists").
        UponReceiving("a request to register user").
        WithRequest("POST", "/api/v1/users").
        WithHeader("Content-Type", "application/json").
        WithBody(map[string]interface{}{
            "email":    "user@example.com",
            "name":     "John",
            "password": "pass123",
        }).
        WillRespondWith(http.StatusCreated).
        WithHeader("Content-Type", "application/json").
        WithBody(map[string]interface{}{
            "data": map[string]interface{}{
                "id":        matchers.Integer(),
                "email":     "user@example.com",
                "name":      "John",
                "created_at": matchers.String(),
            },
        })
    
    err := pact.ExecuteTest(t, func(config *consumer.MockServerConfig) error {
        client := &http.Client{}
        
        body := []byte(`{
            "email":"user@example.com",
            "name":"John",
            "password":"pass123"
        }`)
        
        req, _ := http.NewRequest("POST", config.URL+"/api/v1/users", bytes.NewBuffer(body))
        req.Header.Set("Content-Type", "application/json")
        
        resp, err := client.Do(req)
        if err != nil {
            return err
        }
        defer resp.Body.Close()
        
        if resp.StatusCode != http.StatusCreated {
            return fmt.Errorf("unexpected status: %d", resp.StatusCode)
        }
        
        return nil
    })
    
    if err != nil {
        t.Fatalf("pact test failed: %v", err)
    }
}
```

## Provider Verification

### Verify Against Contracts

```go
// tests/contract/provider_verify_test.go

func TestProviderVerification(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping provider verification in short mode")
    }
    
    // Start test server
    db, cleanup := setupPostgres(t)
    defer cleanup()
    
    server := startTestServer(db)
    defer server.Close()
    
    // Setup state
    setupTestData(db)
    
    // Verify provider
    verifier := provider.NewVerifier()
    
    err := verifier.VerifyProvider(t, provider.VerifyRequest{
        ProviderName:    "BookshelfAPI",
        ProviderVersion: "1.0.0",
        PactFiles:       []string{"pacts/FrontendApp-BookshelfAPI.json"},
        Provider:        server.URL,
        StateHandlers: provider.StateHandlers{
            "no user with email exists": func() error {
                return cleanupTestData(db)
            },
            "user exists": func() error {
                return insertTestUser(db)
            },
        },
    })
    
    if err != nil {
        t.Fatalf("provider verification failed: %v", err)
    }
}
```

## Multiple Consumer Contracts

```go
// Contracts from multiple consumers
PactFiles: []string{
    "pacts/frontend-bookshelf.json",
    "pacts/mobile-bookshelf.json",
    "pacts/admin-bookshelf.json",
}
```

## Pact Broker Integration

### Publish Consumer Pacts

```bash
go get github.com/pact-foundation/pact-go/v2

# After running consumer tests, pacts are generated in pacts/
# Publish to broker:
docker run --rm \
  -v $(pwd)/pacts:/pacts \
  pactfoundation/pact-cli:latest \
  publish /pacts \
  --consumer-app-version=1.0.0 \
  --broker-base-url=http://pact-broker:8080 \
  --branch=main
```

### Verify in CI

```go
func TestProviderVerificationFromBroker(t *testing.T) {
    verifier := provider.NewVerifier()
    
    err := verifier.VerifyProvider(t, provider.VerifyRequest{
        ProviderName:    "BookshelfAPI",
        ProviderVersion: "1.0.0",
        
        // Fetch pacts from broker
        BrokerURL:       "http://pact-broker:8080",
        PublishResults:  true,
        
        Provider: "http://localhost:8080",
        StateHandlers: provider.StateHandlers{
            "no user exists":  cleanupTestData,
            "user exists":     insertTestUser,
        },
    })
    
    if err != nil {
        t.Fatalf("provider verification failed: %v", err)
    }
}
```

## Test Checklist

- [ ] Consumer contract tests pass
- [ ] Provider verification passes
- [ ] All consumer scenarios covered
- [ ] Error cases defined
- [ ] Pacts generated correctly
- [ ] Pacts publishable to broker

## Next Step

Proceed to [CI Pipeline for Capstone](ci-pipeline-for-capstone.md)
