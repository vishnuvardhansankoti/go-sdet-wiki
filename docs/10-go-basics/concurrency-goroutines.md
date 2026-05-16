# Concurrency: Goroutines

## What are Goroutines?

Goroutines are lightweight threads managed by the Go runtime. They're much cheaper than OS threads.

## Creating Goroutines

```go
go functionName()
```

## Example

```go
func say(s string) {
    for i := 0; i < 5; i++ {
        fmt.Println(s)
        time.Sleep(100 * time.Millisecond)
    }
}

func main() {
    go say("Hello")
    say("World")
}
```

## Waiting for Goroutines

### Using time.Sleep (Not Recommended)

```go
go say("Hello")
time.Sleep(1 * time.Second)
```

### Using sync.WaitGroup (Recommended)

```go
var wg sync.WaitGroup

wg.Add(2)
go func() {
    defer wg.Done()
    fmt.Println("Goroutine 1")
}()

go func() {
    defer wg.Done()
    fmt.Println("Goroutine 2")
}()

wg.Wait()
```

## Race Conditions

Use the race detector:

```bash
go run -race main.go
go test -race ./...
```

## Synchronization Primitives

- **sync.Mutex**: Mutual exclusion lock
- **sync.RWMutex**: Read-write lock
- **sync.Cond**: Condition variable
- **sync.Once**: Execute exactly once
