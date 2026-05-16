# GitHub Actions for Go

GitHub Actions pipelines are the operational backbone of Go quality gates. A well-structured workflow reduces feedback time, isolates failures clearly, and scales with team velocity.

This page focuses on practical workflow architecture for reliable Go CI.

## Basic Workflow

Begin with one deterministic test job, then split responsibilities as the project grows.

### Simple Test Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Run tests
        run: go test -v -race -timeout=10m ./...
```

## Matrix Testing

Test across multiple Go versions and operating systems:

```yaml
jobs:
  test:
    strategy:
      matrix:
        go-version: ['1.20', '1.21', '1.22']
        os: [ubuntu-latest, macos-latest, windows-latest]
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: ${{ matrix.go-version }}
      - run: go test -v ./...
```

Use matrix coverage strategically for compatibility-sensitive projects.

## Caching Dependencies

Effective caching reduces CI runtime and protects feedback loops as dependency graphs grow.

```yaml
steps:
  - uses: actions/checkout@v3
  - uses: actions/setup-go@v4
    with:
      go-version: '1.21'
  - uses: actions/cache@v3
    with:
      path: ~/go/pkg/mod
      key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
      restore-keys: |
        ${{ runner.os }}-go-
  - run: go test -v ./...
```

## Build and Push

Build and artifact steps should produce reproducible outputs tied to immutable commit identifiers.

### Build Binary

```yaml
- name: Build
  run: go build -o app ./cmd/server

- name: Upload artifact
  uses: actions/upload-artifact@v3
  with:
    name: app
    path: app
```

### Docker Build and Push

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v4
  with:
    context: .
    push: true
    tags: myregistry/myapp:${{ github.sha }}
    username: ${{ secrets.DOCKER_USERNAME }}
    password: ${{ secrets.DOCKER_PASSWORD }}
```

## Environment Variables

Keep environment wiring explicit so test behavior is predictable and auditable.

```yaml
env:
  ENVIRONMENT: test
  LOG_LEVEL: debug

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: postgres://user:pass@localhost/test
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
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
      - run: go test -v ./...
```

## Secrets

Secrets should only be injected at job scope where required and never echoed in logs.

```yaml
- name: Run tests
  env:
    API_KEY: ${{ secrets.API_KEY }}
    SECRET_TOKEN: ${{ secrets.SECRET_TOKEN }}
  run: go test -v ./...
```

## Outputs and Notifications

Notifications and artifacts should improve triage, not create noise.

### Slack Notification

```yaml
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Build ${{ job.status }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "Build: ${{ job.status }}\nCommit: ${{ github.sha }}"
            }
          }
        ]
      }
```

### Upload Test Results

```yaml
- name: Upload test results
  uses: dorny/test-reporter@v1
  if: always()
  with:
    name: Go Test Results
    path: '*.out'
    reporter: 'go-test'
```

## Assignment: GitHub Actions Pipeline for Bookshelf

### Goal
Create a production-ready CI workflow for the Bookshelf tutorial app.

This assignment transitions Bookshelf from local checks to enforceable pipeline governance.

### Tasks

1. Add workflow file `.github/workflows/ci.yml` with jobs:
  - `lint`
  - `unit`
  - `integration`
  - `contract`

2. Use Go setup + module caching in every job.

3. Run commands:

```bash
go test -v -race ./...
go test -v ./tests/integration/...
go test -v ./tests/contract/consumer ./tests/contract/provider
```

4. Upload artifacts from CI:
  - coverage report
  - pact files

5. Ensure pull requests fail if any job fails.

### Done Criteria

- A single push triggers all checks.
- PR checks are visible and enforced before merge.

Also ensure failed jobs publish enough diagnostics for quick recovery.

## Deep Dive: Workflow Architecture for Scalable CI

### Background

As projects grow, CI reliability depends on job decomposition, caching discipline, and artifact strategy. Well-structured workflows are easier to debug and evolve.

### Architecture principles

1. Keep jobs single-purpose (`lint`, `unit`, `integration`, `contract`).
2. Reuse setup steps consistently (Go version, cache keys, checkout depth).
3. Upload diagnostics artifacts from failing jobs.
4. Keep sensitive values in repository secrets only.

### Operational safeguards

- Use explicit timeouts per job.
- Pin third-party action versions where possible.
- Add branch protection so required checks gate merge.

### SDET recommendation

Treat CI workflow files as production code: review changes carefully, test in PRs, and document why each gate exists.

## Common Anti-Patterns

- Putting all checks into one monolithic job with poor failure isolation.
- Using floating action versions without review strategy.
- Inconsistent Go versions between jobs causing non-reproducible behavior.
- Missing artifacts/logs for failed integration or contract jobs.

## Quick Workflow Checklist

- Are jobs split by responsibility (`lint`, `unit`, `integration`, `contract`)?
- Are setup and cache patterns consistent across jobs?
- Are action versions pinned and reviewed?
- Are secrets scoped minimally and handled safely?
- Are failure diagnostics uploaded automatically?


