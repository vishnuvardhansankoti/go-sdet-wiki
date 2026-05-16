# Limitations and Best Practices

## WASM Limitations

### Language Limitations

#### No Direct System Access
```go
// These won't work in WASM
os.Getenv()      // No environment variables
os.Open()        // No file system
net.Dial()       // Limited to same-origin requests
exec.Command()   // No process execution
```

#### No OS-Specific APIs
```go
// Won't work
time.LoadLocation()  // Limited timezone support
os.Signal            // No signal handling
syscall              // No system calls
```

#### No CGO
```go
// Not supported
/*
#cgo LDFLAGS: -lm
#include <math.h>
*/
// import "C"
```

### Runtime Limitations

#### Single Threaded
- Only one goroutine can execute at a time
- Concurrency simulated with cooperative scheduling
- No true parallelism

#### Memory Constraints
- Maximum 2GB addressable memory (in theory)
- Browser typically limits to available RAM
- No memory mapping

#### Module Size
- Typical WASM modules: 2-5 MB uncompressed
- After gzip: 500 KB - 1 MB
- Cold start time: 100-500ms depending on size

### Browser Limitations

#### Same-Origin Policy
```go
// Only works for same-origin requests
resp, _ := http.Get("/api/data")       // Works
resp, _ := http.Get("https://api.example.com")  // Fails (unless CORS)
```

#### No WebSocket (Limited Support)
WebSocket support is browser-dependent and limited.

#### No Direct File Upload
File uploads require JavaScript bridge code.

## Best Practices

### 1. Keep Code Small

```go
// Good - focused example
func main() {
    fmt.Println("Fibonacci sequence:")
    for i := 0; i < 10; i++ {
        fmt.Println(fibonacci(i))
    }
}

// Bad - complex dependencies
package main
import "mycompany.com/internal/service"
```

### 2. Avoid Heavy Initialization

```go
// BAD - slow initialization
var complexMap = buildExpensiveMap()  // Blocks on load

// GOOD - lazy initialization
func getMap() map[string]string {
    if m == nil {
        m = buildMap()
    }
    return m
}
```

### 3. Optimize for Download Size

```bash
# Strip debug symbols
GOOS=js GOARCH=wasm go build -ldflags "-s -w" -o main.wasm

# Compress
gzip -k main.wasm

# Result
# main.wasm: 5.2 MB uncompressed
# main.wasm.gz: 800 KB compressed
```

### 4. Handle Async Operations Correctly

```go
// Good - use channels for sync
func main() {
    result := make(chan string)
    
    go func() {
        time.Sleep(1 * time.Second)
        result <- "done"
    }()
    
    fmt.Println(<-result)
}
```

### 5. Provide User Feedback

```go
func main() {
    fmt.Println("Starting computation...")
    
    for i := 0; i < 100; i++ {
        if i%10 == 0 {
            fmt.Printf("Progress: %d%%\n", i)
        }
        doWork()
    }
    
    fmt.Println("Finished!")
}
```

### 6. Test Before Deployment

```bash
# Test locally
GOOS=js GOARCH=wasm go test ./...

# Or build and test in browser
go test -c -o test.exe
```

## Common Gotchas

### Goroutines Don't Exit Automatically

```go
// BAD - infinite goroutine
func main() {
    go func() {
        for {
            time.Sleep(1 * time.Second)
            fmt.Println("Running")
        }
    }()
    // Never returns, program hangs
}

// GOOD - controlled exit
func main() {
    done := make(chan bool)
    
    go func() {
        for i := 0; i < 10; i++ {
            fmt.Println("Running", i)
            time.Sleep(1 * time.Second)
        }
        done <- true
    }()
    
    <-done
}
```

### Time-Based Operations

```go
// WASM time has limited precision
// Don't rely on exact timing for tests

// Instead use counters
counter := 0
for {
    counter++
    if counter > 1000000 {
        break
    }
}
```

### Memory Leaks from Goroutines

```go
// Monitor for goroutine leaks
runtime.NumGoroutine()  // Returns count
```

## Example: Production-Ready Playground

```go
package main

import (
    "fmt"
    "runtime/debug"
    "syscall/js"
)

func init() {
    debug.SetMaxStack(1 << 20)  // Limit stack
}

func main() {
    fmt.Println("Ready")
    
    // Expose function to JavaScript
    js.Global().Set("runAlgorithm", js.FuncOf(func(this js.Value, args []js.Value) interface{} {
        input := args[0].Int()
        result := fibonacci(input)
        return result
    }))
    
    // Block forever
    select {}
}

func fibonacci(n int) int {
    if n <= 1 {
        return n
    }
    return fibonacci(n-1) + fibonacci(n-2)
}
```

## Documentation Examples

### For Simple Concepts

```go
package main

import "fmt"

func main() {
    // One-liner examples
    fmt.Println("Hello, World!")
}
```

### For Complex Topics

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

func main() {
    // Show real-world pattern
    var wg sync.WaitGroup
    
    for i := 1; i <= 5; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            fmt.Printf("Worker %d started\n", id)
            time.Sleep(time.Duration(id*100) * time.Millisecond)
            fmt.Printf("Worker %d finished\n", id)
        }(i)
    }
    
    wg.Wait()
    fmt.Println("All workers done!")
}
```

## Monitoring and Debugging

### Browser DevTools

- Use Chrome DevTools JavaScript console
- Inspect WASM module in Sources tab
- Profile execution in Performance tab

### Logging to JavaScript Console

```go
import "syscall/js"

func log(message string) {
    js.Global().Get("console").Call("log", message)
}
```

## Conclusion

- WASM is excellent for interactive documentation
- Keep examples focused and simple
- Test thoroughly before publishing
- Compress for faster download
- Document limitations for users
