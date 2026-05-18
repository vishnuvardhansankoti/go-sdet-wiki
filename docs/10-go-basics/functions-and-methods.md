# Functions and Methods

Functions and methods are where domain rules become executable behavior. In this section, you move from defining data structures to implementing operations that enforce business constraints.

## Basic Function

A basic function is best for stateless logic: take input, return output, and avoid hidden side effects.

```go
func greet(name string) string {
    return "Hello, " + name
}
```

Use this style for utility behavior that does not need to read or modify object state.

## Multiple Return Values

Go commonly returns a value plus an `error`. This keeps failure handling explicit and close to the call site.

```go
func divide(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}
```

In production code, this pattern is preferred over throwing exceptions because callers must choose how to handle the failure path.

## Named Return Values

Named returns can improve readability when return values have clear semantic meaning.

```go
func swap(a, b int) (x, y int) {
    x = b
    y = a
    return
}
```

Use named returns sparingly. They are useful when they document intent, but avoid overusing them in long functions where `return` behavior becomes less obvious.

## Methods

A method is a function with a receiver argument.

Methods attach behavior to domain types. This helps keep related logic close to the data it acts on.

```go
type Person struct {
    Name string
}

func (p Person) Greet() string {
    return "Hello, " + p.Name
}
```

In domain-driven code, prefer methods for business actions that naturally belong to an entity.

## Variadic Functions

Variadic functions accept zero or more values of the same type. They are useful when callers may pass a flexible number of arguments.

```go
func sum(nums ...int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

sum(1, 2, 3, 4, 5)
```

This is often used in helper APIs, logging utilities, and aggregation logic.

## Anonymous Functions and Closures

Anonymous functions are useful for short inline behavior, callbacks, and test setup code. Closures can capture variables from surrounding scope.

```go
increment := func(x int) int {
    return x + 1
}
fmt.Println(increment(5))
```

Use closures carefully when loops are involved; always be explicit about captured variables to avoid subtle bugs.

## Quick Exercises (SDET Focus)

Try these exercises before moving to the assignment.

### Exercise 1: Table-Driven Validation Function

Goal: Practice function design with explicit error handling and test coverage.

1. Write function `ValidateUsername(name string) error` with rules:
	- minimum length 3,
	- maximum length 20,
	- only letters, numbers, and underscore.
2. Return descriptive errors for each failed rule.
3. Write a table-driven test with at least 6 cases (valid + invalid).
4. Assert both pass/fail behavior and expected error messages.

Stretch: Add benchmark `BenchmarkValidateUsername` for short and long inputs.

### Exercise 2: Method-Based Retry Policy for HTTP Checks

Goal: Practice methods, receiver choices, and deterministic behavior for automation code.

1. Define struct `RetryPolicy` with fields `MaxAttempts int` and `BackoffMs int`.
2. Add method `ShouldRetry(statusCode int, err error, attempt int) bool`.
3. Rules:
	- retry on network error,
	- retry on `502`, `503`, `504`,
	- do not retry on `4xx`,
	- stop at `MaxAttempts`.
4. Write tests for each rule, including boundary case when `attempt == MaxAttempts`.

Stretch: Add method `NextDelay(attempt int) time.Duration` using exponential backoff.

## Assignment: Part 4 - Business Logic Methods and Functions

### Goal
Build business logic functions that orchestrate operations across multiple domain models.

This assignment introduces the service-layer style used in the rest of the tutorial: methods that coordinate domain entities, validate rules, and return typed errors.

### Tasks

#### 1. Create Business Logic Package - `pkg/domain/business_rules.go`

```go
package domain

// UserService contains business logic for user operations
type UserService struct {
	// In Section 40, this will be replaced with repository interface
}

// NewUserService creates a new UserService
func NewUserService() *UserService {
	return &UserService{}
}

// CanUserRate checks if a user can rate a book
// Rules:
// - User must be active
// - User must have added book to shelf
// - User must have at least started reading the book
func (us *UserService) CanUserRate(user *User, shelfEntry *ShelfEntry) error {
	if !user.IsActive() {
		return NewInvalidStatusError(user.Status, UserStatusActive, "inactive users cannot rate books")
	}

	if shelfEntry.Status == StatusWantToRead {
		return NewInvalidStatusError(StatusWantToRead, StatusCurrentlyReading, "must start reading before rating")
	}

	return nil
}

// CalculateUserReputationScore calculates a user's reputation based on reviews
// Rules:
// - Start with base score of 0
// - +1 for each review written
// - +2 if review has both rating and comment
// - -1 if user has been inactive for 30 days
func (us *UserService) CalculateUserReputationScore(
	user *User,
	reviews []*Review,
	lastActivityDays int,
) int {
	score := 0

	// Base score for reviews
	for _, review := range reviews {
		score += 1
		if review.Comment != "" {
			score += 2
		}
	}

	// Penalty for inactivity
	if lastActivityDays > 30 {
		score -= 1
	}

	return score
}

// BookService contains business logic for book operations
type BookService struct {
}

// NewBookService creates a new BookService
func NewBookService() *BookService {
	return &BookService{}
}

// CanAddToShelf validates if a book can be added to a shelf
func (bs *BookService) CanAddToShelf(book *Book, existingEntries []*ShelfEntry) error {
	// Check if book already in shelf (simplified - no repository yet)
	for _, entry := range existingEntries {
		if entry.BookID == book.ID {
			return NewDuplicateError("shelf entry", "book_id", book.ID.String())
		}
	}
	return nil
}

// ReviewService contains business logic for review operations
type ReviewService struct {
}

// NewReviewService creates a new ReviewService
func NewReviewService() *ReviewService {
	return &ReviewService{}
}

// CanDeleteReview checks if a review can be deleted
func (rs *ReviewService) CanDeleteReview(review *Review, user *User) error {
	if review.UserID != user.ID {
		return NewInvalidStatusError(
			string(review.UserID),
			string(user.ID),
			"only the reviewer can delete their own review",
		)
	}
	return nil
}

// CalculateAverageRating calculates the average rating for a book
func (rs *ReviewService) CalculateAverageRating(reviews []*Review) float64 {
	if len(reviews) == 0 {
		return 0.0
	}

	total := 0
	for _, review := range reviews {
		total += review.Rating
	}

	return float64(total) / float64(len(reviews))
}

// CalculateRatingDistribution returns the distribution of ratings
func (rs *ReviewService) CalculateRatingDistribution(reviews []*Review) map[int]int {
	distribution := make(map[int]int)
	for i := MinRating; i <= MaxRating; i++ {
		distribution[i] = 0
	}

	for _, review := range reviews {
		distribution[review.Rating]++
	}

	return distribution
}

// ShelfService contains business logic for shelf operations
type ShelfService struct {
	userService   *UserService
	bookService   *BookService
	reviewService *ReviewService
}

// NewShelfService creates a new ShelfService
func NewShelfService(
	userService *UserService,
	bookService *BookService,
	reviewService *ReviewService,
) *ShelfService {
	return &ShelfService{
		userService:   userService,
		bookService:   bookService,
		reviewService: reviewService,
	}
}

// AddBookToShelf adds a book to user's shelf with validation
func (ss *ShelfService) AddBookToShelf(
	user *User,
	book *Book,
	existingEntries []*ShelfEntry,
	status string,
) (*ShelfEntry, error) {
	// Validate user
	if !user.IsActive() {
		return nil, NewInvalidStatusError(user.Status, UserStatusActive, "inactive users cannot modify shelf")
	}

	// Validate book can be added
	if err := ss.bookService.CanAddToShelf(book, existingEntries); err != nil {
		return nil, err
	}

	// Create shelf entry
	entry, err := NewShelfEntry(user.ID, book.ID, status)
	if err != nil {
		return nil, err
	}

	return entry, nil
}

// RateBook adds or updates a rating with validation
func (ss *ShelfService) RateBook(
	user *User,
	book *Book,
	shelfEntry *ShelfEntry,
	rating int,
	comment string,
) (*Review, error) {
	// Check if user can rate
	if err := ss.userService.CanUserRate(user, shelfEntry); err != nil {
		return nil, err
	}

	// Create review
	review, err := NewReview(book.ID, user.ID, rating, comment)
	if err != nil {
		return nil, err
	}

	return review, nil
}
```

#### 2. Create Tests for Business Logic - `pkg/domain/business_rules_test.go`

```go
package domain

import "testing"

func TestUserService_CanUserRate_Success(t *testing.T) {
	us := NewUserService()
	user, _ := NewUser("john@example.com", "password123")
	entry, _ := NewShelfEntry(user.ID, "book123", StatusCurrentlyReading)

	err := us.CanUserRate(user, entry)
	if err != nil {
		t.Errorf("expected success, got error: %v", err)
	}
}

func TestUserService_CanUserRate_InactiveUser(t *testing.T) {
	us := NewUserService()
	user, _ := NewUser("john@example.com", "password123")
	user.Deactivate()
	entry, _ := NewShelfEntry(user.ID, "book123", StatusCurrentlyReading)

	err := us.CanUserRate(user, entry)
	if err == nil {
		t.Errorf("expected error for inactive user")
	}
}

func TestUserService_CanUserRate_OnlyWantToRead(t *testing.T) {
	us := NewUserService()
	user, _ := NewUser("john@example.com", "password123")
	entry, _ := NewShelfEntry(user.ID, "book123", StatusWantToRead)

	err := us.CanUserRate(user, entry)
	if err == nil {
		t.Errorf("expected error for WANT_TO_READ status")
	}
}

func TestUserService_CalculateUserReputationScore(t *testing.T) {
	us := NewUserService()
	user, _ := NewUser("john@example.com", "password123")

	// Create some reviews
	review1, _ := NewReview("book1", user.ID, 5, "Great book!")
	review2, _ := NewReview("book2", user.ID, 4, "")
	review3, _ := NewReview("book3", user.ID, 5, "Excellent")

	score := us.CalculateUserReputationScore(user, []*Review{review1, review2, review3}, 10)

	// review1: +1 (review) +2 (has comment) = 3
	// review2: +1 (review) +0 (no comment) = 1
	// review3: +1 (review) +2 (has comment) = 3
	// Total: 7
	expected := 7
	if score != expected {
		t.Errorf("expected %d, got %d", expected, score)
	}
}

func TestReviewService_CalculateAverageRating(t *testing.T) {
	rs := NewReviewService()

	review1, _ := NewReview("book1", "user1", 5, "")
	review2, _ := NewReview("book1", "user2", 3, "")
	review3, _ := NewReview("book1", "user3", 4, "")

	avg := rs.CalculateAverageRating([]*Review{review1, review2, review3})

	expected := 4.0
	if avg != expected {
		t.Errorf("expected %f, got %f", expected, avg)
	}
}

func TestReviewService_CalculateRatingDistribution(t *testing.T) {
	rs := NewReviewService()

	review1, _ := NewReview("book1", "user1", 5, "")
	review2, _ := NewReview("book1", "user2", 5, "")
	review3, _ := NewReview("book1", "user3", 3, "")
	review4, _ := NewReview("book1", "user4", 4, "")

	distribution := rs.CalculateRatingDistribution([]*Review{review1, review2, review3, review4})

	if distribution[5] != 2 {
		t.Errorf("expected 2 reviews with rating 5, got %d", distribution[5])
	}
	if distribution[3] != 1 {
		t.Errorf("expected 1 review with rating 3, got %d", distribution[3])
	}
}

func TestShelfService_AddBookToShelf_Success(t *testing.T) {
	us := NewUserService()
	bs := NewBookService()
	rs := NewReviewService()
	ss := NewShelfService(us, bs, rs)

	user, _ := NewUser("john@example.com", "password123")
	book, _ := NewBook("Go Programming", "John Doe", "ISBN123", 2023)

	entry, err := ss.AddBookToShelf(user, book, []*ShelfEntry{}, StatusWantToRead)

	if err != nil {
		t.Errorf("expected success, got error: %v", err)
	}
	if entry == nil {
		t.Errorf("expected entry, got nil")
	}
}

func TestShelfService_RateBook_Success(t *testing.T) {
	us := NewUserService()
	bs := NewBookService()
	rs := NewReviewService()
	ss := NewShelfService(us, bs, rs)

	user, _ := NewUser("john@example.com", "password123")
	book, _ := NewBook("Go Programming", "John Doe", "ISBN123", 2023)
	entry, _ := NewShelfEntry(user.ID, book.ID, StatusCompleted)

	review, err := ss.RateBook(user, book, entry, 5, "Excellent book!")

	if err != nil {
		t.Errorf("expected success, got error: %v", err)
	}
	if review == nil {
		t.Errorf("expected review, got nil")
	}
	if review.Rating != 5 {
		t.Errorf("expected rating 5, got %d", review.Rating)
	}
}
```

### Method Receivers: Value vs Pointer

Receiver choice affects correctness, performance, and readability.

**Important note:** In the examples above, services are created as pointer receivers:

```go
// This modifies the User
func (u *User) Deactivate() error {
    u.Status = UserStatusInactive  // Modifies the actual object
    return nil
}

// This does NOT modify the User (just reads)
func (u User) GetEmail() string {
    return u.Email
}
```

- **Use pointer receiver** when the method modifies the object
- **Use value receiver** when the method only reads

Additional guidance:

- For large structs, pointer receivers avoid unnecessary copying.
- Keep receiver style consistent for a type unless there is a strong reason to mix.
- If a type has at least one mutating method, pointer receivers are usually best for all methods on that type.

### Verification

Run all tests:

```bash
cd pkg/domain
go test -v ./...
```

Output should show:
```
ok      bookshelf-api/pkg/domain       0.004s
```

### Files Created This Section

```
pkg/domain/
├── business_rules.go        # Service layer with business logic
├── business_rules_test.go   # Tests for business logic
└── (previous files...)
```

### Composition Over Inheritance

Notice how `ShelfService` contains references to `UserService`, `BookService`, and `ReviewService`. This is **composition** - combining smaller, focused services into larger ones. This is more flexible than inheritance and easier to test (can mock dependencies).

This design also supports incremental refactoring: each service can later be backed by repository interfaces without rewriting domain rules.

### What's Next

In **Section 20 (Microservices & REST API)**, you'll:
- Create handler functions that accept HTTP requests
- Use these business logic functions to process requests
- Return HTTP responses
- Add dependency injection to wire it all together

## Deep Dive: Designing Functions and Methods for Maintainability

### Background

In Go, well-designed functions are small, explicit, and easy to test. Methods organize behavior around data, while functions can remain stateless and reusable.

When this separation is done well, your codebase becomes easier to reason about:

- Domain methods protect invariants.
- Service methods orchestrate workflows.
- Handlers focus on transport concerns (HTTP request/response).

### Function Design Principles

1. Keep parameters focused and meaningful.
2. Return errors instead of hiding failures.
3. Avoid side effects in helper functions where possible.
4. Favor composition of small functions.
5. Keep one clear responsibility per method.
6. Prefer explicit names that match domain language.

### Value vs Pointer Receivers

- Use value receivers for read-only behavior on small structs.
- Use pointer receivers when mutating state or avoiding copies.

```go
type Counter struct { Value int }

func (c Counter) Snapshot() int { return c.Value }
func (c *Counter) Increment()   { c.Value++ }
```

### Service Method Pattern

```go
func (s *ShelfService) MoveToCompleted(entry *ShelfEntry) error {
	if entry.Status == StatusCompleted {
		return NewInvalidStatusError(StatusCompleted, StatusCompleted, "already completed")
	}
	entry.Status = StatusCompleted
	entry.UpdatedAt = Now()
	return nil
}
```

### Testing Guidance

- Unit test every branch for service methods.
- Keep method responsibilities narrow (one business action per method).
- Use descriptive method names that reflect domain actions.

### Common Pitfalls

- Large service methods that combine validation, persistence, and response formatting.
- Generic method names like `Process` or `Handle` that hide intent.
- Missing error context when returning failures from orchestration methods.

### SDET Perspective

Functions and methods designed with clear inputs, outputs, and error contracts are easier to automate at unit, integration, and contract-test layers.

## Common Anti-Patterns

- Writing large service methods that combine validation, persistence, and response formatting in a single function.
- Using generic method names like `Process` or `Handle` that obscure the domain intent.
- Missing error context when returning failures from orchestration methods.
- Accepting struct values instead of interfaces, preventing test double injection.

## Quick Functions and Methods Checklist

- Does each function have a single, named responsibility?
- Are method parameters typed as interfaces wherever a dependency could be replaced in tests?
- Does every error return include sufficient context to diagnose the failure?
- Are domain operations free of infrastructure concerns like logging or HTTP encoding?



## Next Step

Continue with [Structs and Interfaces](structs-and-interfaces.md).
