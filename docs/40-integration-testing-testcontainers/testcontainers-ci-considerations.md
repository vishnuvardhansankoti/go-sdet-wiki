# Testcontainers CI Considerations

## Running Tests in CI/CD

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

## Docker-in-Docker (DinD)

For running Testcontainers in CI containers:

```yaml
services:
  docker:
    image: docker:dind
    options: --privileged

steps:
  - run: go test -v ./...
```

## Performance Optimization

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

## Resource Limits

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

### Timeouts

```go
wait.ForListeningPort("5432/tcp").WithTimeout(30 * time.Second)
```

### Health Checks

```go
wait.ForLog("ready to accept connections").WithOccurrence(2)
```

## Cost Optimization for CI

1. **Cache Docker Images**: Pull images once, reuse
2. **Parallel Tests**: Use `t.Parallel()`
3. **Test Timeouts**: Set reasonable timeouts
4. **Cleanup**: Always cleanup containers

## Debugging CI Failures

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

### Save Logs from Failed Tests

```bash
docker logs <container-id> > /tmp/container.log
```

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

## Monitoring and Alerts

- Monitor CI test duration trends
- Alert on repeated failures
- Track container startup times
- Monitor Docker daemon health
