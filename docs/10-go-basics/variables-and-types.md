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

