# Coverage and Thresholds

## Measuring Coverage

### Generate Coverage Report

```bash
go test -coverprofile=coverage.out ./...
```

### View Coverage

```bash
go tool cover -html=coverage.out
```

### Coverage by Function

```bash
go test -v -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html
```

### Coverage Percentage

```bash
go test -cover ./...
```

## Coverage Thresholds

### GitHub Actions: Coverage Check

```yaml
name: Coverage

on: [push, pull_request]

jobs:
  coverage:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Generate coverage
        run: go test -v -coverprofile=coverage.out ./...
      
      - name: Check coverage
        run: |
          coverage=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | sed 's/%//')
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "Coverage $coverage% is below 80% threshold"
            exit 1
          fi
```

### Using gcov2lcov

```yaml
- name: Convert coverage to lcov
  run: |
    go install github.com/jandelgado/gcov2lcov@latest
    gcov2lcov -infile=coverage.out -outfile=coverage.lcov

- name: Upload coverage
  uses: coverallsapp/github-action@master
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    path-to-lcov: coverage.lcov
```

### Using Codecov

```yaml
- name: Upload to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage.out
    flags: unittests
    fail_ci_if_error: true
```

## Per-Package Coverage Targets

```go
// Makefile
check-coverage:
	@go test -coverprofile=coverage.out ./...
	@echo "Overall coverage:"
	@go tool cover -func=coverage.out | grep total
	@echo ""
	@echo "Package coverage:"
	@go tool cover -func=coverage.out | awk 'NR > 1 && $$NF < 80 {print $$1 ": " $$NF "%"}' | sort | uniq
```

## Exclude Files from Coverage

```go
// coverage_helper_test.go
// +build !coverage

package myapp_test
```

Or use:

```bash
go test -cover -covermode=count ./...
```

## Quality Gates

### Enforce Minimum Coverage

```bash
#!/bin/bash
set -e

# Run tests with coverage
go test -v -coverprofile=coverage.out ./...

# Extract coverage percentage
coverage=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | sed 's/%//')
minimum=80

# Check threshold
if (( $(echo "$coverage < $minimum" | bc -l) )); then
    echo "FAIL: Coverage $coverage% is below $minimum%"
    exit 1
fi

echo "PASS: Coverage is $coverage%"
```

### Combined with Other Checks

```yaml
jobs:
  quality:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Run tests
        run: go test -v -race ./...
      
      - name: Check coverage
        run: |
          go test -coverprofile=coverage.out ./...
          coverage=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | sed 's/%//')
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "Coverage $coverage% below 80%"
            exit 1
          fi
      
      - name: Lint
        uses: golangci/golangci-lint-action@v3
      
      - name: Static analysis
        run: go vet ./...
```

## Reporting Coverage Trends

```yaml
- name: Comment coverage on PR
  if: github.event_name == 'pull_request'
  uses: romeovs/lcov-reporter-action@v0.3.1
  with:
    lcov-file: ./coverage.lcov
```

## Best Practices

- Set realistic coverage targets (80-90%)
- Include edge cases in coverage
- Monitor coverage trends over time
- Don't aim for 100% - focus on critical paths
- Review uncovered code regularly
- Use incremental coverage gates
