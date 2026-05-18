# Testing Package Basics

Go's built-in `testing` package is intentionally simple, but it is powerful enough to build production-grade test suites. Understanding these basics well gives you a strong foundation for all later testing layers.

In this section, you will learn how to run tests, write clear assertions, manage setup/teardown, and measure coverage in a way that scales with real projects.

## Running Tests

These are the most common commands you'll use day-to-day:

```bash
go test ./...
go test -v ./...
go test -run TestUserService ./...
```

Quick guidance:

- `go test ./...` runs all package tests recursively.
- `-v` shows detailed per-test output.
- `-run` filters tests by name for focused iteration.

## Basic Test Function

A standard Go test function follows the pattern: arrange inputs, execute behavior, assert outcomes.

```go
func TestAdd(t *testing.T) {
    result := Add(2, 3)
    expected := 5
    
    if result != expected {
        t.Errorf("Add(2, 3) = %d; want %d", result, expected)
    }
}
```

This structure keeps tests readable and makes failures easier to diagnose.

## Test Assertions

Go does not force a third-party assertion library. The standard pattern uses explicit `if` checks and `t.*` methods.

### Using t.Errorf()
```go
if result != expected {
    t.Errorf("got %v, want %v", result, expected)
}
```

Use `t.Errorf` when the test can continue safely and report multiple issues in one run.

### Using t.Fatalf() (Stops Test)
```go
if result != expected {
    t.Fatalf("got %v, want %v", result, expected)
}
```

Use `t.Fatalf` when continuing would cause misleading errors (for example, setup failure or nil dependency).

### Using t.FailNow()
```go
if err != nil {
    t.FailNow()
}
```

`t.FailNow` stops execution immediately, similar to `t.Fatalf` without custom formatting.

## Setup and Teardown

Setup and teardown should be explicit and lightweight. Keep shared initialization only where it reduces meaningful duplication.

### Using TestMain
```go
func TestMain(m *testing.M) {
    // Setup
    fmt.Println("Setting up tests...")
    
    code := m.Run()
    
    // Teardown
    fmt.Println("Tearing down tests...")
    
    os.Exit(code)
}
```

`TestMain` is useful for package-level setup such as global fixtures, temporary infrastructure bootstrapping, or shared environment initialization.

### Using Setup/Teardown Functions
```go
func setup() {
    // Initialize test fixtures
}

func teardown() {
    // Clean up
}

func TestSomething(t *testing.T) {
    setup()
    defer teardown()
    
    // Test code
}
```

Per-test setup keeps tests isolated and reduces cross-test interference.

## Skip and Parallel Tests

Skipping and parallelization are useful tools for keeping suites portable and efficient.

### Skip Tests
```go
func TestSkipped(t *testing.T) {
    if runtime.GOOS == "windows" {
        t.Skip("Skipping on Windows")
    }
}
```

Skip platform-specific or environment-specific tests when preconditions are not satisfied.

### Parallel Tests
```go
func TestParallel(t *testing.T) {
    t.Parallel()
    // Test code
}
```

Use `t.Parallel()` only when tests do not share mutable global state.

## Coverage

Coverage reports help identify untested paths, but coverage percentage alone is not a quality guarantee.

```bash
go test -cover ./...
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

Prioritize coverage in high-risk logic and error paths instead of chasing 100% indiscriminately.


## Quick Exercises (SDET Focus)

Try these exercises before moving to the next section.

### Exercise 1: Table-Driven Boundary Tests

Goal: Improve correctness coverage with compact test cases.

1. Select one function with input validation.
2. Write table-driven tests for min, max, empty, and invalid values.
3. Assert expected result and expected error path.
4. Add case names that clearly describe intent.

Stretch: Add fuzz-style randomized inputs for one field.

### Exercise 2: Replace Real Dependency with Test Double

Goal: Make tests deterministic and fast.

1. Introduce a small interface for one external dependency.
2. Implement fake/stub behavior for success and failure paths.
3. Assert function behavior for both paths.
4. Ensure tests run without network/database access.

Stretch: Measure and compare runtime before/after dependency isolation.

## Assignment: First Bookshelf Unit Tests

### Goal
Create your first unit tests for the Bookshelf API domain layer.

This assignment establishes the minimum testing workflow used throughout the rest of the tutorial.

### Tasks

1. Create `pkg/domain/user_test.go` and add:

```go
func TestNewUser_ValidInput(t *testing.T) {
    user, err := NewUser("reader@example.com", "StrongPass123")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.Email != "reader@example.com" {
        t.Fatalf("email = %s, want reader@example.com", user.Email)
    }
}

func TestNewUser_InvalidEmail(t *testing.T) {
    _, err := NewUser("bad-email", "StrongPass123")
    if err == nil {
        t.Fatal("expected validation error")
    }
}
```

2. Create `pkg/domain/book_test.go` and verify valid and invalid book creation.

3. Run tests:

```bash
go test ./pkg/domain -v
go test ./... -cover
```

Start with focused package tests while iterating, then run full-suite and coverage checks before finalizing changes.

### Done Criteria

- At least 4 tests are passing in `pkg/domain`
- Coverage is generated successfully

Add at least one negative-path test to validate error behavior, not only happy paths.

## Deep Dive: Foundations of Reliable Go Tests

### Background

Go testing is intentionally lightweight, but effective test suites require discipline: isolation, deterministic assertions, and fast feedback loops.

These qualities matter more than complex test tooling.

### Pyramid Mindset

Prioritize tests in this order:

1. Unit tests (most)
2. Integration tests (fewer)
3. End-to-end tests (fewest)

This keeps CI fast while preserving confidence.

Use heavier tests strategically for boundary validation, not for all behavior checks.

### Assertion Strategy

- Use `t.Fatalf` when continuing would produce misleading failures.
- Use `t.Errorf` when multiple assertions can still run safely.

Keep assertion messages specific: include input and expected/actual values.

### Reproducibility Tips

1. Avoid relying on system clock directly.
2. Avoid random inputs unless seeded and logged.
3. Avoid external network/database in unit tests.

Also reset shared mutable state between tests to avoid order-dependent failures.

### Practice

Create one failing test intentionally, fix implementation, and re-run only that test with `-run` before running full suite.

## Common Anti-Patterns

- One large test function covering unrelated behaviors.
- Tests that depend on execution order.
- Assertions without useful failure context.
- Overusing sleeps instead of deterministic synchronization.

## Quick Beginner Checklist

- Is each test focused on one behavior?
- Are both success and failure paths covered?
- Can tests run repeatedly with same results?
- Are failure messages actionable?
- Are package-level tests fast enough for frequent reruns?




## Next Step

Continue with [Table-Driven Tests](table-driven-tests.md).
