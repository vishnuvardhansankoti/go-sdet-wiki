# Channels and Select

Channels are Go's primary coordination primitive for passing typed data between goroutines with built-in synchronization. For SDETs, channel patterns power safe parallel test execution, timeout-bounded API probes, and fan-out result collection.

## Channels

Channels are Go's primary mechanism for safe communication between goroutines. They provide synchronized, type-safe message passing without explicit locks or condition variables.

### Why Use Channels?

Channels solve the fundamental problem of concurrent programming: **how do you safely pass data between goroutines without race conditions?**

**Key Benefits:**

- **Thread-safe communication** without explicit locks
- **Synchronization** - the sender blocks until receiver is ready (unbuffered channels)
- **Decoupling** - producers don't need to know about consumers
- **Goroutine orchestration** - coordinate multiple concurrent tasks
- **Preventing race conditions** - data is passed by value, not shared

### Unbuffered vs Buffered Channels

The first distinction to understand is whether a channel is unbuffered or buffered. This changes not only performance characteristics, but also how tightly two goroutines are synchronized.

**Unbuffered Channels (Synchronous):**
- Sender blocks until receiver is ready
- Receiver blocks until sender has data
- Creates a synchronization point
- Use when you want to ensure both sides are ready

An unbuffered channel acts like a direct handoff. The send and receive must meet each other. That makes unbuffered channels useful when you want communication and synchronization at the same time.

In practice, this means:

- the sender cannot "drop off" a value and continue later
- the receiver cannot continue until another goroutine provides a value
- the handoff itself proves both goroutines reached that point in the workflow

```go
ch := make(chan int)  // Unbuffered - creates a rendezvous point
ch <- 42              // Sender waits here until someone receives
value := <-ch         // Receiver waits here until someone sends
```

**Buffered Channels (Asynchronous):**
- Sender only blocks when buffer is full
- Receiver only blocks when buffer is empty
- Allows producer/consumer decoupling
- Use when you want looser coupling

A buffered channel includes a small queue. Sends can proceed without an immediate receiver as long as there is room in the buffer.

This is helpful when producers and consumers run at different speeds. For example, a fast producer can enqueue some work while slower workers catch up.

Buffered channels do not remove synchronization completely. They delay it. Once the buffer is full, sends block again. Once the buffer is empty, receives block again.

```go
ch := make(chan int, 10)  // Buffered with capacity 10
ch <- 1                   // Doesn't block (buffer not full)
ch <- 2                   // Doesn't block
value := <-ch             // Receives 1
```

As a rule of thumb:

- use unbuffered channels when you want a direct handshake between goroutines
- use buffered channels when you want a bounded queue between producers and consumers
- do not add a buffer unless you can explain what backlog it is meant to absorb

### Creating Channels

Channels are created with `make`, just like slices and maps. The channel's type tells you what values can move through it, and the optional buffer size tells you whether the channel is buffered.

Every channel has two key properties:

- element type: what kind of value it carries, such as `int`, `string`, or a struct
- capacity: how many values can wait in the channel before sends block

You will most often create a bidirectional channel and then pass it to functions as send-only or receive-only when you want the type system to enforce correct usage.

```go
// Unbuffered channel - requires both sender and receiver ready
ch := make(chan int)

// Buffered channel - can hold up to 10 values
ch := make(chan string, 10)

// Bidirectional channel passed into narrower views
full := make(chan int)

// Receive-only channel view (cannot send)
var readCh <-chan int = full

// Send-only channel view (cannot receive)
var writeCh chan<- int = full
```

Directional channels are especially useful in function signatures because they communicate intent clearly:

- `<-chan T` means the function only reads from the channel
- `chan<- T` means the function only writes to the channel
- `chan T` means the function can do both

This makes APIs safer. For example, a worker that should only consume jobs should accept `<-chan Job`, not `chan Job`.

### Sending and Receiving

Sending and receiving are the two basic channel operations.

- `ch <- value` sends a value into the channel
- `value := <-ch` receives the next value from the channel

Both operations may block depending on whether the channel is buffered and whether another goroutine is ready.

```go
// Send value to channel
ch <- 42

// Receive value from channel (blocks until available)
value := <-ch

// Receive with ok flag (checks if channel is closed)
value, ok := <-ch
if !ok {
    fmt.Println("Channel is closed")
}

// Iterate over channel until closed
for value := range ch {
    fmt.Println("Received:", value)
}
```

Important behavior to understand:

- sending on an unbuffered channel waits for a receiver
- receiving from an unbuffered channel waits for a sender
- sending on a buffered channel waits only when the buffer is full
- receiving from a buffered channel waits only when the buffer is empty

The `value, ok := <-ch` form is important when channels may be closed. If `ok` is `false`, the channel is closed and no more values will arrive.

The `for value := range ch` form keeps receiving until the channel is closed. This is the most common pattern for consumer goroutines.

Two channel rules are easy to get wrong:

- sending on a closed channel causes a panic
- receiving from a closed channel is allowed; it returns the zero value after buffered values are drained

Closing a channel usually means "no more values will be sent." It does not mean "discard everything immediately."

The usual convention is that the sender closes the channel, because the sender knows when production is finished.

## Common Channel Patterns

Channels become most useful when they structure a recurring coordination pattern instead of isolated sends and receives. In Go, a few patterns appear repeatedly because they solve common concurrency problems cleanly.

### 1. Worker Pool Pattern

The worker pool pattern uses multiple goroutines to consume jobs from the same channel. This lets you process many tasks concurrently while controlling how many workers run at once.

The core idea is:

- one part of the program produces jobs
- a fixed number of workers read from the jobs channel
- workers send results to another channel
- closing the jobs channel tells workers there is no more input

Distribute work across multiple goroutines efficiently:

```go
func worker(id int, jobs <-chan int, results chan<- int) {
    for job := range jobs {
        fmt.Printf("Worker %d processing job %d\n", id, job)
        time.Sleep(time.Second)  // Simulate work
        results <- job * 2
    }
}

func main() {
    const numWorkers = 3
    jobs := make(chan int, 10)
    results := make(chan int, 10)
    
    // Start worker goroutines
    for w := 1; w <= numWorkers; w++ {
        go worker(w, jobs, results)
    }
    
    // Send jobs
    go func() {
        for j := 1; j <= 10; j++ {
            jobs <- j
        }
        close(jobs)  // Signal workers that no more jobs
    }()
    
    // Collect results
    for r := 0; r < 10; r++ {
        fmt.Println("Result:", <-results)
    }
}

// Output:
// Worker 1 processing job 1
// Worker 2 processing job 2
// Worker 3 processing job 3
// Result: 2
// Result: 4
// Result: 6
// ...
```

This pattern is a good fit when you have many similar tasks and want bounded concurrency rather than launching one goroutine per task without limits.

For SDETs, this is useful for running batches of API checks, test data validations, or browser tasks with a fixed worker count so you do not overload the target system.

**Real-World Example:** Nightly API regression across 300 endpoints. Push endpoint test jobs into `jobs`, run 10 workers to avoid rate-limit spikes, and collect pass/fail payloads on `results` for a final report.

<div class="go-playground">
    <textarea class="go-code" rows="12">package main

import (
        "fmt"
        "time"
)

func worker(id int, jobs <-chan int, results chan<- int) {
    for job := range jobs {
        fmt.Printf("Worker %d processing job %d\n", id, job)
        time.Sleep(time.Second)  // Simulate work
        results <- job * 2
    }
}

func main() {
    const numWorkers = 3
    jobs := make(chan int, 10)
    results := make(chan int, 10)
    
    // Start worker goroutines
    for w := 1; w <= numWorkers; w++ {
        go worker(w, jobs, results)
    }
    
    // Send jobs
    go func() {
        for j := 1; j <= 10; j++ {
            jobs <- j
        }
        close(jobs)  // Signal workers that no more jobs
    }()
    
    // Collect results
    for r := 0; r < 10; r++ {
        fmt.Println("Result:", <-results)
    }
}

// Output:
// Worker 1 processing job 1
// Worker 2 processing job 2
// Worker 3 processing job 3
// Result: 2
// Result: 4
// Result: 6
// ...
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


**Use Case:** SDET testing with multiple parallel test runners processing test cases from a queue.

### 2. Pipeline Pattern

The pipeline pattern breaks processing into stages. Each stage reads from an input channel, transforms or filters the data, and sends results to an output channel.

This works well when work naturally happens in steps, such as:

- fetch data
- transform it
- validate it
- store or report the result

Each stage can run in its own goroutine, which keeps the program modular and lets stages overlap in time.

Pass data through multiple stages, each processing in separate goroutines:

```go
// Stage 1: Generate numbers
func generate(max int) <-chan int {
    out := make(chan int)
    go func() {
        for i := 1; i <= max; i++ {
            out <- i
        }
        close(out)
    }()
    return out
}

// Stage 2: Square numbers
func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for num := range in {
            out <- num * num
        }
        close(out)
    }()
    return out
}

// Stage 3: Filter even numbers
func filterEven(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for num := range in {
            if num%2 == 0 {
                out <- num
            }
        }
        close(out)
    }()
    return out
}

func main() {
    // Chain the pipeline
    numbers := generate(10)
    squares := square(numbers)
    evens := filterEven(squares)
    
    for num := range evens {
        fmt.Println(num)  // 4, 16, 36, 64, 100
    }
}
```

One major advantage of pipelines is separation of responsibilities. Each function handles one stage and exposes a simple channel-based contract.

When building pipelines, remember to close the output channel when the stage is done producing values. Otherwise, downstream receivers waiting with `range` can block forever.

**Real-World Example:** Test data certification flow in CI:

- Stage 1 reads rows from CSV test fixtures
- Stage 2 normalizes fields (dates, enums, IDs)
- Stage 3 validates schema/business rules
- Final stage writes only valid records to a seed file used by integration tests

<div class="go-playground">
    <textarea class="go-code" rows="12">package main

import "fmt"

// Stage 1: Generate numbers
func generate(max int) <-chan int {
    out := make(chan int)
    go func() {
        for i := 1; i <= max; i++ {
            out <- i
        }
        close(out)
    }()
    return out
}

// Stage 2: Square numbers
func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for num := range in {
            out <- num * num
        }
        close(out)
    }()
    return out
}

// Stage 3: Filter even numbers
func filterEven(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for num := range in {
            if num%2 == 0 {
                out <- num
            }
        }
        close(out)
    }()
    return out
}

func main() {
    // Chain the pipeline
    numbers := generate(10)
    squares := square(numbers)
    evens := filterEven(squares)
    
    for num := range evens {
        fmt.Println(num)  // 4, 16, 36, 64, 100
    }
}
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


## Advanced Select Patterns and Troubleshooting

### Cancellation with done Channel

```go
func producer(done <-chan struct{}, out chan<- int) {
    defer close(out)
    for i := 0; i < 1000; i++ {
        select {
        case <-done:
            return
        case out <- i:
        }
    }
}
```

### Backpressure Awareness

Buffered channels are queues, not unlimited storage. If consumers are slow, producers will eventually block. This is useful because it naturally applies backpressure and prevents runaway memory growth.

### Debugging Checklist

1. Check for sends on channels with no receiver.
2. Check for receives on never-written channels.
3. Ensure channels are closed by the producer side.
4. Avoid double-close panics.
5. Add timeout `select` cases in tests.

### SDET Example: Multiplexing Test Result Streams

Use one channel for pass events, one for fail events, and a timeout case to avoid hanging test orchestrators.

### 3. Fan-Out / Fan-In Pattern

The fan-out / fan-in pattern is a two-phase concurrency strategy:

- **Fan-Out:** Distribute the same work items to many goroutines running in parallel
- **Fan-In:** Collect results from all those goroutines back into a single channel

This is essential when you need to parallelize independent tasks and then wait for all of them to complete before proceeding.

**When to Use Fan-Out / Fan-In:**

1. **Parallel test scenarios:** Run the same test case against multiple environments (dev, staging, prod)
2. **Multi-target health checks:** Ping multiple endpoints and collect status
3. **Cross-browser testing:** Execute the same automation script on Chrome, Firefox, Safari
4. **Batch validations:** Validate a large dataset by splitting it across worker goroutines
5. **Load test spike:** Launch many concurrent requests and aggregate response times

**How It Works:**

```go
func worker(id int, job string) string {
    fmt.Printf("Worker %d handling: %s\n", id, job)
    time.Sleep(time.Duration(rand.Intn(100)) * time.Millisecond)
    return fmt.Sprintf("Result from worker %d", id)
}

func fanOut(jobs []string) <-chan string {
    out := make(chan string, len(jobs))
    for i, job := range jobs {
        go func(id int, j string) {
            out <- worker(id, j)
        }(i+1, job)
    }
    return out
}

func main() {
    jobs := []string{"test1", "test2", "test3", "test4", "test5"}
    results := fanOut(jobs)
    
    for range jobs {
        fmt.Println(<-results)
    }
}
```

**Key Points:**

- **Unbuffered vs Buffered:** The example uses a buffered channel with capacity = number of jobs. This allows all goroutines to send without blocking on each other
- **Order doesn't matter:** Results arrive in any order (whichever goroutine finishes first)
- **Wait for all:** The `for range jobs` loop reads exactly as many results as jobs sent—no more, no less
- **Goroutine count equals job count:** Each job gets its own goroutine (no worker pool)

**Fan-Out + Fan-In with Error Handling:**

A more realistic version that collects both success and error results:

```go
type Result struct {
    ID    string
    Value string
    Err   error
}

func processJob(id string) (string, error) {
    // Simulate work that may fail
    if rand.Intn(3) == 0 {
        return "", fmt.Errorf("failed to process %s", id)
    }
    return fmt.Sprintf("result for %s", id), nil
}

func fanOutWithErrors(jobIDs []string) <-chan Result {
    out := make(chan Result, len(jobIDs))
    for _, id := range jobIDs {
        go func(jobID string) {
            value, err := processJob(jobID)
            out <- Result{ID: jobID, Value: value, Err: err}
        }(id)
    }
    return out
}

func main() {
    jobs := []string{"job1", "job2", "job3", "job4", "job5"}
    results := fanOutWithErrors(jobs)
    
    successCount := 0
    failureCount := 0
    
    for range jobs {
        result := <-results
        if result.Err != nil {
            fmt.Printf("❌ %s: %v\n", result.ID, result.Err)
            failureCount++
        } else {
            fmt.Printf("✓ %s: %s\n", result.ID, result.Value)
            successCount++
        }
    }
    
    fmt.Printf("Summary: %d passed, %d failed\\n", successCount, failureCount)
}
```

**Fan-Out + Worker Pool Hybrid:**

Sometimes you want to fan out but not create one goroutine per job. Use the worker pool pattern instead:

```go
func fanOutToWorkerPool(jobs []string, numWorkers int) <-chan Result {
    jobCh := make(chan string, len(jobs))
    resultCh := make(chan Result, len(jobs))
    
    // Start workers
    for i := 0; i < numWorkers; i++ {
        go func() {
            for job := range jobCh {
                value, err := processJob(job)
                resultCh <- Result{ID: job, Value: value, Err: err}
            }
        }()
    }
    
    // Send jobs (fan-out)
    go func() {
        for _, job := range jobs {
            jobCh <- job
        }
        close(jobCh)
    }()
    
    return resultCh
}
```

**Real-World Example:** Cross-browser smoke tests. Fan out the same scenario set to Chrome, Firefox, and WebKit workers, then fan in all results to produce one consolidated build status.

**SDET Use Cases:**

1. **Multi-environment validation:** Test API against 5 different environments, collect pass/fail for each
2. **Flaky test diagnosis:** Run the same test 20 times in parallel, collect failure patterns
3. **Load spike simulation:** Send 100 concurrent requests, collect response times and error counts
4. **Parallel UI test suite:** Open 10 browser windows running the same scenario, aggregate results

<div class="go-playground">
    <textarea class="go-code" rows="12">package main

import (
        "fmt"
        "math/rand"
        "time"
)

func worker(id int, job string) string {
    fmt.Printf("Worker %d handling: %s\n", id, job)
    time.Sleep(time.Duration(rand.Intn(100)) * time.Millisecond)
    return fmt.Sprintf("Result from worker %d", id)
}

func fanOut(jobs []string) <-chan string {
    out := make(chan string, len(jobs))
    for i, job := range jobs {
        go func(id int, j string) {
            out <- worker(id, j)
        }(i+1, job)
    }
    return out
}

func main() {
    jobs := []string{"test1", "test2", "test3", "test4", "test5"}
    results := fanOut(jobs)
    
    for range jobs {
        fmt.Println(<-results)
    }
}
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>

### 4. Timeout Pattern

The timeout pattern prevents goroutines from waiting indefinitely. This is critical in testing and production systems where external dependencies may hang, fail slowly, or become unresponsive. Instead of blocking forever, your code detects the timeout and handles it gracefully.

**Why Timeouts Matter for SDETs:**

- API tests often call third-party services that may be slow or down
- Database queries can hang if the connection pool is exhausted
- UI automation may stall waiting for elements that never appear
- Without timeouts, a single slow test can hang the entire CI pipeline

**How it Works:**

Use `select` with `time.After()` to race the actual work against a deadline. Whichever completes first wins:

```go
func fetchTestResult(timeout time.Duration) (string, error) {
    resultCh := make(chan string)
    
    go func() {
        time.Sleep(2 * time.Second)  // Simulate slow operation
        resultCh <- "Test passed"
    }()
    
    select {
    case result := <-resultCh:
        return result, nil
    case <-time.After(timeout):
        return "", fmt.Errorf("operation timed out after %v", timeout)
    }
}

func main() {
    // This will timeout
    result, err := fetchTestResult(1 * time.Second)
    if err != nil {
        fmt.Println("Error:", err)  // Error: operation timed out after 1s
    } else {
        fmt.Println(result)
    }
}
```

**Important:** Note that after timeout, the goroutine continues running in the background. For long-lived services, use `context.WithTimeout` to cancel the goroutine's work, not just abandon it.

**Real-World Example:** Dependency health checks in startup validation. Each downstream service call gets a 2s timeout; slow dependencies are marked degraded instead of blocking the whole readiness workflow.

**Common Patterns:**

1. **Per-operation timeouts:** Each API call gets its own deadline
2. **Cascading timeouts:** Parent operation timeout is split among child operations
3. **Deadline propagation:** Use `context` to enforce the same deadline across multiple goroutines

**Pitfall to Avoid:**

Do not use `time.Sleep` to guess how long something takes. Use timeouts with channels to *detect* when something is taking too long.

<div class="go-playground">
    <textarea class="go-code" rows="12">package main

import (
        "fmt"
        "time"
)

func fetchTestResult(timeout time.Duration) (string, error) {
    resultCh := make(chan string)
    
    go func() {
        time.Sleep(2 * time.Second)  // Simulate slow operation
        resultCh <- "Test passed"
    }()
    
    select {
    case result := <-resultCh:
        return result, nil
    case <-time.After(timeout):
        return "", fmt.Errorf("operation timed out after %v", timeout)
    }
}

func main() {
    // This will timeout
    result, err := fetchTestResult(1 * time.Second)
    if err != nil {
        fmt.Println("Error:", err)  // Error: operation timed out after 1s
    } else {
        fmt.Println(result)
    }
}
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


### 5. Broadcast Pattern

The broadcast pattern sends a single signal to many goroutines simultaneously. Unlike a work queue where each job goes to one worker, broadcast wakes all listeners at once.

**Key Insight:**

Closing a channel sends a signal to *all* goroutines waiting on that channel. This is fundamentally different from sending a message to a single reader. It's the only Go primitive that naturally handles fan-in of a signal.

Send the same message to multiple receivers:

```go
func main() {
    // Create a buffered channel for notifications
    done := make(chan struct{})  // Empty struct uses no memory
    
    // Multiple goroutines waiting for the same signal
    for i := 1; i <= 5; i++ {
        go func(id int) {
            <-done
            fmt.Printf("Goroutine %d received shutdown signal\n", id)
        }(i)
    }
    
    time.Sleep(1 * time.Second)
    fmt.Println("Broadcasting shutdown signal...")
    close(done)  // All waiting goroutines wake up
    
    time.Sleep(100 * time.Millisecond)
}
```

**Why Use `struct{}`?**

The empty struct `struct{}` uses zero bytes in memory, making it perfect for signals that carry no data—just notification. Compare:

```go
done := make(chan struct{})    // Efficient: 0 bytes
status := make(chan bool)      // Wasteful: 1 byte per send (not needed here)
```

**Real-World Example:** Graceful test shutdown. When CI receives cancel/abort, close a shared `done` channel so log streamers, pollers, and background workers all stop quickly and cleanly.

**Use Cases:**

1. **Shutdown signals:** Stop all workers when test suite exits
2. **Start gates:** All workers wait until a shared signal, then race to process work
3. **Event notifications:** Announce events (e.g., "config reloaded") to many listeners
4. **Cancellation propagation:** Signal all child goroutines to stop

**Broadcast vs Send:**

If you tried to send the same value to 100 goroutines individually:

```go
// BAD: Must loop and send to each goroutine
for i := 0; i < 100; i++ {
    workers[i] <- struct{}{}  // Blocks if worker not ready
}

// GOOD: One close wakes all listeners
close(done)  // All 100 wake up instantly
```

**Pattern: Start Gate with Broadcast**

Wait for a signal before a batch of workers begin—useful in load tests:

```go
func worker(id int, start <-chan struct{}, done chan<- struct{}) {
    <-start             // Wait for broadcast
    fmt.Printf("Worker %d starting\n", id)
    // Do work
    done <- struct{}{}
}

func main() {
    start := make(chan struct{})
    done := make(chan struct{}, 100)
    
    for i := 0; i < 100; i++ {
        go worker(i, start, done)
    }
    
    time.Sleep(1 * time.Second)
    close(start)  // All workers start *simultaneously*
    
    for i := 0; i < 100; i++ {
        <-done
    }
}
```

**Pitfall to Avoid:**

Sending on a closed channel panics. Always have the *initiator* close the channel, and ensure no other goroutine tries to send after close is called.

<div class="go-playground">
    <textarea class="go-code" rows="12">package main

import (
        "fmt"
        "time"
)

func main() {
    // Create a buffered channel for notifications
    done := make(chan struct{})  // Empty struct uses no memory
    
    // Multiple goroutines waiting for the same signal
    for i := 1; i <= 5; i++ {
        go func(id int) {
            <-done
            fmt.Printf("Goroutine %d received shutdown signal\n", id)
        }(i)
    }
    
    time.Sleep(1 * time.Second)
    fmt.Println("Broadcasting shutdown signal...")
    close(done)  // All waiting goroutines wake up
    
    time.Sleep(100 * time.Millisecond)
}
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


## Select Statement

The `select` statement waits on multiple channel operations simultaneously. It's like a switch for channels - it blocks until one of its cases can proceed.

### Basic Select

```go
select {
case msg1 := <-ch1:
    fmt.Println("Received from ch1:", msg1)
case msg2 := <-ch2:
    fmt.Println("Received from ch2:", msg2)
case <-time.After(2 * time.Second):
    fmt.Println("Timeout - no message received")
}
```

**How it works:**
1. Blocks until one of the cases is ready
2. Executes that case
3. If multiple are ready, picks one randomly
4. The default case executes immediately if no other case is ready

### Select with Default (Non-Blocking)

```go
select {
case msg := <-ch:
    fmt.Println("Received:", msg)
default:
    fmt.Println("No message available, continuing...")
}
```

### Real-World Example: Monitoring Multiple Services

```go
func fetchFromService(name string, delay time.Duration) <-chan string {
    out := make(chan string)
    go func() {
        time.Sleep(delay)
        out <- fmt.Sprintf("Response from %s", name)
    }()
    return out
}

func main() {
    // Fetch from multiple services in parallel
    serviceA := fetchFromService("ServiceA", 100*time.Millisecond)
    serviceB := fetchFromService("ServiceB", 50*time.Millisecond)
    serviceC := fetchFromService("ServiceC", 150*time.Millisecond)
    
    // Process results as they arrive (fastest first)
    for i := 0; i < 3; i++ {
        select {
        case result := <-serviceA:
            fmt.Println(result)
        case result := <-serviceB:
            fmt.Println(result)
        case result := <-serviceC:
            fmt.Println(result)
        }
    }
}

// Output (order may vary):
// Response from ServiceB
// Response from ServiceA
// Response from ServiceC
```

<div class="go-playground">
    <textarea class="go-code" rows="12">package main

import (
        "fmt"
        "time"
)

func fetchFromService(name string, delay time.Duration) <-chan string {
    out := make(chan string)
    go func() {
        time.Sleep(delay)
        out <- fmt.Sprintf("Response from %s", name)
    }()
    return out
}

func main() {
    // Fetch from multiple services in parallel
    serviceA := fetchFromService("ServiceA", 100*time.Millisecond)
    serviceB := fetchFromService("ServiceB", 50*time.Millisecond)
    serviceC := fetchFromService("ServiceC", 150*time.Millisecond)
    
    // Process results as they arrive (fastest first)
    for i := 0; i < 3; i++ {
        select {
        case result := <-serviceA:
            fmt.Println(result)
        case result := <-serviceB:
            fmt.Println(result)
        case result := <-serviceC:
            fmt.Println(result)
        }
    }
}

// Output (order may vary):
// Response from ServiceB
// Response from ServiceA
// Response from ServiceC
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


### Select in a Loop (Multiplexing)

```go
func main() {
    ticker := time.NewTicker(500 * time.Millisecond)
    defer ticker.Stop()
    
    quit := make(chan bool)
    
    go func() {
        time.Sleep(2 * time.Second)
        quit <- true
    }()
    
    for {
        select {
        case <-ticker.C:
            fmt.Println("Tick")
        case <-quit:
            fmt.Println("Quitting")
            return
        }
    }
}
```

<div class="go-playground">
    <textarea class="go-code" rows="12">package main

import (
        "fmt"
        "time"
)

func main() {
    ticker := time.NewTicker(500 * time.Millisecond)
    defer ticker.Stop()
    
    quit := make(chan bool)
    
    go func() {
        time.Sleep(2 * time.Second)
        quit <- true
    }()
    
    for {
        select {
        case <-ticker.C:
            fmt.Println("Tick")
        case <-quit:
            fmt.Println("Quitting")
            return
        }
    }
}
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


**Use Case:** SDET test runner that processes test results as they arrive, with a timeout for overall test execution.

## Closing Channels

Channels must be explicitly closed when no more data will be sent. The sender should always close the channel, never the receiver.

```go
// CORRECT: Sender closes
ch := make(chan int)
go func() {
    ch <- 1
    ch <- 2
    close(ch)  // Sender closes
}()

for val := range ch {
    fmt.Println(val)
}

// WRONG: Receiver closes (causes panic if sender tries to send)
close(ch)  // Receiver closes - BAD!

// WRONG: Multiple senders close (panic)
go func() { close(ch) }()
go func() { close(ch) }()  // PANIC!
```

**Receiving from a closed channel:**
```go
value, ok := <-ch
if !ok {
    fmt.Println("Channel is closed")  // ok will be false
}
```

**Best Practice:** Always close channels from the sender side, and document ownership clearly.

## Parallels in Other Languages

### C# - BlockingCollection and Channels

**C# BlockingCollection** (similar to Go channels):
```csharp
using System.Collections.Concurrent;
using System.Threading.Tasks;

var collection = new BlockingCollection<int>();

// Producer
Task.Run(() => {
    for (int i = 0; i < 5; i++) {
        collection.Add(i);
    }
    collection.CompleteAdding();
});

// Consumer
foreach (var item in collection.GetConsumingEnumerable()) {
    Console.WriteLine($"Received: {item}");
}
```

**C# Channels** (modern replacement, closer to Go):
```csharp
using System.Threading.Channels;

var channel = Channel.CreateUnbounded<int>();

// Producer
await channel.Writer.WriteAsync(42);
channel.Writer.TryComplete();

// Consumer
while (await channel.Reader.WaitToReadAsync()) {
    if (channel.Reader.TryRead(out var item)) {
        Console.WriteLine($"Received: {item}");
    }
}
```

**Key Differences:**
- C# requires explicit async/await patterns
- No built-in `select` equivalent; use `Task.WhenAny()` instead
- Channels API is newer and more aligned with Go's design

### Java - BlockingQueue and ExecutorService

**Java BlockingQueue** (similar to Go channels):
```java
import java.util.concurrent.*;

BlockingQueue<Integer> queue = new LinkedBlockingQueue<>(10);

// Producer
Thread producer = new Thread(() -> {
    try {
        for (int i = 0; i < 5; i++) {
            queue.put(i);  // Blocks if queue is full
        }
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
});

// Consumer
Thread consumer = new Thread(() -> {
    try {
        while (true) {
            Integer item = queue.take();  // Blocks if queue is empty
            System.out.println("Received: " + item);
        }
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
});

producer.start();
consumer.start();
```

**Java ExecutorService for Worker Pattern**:
```java
ExecutorService executor = Executors.newFixedThreadPool(3);

// Submit tasks
for (int i = 1; i <= 10; i++) {
    final int job = i;
    executor.submit(() -> {
        System.out.println("Processing: " + job);
    });
}

executor.shutdown();
executor.awaitTermination(1, TimeUnit.MINUTES);
```

**Java CompletableFuture for Fan-Out/Fan-In**:
```java
List<CompletableFuture<String>> futures = new ArrayList<>();
for (int i = 1; i <= 5; i++) {
    futures.add(
        CompletableFuture.supplyAsync(() -> "Result " + i)
    );
}

// Wait for all
CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
    .thenRun(() -> {
        futures.forEach(f -> System.out.println(f.join()));
    });
```

### Comparison Table

| Feature | Go Channels | C# BlockingCollection | C# Channels | Java BlockingQueue |
|---------|------------|----------------------|------------|-------------------|
| **Synchronization** | Built-in, type-safe | Manual with locks | Built-in with async/await | Manual with locks |
| **Select/Wait Multiple** | `select` statement | `WaitAny()` | `WaitForReadAsync()` | `poll()` or custom wait |
| **Buffering** | Unbuffered/Buffered | Collection size | Per channel | Collection capacity |
| **Goroutine Spawn** | `go` keyword | `Task.Run()` | `Task.Run()` | `new Thread()` or Executor |
| **Closing** | `close()` | `CompleteAdding()` | `Complete()` | No explicit close |
| **Learning Curve** | Simpler primitives | More verbose | Modern but less intuitive | More verbose |

**Go's Advantage:** Channels are a first-class language construct designed from the ground up for concurrency. C# and Java require combining multiple APIs (BlockingQueue, ExecutorService, CompletableFuture) to achieve similar functionality.

## Best Practices and Anti-Patterns

### What to Avoid

❌ **Closing a closed channel** - causes panic:
```go
ch := make(chan int)
close(ch)
close(ch)  // PANIC: send on closed channel
```

❌ **Sending on a closed channel** - causes panic:
```go
ch := make(chan int)
close(ch)
ch <- 42  // PANIC: send on closed channel
```

❌ **Closing from receiver** - can cause panic if sender sends after:
```go
ch := make(chan int)
go func() {
    close(ch)  // Receiver closes - BAD!
}()
go func() {
    ch <- 42  // May panic if receiver closed first
}()
```

❌ **Multiple senders, single receiver pattern without sync**:
```go
// WRONG: How does receiver know when all senders are done?
for i := 1; i <= 5; i++ {
    go func(i int) {
        ch <- i
    }(i)
}
// ??? How to close ch safely? Can't - multiple senders
```

**Better approach - use sync.WaitGroup:**
```go
var wg sync.WaitGroup
for i := 1; i <= 5; i++ {
    wg.Add(1)
    go func(i int) {
        defer wg.Done()
        ch <- i
    }(i)
}
go func() {
    wg.Wait()
    close(ch)  // Safe to close now
}()
```

### Best Practices

✅ **Owner closes pattern** - sender always closes:
```go
// Sender owns the channel
func produce(ch chan<- int) {
    for i := 1; i <= 5; i++ {
        ch <- i
    }
    close(ch)  // Sender closes
}

func main() {
    ch := make(chan int)
    go produce(ch)
    
    for val := range ch {
        fmt.Println(val)
    }
}
```

<div class="go-playground">
    <textarea class="go-code" rows="12">package main

import "fmt"

// Sender owns the channel
func produce(ch chan<- int) {
    for i := 1; i <= 5; i++ {
        ch <- i
    }
    close(ch)  // Sender closes
}

func main() {
    ch := make(chan int)
    go produce(ch)
    
    for val := range ch {
        fmt.Println(val)
    }
}
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


✅ **Use receive-only channels** to enforce correct usage:
```go
func worker(jobs <-chan int) {  // Can only receive
    for job := range jobs {
        fmt.Println("Working on:", job)
    }
}

func dispatcher(ch chan<- int) {  // Can only send
    for i := 1; i <= 10; i++ {
        ch <- i
    }
    close(ch)
}
```

✅ **Add context for cancellation** in long-lived operations:
```go
func processWithCancel(ctx context.Context, jobs <-chan int) {
    for {
        select {
        case job, ok := <-jobs:
            if !ok {
                return  // Jobs channel closed
            }
            fmt.Println("Processing:", job)
        case <-ctx.Done():
            return  // Parent context cancelled
        }
    }
}
```

✅ **Use empty struct for signaling** (zero memory):
```go
done := make(chan struct{})  // Better than chan bool
// Signal that work is done
close(done)
// Or send a signal
done <- struct{}{}
```

✅ **Buffered channels for producer/consumer decoupling**:
```go
// Unbuffered: tight coupling, synchronous
ch := make(chan int)

// Buffered: loose coupling, producer can send ahead
ch := make(chan int, 100)
```

## SDET Testing Use Cases

### Example 1: Parallel Test Execution with Result Collection

```go
type TestResult struct {
    TestName string
    Passed   bool
    Duration time.Duration
}

func runTest(name string, duration time.Duration) <-chan TestResult {
    result := make(chan TestResult)
    go func() {
        start := time.Now()
        time.Sleep(duration)  // Simulate test
        result <- TestResult{
            TestName: name,
            Passed:   true,
            Duration: time.Since(start),
        }
        close(result)
    }()
    return result
}

func main() {
    tests := []struct {
        name     string
        duration time.Duration
    }{
        {"LoginTest", 100 * time.Millisecond},
        {"CheckoutTest", 200 * time.Millisecond},
        {"PaymentTest", 150 * time.Millisecond},
    }
    
    results := make(chan TestResult)
    var wg sync.WaitGroup
    
    // Fan-out: start all tests
    for _, test := range tests {
        wg.Add(1)
        go func(t struct {
            name     string
            duration time.Duration
        }) {
            defer wg.Done()
            res := <-runTest(t.name, t.duration)
            results <- res
        }(test)
    }
    
    // Wait for all and close results
    go func() {
        wg.Wait()
        close(results)
    }()
    
    // Fan-in: collect all results
    passed := 0
    for result := range results {
        status := "PASSED"
        if !result.Passed {
            status = "FAILED"
        }
        fmt.Printf("[%s] %s (%.2fms)\n", status, result.TestName, 
            result.Duration.Seconds()*1000)
        if result.Passed {
            passed++
        }
    }
    fmt.Printf("\nTotal: %d/%d passed\n", passed, len(tests))
}
```

<div class="go-playground">
  <textarea class="go-code" rows="12">type TestResult struct {
    TestName string
    Passed   bool
    Duration time.Duration
}

func runTest(name string, duration time.Duration) <-chan TestResult {
    result := make(chan TestResult)
    go func() {
        start := time.Now()
        time.Sleep(duration)  // Simulate test
        result <- TestResult{
            TestName: name,
            Passed:   true,
            Duration: time.Since(start),
        }
        close(result)
    }()
    return result
}

func main() {
    tests := []struct {
        name     string
        duration time.Duration
    }{
        {"LoginTest", 100 * time.Millisecond},
        {"CheckoutTest", 200 * time.Millisecond},
        {"PaymentTest", 150 * time.Millisecond},
    }
    
    results := make(chan TestResult)
    var wg sync.WaitGroup
    
    // Fan-out: start all tests
    for _, test := range tests {
        wg.Add(1)
        go func(t struct {
            name     string
            duration time.Duration
        }) {
            defer wg.Done()
            res := <-runTest(t.name, t.duration)
            results <- res
        }(test)
    }
    
    // Wait for all and close results
    go func() {
        wg.Wait()
        close(results)
    }()
    
    // Fan-in: collect all results
    passed := 0
    for result := range results {
        status := "PASSED"
        if !result.Passed {
            status = "FAILED"
        }
        fmt.Printf("[%s] %s (%.2fms)\n", status, result.TestName, 
            result.Duration.Seconds()*1000)
        if result.Passed {
            passed++
        }
    }
    fmt.Printf("\nTotal: %d/%d passed\n", passed, len(tests))
}
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


### Example 2: API Response Collection with Timeout

```go
type APIResponse struct {
    Endpoint string
    Status   int
    Error    error
}

func queryAPI(endpoint string, timeout time.Duration) <-chan APIResponse {
    out := make(chan APIResponse)
    go func() {
        select {
        case <-time.After(timeout):
            out <- APIResponse{
                Endpoint: endpoint,
                Status:   0,
                Error:    fmt.Errorf("timeout after %v", timeout),
            }
        }
    }()
    return out
}

func main() {
    endpoints := []string{
        "/api/users",
        "/api/products",
        "/api/orders",
    }
    
    // Collect responses as they arrive
    responses := make([]APIResponse, 0)
    timeout := 5 * time.Second
    
    for _, endpoint := range endpoints {
        select {
        case resp := <-queryAPI(endpoint, timeout):
            responses = append(responses, resp)
        case <-time.After(timeout):
            fmt.Println("Overall timeout exceeded")
            break
        }
    }
    
    for _, resp := range responses {
        if resp.Error != nil {
            fmt.Printf("%s: Error - %v\n", resp.Endpoint, resp.Error)
        } else {
            fmt.Printf("%s: Status %d\n", resp.Endpoint, resp.Status)
        }
    }
}
```

<div class="go-playground">
  <textarea class="go-code" rows="12">type APIResponse struct {
    Endpoint string
    Status   int
    Error    error
}

func queryAPI(endpoint string, timeout time.Duration) <-chan APIResponse {
    out := make(chan APIResponse)
    go func() {
        select {
        case <-time.After(timeout):
            out <- APIResponse{
                Endpoint: endpoint,
                Status:   0,
                Error:    fmt.Errorf("timeout after %v", timeout),
            }
        }
    }()
    return out
}

func main() {
    endpoints := []string{
        "/api/users",
        "/api/products",
        "/api/orders",
    }
    
    // Collect responses as they arrive
    responses := make([]APIResponse, 0)
    timeout := 5 * time.Second
    
    for _, endpoint := range endpoints {
        select {
        case resp := <-queryAPI(endpoint, timeout):
            responses = append(responses, resp)
        case <-time.After(timeout):
            fmt.Println("Overall timeout exceeded")
            break
        }
    }
    
    for _, resp := range responses {
        if resp.Error != nil {
            fmt.Printf("%s: Error - %v\n", resp.Endpoint, resp.Error)
        } else {
            fmt.Printf("%s: Status %d\n", resp.Endpoint, resp.Status)
        }
    }
}
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


## Quick Exercises (SDET Focus)

Try these exercises before moving to the next chapter.

### Exercise 1: Fan-Out/Fan-In API Checks

Goal: Practice channel-based worker coordination for test automation.

1. Create worker function that receives endpoint URLs from an input channel.
2. Each worker performs an HTTP check and sends a result struct to an output channel.
3. Start 3 workers and feed 10 endpoints.
4. Collect all results and assert counts for success/failure.

Stretch: Add a `context.Context` cancellation path and stop workers cleanly.

### Exercise 2: Timeout-Aware Select Router

Goal: Use `select` for deterministic timeout handling.

1. Implement function that waits on:
    - a response channel,
    - an error channel,
    - `time.After(timeout)`.
2. Return a typed result indicating success, failure, or timeout.
3. Write tests for all three branches.
4. Ensure no goroutine leak when timeout happens first.

Stretch: Replace `time.After` with reusable timer to reduce allocations in loops.


## Common Anti-Patterns

- Sending on a closed channel, causing a panic that is difficult to trace across goroutines.
- Forgetting to drain a buffered channel before returning from a test helper, causing goroutine leaks.
- Using an unbuffered channel in a goroutine that can block forever if the receiver exits early.
- Omitting a default case in a `select` when non-blocking behavior is required.

## Quick Channel Usage Checklist

- Is channel direction (`<-chan`, `chan<-`) declared at every function boundary that uses it?
- Are all goroutines that write to a channel guaranteed to exit when the channel is closed?
- Is a `done` or context channel used to signal goroutine shutdown in tests?
- Has the race detector (`-race`) been run against all channel-based test helpers?


## Next Step

Continue with [HTTP Client and Server Basics](http-client-and-server-basics.md).
