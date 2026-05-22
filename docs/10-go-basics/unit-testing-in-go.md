# Unit Testing in Go

Unit testing is the foundation of reliable Go services. Before moving into microservices architecture, you should be comfortable validating small units of behavior in isolation. This reduces defect escape rate, makes refactoring safer, and gives fast feedback during development.

In this section, you will learn:

- What unit testing is and why it matters.
- Advantages of unit testing for SDETs and backend engineers.
- How unit testing is done in Go using the standard tooling.
- Popular unit testing, assertion, and mocking frameworks in Go.
- What a mocking framework is and when to use it.

## What Is Unit Testing?

A unit test verifies the behavior of a small unit of code, usually:

- a function,
- a method,
- or a small component with minimal dependencies.

A good unit test is:

- **Fast**: Runs in milliseconds.
- **Deterministic**: Same input produces same result.
- **Isolated**: External systems (DB/network/filesystem) are replaced with test doubles.
- **Focused**: Validates one behavior or rule at a time.

Examples of units in Go:

- `CalculateDiscount(price, customerType)`
- `ValidateEmail(input)`
- `OrderService.CanCancel(order)`

## Why Unit Testing Matters

Unit tests provide confidence at the lowest level of your system.

### Advantages

- **Early bug detection**: Catch logic issues before integration and E2E stages.
- **Safer refactoring**: Protect behavior while changing internal implementation.
- **Executable documentation**: Tests show expected behavior in real examples.
- **Faster feedback loop**: Run tests in seconds locally and in CI.
- **Improved design**: Testable code usually has better separation of concerns.

For SDETs, strong unit tests reduce noise in later test layers and make failures easier to localize.

## How Unit Testing Is Done in Go

Go has built-in testing support via the `testing` package and the `go test` command.

### File and Function Conventions

- Test files end with `_test.go`.
- Test functions follow `func TestXxx(t *testing.T)`.
- Benchmark functions follow `func BenchmarkXxx(b *testing.B)`.
- Example tests follow `func ExampleXxx()`.

### Basic Example

Production code:

```go
package mathutil

func Add(a, b int) int {
    return a + b
}
```

Test code:

```go
package mathutil

import "testing"

func TestAdd(t *testing.T) {
    got := Add(2, 3)
    want := 5

    if got != want {
        t.Fatalf("Add(2, 3) = %d; want %d", got, want)
    }
}
```

Run tests:

```bash
go test ./...
```

### Table-Driven Tests (Recommended)

Table-driven tests are idiomatic in Go. They keep tests readable and scalable.

```go
package mathutil

import "testing"

func Divide(a, b int) (int, error) {
    if b == 0 {
        return 0, ErrDivideByZero
    }
    return a / b, nil
}

func TestDivide(t *testing.T) {
    tests := []struct {
        name    string
        a       int
        b       int
        want    int
        wantErr bool
    }{
        {name: "valid", a: 10, b: 2, want: 5, wantErr: false},
        {name: "divide by zero", a: 10, b: 0, want: 0, wantErr: true},
    }

    for _, tc := range tests {
        tc := tc
        t.Run(tc.name, func(t *testing.T) {
            got, err := Divide(tc.a, tc.b)
            if (err != nil) != tc.wantErr {
                t.Fatalf("error = %v; wantErr = %v", err, tc.wantErr)
            }
            if got != tc.want {
                t.Fatalf("got = %d; want = %d", got, tc.want)
            }
        })
    }
}
```

### Coverage Command

```bash
go test ./... -cover
```

For local HTML reports:

```bash
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

Coverage is useful, but high percentage alone does not guarantee good tests. Prefer meaningful assertions over line-count gaming.

## Packages and Frameworks for Unit Testing in Go

Go's standard library is enough for many projects, but frameworks can improve readability and ergonomics.

### Standard Package

- **testing (stdlib)**: Core package for tests, benchmarks, and examples.

### Assertion and Test Suite Frameworks

- **stretchr/testify**: Assertion helpers (`assert`, `require`) and suite support.
- **onsi/gomega**: Expressive matcher-style assertions.
- **onsi/ginkgo**: BDD-style test runner often paired with Gomega.

### Mocking and Code Generation Tools

- **golang/mock (GoMock)**: Interface mocking with generated mocks.
- **vektra/mockery**: Generates mocks for interfaces.
- **matryer/moq**: Lightweight mock generator focused on interfaces.
- **testify/mock**: Dynamic mock style included in Testify.

Guideline: Start with `testing` + table-driven style. Add frameworks when they clearly improve readability or maintainability.

## What Is a Mocking Framework?

A mocking framework helps you replace real dependencies with fake implementations that:

- return controlled outputs,
- capture calls,
- and verify expected interactions.

This is useful when your unit depends on:

- external APIs,
- databases,
- message brokers,
- clocks/random generators,
- or any slow/non-deterministic dependency.

### Why Use Mocking Frameworks?

- Keep unit tests fast and deterministic.
- Test error paths that are hard to trigger in real systems.
- Verify behavior contracts between collaborators.

### Mocking Example (Interface + Testify Mock)

Production code:

```go
package order

import "fmt"

type PaymentGateway interface {
    Charge(userID string, amount int64) error
}

type Service struct {
    gateway PaymentGateway
}

func NewService(g PaymentGateway) *Service {
    return &Service{gateway: g}
}

func (s *Service) Checkout(userID string, amount int64) error {
    if amount <= 0 {
        return fmt.Errorf("amount must be positive")
    }
    return s.gateway.Charge(userID, amount)
}
```

Test code:

```go
package order

import (
    "errors"
    "testing"

    "github.com/stretchr/testify/require"
)

type fakeGateway struct {
    chargeFn func(userID string, amount int64) error
}

func (f *fakeGateway) Charge(userID string, amount int64) error {
    return f.chargeFn(userID, amount)
}

func TestCheckout_Success(t *testing.T) {
    svc := NewService(&fakeGateway{
        chargeFn: func(userID string, amount int64) error {
            if userID != "u1" || amount != 500 {
                t.Fatalf("unexpected charge args: %s %d", userID, amount)
            }
            return nil
        },
    })

    err := svc.Checkout("u1", 500)
    require.NoError(t, err)
}

func TestCheckout_GatewayError(t *testing.T) {
    svc := NewService(&fakeGateway{
        chargeFn: func(userID string, amount int64) error {
            return errors.New("gateway timeout")
        },
    })

    err := svc.Checkout("u1", 500)
    require.EqualError(t, err, "gateway timeout")
}
```

This snippet uses a fake implementation pattern. In larger systems, a mocking framework automates this and adds call-expectation verification.

## Unit Testing Use Cases in Go Projects

- Validation logic (`ValidateRequest`, `ParseConfig`, `NormalizeInput`).
- Domain rules (`CanTransitionStatus`, `CalculatePrice`, `CanPublish`).
- Error mapping (`mapErrorToHTTPStatus`).
- Retry and backoff logic without real network calls.
- Handler/business logic with injected interfaces.

Avoid classifying these as unit tests:

- Tests hitting real DB/container/external HTTP endpoints.
- Tests requiring multiple services to be running.

Those are better categorized as integration or end-to-end tests.

## Quick Exercises (SDET Focus)

Try these exercises before moving to the assignment.

### Exercise 1: Build Your First Unit Test Package

Goal: Create a small package and validate deterministic behavior.

1. Create package `pkg/price` with function `ApplyDiscount(amount int, pct int) (int, error)`.
2. Validate inputs (`amount >= 0`, `0 <= pct <= 100`).
3. Write table-driven tests for valid and invalid inputs.
4. Run `go test ./... -cover` and record package coverage.

Stretch: Add benchmark for large input values.

### Exercise 2: Unit Test with a Mocked Dependency

Goal: Test service behavior without calling external systems.

1. Define `Notifier` interface with method `Send(userID, message string) error`.
2. Create `ReminderService` using `Notifier`.
3. Add test for success path and failure path (simulated notifier error).
4. Assert returned errors and verify that invalid input does not call notifier.

Stretch: Use GoMock or Testify Mock instead of a hand-written fake.

## Assignment: Part 1 - Unit Testing Foundation for Service Code

### Goal

Build a mini service package with clear business rules and a complete unit test suite using table-driven tests and mocks/fakes.

### Tasks

1. Create `internal/inventory/service.go`.
2. Define interface `StockRepository` with methods:
   - `Get(productID string) (int, error)`
   - `Update(productID string, newQty int) error`
3. Implement method `Reserve(productID string, qty int) error` with rules:
   - `qty` must be positive.
   - product must exist.
   - current stock must be enough.
   - update repository with reduced stock.
4. Write tests in `internal/inventory/service_test.go` for:
   - success reservation,
   - invalid quantity,
   - product not found,
   - insufficient stock,
   - repository update failure.
5. Use either:
   - hand-written fake repository, or
   - a mocking framework (GoMock / Testify / Mockery-generated mock).

### Acceptance Criteria

- `go test ./...` passes.
- Tests are deterministic and do not require external services.
- Happy path and error paths are covered.
- Assertions are clear and failure messages are actionable.

## Common Anti-Patterns

- Writing tests that depend on wall-clock time without controllable clock abstraction.
- Sharing mutable global state across tests.
- Asserting too much in one test (hard to diagnose failures).
- Testing framework internals instead of your own behavior.
- Chasing 100% coverage with weak assertions.

## Next Step

Continue with [Microservices Overview](../20-microservices/microservices-overview.md).
