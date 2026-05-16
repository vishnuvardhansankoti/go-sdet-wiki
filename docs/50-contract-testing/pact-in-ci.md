# Pact in CI

## Pact Broker

The Pact Broker is a central repository for pact files and verification results.

```bash
# Run Pact Broker via Docker
docker run -d -p 8080:8080 pactfoundation/pact-broker:latest
```

## Publishing Consumer Pacts

### GitHub Actions: Consumer Job

```yaml
name: Consumer Contract Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Run consumer tests
        run: go test -v ./tests/consumer
      
      - name: Publish pacts
        run: |
          docker run --rm \
            -v ${{ github.workspace }}/pacts:/pacts \
            pactfoundation/pact-cli:latest \
            publish /pacts \
            --consumer-app-version=${{ github.sha }} \
            --broker-base-url=http://pact-broker:8080 \
            --branch=${{ github.ref_name }}
```

## Provider Verification in CI

### GitHub Actions: Provider Job

```yaml
name: Provider Verification

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    
    services:
      pact-broker:
        image: pactfoundation/pact-broker:latest
        ports:
          - 8080:8080
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Download pacts from broker
        run: |
          docker run --rm \
            -v ${{ github.workspace }}/pacts:/pacts \
            --network host \
            pactfoundation/pact-cli:latest \
            find --broker-base-url=http://localhost:8080 \
            --output=/pacts \
            --consumer-version-selectors='latest' \
            -a 'UserService'
      
      - name: Run provider
        run: go run ./cmd/server &
      
      - name: Verify pacts
        run: go test -v ./tests/provider -run TestProviderVerification
      
      - name: Publish verification
        run: |
          docker run --rm \
            -v ${{ github.workspace }}:/app \
            --network host \
            pactfoundation/pact-cli:latest \
            publish-provider-results \
            --broker-base-url=http://localhost:8080 \
            --provider-app-version=${{ github.sha }} \
            --branch=${{ github.ref_name }}
```

## CLI Publishing

### Publish Consumer Pacts

```bash
pact-cli publish ./pacts \
  --consumer-app-version=1.0.0 \
  --broker-base-url=http://pact-broker:8080 \
  --branch=main
```

### Publish Provider Results

```bash
pact-cli publish-provider-results ./verification-results \
  --provider-app-version=1.0.0 \
  --broker-base-url=http://pact-broker:8080 \
  --branch=main
```

## Programmatic Publishing

```go
import "github.com/pact-foundation/pact-go/v2/publisher"

func TestPublishPacts(t *testing.T) {
    err := publisher.Publish(
        "frontend-app",
        "1.0.0",
        []string{"pacts/"},
        publisher.WithBrokerURL("http://pact-broker:8080"),
        publisher.WithBrokerToken("token"),
        publisher.WithBranchName("main"),
    )
    if err != nil {
        t.Fatalf("publish failed: %v", err)
    }
}
```

## Matrix Testing

Test multiple provider versions:

```yaml
jobs:
  verify:
    strategy:
      matrix:
        go-version: ['1.20', '1.21', '1.22']
        provider-version: ['1.0.0', '2.0.0']
    
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: ${{ matrix.go-version }}
      
      - name: Verify provider
        run: |
          go test -v ./tests/provider \
            -provider-version=${{ matrix.provider-version }}
```

## Can I Deploy Decision

The Pact Broker can determine if it's safe to deploy:

```bash
pact-cli can-i-deploy \
  --broker-base-url=http://pact-broker:8080 \
  --pacticipant=UserService \
  --version=1.0.0 \
  --branch=main
```

In CI:

```yaml
- name: Check if safe to deploy
  run: |
    docker run --rm \
      --network host \
      pactfoundation/pact-cli:latest \
      can-i-deploy \
      --broker-base-url=http://localhost:8080 \
      --pacticipant=UserService \
      --version=${{ github.sha }} \
      --branch=${{ github.ref_name }}
```

## Best Practices

- Publish all contracts to broker
- Verify against broker-fetched pacts
- Use versioning and branches
- Monitor pact verification trends
- Fail deployment if verification fails
- Review contracts regularly
