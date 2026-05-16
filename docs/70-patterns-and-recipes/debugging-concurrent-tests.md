# Debugging Concurrent Tests

## Challenges with Concurrent Tests

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

## Race Detection

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

## Debugging Goroutine Issues

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

## Debugging Channels

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
