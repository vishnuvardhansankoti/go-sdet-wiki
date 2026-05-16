# CI Pipeline for Capstone

The CI pipeline is the enforcement engine for capstone quality. It should provide fast, reliable feedback while blocking merges that violate correctness, compatibility, or maintainability gates.

This page defines a practical pipeline architecture for deterministic delivery.

## GitHub Actions Workflow

Split checks by concern where possible to improve failure isolation and rerun efficiency.

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: bookshelf_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Run unit tests
        run: |
          go test -v -race -cover ./tests/unit/... \
            -coverprofile=coverage-unit.out
      
      - name: Run integration tests
        env:
          DATABASE_URL: "postgres://postgres:password@localhost/bookshelf_test"
        run: |
          go test -v -race -timeout=5m \
            -coverprofile=coverage-integration.out \
            ./tests/integration/...
      
      - name: Run contract tests
        run: |
          go test -v ./tests/contract/... \
            -coverprofile=coverage-contract.out
      
      - name: Merge coverage reports
        run: |
          go install github.com/wadey/gocovmerge@latest
          gocovmerge coverage-*.out > coverage.out
      
      - name: Check coverage
        run: |
          coverage=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | sed 's/%//')
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "Coverage $coverage% below 80%"
            exit 1
          fi
      
      - name: Format check
        run: |
          if [ -n "$(gofmt -l .)" ]; then
            gofmt -l .
            exit 1
          fi
      
      - name: Go vet
        run: go vet ./...
      
      - name: golangci-lint
        uses: golangci/golangci-lint-action@v3
        with:
          version: latest
          args: --timeout=5m
      
      - name: Build
        run: go build -o app ./cmd/server
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.out
          flags: unittests
          fail_ci_if_error: false
```

## Makefile

Make targets should mirror CI job commands to preserve local/CI parity.

Create `Makefile` for local development:

```makefile
.PHONY: help test test-unit test-integration test-contract coverage lint build run

help:
	@echo "Available targets:"
	@echo "  test                - Run all tests"
	@echo "  test-unit          - Run unit tests"
	@echo "  test-integration   - Run integration tests"
	@echo "  test-contract      - Run contract tests"
	@echo "  coverage           - Generate coverage report"
	@echo "  lint               - Run linters"
	@echo "  build              - Build binary"
	@echo "  run                - Run server"
	@echo "  docker-up          - Start Docker services"
	@echo "  docker-down        - Stop Docker services"

test:
	go test -v -race ./tests/unit/... ./tests/integration/... ./tests/contract/...

test-unit:
	go test -v -race ./tests/unit/...

test-integration:
	go test -v -race -timeout=5m ./tests/integration/...

test-contract:
	go test -v ./tests/contract/...

coverage:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out

lint:
	golangci-lint run ./...
	go vet ./...

build:
	go build -o app ./cmd/server

run: build
	./app

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down
```

## Docker Compose

Local infrastructure setup should be predictable and aligned with integration test expectations.

Create `docker-compose.yml` for local development:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: bookshelf
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - ./tests/fixtures/schema.sql:/docker-entrypoint-initdb.d/schema.sql
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  adminer:
    image: adminer
    ports:
      - "8081:8080"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

## Quality Checks

Quality checks should fail fast and emit actionable diagnostics.

### Code Coverage

```bash
make coverage
```

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Running tests..."
go test -v -race ./...

if [ $? -ne 0 ]; then
    echo "Tests failed"
    exit 1
fi

echo "Running linters..."
go vet ./...
golangci-lint run ./...

if [ $? -ne 0 ]; then
    echo "Linting failed"
    exit 1
fi

exit 0
```

Make executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Workflow

Use this workflow as a delivery policy, not just a suggested sequence.

1. **Local Development**
   ```bash
   make docker-up
   make test
   make lint
   ```

2. **Commit**
   - Pre-commit hook runs tests and linters
   - Push only if all pass

3. **CI Pipeline**
   - GitHub Actions runs full test suite
   - Coverage checked
   - Linting verified
   - Build verified

4. **Merge**
   - All CI checks must pass
   - PR reviewed
   - Merge to main

## Troubleshooting

Troubleshooting guidance should prioritize reproducibility and root-cause visibility.

### Database Connection Issues

```bash
# Check if postgres is running
docker-compose ps

# View logs
docker-compose logs postgres

# Restart
docker-compose restart postgres
```

### Test Failures

```bash
# Run with verbose output
go test -v -run TestName ./...

# Run with race detector
go test -race ./...

# Run with timeout
go test -timeout=30s ./...
```

## Next Step

You've completed the capstone project! Review and refactor your code, then consider:

1. Adding more comprehensive tests
2. Implementing authentication
3. Adding API documentation (Swagger/OpenAPI)
4. Setting up production deployment
5. Adding performance testing
6. Implementing caching

Congratulations on completing the Go SDET Wiki Capstone!

## Assignment: Final Capstone Pipeline Hardening

### Goal
Finalize a deterministic CI pipeline for the complete Bookshelf system.

### Required Jobs

1. Formatting + lint + vet
2. Unit tests with race detector
3. Integration tests with timeout budget
4. Contract tests (consumer + provider)
5. Coverage gate (>= 80%)
6. Build artifact verification

### Final Validation

```bash
go test -v -race ./...
go test -v ./tests/integration/...
go test -v ./tests/contract/...
go build ./...
```

### Done Criteria

- CI green on a fresh branch.
- Coverage gate and quality gates enforced.
- Capstone is ready for portfolio/demo.

## Deep Dive: Pipeline Reliability and Developer Feedback

### Background

CI should be both strict and informative: strict enough to prevent risky merges, informative enough to make failures quickly actionable.

### Reliability architecture

1. Keep jobs focused by concern (`quality`, `unit`, `integration`, `contract`, `build`).
2. Use deterministic tool versions and explicit timeouts.
3. Persist artifacts for failing suites (coverage, logs, pact files).
4. Keep local commands aligned with CI targets.

### SDET recommendation

Measure median CI duration and failure categories to continuously improve feedback speed and pipeline health.

## Common Anti-Patterns

- Running all concerns in one monolithic job with poor diagnostics.
- Using floating tool/action versions that change behavior unexpectedly.
- Missing artifacts/log capture for failed integration or contract checks.
- Letting local commands drift from CI execution commands.

## Quick Pipeline Hardening Checklist

- Are quality/unit/integration/contract/build gates clearly separated?
- Are versions, timeouts, and environments deterministic?
- Are failure diagnostics and artifacts retained?
- Are coverage and lint thresholds enforced?
- Do local Make targets mirror CI behavior?


