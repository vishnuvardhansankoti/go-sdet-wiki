# Concurrency: Goroutines

Goroutines are lightweight execution units that make concurrent patterns cheap to express in Go. For SDETs, goroutine patterns power parallel API calls, fan-out test workers, and timeout-controlled probes.

## What are Goroutines?

Goroutines are lightweight threads managed by the Go runtime. They're much cheaper than OS threads.

## What Is Concurrency?

Concurrency means structuring a program so it can make progress on more than one task in the same period of time. It does not always mean tasks run at the exact same instant; it means the program can manage multiple in-flight activities without waiting for one to finish before starting the next.

In practice, concurrency helps when your application needs to:

- Handle many requests at once
- Wait on I/O without blocking the whole program
- Split large work into smaller tasks
- Keep the program responsive while other work continues

Parallelism is related but different. Parallelism means tasks are literally executing at the same time on multiple CPU cores. Go supports both, but concurrency is the core idea you design for first.

## How Go Goroutines Handle Concurrency

Go uses a runtime scheduler to manage goroutines. You can think of it as a very small task runner that maps many goroutines onto a smaller pool of operating system threads.

The important idea is this:

- You write goroutines as if they are independent units of work.
- The Go runtime decides when and where they run.
- The runtime can pause one goroutine and resume another very quickly.

This makes goroutines cheap compared with OS threads. You can often launch thousands or even millions of goroutines, depending on memory and workload, because each goroutine starts with a small stack and grows as needed.

### What the Go Scheduler Does

The scheduler handles:

- Starting goroutines
- Pausing goroutines that are waiting
- Resuming goroutines when they can continue
- Sharing CPU time across runnable goroutines

When a goroutine waits on a channel, timer, network call, or other blocking operation, the runtime can switch to another goroutine instead of blocking the entire program.

### Why This Is Useful

This model is a strong fit for servers and test automation because many tasks are I/O bound:

- HTTP requests
- Database calls
- File processing
- Bulk imports

Instead of waiting for each operation one by one, Go can keep many of them active and interleave their execution efficiently.

### Concurrency vs Parallelism in Go

Concurrency is about program structure. Parallelism is about actual simultaneous execution.

For example:

- One goroutine can still be concurrent even on a single CPU core.
- Multiple goroutines can run in parallel when Go has more than one processor available.

So in Go, concurrency is the design pattern, while parallelism is an optimization the runtime can use when hardware allows it.

## Advantages of Goroutines Over Other Languages

Go's goroutine model is especially attractive when compared with the most common concurrency models in Java and C#.

## Thread vs Goroutine

The table below summarizes practical differences between OS threads and Go goroutines.

| Thread | Goroutine |
|------|---------|
| OS threads are managed by the kernel and have hardware/OS-level scheduling dependencies. | Goroutines are managed by the Go runtime and are multiplexed over OS threads. |
| OS threads generally have a fixed stack size (often around 1-2 MB by default, platform-dependent). | Goroutines start with a very small stack (historically a few KB) and grow/shrink dynamically as needed. |
| Stack size is usually allocated upfront and does not grow in the same lightweight way as goroutine stacks. | Goroutine stack size is managed at runtime and can grow significantly (up to implementation/runtime limits) by moving data as needed. |
| There is no built-in language primitive for thread-to-thread communication; coordination often relies on locks/condition variables and may add overhead. | Goroutines use `channels` for structured communication and synchronization, often with lower coordination overhead in Go code paths ([read more](https://blog.twitch.tv/gos-march-to-low-latency-gc-a6fa96f06eb7)). |
| Threads have identity (for example, TID at OS level). | Goroutines intentionally do not expose stable identity in the language/runtime model. This aligns with Go's design (no direct TLS-style goroutine identity API) ([Thread Local Storage reference](https://msdn.microsoft.com/en-us/library/windows/desktop/ms686749(v=vs.85).aspx)). |
| Threads have higher setup/teardown cost because they involve heavier OS resource allocation. | Goroutines are created and destroyed by the Go runtime and are typically much cheaper than creating OS threads. |
| Threads are preemptively scheduled by the OS; context switches are relatively expensive due to full thread state management. | Goroutines are scheduled by Go's runtime scheduler; modern Go (1.14+) supports asynchronous preemption and low-cost goroutine switching compared with OS thread switching ([preemptive threads](https://stackoverflow.com/questions/4147221/preemptive-threads-vs-non-preemptive-threads), [goroutine scheduling discussion](https://stackoverflow.com/questions/37469995/goroutines-are-cooperatively-scheduled-does-that-mean-that-goroutines-that-don)). |

SDET note: this is why fan-out I/O checks (API probes, health checks, parallel validations) are often simpler and more resource-efficient with goroutines than one-thread-per-task designs.

### Lower Overhead Than OS Threads

Goroutines are much lighter than Java or C# threads. That means you can create many more concurrent tasks without paying the same memory and scheduling cost that traditional threads require.

### Simpler Programming Model

You usually start a goroutine with just the `go` keyword. In Java and C#, concurrency often involves more ceremony, such as thread pools, futures, tasks, executors, or async state machines.

### Built-In Scheduling by the Go Runtime

Go handles goroutine scheduling for you. In Java and C#, the runtime also helps, but developers often need to think more explicitly about thread pools, task scheduling, or async coordination.

### Channels Make Coordination Clear

Go gives you channels as a first-class way to pass data and signal completion. This often makes concurrent code easier to understand than shared-memory approaches with locks alone.

### Great Fit for I/O-Bound Work

For HTTP calls, database access, queue consumers, and test automation, goroutines make it easy to keep many operations in flight without blocking the whole program.

### Easier to Read in Test Code

In SDET work, you often need to launch parallel checks, wait for results, and clean up safely. Goroutines plus `WaitGroup` usually stay shorter and clearer than equivalent Java thread or C# task code.

### Standard Library Support

Go's standard library works very well with concurrency patterns, especially `sync`, `time`, `context`, and `net/http`. This reduces the need for extra frameworks.

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

<div class="go-playground">
  <textarea class="go-code" rows="12">package main

import (
	"fmt"
	"time"
)
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
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


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

## Parallel in Java and C#

Go goroutines are conceptually similar to lightweight tasks, but the way you work with concurrency in Java and C# is different.

### Java

In Java, you often use `Thread`, `ExecutorService`, `CompletableFuture`, or the newer virtual threads in modern Java.

```java
ExecutorService executor = Executors.newFixedThreadPool(4);

executor.submit(() -> {
	System.out.println("Task 1");
});

executor.submit(() -> {
	System.out.println("Task 2");
});

executor.shutdown();
```

Java threads are typically heavier than goroutines, so developers often use thread pools to control resource usage. With newer Java versions, virtual threads reduce the cost of blocking, but the programming model still centers around executors and futures rather than goroutines and channels.

### C#

In C#, concurrency is commonly expressed through `Task`, `async`, and `await`.

```csharp
async Task RunAsync()
{
	var task1 = Task.Run(() => Console.WriteLine("Task 1"));
	var task2 = Task.Run(() => Console.WriteLine("Task 2"));

	await Task.WhenAll(task1, task2);
}
```

C# makes asynchronous programming very ergonomic, especially for I/O-heavy work. The runtime schedules tasks efficiently, but you usually coordinate work with tasks and async/await rather than channels.

### Main Difference

- Go emphasizes goroutines and channels as first-class concurrency tools.
- Java often emphasizes threads, executors, and futures.
- C# often emphasizes tasks, async/await, and task combinators.

The shared goal is the same: keep the program responsive and efficient while multiple operations are in flight.

### Why Go Is Often Simpler for SDETs

Go usually requires less ceremony for concurrent test code:

- Launch a goroutine with `go func() { ... }()`.
- Coordinate completion with `sync.WaitGroup`.
- Share data safely with mutexes or channels.

That simplicity is why Go is a strong fit for test automation, load tooling, and service orchestration.

## Additional Reading

- [Go concurrency video](https://www.youtube.com/watch?v=f6kdp27TYZs)

## Quick Exercises (SDET Focus)

Try these exercises before moving to the assignment.

### Exercise 1: Parallel Endpoint Health Checks

Goal: Practice goroutines + `WaitGroup` with deterministic test assertions.

1. Implement `CheckEndpoints(endpoints []string) map[string]error`.
2. Launch one goroutine per endpoint.
3. Use `sync.WaitGroup` to wait for completion.
4. Store results safely (mutex or channel collector).
5. Write tests for all-success and partial-failure scenarios.

Stretch: Add per-endpoint timeout using `context.WithTimeout`.

### Exercise 2: Race-Safe Shared Counter

Goal: Understand race conditions and safe synchronization.

1. Create `ConcurrentCounter` with methods `Inc()` and `Value()`.
2. Run 100 goroutines that increment the counter 100 times each.
3. Verify final value is exactly `10000`.
4. Run with race detector and ensure no data races.

Stretch: Implement the same counter using channels and compare readability.

## Assignment: Part 5 - Concurrent Book Processing

### Goal
Build concurrent batch processing for importing books into the Bookshelf API using goroutines and WaitGroup.

### Tasks

#### 1. Create CSV Data Model - `pkg/domain/bulk_import.go`

```go
package domain

import "sync"

// BookImportRecord represents a single book record from bulk import
type BookImportRecord struct {
	Title         string
	Author        string
	ISBN          string
	PublishedYear int
}

// BulkImportResult contains results of a bulk operation
type BulkImportResult struct {
	SuccessfulBooks []*Book
	FailedBooks     []FailedBookImport
	TotalProcessed  int
	mu              sync.RWMutex
}

// FailedBookImport represents a failed import attempt
type FailedBookImport struct {
	Record BookImportRecord
	Error  error
	Index  int
}

// NewBulkImportResult creates a new BulkImportResult
func NewBulkImportResult() *BulkImportResult {
	return &BulkImportResult{
		SuccessfulBooks: make([]*Book, 0),
		FailedBooks:     make([]FailedBookImport, 0),
	}
}

// AddSuccessfulBook adds a successfully imported book (thread-safe)
func (r *BulkImportResult) AddSuccessfulBook(book *Book) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.SuccessfulBooks = append(r.SuccessfulBooks, book)
}

// AddFailedBook adds a failed import (thread-safe)
func (r *BulkImportResult) AddFailedBook(record BookImportRecord, err error, index int) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.FailedBooks = append(r.FailedBooks, FailedBookImport{
		Record: record,
		Error:  err,
		Index:  index,
	})
}

// GetStats returns statistics about the import
func (r *BulkImportResult) GetStats() (successful, failed, total int) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.SuccessfulBooks), len(r.FailedBooks), len(r.SuccessfulBooks) + len(r.FailedBooks)
}

// SuccessRate returns the percentage of successful imports
func (r *BulkImportResult) SuccessRate() float64 {
	r.mu.RLock()
	defer r.mu.RUnlock()
	total := len(r.SuccessfulBooks) + len(r.FailedBooks)
	if total == 0 {
		return 0.0
	}
	return float64(len(r.SuccessfulBooks)) / float64(total) * 100
}
```

#### 2. Create Bulk Import Service - `pkg/domain/bulk_import_service.go`

```go
package domain

import (
	"sync"
)

// BulkImportService handles concurrent book imports
type BulkImportService struct {
	maxWorkers int
}

// NewBulkImportService creates a new BulkImportService
func NewBulkImportService(maxWorkers int) *BulkImportService {
	if maxWorkers <= 0 {
		maxWorkers = 4 // default
	}
	return &BulkImportService{maxWorkers: maxWorkers}
}

// ImportBooksParallel imports multiple books concurrently
// It processes records using multiple goroutines (workers)
func (bis *BulkImportService) ImportBooksParallel(
	records []BookImportRecord,
) *BulkImportResult {
	result := NewBulkImportResult()

	if len(records) == 0 {
		return result
	}

	// Create channels for work distribution
	recordsChan := make(chan struct {
		record BookImportRecord
		index  int
	}, bis.maxWorkers)

	var wg sync.WaitGroup

	// Start workers
	for i := 0; i < bis.maxWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			bis.worker(recordsChan, result)
		}()
	}

	// Send records to workers
	go func() {
		for i, record := range records {
			recordsChan <- struct {
				record BookImportRecord
				index  int
			}{record, i}
		}
		close(recordsChan)
	}()

	// Wait for all workers to complete
	wg.Wait()

	return result
}

// worker processes records from the channel
func (bis *BulkImportService) worker(
	recordsChan <-chan struct {
		record BookImportRecord
		index  int
	},
	result *BulkImportResult,
) {
	for item := range recordsChan {
		// Try to create the book
		book, err := NewBook(
			item.record.Title,
			item.record.Author,
			item.record.ISBN,
			item.record.PublishedYear,
		)

		if err != nil {
			result.AddFailedBook(item.record, err, item.index)
			continue
		}

		// Simulate processing time (validation, deduplication, etc.)
		// In real app, might check for duplicates, normalize data, etc.
		book.ID = NewBookID(book.ISBN) // Use ISBN as ID for this exercise

		result.AddSuccessfulBook(book)
	}
}

// ImportBooksSequential imports books one at a time (for comparison)
func (bis *BulkImportService) ImportBooksSequential(
	records []BookImportRecord,
) *BulkImportResult {
	result := NewBulkImportResult()

	for i, record := range records {
		book, err := NewBook(
			record.Title,
			record.Author,
			record.ISBN,
			record.PublishedYear,
		)

		if err != nil {
			result.AddFailedBook(record, err, i)
			continue
		}

		book.ID = NewBookID(book.ISBN)
		result.AddSuccessfulBook(book)
	}

	return result
}
```

#### 3. Write Tests - `pkg/domain/bulk_import_test.go`

```go
package domain

import (
	"testing"
	"time"
)

func TestBulkImportResult_ThreadSafety(t *testing.T) {
	result := NewBulkImportResult()
	var wg sync.WaitGroup

	// Simulate concurrent additions
	numGoroutines := 10
	itemsPerGoroutine := 100

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for j := 0; j < itemsPerGoroutine; j++ {
				book, _ := NewBook(
					"Test Book",
					"Test Author",
					"ISBN",
					2023,
				)
				result.AddSuccessfulBook(book)
			}
		}(i)
	}

	wg.Wait()

	successful, _, _ := result.GetStats()
	expected := numGoroutines * itemsPerGoroutine
	if successful != expected {
		t.Errorf("expected %d successful, got %d", expected, successful)
	}
}

func TestBulkImportService_ImportBooksParallel(t *testing.T) {
	records := []BookImportRecord{
		{Title: "Go Programming", Author: "John Doe", ISBN: "ISBN001", PublishedYear: 2020},
		{Title: "Clean Code", Author: "Robert Martin", ISBN: "ISBN002", PublishedYear: 2008},
		{Title: "Design Patterns", Author: "Gang of Four", ISBN: "ISBN003", PublishedYear: 1994},
		{Title: "The Pragmatic Programmer", Author: "Hunt & Thomas", ISBN: "ISBN004", PublishedYear: 1999},
		{Title: "Code Complete", Author: "Steve McConnell", ISBN: "ISBN005", PublishedYear: 2004},
	}

	service := NewBulkImportService(2)
	result := service.ImportBooksParallel(records)

	successful, failed, total := result.GetStats()

	if total != len(records) {
		t.Errorf("expected %d total, got %d", len(records), total)
	}
	if failed != 0 {
		t.Errorf("expected 0 failures, got %d", failed)
	}
	if successful != len(records) {
		t.Errorf("expected %d successful, got %d", len(records), successful)
	}

	if result.SuccessRate() != 100.0 {
		t.Errorf("expected 100%% success rate, got %.2f%%", result.SuccessRate())
	}
}

func TestBulkImportService_InvalidRecords(t *testing.T) {
	records := []BookImportRecord{
		{Title: "", Author: "Author", ISBN: "ISBN001", PublishedYear: 2020}, // Empty title - invalid
		{Title: "Valid Book", Author: "Author", ISBN: "ISBN002", PublishedYear: 2020},
		{Title: "Another Book", Author: "", ISBN: "ISBN003", PublishedYear: 2020}, // Empty author - invalid
	}

	service := NewBulkImportService(1)
	result := service.ImportBooksParallel(records)

	successful, failed, _ := result.GetStats()

	if successful != 1 {
		t.Errorf("expected 1 successful, got %d", successful)
	}
	if failed != 2 {
		t.Errorf("expected 2 failures, got %d", failed)
	}
}

func TestBulkImportService_ParallelVsSequential(t *testing.T) {
	// Create 100 records
	records := make([]BookImportRecord, 100)
	for i := 0; i < 100; i++ {
		records[i] = BookImportRecord{
			Title:         "Book " + string(rune(i)),
			Author:        "Author " + string(rune(i)),
			ISBN:          "ISBN" + string(rune(i)),
			PublishedYear: 2000 + i,
		}
	}

	service := NewBulkImportService(4)

	// Parallel import
	startParallel := time.Now()
	resultParallel := service.ImportBooksParallel(records)
	parallelTime := time.Since(startParallel)

	// Sequential import
	startSequential := time.Now()
	resultSequential := service.ImportBooksSequential(records)
	sequentialTime := time.Since(startSequential)

	// Both should process same number
	pSucc, _, _ := resultParallel.GetStats()
	sSucc, _, _ := resultSequential.GetStats()

	if pSucc != sSucc {
		t.Errorf("parallel processed %d, sequential processed %d", pSucc, sSucc)
	}

	t.Logf("Parallel import time: %v", parallelTime)
	t.Logf("Sequential import time: %v", sequentialTime)
	// Note: Sequential might be faster for small datasets due to goroutine overhead
}

// Helper function
func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
```

### Key Patterns

1. **Worker Pool Pattern** - Multiple goroutines (workers) process items from a channel
2. **WaitGroup** - Ensure all workers complete before continuing
3. **Mutex for Shared State** - Protect concurrent access to the result object
4. **Channel for Work Distribution** - Send work items to workers without blocking

### Race Detection

Run with race detector to catch potential issues:

```bash
go test -race -v ./pkg/domain
```

### Verification

Run tests:

```bash
cd pkg/domain
go test -v -run BulkImport
```

Expected output:
```
ok      bookshelf-api/pkg/domain       0.005s
```

### Files Created This Section

```
pkg/domain/
├── bulk_import.go             # Data models for bulk operations
├── bulk_import_service.go     # Concurrent import service
├── bulk_import_test.go        # Tests with concurrency
└── (previous files...)
```

### Real-World Use Case

This pattern is used in the Bookshelf API for:
- **Initial data loading** - Import thousands of books from a catalog
- **Batch user operations** - Migrate user data from legacy system
- **Periodic sync** - Update book ratings from external sources
- **Batch notifications** - Send emails to multiple users

### What's Next

In **Section 20 (Microservices & REST API)**, you'll expose these bulk operations via HTTP endpoints and add dependency injection to wire services together.

## Deep Dive: Concurrency Patterns for Reliable Test Automation

### Background

Goroutines make it easy to scale work, but concurrency correctness is hard. Deterministic synchronization and bounded worker pools are critical for stable systems.

### Practical Guidelines

1. Prefer bounded concurrency (`maxWorkers`) over unbounded goroutine spawning.
2. Protect shared mutable state with mutexes or channel ownership.
3. Always define shutdown/completion signals (`WaitGroup`, context cancellation).
4. Run race detector frequently (`-race`).

### Example: Context-Aware Worker

```go
func worker(ctx context.Context, jobs <-chan BookImportRecord, out chan<- error) {
	for {
		select {
		case <-ctx.Done():
			return
		case record, ok := <-jobs:
			if !ok {
				return
			}
			_, err := NewBook(record.Title, record.Author, record.ISBN, record.PublishedYear)
			out <- err
		}
	}
}
```

### SDET Relevance

These patterns directly apply to parallel test execution, batch API checks, and multi-environment validation runs.

## Common Anti-Patterns

- Launching goroutines without a `WaitGroup` or channel to track completion, causing test races.
- Sharing mutable state across goroutines without a mutex or channel-based handoff.
- Skipping the race detector (`-race` flag) in test runs, missing data races silently.
- Starting goroutines inside tests without guaranteed cleanup when the test exits.

## Quick Goroutine Safety Checklist

- Is every goroutine launched in a test paired with a `WaitGroup.Wait()` or completion channel?
- Are all shared data structures protected by a mutex or accessed through a single owning goroutine?
- Does CI run tests with `-race` to surface data race conditions?
- Are goroutine leaks checked using `goleak` or equivalent in long-running test suites?



## Next Step

Continue with [Channels and Select](channels-and-select.md).
