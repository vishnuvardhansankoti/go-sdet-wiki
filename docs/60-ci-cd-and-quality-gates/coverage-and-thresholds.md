# Coverage and Thresholds

Coverage gating is a risk-control mechanism, not a vanity metric. The objective is to improve confidence in critical behavior while preventing silent test-quality regressions over time.

This guide explains how to measure coverage, enforce practical thresholds, and use coverage trends as part of CI governance.

## Measuring Coverage

Start with reproducible commands that generate machine-readable output and human-friendly reports.

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

Function-level views help identify high-risk code paths that lack test depth.

### Coverage Percentage

```bash
go test -cover ./...
```

## Coverage Thresholds

Thresholds should reflect risk profile, not arbitrary targets.

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

Use this as a baseline and evolve to package-specific gates for critical modules.

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

Per-package targets prevent strong overall coverage from hiding weak critical components.

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

Use exclusions sparingly and document why each exclusion is justified.

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

A good quality gate fails fast with clear diagnostics and actionable context.

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

Coverage works best when combined with race checks, linting, and static analysis.

## Reporting Coverage Trends

Trend reporting helps teams catch gradual regressions before they become release risk.

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

Additional guidance:

- Track both global and critical-package thresholds.
- Highlight uncovered hotspots in PR summaries.
- Treat sudden drops as investigation triggers, not just numeric failures.

## Assignment: Coverage Gate Policy for Bookshelf

### Goal
Enforce minimum test coverage and protect critical modules.

This assignment formalizes coverage as a merge gate for the Bookshelf project.

### Coverage Policy

- Global minimum: `80%`
- Domain package target (`pkg/domain`): `90%`
- Handler package target (`pkg/handler`): `85%`

### Tasks

1. Generate coverage in CI:

```bash
go test -v -coverprofile=coverage.out ./...
go tool cover -func=coverage.out
```

2. Add gate script `scripts/check-coverage.sh`:
  - fail when total coverage < 80
  - print uncovered hotspots

3. Upload coverage artifact and optionally publish to Codecov.

4. Add PR summary comment with total coverage and delta.

### Suggested Gate Script Logic

```bash
coverage=$(go tool cover -func=coverage.out | awk '/total:/ {print $3}' | sed 's/%//')
minimum=80
if (( $(echo "$coverage < $minimum" | bc -l) )); then
  echo "Coverage $coverage% is below $minimum%"
  exit 1
fi
```

### Done Criteria

- CI fails automatically below threshold.
- Team can track trend and prevent coverage regressions.

Also ensure threshold failures include clear instructions for contributors.

## Deep Dive: Coverage as Risk Management

### Background

Coverage is not a quality metric by itself; it is a visibility metric. The goal is to maximize confidence on critical paths, not to maximize percentages blindly.

### Practical threshold strategy

1. Set realistic global threshold (for example, 80%).
2. Set higher thresholds for business-critical packages.
3. Enforce non-regression: block significant drops from baseline.
4. Pair coverage checks with mutation-prone area reviews.

### Interpreting low coverage hotspots

- Low coverage in error handling paths often indicates hidden production risk.
- Low coverage in handlers can hide status-code and payload contract regressions.
- Low coverage in concurrency code can hide race-related defects.

### SDET recommendation

Track trend over time and prioritize adding tests where change frequency and business impact intersect.

## Common Anti-Patterns

- Chasing 100% coverage while missing critical failure-path tests.
- Relying only on global threshold and ignoring weak key packages.
- Treating coverage drop failures as flaky instead of investigating root cause.
- Excluding files without explicit rationale.

## Quick Coverage Gate Checklist

- Is coverage generated consistently in CI?
- Are thresholds risk-based and documented?
- Are critical packages tracked separately?
- Are PRs showing trend/delta information?
- Are failures actionable for contributors?


