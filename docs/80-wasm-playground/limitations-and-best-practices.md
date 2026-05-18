# Limitations and Best Practices

WASM playground quality depends on designing with constraints, not fighting them. Go-in-browser execution is powerful for education, but runtime, security, and platform limits must shape example design.

This page helps you build examples that are reliable, understandable, and production-minded.

## WASM Limitations

Treat limitations as explicit contract boundaries for tutorial content.

### Language Limitations

#### No Direct System Access
```go
// These won't work in WASM
os.Getenv()      // No environment variables
os.Open()        // No file system
net.Dial()       // Limited to same-origin requests
exec.Command()   // No process execution
```

Document these constraints near examples that learners might try to adapt from server-side Go.

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

Concurrency examples should focus on coordination patterns, not throughput assumptions.

#### Memory Constraints
- Maximum 2GB addressable memory (in theory)
- Browser typically limits to available RAM
- No memory mapping

#### Module Size
- Typical WASM modules: 2-5 MB uncompressed
- After gzip: 500 KB - 1 MB
- Cold start time: 100-500ms depending on size

Cold-start variance can significantly affect perceived docs responsiveness.

### Browser Limitations

Browser policy constraints are a frequent source of confusion when examples involve external calls.

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

Best practices here aim to maximize learning value while minimizing runtime fragility.

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

Include browser smoke checks in addition to compile-time checks.

## Common Gotchas

Most gotchas are lifecycle and determinism issues that appear after examples grow in complexity.

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

<div class="go-playground">
  <textarea class="go-code" rows="12">// BAD - infinite goroutine
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
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


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

<div class="go-playground">
  <textarea class="go-code" rows="12">package main

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
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


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

<div class="go-playground">
  <textarea class="go-code" rows="12">package main

import "fmt"

func main() {
    // One-liner examples
    fmt.Println("Hello, World!")
}
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


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

<div class="go-playground">
  <textarea class="go-code" rows="12">package main

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
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


## Monitoring and Debugging

Treat observability as part of docs runtime quality, not an afterthought.

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

Use this as a decision guide for what belongs in browser playgrounds versus local project exercises.

## Deep Dive: Production-minded WASM Documentation

### Background

Interactive docs are part of the product experience. Treating playground pages like production surfaces improves trust and maintainability.

### Production-minded practices

1. Document unsupported APIs and runtime constraints clearly.
2. Normalize outputs so examples remain deterministic.
3. Add fallback messages for unsupported browser environments.
4. Monitor bundle size and startup latency on docs pages.

### Common failure prevention

- Avoid long-running loops without cancellation strategy.
- Prevent memory growth from unmanaged goroutine lifetimes.
- Prefer explicit progress messages for longer computations.

### SDET recommendation

Include browser compatibility checks in regression testing when updating WASM runtime assets.

## Common Anti-Patterns

- Porting server-side examples directly without adapting for browser constraints.
- Using long-running loops without cancellation or progress feedback.
- Ignoring binary size growth and startup latency impact.
- Demonstrating unsupported APIs without clear warning notes.

## Quick WASM Best-Practice Checklist

- Are unsupported capabilities documented where relevant?
- Are examples deterministic and short-running?
- Are module size and compression monitored?
- Are user-facing errors and fallbacks clear?
- Are browser compatibility checks part of regression flow?



## Next Step

Continue with [Capstone Overview](../90-capstone/capstone-overview.md).
