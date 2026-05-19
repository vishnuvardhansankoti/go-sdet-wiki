# Error Handling

Go's error model is explicit: errors are values returned alongside results, not exceptions thrown out of band. For SDETs, this means test assertions can target exact error types and wrapped messages rather than catching broad exception classes.

Go handles errors by treating them as values rather than exceptions. This avoids hidden control flow and encourages developers to handle potential failures immediately and explicitly.

## Core Concepts

### The Error Interface

In Go, an error is any type that implements the built-in `error` interface:

```go
type error interface {
	Error() string
}
```

### Returning Errors

Functions that can fail return an `error` as their last return value. When successful, they return `nil`.

```go
func ParseConfig(path string) (Config, error) {
	if path == "" {
		return Config{}, errors.New("path is required")
	}

	// parse config...
	return Config{}, nil
}
```

## Common Patterns

### Checking Errors

The idiomatic pattern is checking `err != nil` immediately after a call.

```go
cfg, err := ParseConfig("config.yml")
if err != nil {
	return fmt.Errorf("parse config: %w", err)
}
_ = cfg
```

### Sentinel Errors

Sentinel errors are predefined variables used to represent specific conditions. Check them with `errors.Is`.

```go
var ErrCacheMiss = errors.New("cache miss")

func FindUser(id string) error {
	if id == "" {
		return ErrCacheMiss
	}
	return nil
}

if err := FindUser(""); errors.Is(err, ErrCacheMiss) {
	fmt.Println("fallback to database")
}
```

### Custom Error Types

For richer scenarios, define custom structs that implement `Error() string`. Use `errors.As` to inspect typed details.

```go
type ValidationError struct {
	Field string
	Msg   string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("invalid %s: %s", e.Field, e.Msg)
}

func ValidateEmail(email string) error {
	if email == "" {
		return &ValidationError{Field: "email", Msg: "cannot be empty"}
	}
	return nil
}

var ve *ValidationError
if err := ValidateEmail(""); errors.As(err, &ve) {
	fmt.Println("field:", ve.Field)
}
```

### Error Wrapping

Since Go 1.13, use `%w` with `fmt.Errorf` to add context while preserving the original cause.

```go
if err := saveUser(u); err != nil {
	return fmt.Errorf("create user: %w", err)
}
```

## Best Practices

- Handle errors immediately; do not ignore them with `_`.
- Add clear context while bubbling errors upward.
- Use `panic` only for unrecoverable programmer/system faults.
- Avoid over-wrapping; wrap when the added context is useful and intentional.
- Prefer `errors.Is` and `errors.As` over string comparisons.

## Why This Model Works

The simple `error` interface scales well from small utilities to large services. Instead of implicit exception propagation, each call site decides whether to handle, transform, or return the error.

For SDETs, this leads to deterministic behavior in tests: you can assert exact error classification (`errors.Is`, `errors.As`) and verify wrapped context at each layer.

## Creating Errors

In Go, choose the error creation style based on how much context and type information you need.

### Using errors.New()

Use this for static, reusable error messages when no dynamic fields are required.

```go
err := errors.New("something went wrong")
```

### Using fmt.Errorf()

Use this when you want to include runtime values in the error message.

```go
err := fmt.Errorf("invalid input: %s", input)
```

### Custom Error Types

Use custom types when callers need structured details (for example, field name, resource ID, operation name) rather than plain text.

```go
type ValidationError struct {
    Field string
    Issue string
}

func (e ValidationError) Error() string {
    return fmt.Sprintf("validation error on %s: %s", e.Field, e.Issue)
}
```

## Checking Errors

Always check errors as close as possible to the call site. Then either handle locally or return upward with more context.

### Basic Check

This is the standard pattern in Go: guard on `err != nil` and exit early.

```go
result, err := someFunction()
if err != nil {
    log.Fatal(err)
}
```

### Type Assertion

Type assertions can work, but they are fragile if wrapping is involved. Prefer `errors.As` for robust type checks across wrapped chains.

```go
if err, ok := err.(ValidationError); ok {
    fmt.Printf("Field: %s, Issue: %s\n", err.Field, err.Issue)
}
```

### Using errors.Is() and errors.As()

These are the idiomatic tools for modern Go error handling:

- `errors.Is` checks whether a specific sentinel error exists in the chain.
- `errors.As` extracts a typed error from the chain.

```go
if errors.Is(err, io.EOF) {
    fmt.Println("End of file")
}

var targetErr ValidationError
if errors.As(err, &targetErr) {
    fmt.Printf("Field: %s\n", targetErr.Field)
}
```

## Wrapping Errors

Go 1.13 introduced error wrapping:

Wrapping preserves the original cause while adding useful context at each layer. This is critical for debugging production failures.

Rule of thumb:

- Add context when returning an error to a higher layer.
- Keep original cause reachable through `%w`.

```go
if err != nil {
    return fmt.Errorf("failed to process: %w", err)
}
```

## Error Handling Best Practices

1. Return early on error to reduce nesting.
2. Wrap errors with operation context (`create user`, `read book`, etc.).
3. Avoid string comparisons for program logic.
4. Use typed errors for domain-level decisions.
5. Convert internal errors to safe API responses at handler boundaries.

## Why This Pattern Helps SDETs

For test automation and service diagnostics, a consistent error model gives you:

- Faster root-cause analysis from logs and failures.
- Clear assertions in unit/integration tests.
- Stable HTTP error mapping for contract and E2E testing.
- Less brittle tests than message-based matching.

## Quick Exercises (SDET Focus)

Try these exercises before moving to the assignment.

### Exercise 1: Typed Validation Errors + Table-Driven Tests

Goal: Practice creating structured errors and asserting them safely in tests.

1. Implement function `ValidateBookInput(title, author string) error`.
2. Return a typed `ValidationError` with field-specific context.
3. Create table-driven tests with at least 6 cases (valid + invalid).
4. Use `errors.As` to assert error type and inspect `Field`/`Message`.
5. Avoid direct string-equality checks except for one message snapshot test.

Stretch: Add one wrapped error path and assert it with both `errors.Is` and `errors.As`.

### Exercise 2: HTTP Error Mapping Function

Goal: Build deterministic handler-level error conversion used in API tests.

1. Implement `MapDomainErrorToHTTP(err error) (int, map[string]string)`.
2. Map:
	- `ValidationError` -> `400`,
	- `NotFoundError` -> `404`,
	- `DuplicateError` -> `409`,
	- unknown -> `500`.
3. Return a stable payload shape with fields: `code`, `message`.
4. Write tests that verify status code and payload for each error type.

Stretch: Add correlation ID support to the payload for easier CI diagnostics.

## Assignment: Part 3 - Enhanced Error Handling

### Goal
Build a comprehensive error handling system for the Bookshelf API with type-safe error checking.

### Tasks

#### 1. Enhance Error Types - Update `pkg/domain/errors.go`

Replace the previous simple version with this comprehensive error handling:

```go
package domain

import (
	"errors"
	"fmt"
)

// Define error types as variables for use with errors.Is()
var (
	ErrNotFound         = errors.New("resource not found")
	ErrAlreadyExists    = errors.New("resource already exists")
	ErrUnauthorized     = errors.New("unauthorized")
	ErrInternalError    = errors.New("internal server error")
)

// ValidationError represents a validation failure
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation error on field '%s': %s", e.Field, e.Message)
}

func NewValidationError(field, message string) error {
	return &ValidationError{Field: field, Message: message}
}

// IsValidationError checks if an error is a ValidationError
func IsValidationError(err error) bool {
	var ve *ValidationError
	return errors.As(err, &ve)
}

// NotFoundError represents a "not found" error
type NotFoundError struct {
	Resource string
	ID       string
}

func (e *NotFoundError) Error() string {
	return fmt.Sprintf("%s not found: %s", e.Resource, e.ID)
}

func NewNotFoundError(resource, id string) error {
	return &NotFoundError{Resource: resource, ID: id}
}

// DuplicateError represents a duplicate resource error
type DuplicateError struct {
	Resource string
	Field    string
	Value    string
}

func (e *DuplicateError) Error() string {
	return fmt.Sprintf("duplicate %s: %s '%s' already exists", e.Resource, e.Field, e.Value)
}

func NewDuplicateError(resource, field, value string) error {
	return &DuplicateError{Resource: resource, Field: field, Value: value}
}

// InvalidStatusError represents an invalid status transition
type InvalidStatusError struct {
	Current string
	Desired string
	Reason  string
}

func (e *InvalidStatusError) Error() string {
	return fmt.Sprintf("cannot change status from %s to %s: %s", e.Current, e.Desired, e.Reason)
}

func NewInvalidStatusError(current, desired, reason string) error {
	return &InvalidStatusError{Current: current, Desired: desired, Reason: reason}
}

// RepositoryError represents an error from the data layer
type RepositoryError struct {
	Operation string
	Resource  string
	Err       error
}

func (e *RepositoryError) Error() string {
	return fmt.Sprintf("repository error during %s %s: %v", e.Operation, e.Resource, e.Err)
}

func (e *RepositoryError) Unwrap() error {
	return e.Err
}

func NewRepositoryError(operation, resource string, err error) error {
	return &RepositoryError{Operation: operation, Resource: resource, Err: err}
}
```

#### 2. Update Domain Models with Better Error Handling - `pkg/domain/user.go`

Update the validation to use the new error types:

```go
package domain

import (
	"errors"
	"regexp"
	"time"
)

// User represents a user of the Bookshelf API
type User struct {
	ID        UserID    `json:"id"`
	Email     string    `json:"email"`
	Password  string    `json:"-"` // Never expose password in JSON
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// NewUser creates a new User with validation
func NewUser(email, password string) (*User, error) {
	if err := ValidateEmail(email); err != nil {
		return nil, err
	}
	if err := ValidatePassword(password); err != nil {
		return nil, err
	}

	return &User{
		Email:     email,
		Password:  password,
		Status:    UserStatusActive,
		CreatedAt: Now(),
		UpdatedAt: Now(),
	}, nil
}

// ValidateEmail checks if email is valid
func ValidateEmail(email string) error {
	if len(email) < MinEmailLength || len(email) > MaxEmailLength {
		return NewValidationError("email", "length must be between 5 and 254 characters")
	}

	// Basic email regex validation
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return NewValidationError("email", "invalid email format")
	}

	return nil
}

// ValidatePassword checks if password meets requirements
func ValidatePassword(password string) error {
	if len(password) < MinPasswordLength {
		return NewValidationError("password", "must be at least 8 characters")
	}
	if len(password) > MaxPasswordLength {
		return NewValidationError("password", "must not exceed 128 characters")
	}

	// Check for at least one number
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
	// Check for at least one letter
	hasLetter := regexp.MustCompile(`[a-zA-Z]`).MatchString(password)

	if !hasNumber || !hasLetter {
		return NewValidationError("password", "must contain at least one letter and one number")
	}

	return nil
}

// Methods...
func (u *User) GetEmail() string {
	return u.Email
}

func (u *User) IsActive() bool {
	return u.Status == UserStatusActive
}

// Deactivate sets user status to inactive
func (u *User) Deactivate() error {
	if u.Status == UserStatusInactive {
		return NewInvalidStatusError(UserStatusInactive, UserStatusInactive, "user is already inactive")
	}
	u.Status = UserStatusInactive
	u.UpdatedAt = Now()
	return nil
}

// Activate sets user status to active
func (u *User) Activate() error {
	if u.Status == UserStatusActive {
		return NewInvalidStatusError(UserStatusActive, UserStatusActive, "user is already active")
	}
	u.Status = UserStatusActive
	u.UpdatedAt = Now()
	return nil
}
```

#### 3. Create Repository Error Wrapper - `pkg/domain/repository_errors.go`

```go
package domain

// RepositoryErrorOp defines repository operations for error context
type RepositoryErrorOp string

const (
	OpCreate   RepositoryErrorOp = "create"
	OpRead     RepositoryErrorOp = "read"
	OpUpdate   RepositoryErrorOp = "update"
	OpDelete   RepositoryErrorOp = "delete"
	OpList     RepositoryErrorOp = "list"
	OpCount    RepositoryErrorOp = "count"
)

// WrapRepositoryError wraps database errors with context
func WrapRepositoryError(op RepositoryErrorOp, resource string, err error) error {
	if err == nil {
		return nil
	}
	return NewRepositoryError(string(op), resource, err)
}
```

### Testing Error Handling - `pkg/domain/errors_test.go`

```go
package domain

import (
	"errors"
	"testing"
)

func TestValidationError_Error(t *testing.T) {
	err := NewValidationError("email", "invalid format")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !IsValidationError(err) {
		t.Errorf("expected ValidationError, got %T", err)
	}
	expected := "validation error on field 'email': invalid format"
	if err.Error() != expected {
		t.Errorf("got %q, want %q", err.Error(), expected)
	}
}

func TestDuplicateError_Error(t *testing.T) {
	err := NewDuplicateError("user", "email", "john@example.com")
	expected := "duplicate user: email 'john@example.com' already exists"
	if err.Error() != expected {
		t.Errorf("got %q, want %q", err.Error(), expected)
	}
}

func TestNotFoundError_Error(t *testing.T) {
	err := NewNotFoundError("book", "123")
	expected := "book not found: 123"
	if err.Error() != expected {
		t.Errorf("got %q, want %q", err.Error(), expected)
	}
}

func TestInvalidStatusError(t *testing.T) {
	err := NewInvalidStatusError("ACTIVE", "DELETED", "cannot delete active users")
	if !errors.As(err, &InvalidStatusError{}) {
		t.Errorf("expected InvalidStatusError")
	}
}

func TestRepositoryError_Wrapping(t *testing.T) {
	originalErr := errors.New("database connection failed")
	repoErr := NewRepositoryError("create", "user", originalErr)

	if !errors.Is(repoErr, originalErr) {
		t.Errorf("expected wrapped error to be chainable")
	}
}

func TestValidateEmail_ValidEmail(t *testing.T) {
	tests := []struct {
		email string
		valid bool
	}{
		{"user@example.com", true},
		{"test.email+tag@domain.co.uk", true},
		{"invalid.email", false},
		{"@example.com", false},
		{"user@", false},
		{"user name@example.com", false},
	}

	for _, tt := range tests {
		t.Run(tt.email, func(t *testing.T) {
			err := ValidateEmail(tt.email)
			if tt.valid && err != nil {
				t.Errorf("expected valid email, got error: %v", err)
			}
			if !tt.valid && err == nil {
				t.Errorf("expected invalid email to return error")
			}
		})
	}
}

func TestValidatePassword_Requirements(t *testing.T) {
	tests := []struct {
		password string
		valid    bool
	}{
		{"ValidPass1", true},
		{"anotherPass2", true},
		{"short1", false},              // too short
		{"nOnumbers", false},           // no numbers
		{"12345678", false},            // no letters
		{"a1", false},                  // too short
	}

	for _, tt := range tests {
		t.Run(tt.password, func(t *testing.T) {
			err := ValidatePassword(tt.password)
			if tt.valid && err != nil {
				t.Errorf("expected valid password, got error: %v", err)
			}
			if !tt.valid && err == nil {
				t.Errorf("expected invalid password to return error")
			}
		})
	}
}
```

### Why This Matters

1. **Type-safe errors** - Use `errors.As()` and `errors.Is()` instead of string matching
2. **Rich error context** - Know which resource, which field, which operation failed
3. **Debuggability** - Stack trace through wrapped errors
4. **Consistent patterns** - All errors follow the same structure
5. **Testability** - Easy to write tests for different error scenarios

### Verification

Run tests:

```bash
cd pkg/domain
go test -v ./...
```

Expected output shows all validation tests passing.

### Files Updated This Section

```
pkg/domain/
├── errors.go           # Enhanced error types
├── errors_test.go      # Error handling tests
├── repository_errors.go # Repository error wrapper
└── user.go             # Updated with better validation
```

### What's Next

In **Functions and Methods**, you'll create service functions that use these error types to orchestrate business logic across multiple domain models.

## Deep Dive: Error Strategy for Production-Grade APIs

### Background

Go encourages explicit error handling. A good error model improves debugging speed, observability, and API response consistency.

### Layered Error Mapping

Use different error detail at each layer:

1. Domain: rich typed errors (`ValidationError`, `NotFoundError`).
2. Service: wrap with operation context.
3. Handler: map to HTTP status and response payload.

### Example: Mapping to HTTP

```go
func HTTPStatusFromError(err error) int {
	var ve *ValidationError
	if errors.As(err, &ve) {
		return 400
	}
	var ne *NotFoundError
	if errors.As(err, &ne) {
		return 404
	}
	return 500
}
```

### Common Pitfalls

- String-matching error messages instead of using `errors.Is` or `errors.As`.
- Returning raw internal errors directly to API clients.
- Losing root cause by wrapping without `%w`.
- Using one generic error for all failure modes.

### Recommended Workflow

1. Domain returns typed semantic errors.
2. Service adds operation context with wrapping.
3. Handler maps errors to status + response code.
4. Tests verify both behavior and error classification.
- Returning generic internal errors for user-facing validation failures.
- Dropping original errors when wrapping.

### SDET Practice

Add tests to assert:
- correct error type returned by domain constructors
- proper wrapped error behavior with `errors.Unwrap`
- correct HTTP status mapping in handlers

## Common Anti-Patterns

- Comparing error messages with string equality instead of using `errors.Is` or `errors.As`.
- Returning raw infrastructure errors to callers, leaking internal implementation details.
- Losing the root cause by wrapping with `fmt.Errorf` without the `%w` verb.
- Using a single sentinel error for multiple distinct failure modes, preventing specific handling.

## Quick Error Design Checklist

- Are all sentinel errors defined as package-level variables for use with `errors.Is`?
- Does every wrapping call use `fmt.Errorf("context: %w", err)` to preserve unwrap chains?
- Are typed errors used for domain failures so handlers can use `errors.As` for status mapping?
- Do tests assert specific error types and unwrapped causes, not just error message strings?



## Next Step

Continue with [Generics in Go](generics-in-go.md).
