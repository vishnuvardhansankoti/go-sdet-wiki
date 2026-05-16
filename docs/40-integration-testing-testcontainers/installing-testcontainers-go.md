# Installing Testcontainers Go

Installing Testcontainers Go is more than adding one dependency. You are preparing your test runtime to provision real infrastructure consistently across developer machines and CI agents.

This page explains installation with an SDET mindset: predictable setup, fast verification, and clear failure diagnostics.

## Prerequisites

- Go 1.20 or later
- Docker installed and running
- Docker daemon accessible

Why these matter:

- Go version controls module compatibility and build behavior.
- Docker availability determines whether containers can be started at all.
- Daemon accessibility determines whether your test process can control Docker.

## Installation

Keep installation explicit and version-controlled so every contributor runs integration tests in a similar environment.

### 1. Add Package to go.mod

```bash
go get github.com/testcontainers/testcontainers-go
```

This command adds the core Testcontainers library to your module graph.

### 2. Verify Installation

```bash
go list -m github.com/testcontainers/testcontainers-go
```

Verification confirms the module is resolvable and visible to your project.

## Docker Requirements

Testcontainers relies on a healthy Docker runtime. Validate Docker before investigating test code failures.

### Check Docker Installation

```bash
docker version
docker ps
```

If these commands fail, integration tests will fail regardless of Go code quality.

### Starting Docker

**macOS:**
```bash
open /Applications/Docker.app
```

**Linux:**
```bash
sudo systemctl start docker
```

**Windows:**
- Use Docker Desktop

On Windows, ensure Docker Desktop is fully initialized before running tests from terminal/IDE.

## Configuration

Most environments require no custom configuration. Keep defaults first, then only customize for non-standard setups.

### Docker Socket

Most setups work out of the box. For custom Docker configurations:

```go
req := testcontainers.ContainerRequest{
    Image: "postgres:latest",
}
```

Prefer pinned image tags (for example `postgres:15-alpine`) in tests to improve determinism.

### Environment Variables

```bash
export DOCKER_HOST=unix:///var/run/docker.sock
```

Use this only when your Docker daemon endpoint differs from default behavior.

## Optional Dependencies

Use module helpers for common databases to reduce boilerplate and improve clarity.

For specific databases, you may want to import helper modules:

```bash
go get github.com/testcontainers/testcontainers-go/modules/postgres
go get github.com/testcontainers/testcontainers-go/modules/mysql
go get github.com/testcontainers/testcontainers-go/modules/mongodb
```

Only add modules you actively use to keep dependency surface minimal.

## Troubleshooting

Troubleshooting should follow a fixed order: Docker health -> module resolution -> test startup logs.

### "Cannot connect to Docker daemon"

- Ensure Docker is running
- Check Docker socket permissions
- Verify Docker is accessible to your user

In CI, also validate service container/runtime permissions for the build agent.

### Module not found

```bash
go get -u github.com/testcontainers/testcontainers-go
go mod tidy
```

If this persists, check private proxy settings (`GOPROXY`) and network restrictions.

### Version Compatibility

Check [releases](https://github.com/testcontainers/testcontainers-go/releases) for latest version.

Upgrade intentionally and re-run a narrow smoke test before full suite execution.

## Assignment: Install Dependencies for Bookshelf Integration Tests

### Goal
Prepare the Bookshelf project to run Testcontainers-based tests locally and in CI.

This assignment ensures environment readiness before you invest time in heavier integration scenarios.

### Commands

```bash
go get github.com/testcontainers/testcontainers-go
go get github.com/testcontainers/testcontainers-go/modules/postgres
go get github.com/lib/pq
go mod tidy
```

### Local Verification

```bash
docker ps
go test ./tests/integration -v
```

Start with one focused smoke test if full suite runtime is long.

### Done Criteria

- `go.mod` contains testcontainers + postgres module
- Docker is reachable from test process

Also ensure commands run successfully on a clean terminal session.

## Deep Dive: Environment Readiness Checks

### Background

Most first-time failures come from environment mismatches, not test code. Add fast readiness checks before running integration suites.

These checks reduce debugging noise and give faster feedback during onboarding.

### Quick Readiness Script

```bash
docker version
docker ps
go test ./tests/integration -run TestBookshelfPostgresContainer_Starts -v
```

### Common Setup Pitfalls

1. Docker daemon not running.
2. Corporate proxy/firewall blocking image pulls.
3. Old Docker Desktop resource limits.
4. Missing postgres module in go.mod.

5. Stale image cache or pull rate limits on shared networks.

## Common Anti-Patterns

- Installing dependencies without verifying Docker reachability.
- Running full integration suites before a single smoke test passes.
- Using floating image tags that change behavior unexpectedly.
- Skipping `go mod tidy`, leaving module graph inconsistent.

## Quick Setup Checklist

- Docker runs and responds to `docker ps`.
- Testcontainers module resolves from `go.mod`.
- Database helper module is installed (if used).
- A minimal container startup test passes locally.
- Setup instructions are documented for the team.

### Team Practice

Document one shared "integration test prerequisites" section in README so onboarding is predictable.


