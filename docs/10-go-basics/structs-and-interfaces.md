# Structs and Interfaces

Structs and interfaces are foundational to idiomatic Go design. Structs represent concrete domain data, while interfaces define behavior contracts between components. Together, they help you build systems that are clear, testable, and easy to evolve.

In this section, focus on one core idea:

- Use structs to model real business entities.
- Use methods to enforce domain rules on those entities.
- Use interfaces to decouple logic from implementation details.

## Structs

Structs are custom types that group related fields. In domain-driven code, each struct should represent something meaningful in the business model.

### Definition

This example defines a simple `Person` with strongly typed fields.

```go
type Person struct {
    Name string
    Age  int
    City string
}
```

Key point: a struct gives you a clear shape for data and improves readability over loosely typed maps.

### Creating Instances

You can initialize structs by position or by field name.

- Positional form is shorter but can become fragile if field order changes.
- Named-field form is usually preferred for readability and maintenance.

```go
p1 := Person{"John", 30, "NYC"}
p2 := Person{
    Name: "Jane",
    Age:  28,
    City: "LA",
}
```

## Interfaces

Interfaces define behavior, not data. A type satisfies an interface implicitly by implementing its methods; no explicit declaration is required.

### Definition

These interfaces describe read/write capabilities without tying code to any concrete storage type.

```go
type Writer interface {
    Write(p []byte) (n int, err error)
}

type Reader interface {
    Read(p []byte) (n int, err error)
}
```

This allows consumers to depend on capabilities instead of concrete implementations.

### Implementing Interfaces

Any type that implements the required method set satisfies the interface automatically.

```go
type File struct {
    data string
}

func (f File) Write(p []byte) (int, error) {
    f.data = string(p)
    return len(p), nil
}

func (f File) Read(p []byte) (int, error) {
    copy(p, f.data)
    return len(f.data), nil
}
```

Important note: in this snippet, `Write` uses a value receiver, so assigning to `f.data` does not persist outside the method call. In real implementations that mutate state, use pointer receivers.

### Embedding

Interface embedding lets you compose larger contracts from smaller ones.

```go
type ReadWriter interface {
    Reader
    Writer
}
```

This promotes modular interface design and keeps contracts reusable.

## Empty Interface

The `interface{}` type can hold any value.

Use it carefully. It is flexible, but you lose compile-time type safety and often need type assertions/switches later.

In modern Go, prefer concrete types, small interfaces, or generics when possible.

```go
var i interface{} = "hello"
var i interface{} = 42
var i interface{} = []int{1, 2, 3}
```

## Why This Matters in the Bookshelf Project

You will use these concepts directly in the domain layer:

- Structs model `User`, `Book`, `Review`, and `ShelfEntry`.
- Methods enforce invariants like valid status/rating transitions.
- Interfaces later decouple services from repositories for easier testing.

This combination enables fast feedback in unit tests and clean separation of concerns in service and handler layers.

## Quick Exercises

Try these short exercises before moving to the assignment.

### Exercise 1: Struct + Methods

Goal: Practice struct design and pointer/value receiver methods.

1. Create a `Book` struct with fields: `Title`, `Author`, `Pages`, `ReadPages`.
2. Add method `Progress() float64` (value receiver) that returns read percentage.
3. Add method `MarkRead(pages int)` (pointer receiver) that updates `ReadPages` safely.
4. Print progress before and after calling `MarkRead`.

Stretch: Prevent `ReadPages` from exceeding `Pages`.

### Exercise 2: Interface-Based Search Service

Goal: Use interfaces to decouple search behavior from implementation.

1. Define interface `BookFinder` with method `FindByTitle(title string) (Book, bool)`.
2. Implement `Library` type with a `[]Book` field that satisfies `BookFinder`.
3. Implement `FindByTitle` with a case-insensitive linear search.
4. Add a small `main` function that demonstrates found/not-found cases.

Stretch: Return `(Book, error)` and define a custom `ErrBookNotFound`.

### Exercise 3: Sort + Binary Search with Interfaces

Goal: Combine structs, interfaces, and algorithms in one practical exercise.

1. Add method `SortByTitle()` on `Library` using `sort.Slice`.
2. Update `FindByTitle` to use binary search on sorted data.
3. Keep the interface contract unchanged (`FindByTitle(title string) (Book, bool)`).
4. Write 3 table-driven test cases: first item, last item, missing item.

Hints:

- Compare lowercase titles for stable behavior.
- Keep sort and search logic deterministic for tests.

## Assignment: Part 2 - Build Domain Models with Methods

### Goal
Create the core domain structs and implement methods for the Bookshelf API.

### Tasks

#### 1. Create User Model - `pkg/domain/user.go`

```go
package domain

import (
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
		return NewValidationError(ErrInvalidEmail)
	}
	// Simple email validation (production would use regex)
	if !contains(email, "@") {
		return NewValidationError(ErrInvalidEmail)
	}
	return nil
}

// ValidatePassword checks if password meets requirements
func ValidatePassword(password string) error {
	if len(password) < MinPasswordLength || len(password) > MaxPasswordLength {
		return NewValidationError(ErrInvalidPassword)
	}
	return nil
}

// GetEmail returns user's email
func (u *User) GetEmail() string {
	return u.Email
}

// IsActive checks if user is active
func (u *User) IsActive() bool {
	return u.Status == UserStatusActive
}

// helper function (place at end of file)
func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
```

#### 2. Create Book Model - `pkg/domain/book.go`

```go
package domain

import "time"

// Book represents a book in the catalog
type Book struct {
	ID            BookID    `json:"id"`
	Title         string    `json:"title"`
	Author        string    `json:"author"`
	ISBN          string    `json:"isbn"`
	PublishedYear int       `json:"published_year"`
	CreatedAt     time.Time `json:"created_at"`
}

// NewBook creates a new Book with validation
func NewBook(title, author, isbn string, year int) (*Book, error) {
	if err := ValidateBookTitle(title); err != nil {
		return nil, err
	}
	if err := ValidateBookAuthor(author); err != nil {
		return nil, err
	}

	return &Book{
		Title:         title,
		Author:        author,
		ISBN:          isbn,
		PublishedYear: year,
		CreatedAt:     Now(),
	}, nil
}

// ValidateBookTitle checks if title is valid
func ValidateBookTitle(title string) error {
	if len(title) < MinTitleLength || len(title) > MaxTitleLength {
		return NewValidationError(ErrInvalidTitle)
	}
	return nil
}

// ValidateBookAuthor checks if author is valid
func ValidateBookAuthor(author string) error {
	if len(author) < MinAuthorLength || len(author) > MaxAuthorLength {
		return NewValidationError(ErrInvalidAuthor)
	}
	return nil
}

// GetTitle returns the book title
func (b *Book) GetTitle() string {
	return b.Title
}

// GetAuthor returns the book author
func (b *Book) GetAuthor() string {
	return b.Author
}
```

#### 3. Create Review Model - `pkg/domain/review.go`

```go
package domain

import "time"

// Review represents a user's review of a book
type Review struct {
	ID        ReviewID  `json:"id"`
	BookID    BookID    `json:"book_id"`
	UserID    UserID    `json:"user_id"`
	Rating    int       `json:"rating"` // 1-5
	Comment   string    `json:"comment"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// NewReview creates a new Review with validation
func NewReview(bookID BookID, userID UserID, rating int, comment string) (*Review, error) {
	if err := ValidateRating(rating); err != nil {
		return nil, err
	}
	if len(comment) > MaxReviewComment {
		return nil, NewValidationError("comment exceeds maximum length")
	}

	return &Review{
		BookID:    bookID,
		UserID:    userID,
		Rating:    rating,
		Comment:   comment,
		CreatedAt: Now(),
		UpdatedAt: Now(),
	}, nil
}

// ValidateRating checks if rating is valid (1-5)
func ValidateRating(rating int) error {
	if rating < MinRating || rating > MaxRating {
		return NewValidationError(ErrInvalidRating)
	}
	return nil
}

// GetRating returns the rating
func (r *Review) GetRating() int {
	return r.Rating
}

// GetComment returns the review comment
func (r *Review) GetComment() string {
	return r.Comment
}

// UpdateReview updates rating and comment
func (r *Review) UpdateReview(newRating int, newComment string) error {
	if err := ValidateRating(newRating); err != nil {
		return err
	}
	if len(newComment) > MaxReviewComment {
		return NewValidationError("comment exceeds maximum length")
	}

	r.Rating = newRating
	r.Comment = newComment
	r.UpdatedAt = Now()
	return nil
}
```

#### 4. Create ShelfEntry Model - `pkg/domain/shelf_entry.go`

```go
package domain

import "time"

// ShelfEntry represents a book entry in a user's bookshelf
type ShelfEntry struct {
	ID        ShelfEntryID `json:"id"`
	UserID    UserID       `json:"user_id"`
	BookID    BookID       `json:"book_id"`
	Status    string       `json:"status"` // WANT_TO_READ, CURRENTLY_READING, COMPLETED
	AddedAt   time.Time    `json:"added_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

// NewShelfEntry creates a new ShelfEntry with validation
func NewShelfEntry(userID UserID, bookID BookID, status string) (*ShelfEntry, error) {
	if err := ValidateReadingStatus(status); err != nil {
		return nil, err
	}

	return &ShelfEntry{
		UserID:    userID,
		BookID:    bookID,
		Status:    status,
		AddedAt:   Now(),
		UpdatedAt: Now(),
	}, nil
}

// ValidateReadingStatus checks if status is valid
func ValidateReadingStatus(status string) error {
	switch status {
	case StatusWantToRead, StatusCurrentlyReading, StatusCompleted:
		return nil
	default:
		return NewValidationError(ErrInvalidReadingStatus)
	}
}

// UpdateStatus updates the reading status
func (s *ShelfEntry) UpdateStatus(newStatus string) error {
	if err := ValidateReadingStatus(newStatus); err != nil {
		return err
	}
	s.Status = newStatus
	s.UpdatedAt = Now()
	return nil
}

// GetStatus returns the current status
func (s *ShelfEntry) GetStatus() string {
	return s.Status
}
```

#### 5. Create Error Type - `pkg/domain/errors.go`

```go
package domain

// ValidationError represents a validation error
type ValidationError struct {
	Message string
}

// NewValidationError creates a new ValidationError
func NewValidationError(message string) *ValidationError {
	return &ValidationError{Message: message}
}

// Error implements the error interface
func (e *ValidationError) Error() string {
	return e.Message
}

// IsValidationError checks if an error is a ValidationError
func IsValidationError(err error) bool {
	_, ok := err.(*ValidationError)
	return ok
}
```

### Why Structs with Methods?

1. **Encapsulation** - Data and behavior together
2. **Validation** - Constructor validates input before creating objects
3. **Type Safety** - NewBook() ensures we have a valid book, not just any struct
4. **Immutability** - Certain fields (ID, CreatedAt) shouldn't change
5. **Business Logic** - UpdateStatus() enforces valid transitions

### Testing This Code

Create `pkg/domain/user_test.go`:

```go
package domain

import "testing"

func TestNewUser_ValidEmail(t *testing.T) {
	user, err := NewUser("john@example.com", "password123")
	if err != nil {
		t.Fatalf("NewUser failed: %v", err)
	}
	if user.Email != "john@example.com" {
		t.Errorf("Expected email john@example.com, got %s", user.Email)
	}
	if user.Status != UserStatusActive {
		t.Errorf("Expected status ACTIVE, got %s", user.Status)
	}
}

func TestNewUser_InvalidEmail(t *testing.T) {
	_, err := NewUser("invalid-email", "password123")
	if err == nil {
		t.Fatalf("Expected validation error for invalid email")
	}
}

func TestNewUser_ShortPassword(t *testing.T) {
	_, err := NewUser("john@example.com", "pass")
	if err == nil {
		t.Fatalf("Expected validation error for short password")
	}
}
```

Similarly, create tests for Book and Review:
- `pkg/domain/book_test.go`
- `pkg/domain/review_test.go`
- `pkg/domain/shelf_entry_test.go`

### Verification

Run the tests:

```bash
cd pkg/domain
go test -v
```

Expected output:
```
=== RUN   TestNewUser_ValidEmail
--- PASS: TestNewUser_ValidEmail (0.001s)
=== RUN   TestNewUser_InvalidEmail
--- PASS: TestNewUser_InvalidEmail (0.001s)
=== RUN   TestNewUser_ShortPassword
--- PASS: TestNewUser_ShortPassword (0.001s)
...
ok      bookshelf-api/pkg/domain       0.003s
```

### Files Created This Section

```
pkg/domain/
├── constants.go          # Constants (from Part 1)
├── types.go             # Type definitions (from Part 1)
├── errors.go            # Error types
├── user.go              # User model
├── book.go              # Book model
├── review.go            # Review model
├── shelf_entry.go       # Shelf entry model
├── user_test.go         # Tests for User
├── book_test.go         # Tests for Book
├── review_test.go       # Tests for Review
└── shelf_entry_test.go  # Tests for ShelfEntry
```

### Checklist

- ✅ All structs created with JSON tags
- ✅ Constructor functions with validation
- ✅ Error types defined
- ✅ Basic tests written for validation logic
- ✅ Code compiles and tests pass

### What's Next

In **Error Handling** section, you'll improve error handling and custom error types. Then in **Section 20**, you'll create the handler layer that accepts HTTP requests and uses these domain models.

## Deep Dive: Struct and Interface Modeling in Go

### Background

Structs model state. Interfaces model behavior contracts. Together, they make code flexible and testable.

### Struct Design Tips

1. Keep fields meaningful and domain-oriented.
2. Use constructor functions (`New...`) for validation.
3. Add JSON tags only when transport serialization is needed.
4. Keep invariants enforced at creation and update boundaries.

### Interface Design Tips

1. Define interfaces where they are consumed, not where they are implemented.
2. Keep interfaces small (`GetByID`, `Save`) rather than broad.
3. Use interfaces to enable mocks/fakes in tests.

### Example: Consumer-Side Interface

```go
type BookLookup interface {
	FindByID(id BookID) (*Book, error)
}

type RecommendationService struct {
	books BookLookup
}
```

### SDET Perspective

Interfaces are the seam that enables deterministic tests. You can replace real database dependencies with in-memory fakes and verify behavior quickly.

### Practice Exercise

Add a `ShelfRepository` interface with `Save`, `FindByUser`, and `Delete` methods, then create an in-memory fake and test service logic against it.

## Common Anti-Patterns

- Defining wide interfaces with many methods when only a subset is used by any one consumer.
- Embedding concrete types in structs instead of using interface fields, preventing test substitution.
- Exporting struct fields that should be enforced through constructor validation.
- Defining interfaces in the implementing package rather than in the consuming package.

## Quick Structs and Interfaces Checklist

- Are interfaces defined in the package that consumes them, not the package that implements them?
- Do all domain structs expose fields only through constructors that enforce invariants?
- Are interface types narrow — containing only the methods a single consumer actually needs?
- Can each struct dependency be swapped for a test fake without changing the consumer?



## Next Step

Continue with [Error Handling](error-handling.md).
