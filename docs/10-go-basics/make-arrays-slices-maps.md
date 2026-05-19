# make, Arrays, Slices, and Maps

Collections are where many real-world Go programs spend most of their time.
For SDETs, these types are critical when modeling test data, building request payloads, grouping assertions, and tracking observed results.

This page covers:

- when to use arrays vs slices,
- how `make` initializes runtime-backed types,
- how maps work for lookup-heavy logic,
- and common patterns, trade-offs, and pitfalls.

## Why This Matters

In test and service code, collection choices affect:

- correctness (nil handling and mutation behavior),
- performance (allocation and copying),
- readability (clear intent for fixed vs dynamic data),
- and maintainability (fewer hidden side effects).

A clear mental model of these four topics will prevent many subtle bugs.

## Arrays

An array is a fixed-length sequence of elements of the same type.
Its length is part of its type.

```go
var ports [3]int = [3]int{80, 443, 8080}
fmt.Println(ports) // [80 443 8080]
```

### Key Properties

- Fixed size: cannot grow or shrink.
- Value semantics: assigning an array copies all elements.
- Comparable: arrays are comparable when element types are comparable.

```go
a := [2]string{"up", "down"}
b := a
b[0] = "left"
fmt.Println(a) // [up down]
fmt.Println(b) // [left down]
```

### Use Cases

- Fixed protocol fields (for example, 16-byte identifiers).
- Small immutable lookup-like sets where size is known at compile time.
- Interop cases where APIs explicitly require arrays.

### Advantages

- Strong compile-time guarantees about size.
- Predictable memory layout.
- Easy equality checks for many element types.

### Limitations

- Inflexible for dynamic workloads.
- Copying large arrays can be expensive.
- Less common in application-level business logic than slices.

## Slices

A slice is a dynamic view over an underlying array.
Most Go collection work uses slices.

```go
users := []string{"alice", "bob"}
users = append(users, "charlie")
fmt.Println(users) // [alice bob charlie]
```

### Slice Internals (Practical View)

A slice header conceptually stores:

- pointer to underlying array,
- current length (`len`),
- current capacity (`cap`).

```go
scores := make([]int, 2, 5)
fmt.Println(len(scores), cap(scores)) // 2 5
```

### Shared Backing Array Behavior

Two slices can reference overlapping data.
Mutating one can affect the other.

```go
base := []int{10, 20, 30, 40}
left := base[:2]  // [10 20]
right := base[1:] // [20 30 40]

left[1] = 999
fmt.Println(base)  // [10 999 30 40]
fmt.Println(right) // [999 30 40]
```

SDET tip: if you pass slices into helpers that mutate elements, document that behavior clearly or make a defensive copy.

### Safe Copy Pattern

```go
input := []string{"a", "b", "c"}
copyForSort := append([]string(nil), input...)
// mutate copyForSort safely
```

### Use Cases

- Test data tables and dynamic result sets.
- Batch request processing.
- Building filtered or transformed collections.

### Advantages

- Dynamic growth with `append`.
- Efficient iteration and composable operations.
- Works naturally with most Go APIs.

### Limitations

- Shared backing arrays can cause accidental side effects.
- Capacity growth can trigger reallocations (and copies).
- Nil vs empty semantics require intentional handling for JSON and APIs.

## `make` in Go

`make` initializes and returns values for:

- slices,
- maps,
- channels.

It does not work for structs, arrays, or basic types.

```go
s := make([]int, 3)          // len=3, cap=3
m := make(map[string]int)    // ready for writes
ch := make(chan string, 10)  // buffered channel
```

### `make` vs `new`

- `make(T, ...)` returns an initialized value of type `T` for slice/map/channel.
- `new(T)` returns `*T` (pointer), zero-initialized.

```go
p := new(int)        // *int
*p = 42

m := make(map[string]int) // map[string]int
m["ok"] = 1
```

### Why `make` Matters

A nil map cannot be written to.
`make` prevents panic for write operations.

```go
var counts map[string]int
// counts["pass"]++ // panic: assignment to entry in nil map

counts = make(map[string]int)
counts["pass"]++ // safe
```

### Use Cases

- Pre-sizing slices for known workloads (`make([]T, 0, n)`).
- Initializing aggregation maps for test runs.
- Creating channels for worker pools and pipelines.

### Advantages

- Correct initialization for runtime-backed types.
- Better performance when capacity is planned.
- Cleaner intent than deferred lazy setup in many paths.

## Maps

A map stores key-value pairs with fast average lookup.
Keys must be comparable.

```go
statusCount := map[string]int{
	"passed": 12,
	"failed": 3,
}

statusCount["skipped"] = 2
fmt.Println(statusCount["failed"]) // 3
```

### Reading and Existence Check

Use the two-value form to distinguish "missing key" from zero value.

```go
retries := map[string]int{"api-a": 0}

v, ok := retries["api-b"]
fmt.Println(v, ok) // 0 false
```

### Iteration Order

Map iteration order is intentionally randomized.
Do not rely on ordering in tests.

```go
for k, v := range statusCount {
	fmt.Println(k, v)
}
```

SDET tip: sort keys before asserting deterministic output.

```go
keys := make([]string, 0, len(statusCount))
for k := range statusCount {
	keys = append(keys, k)
}
slices.Sort(keys)
```

### Use Cases

- Grouping test outcomes by category.
- Fast lookup of fixture data by ID.
- Deduplication and membership checks (`map[T]struct{}`).

### Advantages

- Fast average-case reads and writes.
- Expressive for indexing and aggregations.
- Reduces nested loops for lookup-heavy logic.

### Limitations

- No stable iteration order.
- Key types must be comparable.
- Concurrent writes need synchronization.

## Arrays vs Slices vs Maps

Use this quick decision guide:

- Use array when size is fixed and part of the meaning.
- Use slice for ordered, dynamic sequences.
- Use map for key-based access and grouping.

### Example: Test Result Processing

```go
type Result struct {
	Suite  string
	Passed bool
}

func Summarize(results []Result) map[string]int {
	counts := make(map[string]int)
	for _, r := range results {
		key := "failed"
		if r.Passed {
			key = "passed"
		}
		counts[key]++
	}
	return counts
}
```

This pattern is common in CI quality-gate reporting.

## Common Pitfalls

1. Writing to a nil map.
2. Assuming map iteration order is stable.
3. Unexpected mutation from shared slice backing arrays.
4. Overusing arrays when slices are the intended abstraction.
5. Ignoring capacity planning in hot paths.

## Practical Recommendations

1. Default to slices for ordered collections.
2. Use maps for indexing, grouping, and dedupe scenarios.
3. Use `make([]T, 0, n)` when expected size is known.
4. Use defensive slice copies in test helpers that mutate data.
5. Sort map keys in tests before assertion.

## Quick Recap

- Arrays are fixed-size value types.
- Slices are dynamic, ergonomic, and most commonly used.
- Maps are key-value stores with fast lookup.
- `make` initializes slices, maps, and channels correctly.

With these four tools, you can model most data-flow needs in Go services and test frameworks with confidence.
