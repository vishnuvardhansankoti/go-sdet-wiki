# Running Unit and Integration Tests

## Test Execution

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

## Race Detection

```bash
go test -race ./...
```

Find data races in concurrent code.

## Separate Unit and Integration Tests

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

```bash
go test -cover ./...
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

## Test Output Formats

### JSON Output

```bash
go test -json ./...
```

### Verbose with Timing

```bash
go test -v -timeout 5m ./...
```

## CI/CD Integration

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

## Best Practices

- Run unit tests before integration tests
- Use `t.Parallel()` for independent tests
- Use race detector in CI
- Set appropriate timeouts
- Separate concerns with build tags
- Monitor test execution time
