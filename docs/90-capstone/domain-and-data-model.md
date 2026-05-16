# Domain and Data Model

## Domain Entities

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
