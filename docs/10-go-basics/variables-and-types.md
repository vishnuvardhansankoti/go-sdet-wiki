# Variables and Types

Variables and types are the foundation of reliable Go programs. In SDET-focused systems, strong typing helps prevent invalid state, improves readability, and makes tests easier to write and maintain.

This section introduces:

- how values are declared and inferred,
- how type conversion works,
- how constants centralize domain rules,
- and how domain-specific types reduce runtime errors.

## Declaration

Go gives you two main declaration styles depending on context.

### var Statement

Use `var` when you want explicit type visibility, package-level declarations, or zero-value initialization before assignment.

```go
var name string = "John"
var age int = 30
var height float64 = 5.9
```

### Short Declaration

Use `:=` inside functions when the type is obvious from the assigned value. This is the most common style in day-to-day Go code.

```go
name := "John"
age := 30
height := 5.9
```

Choose clarity over brevity: explicit `var` is often better in public API code or when type inference may be unclear to readers.

## Basic Types

These built-in types cover most everyday application logic:

- **bool**: true or false
- **string**: Text
- **int**: Signed integers
- **float64**: Floating point numbers
- **complex128**: Complex numbers

In backend and API code, `string`, `int`, and `bool` dominate most domain models and transport payloads.

## Type Conversion

Go does not do implicit numeric/string conversions across unrelated types. You must convert explicitly, which prevents many accidental bugs.

```go
var i int = 42
var f float64 = float64(i)
var s string = strconv.Itoa(i)
```

This explicitness is a safety feature: when types change, compile-time errors surface early instead of silently producing incorrect behavior.

## Constants

Constants represent values that should not change at runtime, such as limits, status labels, and error codes.

```go
const pi = 3.14159
const name = "John"
```

In real systems, constants help avoid duplicated literals and enforce consistent behavior across modules and tests.

## Zero Values

Every Go type has a default zero value. Understanding these defaults is critical to avoid nil-pointer errors and uninitialized-state bugs.

- Numeric types: 0
- Boolean: false
- String: ""
- Pointers, slices, maps, channels, functions, interfaces: nil

SDET tip: many bugs come from assuming a collection is initialized. In Go, a nil slice can be ranged over safely, but a nil map cannot be assigned into without initialization.

## Understanding `nil` in Go

`nil` is Go's predeclared identifier for the zero value of reference-like types.

It applies to:

- pointers
- slices
- maps
- channels
- functions
- interfaces

`nil` is **not** a universal value for all types. For example, `int`, `bool`, and `string` never become `nil`; their zero values are `0`, `false`, and `""`.

### Quick Examples

```go
var p *int          // nil pointer
var s []string      // nil slice
var m map[string]int // nil map
var ch chan int     // nil channel
var fn func()       // nil function
var x interface{}   // nil interface
```

### Operations on Nil Values

Different nil-capable types behave differently. Knowing this avoids many runtime panics.

```go
package main

import "fmt"

func main() {
	var s []int
	fmt.Println(s == nil) // true
	fmt.Println(len(s))   // 0
	for _, v := range s { // safe: loop executes zero times
		fmt.Println(v)
	}

	var m map[string]int
	fmt.Println(m == nil) // true
	fmt.Println(m["x"])  // 0 (read is safe)
	// m["x"] = 1        // panic: assignment to entry in nil map
}
```

### Nil Interface Trap (Very Important)

An interface is `nil` only when both its dynamic type and value are nil.

```go
package main

import "fmt"

type MyErr struct{}

func (e *MyErr) Error() string { return "boom" }

func maybeError(fail bool) error {
	if !fail {
		return nil
	}
	var e *MyErr = nil
	return e // non-nil interface holding a nil *MyErr
}

func main() {
	err := maybeError(true)
	fmt.Println(err == nil) // false
}
```

SDET tip: this pattern can make tests fail in surprising ways. Prefer explicit error creation (for example, `errors.New(...)`) and direct `nil` returns.

## `nil` in Go vs `null` in Java (and similar languages)

At a high level, `nil` and `null` both represent "no object/reference". The details are different and matter in production systems.

### Similarities

- Both are used to represent absence of a referenced value.
- Dereferencing without checks can crash (panic in Go, `NullPointerException` in Java).

### Key Differences

1. **Type system behavior**
   - Go: only certain types can be `nil`.
   - Java: any reference type can be `null`; primitives (`int`, `boolean`) cannot.

2. **Collection defaults**
   - Go: zero-value slice/map is `nil`.
   - Java: collections are usually `null` unless initialized with `new ...`.

3. **Read/write behavior**
   - Go: reading from a nil map is safe; writing panics.
   - Java: calling methods on a null map/list throws `NullPointerException`.

4. **Language design style**
   - Go: encourages zero-value usability (for example, nil slices are often usable with `len`, `range`, append).
   - Java: often uses constructors and explicit initialization patterns.

### Side-by-Side Example

```go
// Go
var users []string
fmt.Println(len(users)) // 0
users = append(users, "alice") // works even when initially nil
```

```java
// Java
List<String> users = null;
// users.size(); // NullPointerException
users = new ArrayList<>();
users.add("alice");
```

## Practical Use Cases for `nil`

### 1. Optional dependencies in tests

In test doubles, a nil function field can mean "use default behavior".

```go
type FakeNotifier struct {
	SendFunc func(msg string) error
}

func (f FakeNotifier) Send(msg string) error {
	if f.SendFunc == nil {
		return nil // default no-op for tests
	}
	return f.SendFunc(msg)
}
```

### 2. Distinguish "not loaded" vs "loaded empty"

For API response shaping, nil and empty slices can communicate different states.

```go
type UserResponse struct {
	Tags []string `json:"tags,omitempty"`
}

// Tags == nil       => field omitted with omitempty
// Tags == []string{} => explicit empty list when omitempty is removed
```

### 3. Non-blocking select patterns with channels

Setting a channel to nil disables that case in `select`.

```go
var in chan int
// in is nil, so this case is disabled
select {
case v := <-in:
	fmt.Println(v)
default:
	fmt.Println("no input")
}
```

### 4. Pointer fields for optional input

Use pointers in request structs when you must distinguish "not provided" from zero value.

```go
type UpdateUserInput struct {
	DisplayName *string `json:"displayName"`
}

// nil  => client did not provide field
// ""   => client provided an empty string
```

## Next in Sequence

Continue with [make, Arrays, Slices, Maps](make-arrays-slices-maps.md) to learn how Go collections are initialized, modeled, and used in real-world test and service code.

## Best Practices

- Initialize maps with `make(...)` before writes.
- Prefer returning empty slices in APIs when clients expect arrays.
- Be careful with interface nil checks in error handling.
- In table-driven tests, explicitly include nil and empty cases.

Example test cases worth adding:

- nil slice input
- empty slice input
- nil map read
- nil map write (panic expected)
- typed nil error inside interface

## Quick Exercises

Try these short exercises before moving to the assignment.

### Exercise 1: Typed Price Calculator

Goal: Practice variables, constants, type conversion, and zero values.

1. Create constants `TaxRate` and `DiscountRate`.
2. Declare variables for `basePrice`, `quantity`, and `couponApplied`.
3. Compute final total as `float64` and print it.
4. Add one edge-case check for zero quantity.

Stretch: Create a named type `Currency float64` and use it in your calculation.

## Assignment: Part 1 - Define Domain Constants and Types

### Goal
Create type definitions and constants for the Bookshelf API domain model.

This assignment establishes the vocabulary of your domain. If the constants and types are clean here, later service and handler logic becomes much simpler and safer.

### Tasks

#### 1. Create `pkg/domain/constants.go`

This file defines all constant values used throughout the application:

By centralizing these values, you eliminate scattered magic numbers/strings and make rule updates deterministic.

```go
package domain

// User status constants
const (
	UserStatusActive   = "ACTIVE"
	UserStatusInactive = "INACTIVE"
)

// Book status in reading list
const (
	StatusWantToRead      = "WANT_TO_READ"
	StatusCurrentlyReading = "CURRENTLY_READING"
	StatusCompleted       = "COMPLETED"
)

// Review rating constants
const (
	MinRating = 1
	MaxRating = 5
)

// Validation constraints
const (
	MinEmailLength    = 5
	MaxEmailLength    = 254
	MinPasswordLength = 8
	MaxPasswordLength = 128
	MinTitleLength    = 1
	MaxTitleLength    = 500
	MinAuthorLength   = 1
	MaxAuthorLength   = 500
	MaxReviewComment  = 5000
)

// Error messages (used later in validation)
const (
	ErrInvalidEmail      = "invalid email format"
	ErrInvalidPassword   = "password must be at least 8 characters"
	ErrDuplicateEmail    = "email already registered"
	ErrInvalidRating     = "rating must be between 1 and 5"
	ErrInvalidTitle      = "title is required and cannot exceed 500 characters"
	ErrInvalidAuthor     = "author is required and cannot exceed 500 characters"
	ErrUserNotFound      = "user not found"
	ErrBookNotFound      = "book not found"
	ErrBookNotInShelf    = "book not in user's shelf"
	ErrInvalidReadingStatus = "invalid reading status"
)
```

#### 2. Create Basic Types for IDs
Create `pkg/domain/types.go`:

```go
package domain

import "time"

// ID types for strong typing
type (
	UserID     string
	BookID     string
	ReviewID   string
	ShelfEntryID string
	ReadingListID string
)

// NewUserID creates a new UserID
func NewUserID(id string) UserID {
	return UserID(id)
}

// NewBookID creates a new BookID
func NewBookID(id string) BookID {
	return BookID(id)
}

// NewReviewID creates a new ReviewID
func NewReviewID(id string) ReviewID {
	return ReviewID(id)
}

// String converts UserID to string
func (id UserID) String() string {
	return string(id)
}

// String converts BookID to string
func (id BookID) String() string {
	return string(id)
}

// String converts ReviewID to string
func (id ReviewID) String() string {
	return string(id)
}

// Timestamps are always time.Time in Go
// Use UTC to avoid timezone confusion
var (
	NowFunc = time.Now // Allows overriding time in tests
)

func Now() time.Time {
	return NowFunc()
}
```

Using dedicated ID types prevents accidental parameter swaps and makes function signatures self-documenting.

### Why This Matters

1. **Constants prevent magic strings** - "WANT_TO_READ" vs "want_to_read" vs "wantToRead"
2. **Type safety** - UserID(id) ensures we're working with user IDs, not generic strings
3. **Validation thresholds** - Easy to enforce min/max lengths consistently
4. **Error messages** - Centralized and testable

Together, these patterns create a stable foundation for domain validation and predictable test assertions.

### Expected Output

Running `go mod tidy` should succeed:

```bash
go mod tidy
```

All files should be compilable:

```bash
go build ./pkg/domain
```

### Files Created This Step

```
pkg/domain/
├── constants.go       # All constants
└── types.go          # Type definitions and ID helpers
```

### What's Next

In the next part, you'll create the main domain structs (User, Book, Review) using these constants and types.

## Deep Dive: Variables and Types in Real Systems

### Why SDETs Should Care

Type choices directly affect test reliability. Weakly typed or inconsistent data models often cause flaky validations and confusing failures. In Go, strong typing helps catch issues during compilation before tests even run.

This means many failures shift left from runtime to compile time, which shortens debugging loops and improves CI stability.

### Domain Modeling Tips

1. Prefer explicit domain types (for example, `UserID`, `BookID`) over plain `string`.
2. Keep constants close to the domain they describe.
3. Centralize validation limits to avoid drift between code and tests.
4. Expose helper constructors for clarity in tests.
5. Keep type aliases meaningful and consistent across packages.

### Example: Avoiding Primitive Obsession

```go
// Less safe
func AssignBookToUser(userID string, bookID string) error {
	return nil
}

// Safer and clearer
func AssignBookToUser(userID UserID, bookID BookID) error {
	return nil
}
```

### Common Pitfalls

- Repeating literal status strings in multiple files.
- Using `int` IDs in one package and `string` IDs in another.
- Embedding validation numbers directly inside functions.
- Mixing transport DTO fields with domain-only fields too early.
- Using plain `string` where constrained domain values should be typed.

### SDET Perspective

When domain types are explicit, your test data builders, table-driven tests, and contract assertions become cleaner and less error-prone.

### Additional Practice

Try adding `ReadingProgress` as a domain type:

```go
type ReadingProgress int

const (
	ProgressNotStarted ReadingProgress = 0
	ProgressInProgress ReadingProgress = 50
	ProgressCompleted  ReadingProgress = 100
)
```

Then write tests asserting only valid progress values are accepted.

## Common Anti-Patterns

- Using primitive types (`string`, `int`) for domain identifiers instead of named types, allowing accidental cross-assignment.
- Declaring variables with `var` and leaving them as zero values when a constructor should enforce invariants.
- Using unexported types in public API signatures, breaking usability across packages.
- Overusing `interface{}` or `any` for data that has a known, stable shape.

## Quick Variables and Types Checklist

- Are domain identifiers declared as named types rather than raw primitives?
- Are zero values meaningful, or should a constructor be used to enforce valid initial state?
- Are all exported types and functions usable from external packages without type assertions?
- Have type-related test cases been added for boundary values and invalid inputs?

## Continue Learning

To build on this chapter, continue in this order:

1. [Pointers in Go](pointers-in-go.md) - Understand mutation, pointer receivers, and Go vs C/C++ pointer behavior.
2. [Packages in Go](packages-in-go.md) - Learn package boundaries, exports/imports, and Java/C++ parallels.

