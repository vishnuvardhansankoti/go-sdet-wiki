# Test Organization and Naming

Test organization and naming are core quality practices, not cosmetic choices. A well-structured test suite is easier to navigate, faster to debug, and safer to evolve as the codebase grows.

For SDETs, clear naming and layout provide immediate signal when tests fail in CI: what failed, where it belongs, and which behavior regressed.

## File Organization

Organize tests so location reflects ownership and test scope.

### Convention

```
mypackage/
├── main.go
├── handler.go
├── handler_test.go
├── service.go
└── service_test.go
```

Test files live alongside the code they test.

This "co-location" pattern makes maintenance easier because implementation and unit tests evolve together.

## Test Naming

Good test names describe behavior and expected outcome. Avoid vague names that hide intent.

### Naming Convention

```go
func TestFunctionName(t *testing.T) {}
func TestFunctionNameWithInput(t *testing.T) {}
func TestFunctionNameErrorCase(t *testing.T) {}
```

Use naming that communicates scenario meaning, not implementation details.

### Descriptive Names

```go
// Good
func TestCreateUserWithValidEmail(t *testing.T) {}
func TestCreateUserWithInvalidEmail(t *testing.T) {}
func TestCreateUserWithDuplicateEmail(t *testing.T) {}

// Less helpful
func TestCreateUser(t *testing.T) {}
func TestUser(t *testing.T) {}
```

When reading a failing test list, descriptive names should be enough to understand what broke without opening the file.

## Subtests

Subtests (`t.Run`) group related scenarios under one top-level behavior and improve output readability.

```go
func TestUserService(t *testing.T) {
    t.Run("create user", func(t *testing.T) {
        // Test code
    })
    
    t.Run("get user", func(t *testing.T) {
        // Test code
    })
    
    t.Run("delete user", func(t *testing.T) {
        // Test code
    })
}
```

This is especially useful for table-driven tests and domain validation suites.

## Test Packages

Go supports two styles of test packages, each with different goals.

### Internal Tests
```go
// user_test.go (same package)
package user

func TestExportedFunction(t *testing.T) {}
```

Internal tests can access unexported members and are useful for tightly scoped unit checks.

### External Tests
```go
// user_test.go (test package)
package user_test

func TestExportedFunction(t *testing.T) {}
```

External tests validate behavior through public APIs and help enforce package boundaries.

## Directory Structure for Complex Projects

As projects scale, split tests by layer and purpose to avoid mixing unit and integration concerns.

```
project/
├── pkg/
│   ├── domain/
│   │   ├── user.go
│   │   └── user_test.go
│   └── service/
│       ├── user_service.go
│       └── user_service_test.go
└── tests/
    ├── integration/
    ├── fixtures/
    └── helpers.go
```

This structure makes it easier to run targeted suites (fast unit checks vs slower integration checks).

## Best Practices

- Keep tests close to the code
- Use descriptive test names
- Organize with subtests
- One assertion per test (or related assertions)
- Use external test packages for integration tests
- Keep fixtures in `tests/fixtures` directory

Additional guidance:

- Keep one primary behavior focus per test function.
- Share setup helpers, but keep test intent explicit.
- Avoid brittle names tied to private implementation details.

## Assignment: Organize Bookshelf Test Suite

### Goal
Apply consistent naming and structure across Bookshelf tests.

This assignment creates a predictable test map so contributors can quickly find, run, and extend the right test layer.

### Target Structure

```text
pkg/
    domain/
        user_test.go
        book_test.go
        review_test.go
    handler/
        handlers_test.go
tests/
    fixtures/
        test_data.go
    mocks/
        mock_repositories.go
    integration/
        postgres_repository_test.go
```

### Naming Rules

- Use `Test<FunctionOrMethod>_<Scenario>`
- Examples:
    - `TestNewUser_ValidInput`
    - `TestNewUser_InvalidEmail`
    - `TestCreateUserHandler_BadJSON`
    - `TestBookRepository_SaveAndFindByID`

Prefer scenario names that reflect business behavior, not helper function names.

### Done Criteria

- Existing tests follow naming convention
- New tests are placed in the correct package and file

Also ensure naming remains stable if internal implementation changes.

## Deep Dive: Naming as Documentation

### Background

Test names are executable documentation. Clear naming helps future contributors understand behavior without reading full implementation.

Over time, naming quality directly impacts triage speed and review efficiency.

### Practical Naming Pattern

Use `Test<Unit>_<Condition>_<Expectation>` where possible.

This pattern balances readability with enough precision for CI failure analysis.

Examples:

- `TestCreateBook_InvalidTitle_ReturnsValidationError`
- `TestAddBookToShelf_DuplicateBook_ReturnsDuplicateError`
- `TestCreateUserHandler_InvalidJSON_ReturnsBadRequest`

### File Placement Rules

1. Keep unit tests close to code under `pkg/...`.
2. Keep integration and cross-package tests under `tests/...`.
3. Keep shared fixtures/builders in dedicated fixture files.

Avoid placing integration-only helpers inside unit test packages.

### Review Checklist

- Could a new teammate understand this test from the name alone?
- Is the test file in the right layer?
- Are scenario names stable if implementation changes?

## Common Anti-Patterns

- Generic names like `TestService` or `TestCreate`.
- Huge test files mixing unrelated components.
- Integration tests hidden inside unit packages.
- Repeated setup code with no shared helpers.

## Quick Suite Health Checklist

- Can failing tests be understood from names alone?
- Are tests grouped by layer (unit/integration)?
- Are fixtures and mocks centralized and reusable?
- Are naming conventions enforced in PR review?
- Can targeted suites run independently?


