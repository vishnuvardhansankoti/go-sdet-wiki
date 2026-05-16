# Linting and Static Analysis

Linting and static analysis detect maintainability, correctness, and security risks before runtime tests execute. These checks are most effective when they are deterministic, high-signal, and consistently enforced in CI.

This section explains how to build a practical static quality gate for Go projects.

## Go Vet

Built-in static analysis tool:

```bash
go vet ./...
```

Use `go vet` as a baseline correctness gate in every pull request.

### Running in CI

```yaml
- name: Run go vet
  run: go vet ./...
```

## golangci-lint

Combines multiple linters:

```bash
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

golangci-lint run ./...
```

Pin the linter version in CI for reproducible results.

### Configuration

Create `.golangci.yml`:

```yaml
linters:
  enable:
    - misspell
    - goimports
    - lll
    - unused
    - ineffassign
    - deadcode
    - unconvert
    - staticcheck

linters-settings:
  lll:
    line-length: 120
  
  goimports:
    local-prefixes: github.com/mycompany

output:
  format: colored-line-number
```

Tune enabled linters gradually to avoid overwhelming teams with low-value noise.

### GitHub Actions

```yaml
- uses: golangci/golangci-lint-action@v3
  with:
    version: latest
    args: --timeout=5m
```

## fmt

Format code:

```bash
go fmt ./...

# Check without modifying
gofmt -l ./...
```

Formatting checks should be mandatory and fail fast.

## goimports

Format imports:

```bash
go install golang.org/x/tools/cmd/goimports@latest

goimports -w ./...
```

## Cyclomatic Complexity

Complexity metrics help identify areas that are difficult to test and maintain.

Check code complexity with `gocyclo`:

```bash
go install github.com/fzipp/gocyclo/cmd/gocyclo@latest

gocyclo -over 10 ./...
```

## Error Checking

Unchecked errors are a common source of latent production defects.

### errcheck

Ensures errors are handled:

```bash
go install github.com/kisielk/errcheck@latest

errcheck ./...
```

### nilcheck

Detect potential nil pointer dereferences:

```bash
go install golang.org/x/tools/go/analysis/passes/nilcheck@latest
```

## Security Scanning

Security analyzers should be integrated as routine quality checks, not occasional audits.

### gosec

Security-focused analyzer:

```bash
go install github.com/securego/gosec/v2/cmd/gosec@latest

gosec ./...
```

### Trivy

Vulnerability scanner:

```bash
trivy fs .
```

## Complete CI/CD Pipeline

A complete quality pipeline should separate formatter, correctness, and security findings clearly.

```yaml
name: Quality Checks

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Format check
        run: |
          gofmt -l .
          if [ -n "$(gofmt -l .)" ]; then
            echo "Go files not formatted"
            exit 1
          fi
      
      - name: Go vet
        run: go vet ./...
      
      - name: golangci-lint
        uses: golangci/golangci-lint-action@v3
        with:
          args: --timeout=5m
      
      - name: Complexity check
        run: |
          go install github.com/fzipp/gocyclo/cmd/gocyclo@latest
          gocyclo -over 10 ./...
      
      - name: Security check
        run: |
          go install github.com/securego/gosec/v2/cmd/gosec@latest
          gosec ./...
```

## Pre-commit Hook

Pre-commit hooks improve local feedback speed, while CI remains the source of truth.

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Format check
if ! gofmt -l . | grep -q .; then
  echo "Please format your code with: go fmt ./..."
  exit 1
fi

# Run vet
if ! go vet ./...; then
  echo "Go vet failed"
  exit 1
fi

# Run tests
if ! go test -v ./...; then
  echo "Tests failed"
  exit 1
fi

exit 0
```

Make executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Best Practices

- Run linting on every commit
- Fix issues before submitting PR
- Enforce linting in CI
- Keep linter configuration consistent
- Address security warnings immediately
- Monitor code quality metrics over time

Additional guidance:

- Keep suppression lists explicit and reviewed.
- Separate warning-only and blocking policies by severity.
- Track recurring findings by category to guide refactoring priorities.

## Assignment: Lint and Static Analysis Gate for Bookshelf

### Goal
Add mandatory static quality checks for Bookshelf code before merge.

This assignment ensures static analysis gates are enforceable and team-visible.

### Tasks

1. Create `.golangci.yml` tuned for this repo.
2. Add CI steps:
  - `go fmt ./...`
  - `go vet ./...`
  - `golangci-lint run ./...`
3. Add security scanning step:

```bash
gosec ./...
```

4. Fail CI on formatting drift:

```bash
if [ -n "$(gofmt -l .)" ]; then
  echo "Unformatted files found"
  gofmt -l .
  exit 1
fi
```

### Bookshelf Focus Areas

- Ensure handler error paths always return JSON.
- Ensure goroutine code in bulk import is race-safe.
- Ensure context-aware repository methods handle errors.

### Done Criteria

- Lint + vet + security checks are blocking in CI.
- Contributors cannot merge code with quality gate failures.

Also ensure failure messages include exact remediation hints.

## Deep Dive: Designing High-Signal Quality Gates

### Background

Static checks are most valuable when they are predictable and high-signal. If a gate is noisy, teams stop trusting it; if it is too weak, defects slip through.

### High-signal gate design

1. Keep formatter checks deterministic and mandatory.
2. Separate style issues from correctness issues in job output.
3. Run `go vet` and `golangci-lint` on every PR.
4. Add security scanning as a distinct stage with clear failure messages.

### Suggested failure policy

- Block on formatting drift.
- Block on vet/lint correctness findings.
- Triage security findings by severity and track suppressions explicitly.

### SDET recommendation

Use stable linter versions in CI to avoid surprise breakages from tool updates during active sprint work.

## Common Anti-Patterns

- Enabling too many linters at once without triage strategy.
- Ignoring formatter drift because other checks pass.
- Treating security scanner output as informational only.
- Allowing broad suppressions without review.

## Quick Static Gate Checklist

- Are format checks mandatory and deterministic?
- Are vet and lint running on every PR?
- Is linter version pinned for reproducibility?
- Are security findings triaged with policy?
- Are suppressions documented and reviewable?


