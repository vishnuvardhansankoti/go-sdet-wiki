# Pointers in Go

Pointers in Go are a tool for sharing or mutating data efficiently, not a low-level memory-control feature like in C or C++. If you understand this mindset shift, pointer usage becomes simpler and safer.

In this section, focus on four outcomes:

- what pointers are and how address/dereference work,
- when pointers are useful in everyday Go code,
- how Go pointers compare to C/C++ pointers,
- and how to avoid common pointer-related bugs.

## What Is a Pointer?

A pointer is a value that stores the memory address of another value.

In Go:

- `&x` gives you the address of `x`
- `*p` dereferences pointer `p` and gives you the value it points to
- `*T` means "pointer to type `T`"

```go
package main

import "fmt"

func main() {
    x := 42
    p := &x

    fmt.Println("x:", x)
    fmt.Println("p (address):", p)
    fmt.Println("*p (value at address):", *p)

    *p = 100
    fmt.Println("x after *p = 100:", x)
}
```

<div class="go-playground">
  <textarea class="go-code" rows="12">package main

import "fmt"

func main() {
    x := 42
    p := &x

    fmt.Println("x:", x)
    fmt.Println("p (address):", p)
    fmt.Println("*p (value at address):", *p)

    *p = 100
    fmt.Println("x after *p = 100:", x)
}
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


Key takeaway: writing through `*p` updates the original value.

## Nil Pointers and Zero Values

The zero value of a pointer is `nil`. A nil pointer points to nothing.

```go
var p *int
fmt.Println(p == nil) // true
```

Dereferencing a nil pointer causes a panic:

```go
// panic: runtime error: invalid memory address or nil pointer dereference
fmt.Println(*p)
```

Always ensure a pointer is non-nil before dereferencing.

## Pointers and Function Calls

Go always passes arguments by value. That includes pointers themselves.

- Passing a non-pointer copies the value.
- Passing a pointer copies the address, so both caller and callee can access the same underlying value.

```go
package main

import "fmt"

func incrementByValue(n int) {
    n++
}

func incrementByPointer(n *int) {
    (*n)++
}

func main() {
    a := 10
    incrementByValue(a)
    fmt.Println("after incrementByValue:", a) // 10

    incrementByPointer(&a)
    fmt.Println("after incrementByPointer:", a) // 11
}
```

<div class="go-playground">
  <textarea class="go-code" rows="12">package main

import "fmt"

func incrementByValue(n int) {
    n++
}

func incrementByPointer(n *int) {
    (*n)++
}

func main() {
    a := 10
    incrementByValue(a)
    fmt.Println("after incrementByValue:", a) // 10

    incrementByPointer(&a)
    fmt.Println("after incrementByPointer:", a) // 11
}
  </textarea>

  <button class="go-run-btn" onclick="runGoPlayground(this)">Run</button>

  <pre class="go-output"></pre>
</div>


Use pointer parameters when the function needs to modify caller-owned data or avoid large copies.

## Pointers with Structs

Pointer-to-struct is one of the most common pointer patterns in Go.

```go
type User struct {
    Name  string
    Score int
}

func addPoints(u *User, points int) {
    u.Score += points
}
```

Go allows shorthand field access on pointers (`u.Score` instead of `(*u).Score`).

This makes pointer-based code readable while still giving mutation semantics.

## Method Receivers: Value vs Pointer

Methods can use value receivers or pointer receivers.

Value receiver:

- gets a copy,
- good for read-only behavior,
- mutation does not affect the original.

Pointer receiver:

- gets access to original data,
- use when method mutates state,
- avoids copying large structs.

```go
type Counter struct {
    Value int
}

func (c Counter) Read() int {
    return c.Value
}

func (c *Counter) Inc() {
    c.Value++
}
```

When a type has any mutating method, teams often standardize on pointer receivers for consistency.

## Parallel with C/C++ Pointers

Go and C/C++ both have address-of and dereference operators, but their design goals differ.

### Similarities

- `&` gets an address
- `*` dereferences
- pointer values can be passed to functions for in-place updates

### Core Differences

1. No pointer arithmetic in Go

In C/C++, pointer arithmetic is common:

```cpp
int arr[3] = {10, 20, 30};
int* p = arr;
p = p + 1;
```

In Go, this is not allowed in normal code. This removes a large class of memory bugs.

2. No manual memory management in normal Go

C/C++ requires explicit lifetime handling (`malloc/free`, `new/delete`, RAII patterns).

Go uses garbage collection. You usually do not free memory manually.

3. No arbitrary pointer casting in safe Go

C/C++ allows many low-level casts. Go restricts this in safe code. Low-level operations are pushed into the `unsafe` package and should be rare.

4. Returned pointers to local variables are safe in Go

In C/C++, returning pointer to stack local is usually invalid.

In Go, this pattern is safe because compiler escape analysis moves data to heap when necessary.

5. Simpler pointer model for application code

Go pointers are designed for clarity and safety in service-level programming, not for direct memory layout control in everyday code.

## Quick Comparison Table

| Topic | Go | C/C++ |
| --- | --- | --- |
| Pointer arithmetic | Not allowed (safe Go) | Allowed |
| Memory management | Garbage collected | Manual or RAII/smart pointers |
| Null pointer | `nil` | `nullptr` / `NULL` |
| Return pointer to local | Safe with escape analysis | Unsafe (dangling pointer risk) |
| Arbitrary pointer casts | Restricted (`unsafe` needed) | Commonly allowed |

## Go Garbage Collector (GC)

Go uses an automatic garbage collector to reclaim heap memory that is no longer reachable.

For SDETs and service engineers, this matters because memory pressure and GC pauses can affect test stability, latency, and throughput under load.

### What GC Does

At a high level, Go's GC is a concurrent mark-and-sweep collector:

1. Mark: find objects still reachable from live references.
2. Sweep: reclaim objects that are no longer reachable.
3. Repeat: run continuously as allocation pressure grows.

Most of this work happens concurrently with your program, which keeps stop-the-world pauses relatively small in typical workloads.

### Stack vs Heap and Escape Analysis

Not every value is GC-managed.

- Stack allocations are typically cheap and released automatically when a function returns.
- Heap allocations are tracked by GC.

Go's compiler uses escape analysis to decide where a value lives. If a value must outlive the current stack frame, it "escapes" to heap.

Practical tip: fewer unnecessary heap allocations usually means less GC work.

### Minimal Example: Forcing and Observing GC

```go
package main

import (
    "fmt"
    "runtime"
)

func main() {
    var m runtime.MemStats

    runtime.ReadMemStats(&m)
    fmt.Printf("Before allocation: HeapAlloc=%d KB, NumGC=%d\n", m.HeapAlloc/1024, m.NumGC)

    // Allocate several MB to create memory pressure.
    data := make([][]byte, 0, 20)
    for i := 0; i < 20; i++ {
        data = append(data, make([]byte, 512*1024)) // 512 KB each
    }

    runtime.ReadMemStats(&m)
    fmt.Printf("After allocation:  HeapAlloc=%d KB, NumGC=%d\n", m.HeapAlloc/1024, m.NumGC)

    // Drop references so memory becomes collectible.
    data = nil
    runtime.GC()

    runtime.ReadMemStats(&m)
    fmt.Printf("After GC:          HeapAlloc=%d KB, NumGC=%d\n", m.HeapAlloc/1024, m.NumGC)
}
```

### GC Tuning Basics

Default behavior works well for most services. Tune only when profiling shows memory/latency pain.

- `GOGC` controls how aggressively GC runs.
- Lower `GOGC` -> more frequent collection, lower memory footprint, potentially more CPU overhead.
- Higher `GOGC` -> less frequent collection, higher memory footprint, potentially lower GC CPU overhead.

You can set it with environment variable:

```bash
GOGC=100 go test ./...
```

Or at runtime for experiments:

```go
import "runtime/debug"

func main() {
    old := debug.SetGCPercent(200)
    _ = old // keep old value if you want to restore later
}
```

### Common GC-Aware Coding Patterns

1. Reuse buffers where practical to reduce allocation churn.
2. Avoid keeping long-lived references to large objects unintentionally.
3. Prefer streaming for large payloads instead of loading everything into memory.
4. Profile first: use `pprof` and allocation profiles before tuning.

### Example: Reusing Temporary Objects with sync.Pool

```go
package main

import (
    "bytes"
    "fmt"
    "sync"
)

var bufPool = sync.Pool{
    New: func() interface{} {
        return new(bytes.Buffer)
    },
}

func formatMessage(name string) string {
    b := bufPool.Get().(*bytes.Buffer)
    b.Reset()
    defer bufPool.Put(b)

    b.WriteString("Hello, ")
    b.WriteString(name)
    return b.String()
}

func main() {
    fmt.Println(formatMessage("SDET"))
}
```

Use pooling selectively. Overusing pools can add complexity and sometimes hurt performance if objects are small or usage is low.

## Pointers and "Reference-like" Types in Go

Some Go types already behave like references without explicit pointer syntax:

- slices
- maps
- channels
- functions

Examples:

- passing a map to a function can mutate shared map contents,
- passing a slice can mutate underlying array elements.

Because of this, not every mutable operation needs `*T` pointers.

## Practical Rules of Thumb

Use pointers when:

- the function/method must mutate a struct,
- struct copy cost is high,
- you need a nil-able field to represent optional data.

Prefer values when:

- data is small and immutable-like,
- you want simpler ownership semantics,
- nil handling would add unnecessary complexity.

## Common Pitfalls

- Dereferencing nil pointers
- Mixing value and pointer receivers inconsistently
- Using pointers for tiny immutable data where value semantics are clearer
- Assuming pointer use always improves performance (measure first)

## Quick Exercises

Try these exercises before starting the assignment.

### Exercise 1: Pointer Mutation and Nil Safety

Goal: Build confidence with address-of, dereference, in-place updates, and nil checks.

1. Create function `ApplyBonus(score *int, bonus int) error`.
2. If `score == nil`, return an error instead of panicking.
3. Update the original value through the pointer.
4. In `main`, demonstrate:
    - a successful update,
    - a nil-pointer call and handled error.

Stretch: Reject negative resulting scores and keep the old value unchanged when invalid.

### Exercise 2: Value vs Pointer Receiver Behavior

Goal: Understand method receiver semantics in a realistic domain model.

1. Create struct `Session` with fields: `ID string`, `Retries int`, `Active bool`.
2. Add method `Touch()` with value receiver that tries to increment retries.
3. Add method `Activate()` with pointer receiver that sets `Active = true` and increments retries.
4. In `main`, call both methods and print the struct after each call.
5. Explain in comments why one mutation persists and the other does not.

Stretch: Convert `Touch()` to pointer receiver and compare outputs.

## Assignment: Pointer-Based Updates in Bookshelf Domain

### Goal
Use pointer receivers to model safe state changes on domain entities.

### Tasks

#### 1. Add pointer-receiver state mutation method

Create `pkg/domain/shelf_entry_methods.go` with a pointer receiver method:

```go
package domain

import "time"

// ShelfEntry represents a user's relation to a book.
type ShelfEntry struct {
    UserID    UserID
    BookID    BookID
    Status    string
    UpdatedAt time.Time
}

// SetStatus updates reading status and timestamp.
func (s *ShelfEntry) SetStatus(status string) error {
    if status != StatusWantToRead && status != StatusCurrentlyReading && status != StatusCompleted {
        return NewValidationError(ErrInvalidReadingStatus)
    }

    s.Status = status
    s.UpdatedAt = Now()
    return nil
}
```

Why pointer receiver here:

- method mutates the existing shelf entry,
- caller should see updated status and timestamp,
- avoids copying struct for each update operation.

#### 2. Add value-receiver read helper

In the same file, add a read-only method with value receiver:

```go
// IsCompleted reports whether the shelf entry is completed.
func (s ShelfEntry) IsCompleted() bool {
    return s.Status == StatusCompleted
}
```

This demonstrates mixed receiver usage: pointer for mutations, value for read-only checks.

#### 3. Add unit tests for pointer behavior

Create `pkg/domain/shelf_entry_methods_test.go`:

```go
package domain

import "testing"

func TestShelfEntry_SetStatus_MutatesOriginal(t *testing.T) {
    entry := &ShelfEntry{Status: StatusWantToRead}

    err := entry.SetStatus(StatusCurrentlyReading)
    if err != nil {
        t.Fatalf("SetStatus returned error: %v", err)
    }

    if entry.Status != StatusCurrentlyReading {
        t.Fatalf("expected status %s, got %s", StatusCurrentlyReading, entry.Status)
    }
}

func TestShelfEntry_SetStatus_InvalidValue(t *testing.T) {
    entry := &ShelfEntry{Status: StatusWantToRead}

    err := entry.SetStatus("INVALID")
    if err == nil {
        t.Fatalf("expected validation error for invalid status")
    }
}

func TestShelfEntry_IsCompleted(t *testing.T) {
    entry := ShelfEntry{Status: StatusCompleted}
    if !entry.IsCompleted() {
        t.Fatalf("expected IsCompleted to be true")
    }
}
```

### Expected Output

After this assignment, you should have:

```text
pkg/domain/
  shelf_entry_methods.go
  shelf_entry_methods_test.go
```

### Verification

```bash
go build ./pkg/domain
go test ./pkg/domain -run ShelfEntry -count=1
```

### Extension

Add another pointer-receiver method `MarkCompleted()` that sets status to `StatusCompleted` and updates `UpdatedAt`, then add a unit test for it.

## Deep Dive: Why Go Pointers Feel Different from C/C++

### Mental Model Shift

In C/C++, pointers are central to memory control.
In Go, pointers are mostly about data-sharing and mutation semantics.

That shift changes design priorities:

- from "how do I control allocation exactly?"
- to "how do I keep code correct, readable, and testable?"

### SDET Recommendation

When reviewing pointer-heavy code in services:

1. Check for nil safety before dereference.
2. Check receiver consistency across the type.
3. Check whether pointer usage is required or incidental.
4. Add tests for mutation behavior, not just return values.

### Pointer Safety Checklist

- Is nil handling explicit where pointer can be absent?
- Are mutating methods using pointer receivers?
- Is there a clear reason for pointer use?
- Are tests asserting state changes after method calls?
- Are unsafe pointer operations avoided in application logic?

## Next Step

Continue with [Structs & Interfaces](structs-and-interfaces.md) and observe how pointer receivers and interfaces work together in domain and service design.
