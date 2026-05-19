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
```

Use `defer` when cleanup or finalization should always run after the surrounding function finishes.

## Defer Statement

```go
defer fmt.Println("Last")
fmt.Println("First")
fmt.Println("Second")
// Output: First, Second, Last
```

`defer` schedules a call to run right before the current function returns. This makes cleanup reliable, even when the function exits early due to an error.

If you have used `finally` in Java or C#, the closest mental model is "cleanup that runs at the end of the current scope." The similarity is useful, but the implementation details are different enough that it is easy to make wrong assumptions when moving between languages.

### `defer` vs `finally`

Similarities:

- Both are commonly used for cleanup.
- Both help ensure resources are released even when a function exits early.
- Both are useful for closing files, releasing locks, and restoring state.

Differences:

- `finally` is a language block attached to `try/catch`; `defer` is a statement that registers a function call.
- `finally` runs after the `try` or `catch` block finishes; `defer` runs when the surrounding function returns.
- Go allows multiple deferred calls, and they run in reverse order.
- `defer` arguments are evaluated immediately, not when the function exits.
- `defer` can work with `panic` and `recover`; `finally` is usually discussed in exception-based control flow.

### Comparing the Same Cleanup Pattern

Java/C# style:

```java
BufferedReader reader = null;
try {
    reader = new BufferedReader(new FileReader("config.txt"));
    System.out.println(reader.readLine());
} catch (IOException ex) {
    System.out.println("read failed: " + ex.getMessage());
} finally {
    if (reader != null) {
        try {
            reader.close();
        } catch (IOException ex) {
            System.out.println("close failed: " + ex.getMessage());
        }
    }
}
```

Go style:

```go
f, err := os.Open("config.txt")
if err != nil {
    return err
}
defer f.Close()

data, err := io.ReadAll(f)
if err != nil {
    return err
}
fmt.Println(string(data))
```

The Go version is shorter because cleanup is expressed as a deferred function call instead of a separate `finally` block. That makes the happy path easier to read.

### Important Behavior Differences

#### 1. Deferred arguments are captured immediately

```go
func demo() {
    value := 1
    defer fmt.Println("value:", value)
    value = 2
}
// Output: value: 1
```

This is different from many developers' intuition about `finally`, where they expect the cleanup block to read the "latest" values at the end of execution.

#### 2. Multiple deferred calls run in reverse order

```go
func demo() {
    defer fmt.Println("first defer")
    defer fmt.Println("second defer")
    fmt.Println("work")
}
// Output:
// work
// second defer
// first defer
```

That reverse order matters when cleanup has dependencies, such as unlocking a mutex after closing a span or rolling back a transaction before closing a connection.

#### 3. `defer` can modify named return values

```go
func divide(a, b int) (result int, err error) {
    defer func() {
        if err != nil {
            err = fmt.Errorf("divide failed: %w", err)
        }
    }()

    if b == 0 {
        return 0, fmt.Errorf("division by zero")
    }

    return a / b, nil
}
```

This is a Go-specific pattern. It has no direct equivalent in a standard `finally` block because `finally` is not designed around named return values.

#### 4. `defer` still runs during panic unwinding

```go
func demo() {
    defer fmt.Println("cleanup runs")
    panic("boom")
}
```

This makes `defer` very useful for cleanup in test helpers, goroutines, and resource managers.

### When `defer` Is the Better Choice

- Closing files, sockets, HTTP response bodies, and database rows.
- Unlocking mutexes immediately after locking.
- Deferring transaction rollback before a later commit.
- Making test setup and teardown easier to read.
- Capturing cleanup close to the point where the resource is acquired.

### When `finally` Feels Different in Practice

In Java or C#, developers often rely on `try/finally` around a block of code. In Go, the idiom is usually to acquire a resource and immediately defer its cleanup in the same function.

That means Go code often looks like this:

```go
func handleRequest() error {
    conn, err := db.Open()
    if err != nil {
        return err
    }
    defer conn.Close()

    return doWork(conn)
}
```

The cleanup intent stays local, which makes the function easier to scan than a distant cleanup block.

Key rules to remember:

- Deferred calls run in **LIFO order** (last deferred, first executed).
- Arguments to deferred functions are evaluated **immediately** when `defer` is encountered, not when it executes later.
- Deferred calls still run when a function panics (unless the program exits abruptly).

```go
func demo() {
    defer fmt.Println("cleanup 1")
    defer fmt.Println("cleanup 2")
    fmt.Println("work")
}
// Output:
// work
// cleanup 2
// cleanup 1
```

For SDET workflows, this is especially useful in tests and integration helpers:

Common use cases where `defer` is especially helpful:

- Closing resources opened in the same function (`file.Close()`, `resp.Body.Close()`, `rows.Close()`).
- Releasing locks safely with `defer mu.Unlock()` right after `mu.Lock()`.
- Rolling back database transactions on failure paths (`defer tx.Rollback()` before commit logic).
- Capturing final metrics/logs such as elapsed time at function exit.
- Cleaning up temporary test state (temp files, environment variables, mock servers).

```go
func LoadConfig(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close() // guaranteed cleanup on every return path

    // parse file
    return nil
}
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
