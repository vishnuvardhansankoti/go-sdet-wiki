# Linting and Static Analysis

## Go Vet

Built-in static analysis tool:

```bash
go vet ./...
```

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

## goimports

Format imports:

```bash
go install golang.org/x/tools/cmd/goimports@latest

goimports -w ./...
```

## Cyclomatic Complexity

Check code complexity with `gocyclo`:

```bash
go install github.com/fzipp/gocyclo/cmd/gocyclo@latest

gocyclo -over 10 ./...
```

## Error Checking

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
