# Pact in CI

Contract testing becomes truly valuable when integrated into CI and release governance. Running Pact locally is useful, but automated publication, verification, and deploy decisions are what prevent production compatibility regressions.

This guide focuses on reliable CI workflow design for contract-based delivery.

## Pact Broker

The Pact Broker is a central repository for pact files and verification results.

It acts as the source of truth for compatibility history across teams and versions.

```bash
# Run Pact Broker via Docker
docker run -d -p 8080:8080 pactfoundation/pact-broker:latest
```

## Publishing Consumer Pacts

Consumer pipelines should publish pact artifacts every time API-calling behavior changes.

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

Provider pipelines should fetch current relevant pacts and verify against the running provider.

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

CLI commands are useful for local checks, scripted pipelines, and emergency manual recovery workflows.

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

Programmatic publishing is useful when you want publication tightly coupled to test execution code.

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

Use matrix breadth carefully to balance coverage and CI runtime.

## Can I Deploy Decision

The Pact Broker can determine if it's safe to deploy:

```bash
pact-cli can-i-deploy \
  --broker-base-url=http://pact-broker:8080 \
  --pacticipant=UserService \
  --version=1.0.0 \
  --branch=main
```

Treat this check as a release gate, not an optional informational step.

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

Additional guidance:

- Use immutable app versions such as commit SHA.
- Persist pact and verification artifacts for failed runs.
- Keep broker connectivity checks explicit in pipeline setup.


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

## Assignment: Add Bookshelf Contract Tests to CI

### Goal
Automate contract publication and provider verification in GitHub Actions.

This assignment establishes continuous compatibility governance for the Bookshelf project.

### Tasks

1. Add `.github/workflows/contract-tests.yml` with two jobs:
  - `consumer-contract`
  - `provider-verification`
2. Consumer job:
  - runs `go test ./tests/contract/consumer -v`
  - publishes pacts to broker (or stores as artifact initially)
3. Provider job:
  - starts provider app
  - fetches pacts (broker or artifact)
  - runs `go test ./tests/contract/provider -v`
4. Add can-i-deploy gate before release.

Minimal workflow commands:

```bash
go test ./tests/contract/consumer -v
go test ./tests/contract/provider -v
```

### Done Criteria

- PRs fail if consumer or provider contract tests fail.
- Release pipeline checks can-i-deploy before deployment.

Also ensure failure diagnostics are retained as downloadable artifacts.

## Deep Dive: CI Contract Governance

### Background

Contract testing becomes high-value only when integrated into deployment governance. The broker history plus can-i-deploy provides traceable compatibility decisions.

### Governance pipeline sequence

1. Run consumer tests and publish pacts.
2. Run provider verification against current relevant pacts.
3. Publish verification results.
4. Execute can-i-deploy for release candidate.

### Operational safeguards

1. Use immutable app versions (`git sha`).
2. Include branch/environment tags where needed.
3. Fail fast on missing pact files or broker connectivity errors.
4. Preserve pact/verification artifacts for debugging.

### SDET metrics to monitor

- Contract verification pass rate by provider version.
- Mean time to fix contract breakages.
- Number of blocked deployments due to can-i-deploy.

## Common Anti-Patterns

- Publishing pacts without running corresponding consumer tests.
- Verifying providers against stale local pact files instead of broker source.
- Skipping can-i-deploy in release workflows.
- Treating contract failures as flaky and rerunning without analysis.

## Quick Contract CI Checklist

- Are consumer pacts published per relevant change?
- Does provider verification fetch current broker contracts?
- Are verification results published back to broker?
- Is can-i-deploy enforced before release?
- Are diagnostics/artifacts available for failed runs?




## Next Step

Continue with [GitHub Actions for Go](../60-ci-cd-and-quality-gates/github-actions-for-go.md).
