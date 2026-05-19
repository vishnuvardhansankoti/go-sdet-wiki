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


**Use Case:** Test data transformation pipeline - read test data, transform it, validate it.

### 3. Fan-Out / Fan-In Pattern

Distribute work to multiple workers (fan-out) and collect results (fan-in):

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


**Use Case:** Run multiple test suites in parallel and collect all results.

### 4. Timeout Pattern

Prevent goroutines from hanging indefinitely:

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


**Use Case:** Coordinating test shutdown across multiple concurrent test runners.

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
