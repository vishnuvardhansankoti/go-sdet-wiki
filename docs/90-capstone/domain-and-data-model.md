# Domain and Data Model

The domain model is the long-term stability layer of the capstone. Handlers, storage details, and infrastructure may evolve, but domain invariants and ownership rules should remain explicit and testable.

Use this page to align entities, repository contracts, and service responsibilities.

## Domain Entities

Entities should encode business meaning, not transport-specific concerns.

### User

```go
type User struct {
    ID        int
    Email     string
    Name      string
    CreatedAt time.Time
}
```

Represents a system user with authentication.

### Book

```go
type Book struct {
    ID        int
    Title     string
    Author    string
    ISBN      string
    CreatedAt time.Time
}
```

Represents a book in the catalog.

### Bookshelf

```go
type BookshelfEntry struct {
    ID        int
    UserID    int
    BookID    int
    AddedAt   time.Time
}
```

Entry representing a book on a user's bookshelf.

### ReadingList

```go
type ReadingList struct {
    ID        int
    UserID    int
    Name      string
    CreatedAt time.Time
}
```

A named collection of books for the user.

### ReadingListItem

```go
type ReadingListItem struct {
    ID            int
    ReadingListID int
    BookID        int
    Completed     bool
    AddedAt       time.Time
}
```

Entry in a reading list.

### Review

```go
type Review struct {
    ID        int
    UserID    int
    BookID    int
    Rating    int       // 1-5
    Text      string
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

User review of a book.

## Domain Interfaces

Repository interfaces represent persistence capabilities required by services, not table-level CRUD convenience.

### UserRepository

```go
type UserRepository interface {
    CreateUser(ctx context.Context, user *User) error
    GetUser(ctx context.Context, id int) (*User, error)
    GetUserByEmail(ctx context.Context, email string) (*User, error)
    UpdateUser(ctx context.Context, user *User) error
    DeleteUser(ctx context.Context, id int) error
}
```

### BookRepository

```go
type BookRepository interface {
    GetBook(ctx context.Context, id int) (*Book, error)
    ListBooks(ctx context.Context) ([]Book, error)
    CreateBook(ctx context.Context, book *Book) error
}
```

### BookshelfRepository

```go
type BookshelfRepository interface {
    AddBook(ctx context.Context, userID, bookID int) error
    RemoveBook(ctx context.Context, userID, bookID int) error
    ListBooks(ctx context.Context, userID int) ([]Book, error)
    HasBook(ctx context.Context, userID, bookID int) (bool, error)
}
```

### ReadingListRepository

```go
type ReadingListRepository interface {
    CreateList(ctx context.Context, list *ReadingList) (int, error)
    ListForUser(ctx context.Context, userID int) ([]ReadingList, error)
    GetList(ctx context.Context, id int) (*ReadingList, error)
    DeleteList(ctx context.Context, id int) error
    
    AddBook(ctx context.Context, listID, bookID int) error
    RemoveBook(ctx context.Context, listID, bookID int) error
    ListBooks(ctx context.Context, listID int) ([]Book, error)
    MarkComplete(ctx context.Context, listID, bookID int) error
}
```

### ReviewRepository

```go
type ReviewRepository interface {
    CreateReview(ctx context.Context, review *Review) error
    GetReview(ctx context.Context, id int) (*Review, error)
    ListReviewsForBook(ctx context.Context, bookID int) ([]Review, error)
    UpdateReview(ctx context.Context, review *Review) error
    DeleteReview(ctx context.Context, id int) error
}
```

## Domain Services

Services should orchestrate use cases and enforce business rules while keeping infrastructure concerns out of the domain layer.

### UserService

```go
type UserService interface {
    RegisterUser(ctx context.Context, email, name, password string) (*User, error)
    GetUser(ctx context.Context, id int) (*User, error)
    UpdateUser(ctx context.Context, user *User) error
}
```

### BookService

```go
type BookService interface {
    GetBook(ctx context.Context, id int) (*Book, error)
    ListBooks(ctx context.Context) ([]Book, error)
    AddBook(ctx context.Context, book *Book) error
    GetOrCreateBook(ctx context.Context, title, author string) (*Book, error)
}
```

### BookshelfService

```go
type BookshelfService interface {
    AddBook(ctx context.Context, userID, bookID int) error
    RemoveBook(ctx context.Context, userID, bookID int) error
    GetBooks(ctx context.Context, userID int) ([]Book, error)
}
```

### ReadingListService

```go
type ReadingListService interface {
    CreateList(ctx context.Context, userID int, name string) (*ReadingList, error)
    ListsForUser(ctx context.Context, userID int) ([]ReadingList, error)
    AddBook(ctx context.Context, listID, bookID int) error
    RemoveBook(ctx context.Context, listID, bookID int) error
    GetBooks(ctx context.Context, listID int) ([]Book, error)
    MarkComplete(ctx context.Context, listID, bookID int) error
}
```

### ReviewService

```go
type ReviewService interface {
    CreateReview(ctx context.Context, userID, bookID int, rating int, text string) (*Review, error)
    GetReviewsForBook(ctx context.Context, bookID int) ([]Review, error)
    UpdateReview(ctx context.Context, review *Review) error
    DeleteReview(ctx context.Context, id int) error
}
```

## Entity Relationships

```
User
├── Bookshelf → Book
├── ReadingList
│   └── ReadingListItem → Book
└── Review
    └── Book
```

## Error Types

Typed errors are key to consistent API error mapping and predictable test assertions.

```go
type ValidationError struct {
    Field   string
    Message string
}

type NotFoundError struct {
    Entity string
    ID     int
}

type ConflictError struct {
    Message string
}
```

## Value Objects

Value objects make invariants explicit and reduce invalid state propagation.

```go
type Email string
type Rating int  // 1-5

func (e Email) Valid() bool {
    // Validate email format
}

func (r Rating) Valid() bool {
    return r >= 1 && r <= 5
}
```

## Next Step

Proceed to [API Specification](api-specification.md)

## Assignment: Align Domain Model with Existing Bookshelf Implementation

### Goal
Reconcile capstone domain model with the tutorial's current domain package.

### Tasks

1. Map identifiers to existing types:
    - `UserID`, `BookID`, `ReviewID`
2. Ensure rating invariants are enforced in constructors.
3. Keep repository interfaces context-aware (`context.Context`).
4. Document entity relationships and ownership rules.

### Done Criteria

- Domain docs match code in `pkg/domain`.
- Repository interfaces are consistent with service usage.

## Deep Dive: Domain Integrity and Ownership

### Background

The domain model is the stability core of the system. Handler and repository code can evolve, but entity invariants and ownership rules should remain explicit.

### Integrity rules

1. Enforce invariants in constructors and update methods.
2. Keep repository interfaces focused on aggregate behaviors.
3. Use typed IDs/value objects to avoid cross-entity misuse.
4. Document ownership boundaries (for example, review belongs to user+book).

### SDET recommendation

Add unit tests that assert domain invariants independently from persistence or transport layers.

## Common Anti-Patterns

- Encoding transport concerns directly into domain entities.
- Leaving invariants unenforced until handler/repository layers.
- Using primitive IDs everywhere instead of typed identifiers.
- Creating repository interfaces that leak storage implementation details.

## Quick Domain Integrity Checklist

- Are invariants enforced in constructors/methods?
- Are ownership boundaries documented and tested?
- Are repository contracts aligned with service behavior?
- Are typed errors/value objects used consistently?
- Do domain tests run without DB or HTTP dependencies?


