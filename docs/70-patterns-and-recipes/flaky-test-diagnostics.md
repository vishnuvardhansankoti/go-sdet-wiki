# Flaky Test Diagnostics

## What are Flaky Tests?

Tests that pass inconsistently - sometimes pass, sometimes fail, without code changes.

## Common Causes

### Concurrency Issues
- Race conditions
- Unordered map iteration
- Goroutine timing issues

### External Dependencies
- Network timeouts
- Database connection issues
- Service availability

### Timing Issues
- Insufficient wait time
- Race conditions with time
- Sleep durations too short

### Resource Issues
- Insufficient file handles
- Memory limitations
- Port conflicts

## Detection Strategies

### Repeated Execution

```bash
# Run test 10 times
for i in {1..10}; do
    go test -run TestFlaky ./...
done
```

### With Race Detector

```bash
go test -race -count=10 ./...
```

### Stress Testing

```bash
go test -run TestFlaky -count=100 -parallel=4 ./...
```

## Diagnosis Tools

### pprof for Goroutine Issues

```go
import _ "net/http/pprof"

func TestGoroutineLeaks(t *testing.T) {
    before := runtime.NumGoroutine()
    
    // Test code
    
    runtime.GC()
    after := runtime.NumGoroutine()
    
    if after > before+1 {
        t.Errorf("goroutine leak detected: %d -> %d", before, after)
    }
}
```

### Timeout Issues

```go
func TestWithTimeout(t *testing.T) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    // Test with context timeout
    result := someAsyncOperation(ctx)
    if result == nil {
        t.Error("operation timed out")
    }
}
```

## Fixing Flaky Tests

### Use testify/require for Assertions

```go
import "github.com/stretchr/testify/require"

func TestFlaky(t *testing.T) {
    result := getSomeValue()
    require.NotNil(t, result)  // Stops immediately on failure
}
```

### Proper Waiting

```go
// Bad - fixed sleep
time.Sleep(100 * time.Millisecond)

// Good - wait for condition
require.Eventually(t, func() bool {
    return service.IsReady()
}, 5*time.Second, 100*time.Millisecond)
```

### Use testify/assert for Complex Conditions

```go
import "github.com/stretchr/testify/assert"

func TestOrderProcessing(t *testing.T) {
    order := processOrder()
    
    assert.Equal(t, "completed", order.Status)
    assert.Equal(t, 99.99, order.Total)
    assert.NotNil(t, order.ConfirmedAt)
}
```

## Debugging Flaky Tests

### Add Logging

```go
func TestWithLogging(t *testing.T) {
    t.Logf("Starting test at %v", time.Now())
    
    result, err := someOperation()
    
    t.Logf("Operation completed with result: %v, error: %v", result, err)
    
    if err != nil {
        t.Fatalf("operation failed: %v", err)
    }
}
```

### Capture Goroutine Stack Traces

```go
import "runtime/debug"

func TestGoroutineStack(t *testing.T) {
    defer func() {
        if t.Failed() {
            debug.PrintStack()
        }
    }()
    
    // Test code
}
```

## Example: Fixing a Flaky Database Test

### Before (Flaky)

```go
func TestUserCreation(t *testing.T) {
    user := createUser("John")
    
    // Race condition - query might run before write completes
    retrieved, err := getUser(user.ID)
    require.NoError(t, err)
    require.Equal(t, "John", retrieved.Name)
}
```

### After (Fixed)

```go
func TestUserCreation(t *testing.T) {
    user := createUser("John")
    
    // Wait for user to be retrievable
    require.Eventually(t, func() bool {
        retrieved, err := getUser(user.ID)
        if err != nil {
            return false
        }
        return retrieved.Name == "John"
    }, 2*time.Second, 100*time.Millisecond)
}
```

## Preventing Flaky Tests

### Use Dependency Injection

```go
type Service struct {
    clock Clock  // Mockable clock
}

func NewService(clock Clock) *Service {
    return &Service{clock: clock}
}
```

### Control Time in Tests

```go
type MockClock struct {
    now time.Time
}

func (m *MockClock) Now() time.Time {
    return m.now
}

func (m *MockClock) Sleep(d time.Duration) {
    m.now = m.now.Add(d)
}
```

### Isolate External Dependencies

```go
func TestWithMockedAPI(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        fmt.Fprint(w, `{"id":1,"name":"John"}`)
    }))
    defer server.Close()
    
    client := NewAPIClient(server.URL)
    user, err := client.GetUser(1)
    
    require.NoError(t, err)
    require.Equal(t, "John", user.Name)
}
```

## Monitoring in CI

```yaml
- name: Detect flaky tests
  run: |
    for i in {1..3}; do
      echo "Run $i"
      go test -v -count=10 ./... || exit 1
    done
```
