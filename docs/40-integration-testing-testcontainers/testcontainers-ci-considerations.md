# Testcontainers CI Considerations

Running Testcontainers in CI requires balancing reliability, runtime, and cost. Integration jobs are often the most realistic checks in your pipeline, but also the most resource-sensitive.

This guide explains how to keep container-based tests stable and actionable in automated environments.

## Running Tests in CI/CD

Start with a minimal workflow that installs Go, checks out code, and runs tests with explicit timeout boundaries.

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Run tests with Testcontainers
        run: go test -v -race -timeout 10m ./...
```

For larger repositories, split fast unit checks and heavier integration checks into separate jobs.

## Docker-in-Docker (DinD)

DinD is sometimes required in containerized CI runners, but it adds complexity and should be used deliberately.

For running Testcontainers in CI containers:

```yaml
services:
  docker:
    image: docker:dind
    options: --privileged

steps:
  - run: go test -v ./...
```

Prefer native Docker-capable runners when available, since they are often simpler and faster.

## Performance Optimization

Optimize for stable feedback first, then reduce runtime and cost.

### Reuse Containers

```go
const skipCleanup = os.Getenv("TESTCONTAINERS_SKIP_CLEANUP") != ""

func setupDatabase(t *testing.T) *sql.DB {
    // Setup code
    
    if !skipCleanup {
        t.Cleanup(func() {
            container.Terminate(ctx)
        })
    }
}
```

Use reuse/skip-cleanup controls cautiously. They can improve speed but may increase cross-test state risk.

### Parallel Test Execution

```bash
go test -parallel 4 ./...
```

```go
func TestDatabaseOperations(t *testing.T) {
    t.Parallel()
    // Test code
}
```

Parallelization must match runner CPU/memory limits to avoid noisy failures.

## Resource Limits

Resource constraints prevent runaway jobs and improve CI predictability.

### Container Resource Constraints

```go
req := testcontainers.ContainerRequest{
    Image: "postgres:15",
    HostConfigModifier: func(hc *container.HostConfig) {
        hc.Memory = 512 * 1024 * 1024  // 512MB
        hc.MemorySwap = 512 * 1024 * 1024
        hc.CPUQuota = 100000
    },
}
```

## Network Issues

Container startup and network readiness are common CI flake sources.

### Timeouts

```go
wait.ForListeningPort("5432/tcp").WithTimeout(30 * time.Second)
```

Set timeouts intentionally for CI variance, not just local machine speed.

### Health Checks

```go
wait.ForLog("ready to accept connections").WithOccurrence(2)
```

Use health conditions that reflect real readiness, not just process start.

## Cost Optimization for CI

1. **Cache Docker Images**: Pull images once, reuse
2. **Parallel Tests**: Use `t.Parallel()`
3. **Test Timeouts**: Set reasonable timeouts
4. **Cleanup**: Always cleanup containers

## Debugging CI Failures

Diagnostics should be first-class in integration pipelines.

### Enable Container Logs

```go
req := testcontainers.ContainerRequest{
    Image: "postgres:15",
    LogConsumerCfg: &testcontainers.LogConsumerConfig{
        Consumers: []testcontainers.LogConsumer{
            &testcontainers.StdoutLogConsumer{},
        },
    },
}
```

Log capture drastically reduces mean-time-to-resolution for intermittent failures.

### Save Logs from Failed Tests

```bash
docker logs <container-id> > /tmp/container.log
```

In CI, publish logs as artifacts so failures are diagnosable post-run.

## Environment-Specific Configuration

```go
func isCI() bool {
    return os.Getenv("CI") != ""
}

func getTestTimeout() time.Duration {
    if isCI() {
        return 30 * time.Second
    }
    return 10 * time.Second
}
```

Keep CI-specific tuning centralized to avoid hidden environment conditionals spread across tests.

## Monitoring and Alerts

- Monitor CI test duration trends
- Alert on repeated failures
- Track container startup times
- Monitor Docker daemon health

## Assignment: CI Job for Bookshelf Integration Tests

### Goal
Run container-based integration tests in GitHub Actions reliably.

This assignment formalizes integration checks as a visible quality gate in pull requests.

### Tasks

1. Create workflow file `.github/workflows/integration-tests.yml`.
2. Add separate job for integration tests:

```yaml
name: Bookshelf Integration Tests

on:
    pull_request:
    push:
        branches: [ main ]

jobs:
    integration:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-go@v5
              with:
                go-version: "1.23"
            - name: Run integration tests
              run: go test -v -timeout 15m ./tests/integration/...
```

3. Keep unit tests and integration tests as separate jobs.

### Done Criteria

- PRs show explicit integration test status
- Timeout is high enough for container startup variability

Also ensure failed runs provide logs/artifacts for rapid triage.

## Deep Dive: CI Stability and Cost Control

### Background

Container-based tests can be the most expensive part of CI. Stability and cost optimization should be designed together.

Reliable pipelines are cheaper in practice because they reduce reruns and debugging churn.

### Stability Practices

1. Separate unit and integration jobs.
2. Use explicit test timeouts.
3. Capture container logs on failure.
4. Avoid over-parallelization when Docker resources are limited.

5. Keep integration suite scope focused on behaviors requiring real infrastructure.

### Cost Practices

1. Trigger integration jobs on PR and main only.
2. Reuse pulled images via CI cache where possible.
3. Keep integration suites scoped to behavior that truly needs real infrastructure.

### Example Failure Artifact Step

```yaml
- name: Upload integration diagnostics
    if: failure()
    uses: actions/upload-artifact@v4
    with:
        name: integration-diagnostics
        path: |
            **/test-results/*.log
            **/coverage-integration.out
```

### SDET KPI Ideas

- Integration job pass rate
- Median integration runtime
- Container startup duration trend

## Common Anti-Patterns

- Running all tests in one monolithic CI job.
- Missing timeout boundaries for long-running integration suites.
- Failing without publishing container/test diagnostics.
- Aggressive parallelization on under-provisioned runners.

## Quick CI Readiness Checklist

- Are unit and integration jobs separated?
- Are timeouts explicit and realistic?
- Are container logs captured on failures?
- Are runner resource limits considered for parallel tests?
- Is integration scope limited to high-value infrastructure behaviors?


