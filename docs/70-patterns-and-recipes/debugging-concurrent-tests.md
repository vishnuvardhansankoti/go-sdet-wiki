# Debugging Concurrent Tests

Concurrent test debugging is about making nondeterministic behavior observable and controllable. Races, deadlocks, and goroutine leaks often hide until load or timing changes expose them.

This guide focuses on practical diagnostics that convert intermittent concurrency failures into repeatable findings.

## Challenges with Concurrent Tests

Concurrency failures usually involve ordering assumptions that are not encoded explicitly in tests.

### Race Conditions

Data races occur when multiple goroutines access the same memory without synchronization.

```bash
# Detect races
go test -race ./...
```

### Deadlocks

Goroutines waiting indefinitely for resources.

### Timeout Issues

Tests take longer with concurrency.

Long runtimes are often a symptom of coordination bugs, not just slow code.

## Race Detection

Race detection should be part of regular local and CI runs for concurrency-heavy packages.

### Enable Race Detector

```bash
go test -race ./...
go run -race main.go
```

### Example Race Condition

```go
// BAD - Data race
var counter int

func TestRace(t *testing.T) {
    go func() { counter++ }()
    go func() { counter++ }()
    
    time.Sleep(100 * time.Millisecond)
    if counter != 2 {
        t.Errorf("counter = %d; want 2", counter)
    }
}

// GOOD - Synchronized
var counter int
var mu sync.Mutex

func TestRaceSafe(t *testing.T) {
    go func() {
        mu.Lock()
        counter++
        mu.Unlock()
    }()
    go func() {
        mu.Lock()
        counter++
        mu.Unlock()
    }()
    
    time.Sleep(100 * time.Millisecond)
    if counter != 2 {
        t.Errorf("counter = %d; want 2", counter)
    }
}
```

The key fix is synchronization around shared mutable state and deterministic completion signaling.

## Debugging Goroutine Issues

Goroutine lifecycle checks are critical for finding leaks and blocked workers.

### Goroutine Leaks

```go
import "runtime"

func TestNoGoroutineLeaks(t *testing.T) {
    before := runtime.NumGoroutine()
    
    // Test code with goroutines
    doAsyncWork()
    
    // Give goroutines time to finish
    time.Sleep(100 * time.Millisecond)
    
    after := runtime.NumGoroutine()
    
    if after > before {
        t.Errorf("goroutine leak: before=%d, after=%d", before, after)
    }
}
```

### Print Stack Traces

```go
import "runtime/debug"

func TestWithStackTrace(t *testing.T) {
    defer func() {
        if r := recover(); r != nil {
            debug.PrintStack()
            t.Fatalf("panic: %v", r)
        }
    }()
    
    // Test code
}
```

Stack traces are especially useful when test failures only occur in CI timing conditions.

## Debugging Channels

Channel bugs are often coordination bugs. Validate sender/receiver ownership explicitly.

### Unbuffered Channel Deadlock

```go
// BAD - Deadlock
func TestChannelDeadlock(t *testing.T) {
    ch := make(chan int)  // Unbuffered
    
    ch <- 1  // Blocks - no receiver
    val := <-ch  // Never reached
    
    if val != 1 {
        t.Error("wrong value")
    }
}

// GOOD - With goroutine
func TestChannelSafe(t *testing.T) {
    ch := make(chan int)
    
    go func() {
        ch <- 1
    }()
    
    val := <-ch
    if val != 1 {
        t.Error("wrong value")
    }
}
```

## Timeout Handling

Timeouts should be explicit and tied to expected operation boundaries.

### Set Test Timeout

```bash
go test -timeout 30s ./...
```

### Per-Test Timeout with Context

```go
func TestWithTimeout(t *testing.T) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    result := make(chan string)
    
    go func() {
        time.Sleep(2 * time.Second)
        result <- "done"
    }()
    
    select {
    case <-ctx.Done():
        t.Fatalf("timeout: %v", ctx.Err())
    case res := <-result:
        if res != "done" {
            t.Errorf("unexpected result: %s", res)
        }
    }
}
```

## Testing Concurrent Operations

Use scenario-based concurrency ranges to validate behavior under realistic worker counts.

### Table-Driven Concurrent Test

```go
func TestConcurrentOperations(t *testing.T) {
    tests := []struct {
        name      string
        workers   int
        operations int
    }{
        {"single worker", 1, 10},
        {"multiple workers", 5, 10},
        {"high concurrency", 100, 100},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            var wg sync.WaitGroup
            results := make(chan int, tt.workers)
            
            for i := 0; i < tt.workers; i++ {
                wg.Add(1)
                go func(id int) {
                    defer wg.Done()
                    for j := 0; j < tt.operations; j++ {
                        results <- id*tt.operations + j
                    }
                }(i)
            }
            
            wg.Wait()
            close(results)
            
            count := len(results)
            expected := tt.workers * tt.operations
            
            if count != expected {
                t.Errorf("processed %d items; want %d", count, expected)
            }
        })
    }
}
```

## Debugging Tool: pprof

Profiling helps distinguish CPU contention from blocked concurrency paths.

### Generate CPU Profile

```go
import _ "net/http/pprof"

func TestWithProfile(t *testing.T) {
    f, _ := os.Create("cpu.prof")
    pprof.StartCPUProfile(f)
    defer pprof.StopCPUProfile()
    
    // Test code
    
    // View: go tool pprof cpu.prof
}
```

## Best Practices

- Run tests with `-race` flag always
- Use `sync.WaitGroup` for coordination
- Use channels for communication
- Set reasonable timeouts
- Avoid busy-wait loops
- Use `select` with timeout
- Test concurrent code multiple times
- Keep concurrent tests focused

Additional guidance:

- Prefer explicit completion channels over fixed sleeps.
- Keep shared state ownership clear by design.
- Add repeated-run commands for intermittent failure detection.

## Assignment: Debug Bookshelf Bulk Import Concurrency

### Goal
Harden concurrent tests around `BulkImportService` and eliminate race/deadlock risks.

This assignment creates a durable confidence layer for Bookshelf concurrency behavior.

### Tasks

1. Add `pkg/domain/bulk_import_concurrency_test.go`.
2. Stress test parallel import with multiple worker counts.
3. Add timeout-safe test using context and `select`.
4. Add goroutine leak check around import calls.

Run commands:

```bash
go test -race -count=20 ./pkg/domain -run TestBulkImport
go test -v -timeout=30s ./pkg/domain -run TestBulkImport
```

### Done Criteria

- No race detector failures.
- No deadlock/timeout under repeated runs.
- Tests are deterministic across 20 runs.

Also ensure failures include enough context (worker count, operation count, timeout path) for quick triage.

## Deep Dive: Concurrency Test Reliability Model

### Background

Concurrent tests fail in non-obvious ways: races, deadlocks, starvation, and leak accumulation. Robust tests coordinate explicitly and observe lifecycle boundaries.

### Reliability checklist

1. Use `WaitGroup` or channel completion signaling for goroutine lifecycle.
2. Guard shared mutable state with mutexes or channel ownership.
3. Use `context` and `select` for cancellation-safe waits.
4. Include test-level timeout boundaries.

### Failure forensics hints

- Race detector output usually points to real shared-state design flaws.
- Hanging tests usually indicate missing receiver/sender coordination.
- Goroutine growth over repeated runs suggests leak or blocked workers.

### SDET recommendation

Run critical concurrency suites with both `-race` and repeated execution in CI to detect intermittent hazards early.

## Common Anti-Patterns

- Using fixed `time.Sleep` as synchronization logic.
- Sharing mutable state without ownership or locking policy.
- Running high-parallel tests without timeout boundaries.
- Ignoring goroutine count growth between repeated test runs.

## Quick Concurrency Debug Checklist

- Is shared state synchronized or ownership-based?
- Are goroutine lifecycles explicitly awaited?
- Are channel send/receive paths guaranteed to complete?
- Are timeouts and cancellation paths covered?
- Do repeated `-race` runs stay stable?


