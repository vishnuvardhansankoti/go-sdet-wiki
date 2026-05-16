# Flaky Test Diagnostics

Flaky tests are reliability debt: they slow delivery, reduce trust in CI, and hide real regressions. Effective flake handling requires a repeatable diagnostic process, not ad hoc reruns.

This guide explains how to detect, classify, and permanently fix flaky tests.

## What are Flaky Tests?

Tests that pass inconsistently - sometimes pass, sometimes fail, without code changes.

Treat flakiness as a product quality issue, not just a test inconvenience.

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

Start with reproducible repeated execution, then layer race and parallel stress diagnostics.

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

Use diagnostics to classify root cause before changing test logic.

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

Timeout-based diagnosis helps separate slow infrastructure from coordination bugs.

## Fixing Flaky Tests

Prioritize deterministic synchronization and explicit test seams.

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

Add temporary high-signal logs and remove them once root cause is confirmed.

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

This example shows the core pattern: replace fixed timing assumptions with condition-based waits.

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

Prevention is cheaper than triage. Favor architecture that makes time, randomness, and dependencies controllable in tests.

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

Periodic repeated-run checks are useful for high-risk suites and newly stabilized tests.

```yaml
- name: Detect flaky tests
  run: |
    for i in {1..3}; do
      echo "Run $i"
      go test -v -count=10 ./... || exit 1
    done
```

## Assignment: Stabilize Flaky Bookshelf Tests

### Goal
Identify and fix flaky tests across handler, integration, and contract layers.

This assignment introduces a practical stabilization workflow for the Bookshelf test suite.

### Tasks

1. Run flaky detector locally:

```bash
go test -race -count=30 ./pkg/handler ./pkg/domain
go test -count=10 ./tests/integration/...
```

2. Replace fixed `time.Sleep(...)` usage with eventual checks (`require.Eventually` or retry loops).
3. Ensure tests do not share mutable global state.
4. Add richer diagnostics:
    - `t.Log` timestamps
    - request/response payload on failure
    - container logs in integration failures

### Done Criteria

- Previously flaky tests pass repeatedly across 30 local runs.
- CI can run repeated mode for flaky-prone suites.

Also ensure every fixed flake has a documented root cause category.

## Deep Dive: Flakiness Triage Playbook

### Background

Flaky failures erode confidence in CI and slow delivery. A repeatable triage workflow reduces guesswork and helps teams fix root causes instead of suppressing symptoms.

### Triage sequence

1. Reproduce with repetition (`-count`, `-race`).
2. Classify failure type: timing, shared state, external dependency, ordering.
3. Add temporary diagnostics to isolate state transitions.
4. Replace nondeterministic behavior with controllable test seams.

### High-value remediation actions

- Remove fixed sleeps and wait for explicit conditions.
- Isolate tests from shared global state.
- Make time, randomness, and external calls injectable.
- Capture failure artifacts (logs, payloads, container output).

### SDET recommendation

Track top flaky tests in a team list and prioritize by failure frequency multiplied by pipeline impact.

## Common Anti-Patterns

- Re-running failing tests until green without root-cause analysis.
- Masking nondeterminism with larger fixed sleeps.
- Leaving shared mutable fixtures across tests.
- Disabling flaky tests indefinitely without stabilization plan.

## Quick Flake Triage Checklist

- Can failure be reproduced with `-count` and `-race`?
- Is root cause category identified (timing/state/dependency/order)?
- Were fixed sleeps replaced with explicit condition waits?
- Are external dependencies isolated or controlled?
- Is the stabilization verified with repeated CI-like runs?


