# Control Flow

Use `if` when you need to branch based on a condition and keep the decision close to the code that depends on it.
## If Statement

```go
if age >= 18 {
    fmt.Println("Adult")
} else if age >= 13 {
    fmt.Println("Teen")
} else {
    fmt.Println("Child")
}
```
Use `for` when you need repetition, either with a fixed counter or by iterating over a collection.

## For Loop
Use the traditional `for` form when you need a counter-driven loop with an explicit start, stop, and step.

### Traditional Loop
```go
for i := 0; i < 10; i++ {
    fmt.Println(i)
}
```
Use `range` when you want to walk through slices, arrays, maps, or strings and work with each item directly.

### Range Loop
```go
numbers := []int{1, 2, 3, 4, 5}
for i, num := range numbers {
    fmt.Println(i, num)
}
```
Use `switch` when one value or expression can match several meaningful outcomes and you want a clearer alternative to chained `if` statements.

## Switch Statement

```go
switch day {
case "Monday":
    fmt.Println("Start of week")
case "Friday":
    fmt.Println("Almost weekend")
default:
    fmt.Println("Middle of week")
}
Use `defer` when cleanup or finalization should always run after the surrounding function finishes.
```

## Defer Statement

```go
defer fmt.Println("Last")
fmt.Println("First")
fmt.Println("Second")
// Output: First, Second, Last
```

## Deep Dive: Control Flow for Testable Code

### Background

Control flow is not just syntax. It is how you encode business rules in a readable and testable way. Clean branches make edge-case tests straightforward.

### Prefer Early Returns

```go
func ValidateCreateUserRequest(email, password string) error {
    if email == "" {
        return fmt.Errorf("email is required")
    }
    if len(password) < 8 {
        return fmt.Errorf("password too short")
    }
    return nil
}
```

This pattern reduces nesting and improves failure diagnostics.

### Switch for Domain States

```go
func IsValidShelfStatus(status string) bool {
    switch status {
    case "WANT_TO_READ", "CURRENTLY_READING", "COMPLETED":
        return true
    default:
        return false
    }
}
```

### Defer for Safe Cleanup

In tests and HTTP handlers, `defer` is essential for releasing resources:

```go
resp, err := http.Get("https://example.com")
if err != nil {
    return err
}
defer resp.Body.Close()
```

### SDET-Focused Examples

- Use `for` + table-driven cases to run many scenarios.
- Use `switch` for HTTP status handling in API test helpers.
- Use `defer` for cleanup in container/database tests.

### Practice Exercise

Write `CanTransitionStatus(from, to string) bool` with `switch`, then add table-driven tests for valid and invalid transitions.

## Quick Exercises (SDET Focus)

Try these exercises before moving to the next chapter.

### Exercise 1: Status Transition Validator

Goal: Practice `if` + `switch` with testable branch logic.

1. Implement `ValidateTransition(from, to string) error` for reading states (`WANT_TO_READ`, `CURRENTLY_READING`, `COMPLETED`).
2. Reject invalid transitions (for example, `COMPLETED -> CURRENTLY_READING`).
3. Return descriptive errors with context (`from`, `to`).
4. Add table-driven tests for all valid and invalid transition pairs.

Stretch: Add a helper that groups errors by transition type for diagnostics.

### Exercise 2: Deferred Cleanup in Test Helpers

Goal: Practice reliable cleanup paths with early returns.

1. Create function `FetchAndValidate(url string) error`.
2. Use early returns for status-code and body validation failures.
3. Ensure `defer resp.Body.Close()` is called exactly once after a successful request.
4. Write tests for success and failure paths to prove cleanup-safe control flow.

Stretch: Add a timeout path and assert that cleanup still runs.

## Common Anti-Patterns

- Nesting multiple `if` blocks instead of using early returns to reduce indentation.
- Using `switch` with `fallthrough` without an explicit comment explaining the intent.
- Forgetting `defer` cleanup when a function has multiple early return paths.
- Capturing a loop variable inside a goroutine closure without shadowing it first.

## Quick Control Flow Checklist

- Are happy-path returns at the bottom and guard clauses at the top?
- Are `switch` statements used for multi-branch dispatch instead of `if/else if` chains?
- Is `defer` used consistently for all resource cleanup in functions that open connections or files?
- Have loop variable capture bugs been tested with the race detector?



## Next Step

Continue with [Functions and Methods](functions-and-methods.md).
