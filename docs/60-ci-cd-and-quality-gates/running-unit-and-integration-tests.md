# Running Unit and Integration Tests

Execution strategy is a quality and productivity decision. Running the right tests at the right stage improves defect detection speed while keeping CI cost under control.

This guide defines practical command patterns for local development and CI parity.

## Test Execution

Start with broad test commands, then use filters and tags to narrow scope for faster iteration.

### Basic Test Run

```bash
go test ./...
```

### Verbose Output

```bash
go test -v ./...
```

### Run Specific Test

```bash
go test -run TestUserService ./...
```

### Run Tests Matching Pattern

```bash
go test -run TestUser/GetUser ./...
```

## Test Filters

Filtering helps isolate failures quickly during triage.

### Skip Certain Tests

```bash
go test -skip TestSlowOperation ./...
```

### Run Only Unit Tests

```bash
go test -short ./...
```

Tests can use `t.Skip()` when `testing.Short()` is true.

## Timeout

```bash
go test -timeout 30s ./...
```

Always set explicit timeouts for long-running suites in CI.

## Race Detection

```bash
go test -race ./...
```

Find data races in concurrent code.

Use race detection regularly on unit suites and concurrency-heavy packages.

## Separate Unit and Integration Tests

Separation ensures fast feedback for unit checks and controlled execution for heavier integration checks.

### Build Tags

```go
// integration_test.go
//go:build integration

package myapp_test

func TestDatabaseIntegration(t *testing.T) {
    // Integration test
}
```

```go
// unit_test.go
//go:build !integration

package myapp_test

func TestUserService(t *testing.T) {
    // Unit test
}
```

Run unit tests only:

```bash
go test ./...
```

Run integration tests:

```bash
go test -tags=integration ./...
```

## Parallel Execution

Parallelism speeds execution, but only for tests that are data-isolated and deterministic.

```bash
go test -parallel 4 ./...
```

Tests must be marked with `t.Parallel()`:

```go
func TestConcurrent(t *testing.T) {
    t.Parallel()
    // Test code
}
```

## Coverage Analysis

Combine coverage with execution groups to identify gaps per test layer.

```bash
go test -cover ./...
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

## Test Output Formats

Structured output helps CI tools parse and surface failures effectively.

### JSON Output

```bash
go test -json ./...
```

### Verbose with Timing

```bash
go test -v -timeout 5m ./...
```

## CI/CD Integration

Split unit and integration jobs to improve observability and rerun efficiency.

### GitHub Actions: Unit + Integration

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      - run: go test -v -race ./...
  
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
      - run: go test -v -tags=integration -timeout=20m ./...
```

### Makefile Example

```makefile
test:
	go test -v -race ./...

test-unit:
	go test -v -short ./...

test-integration:
	go test -v -tags=integration -timeout=20m ./...

test-all: test-unit test-integration

test-coverage:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out
```

Keep Makefile targets aligned with CI commands to avoid local/CI drift.

## Best Practices

- Run unit tests before integration tests
- Use `t.Parallel()` for independent tests
- Use race detector in CI
- Set appropriate timeouts
- Separate concerns with build tags
- Monitor test execution time

Additional guidance:

- Keep integration test setup deterministic and isolated.
- Fail fast on unit regressions before running expensive suites.
- Publish timing trends to detect gradual slowdowns.

## Assignment: Test Execution Strategy for Bookshelf

### Goal
Define repeatable commands for local and CI execution of all Bookshelf tests.

This assignment standardizes how contributors run and reason about test layers.

### Local Commands

```bash
# Fast feedback (domain + handler unit tests)
go test -v -short ./...

# Full unit pass with race detector
go test -v -race ./...

# Integration only
go test -v -timeout=20m ./tests/integration/...

# Contract only
go test -v ./tests/contract/consumer ./tests/contract/provider
```

### Makefile Targets

Add or update targets:

```makefile
test-unit:
  go test -v -race ./...

test-integration:
  go test -v -timeout=20m ./tests/integration/...

test-contract:
  go test -v ./tests/contract/consumer ./tests/contract/provider

test-all: test-unit test-integration test-contract
```

### Done Criteria

- `make test-all` runs complete validation suite.
- CI uses the same command set to avoid drift.

Also verify command docs are visible to new contributors in onboarding paths.

## Deep Dive: Test Pyramid Execution Strategy

### Background

Execution order determines feedback quality and CI cost. Fast failures should happen early, expensive suites should run after quick confidence gates.

### Recommended sequence

1. Unit tests with race detector.
2. Integration tests with bounded timeout.
3. Contract tests for consumer/provider compatibility.

### Pipeline behavior goals

- Fail fast on unit-level regressions.
- Keep integration runs isolated and deterministic.
- Ensure contract checks run before deployment logic.

### Local parity guidance

Local commands should mirror CI command groups. This reduces "works on my machine" failures and shortens PR turnaround.

### SDET recommendation

Publish timing data per test group to identify slowdowns and keep feedback loops tight.

## Common Anti-Patterns

- Running all suites with one command for every local iteration.
- Mixing integration and unit responsibilities in same test package without tags.
- Missing timeouts for long-running integration jobs.
- Enabling parallel test execution without state isolation.

## Quick Test Execution Checklist

- Are unit and integration commands clearly separated?
- Are race checks part of regular validation?
- Are integration and contract suites time-bounded?
- Do local commands mirror CI behavior?
- Are failures easy to classify by test layer?


