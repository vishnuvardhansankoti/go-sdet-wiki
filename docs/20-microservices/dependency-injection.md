# Dependency Injection

Dependency Injection (DI) is one of the most important design practices in testable microservices. It helps you separate business logic from infrastructure concerns by passing dependencies into components instead of constructing them internally.

In this section, you will learn how DI supports:

- cleaner architecture,
- easier unit testing,
- and safer refactoring as the codebase grows.

## What is DI?

Dependency Injection is a technique where objects receive their dependencies from external sources rather than creating them.

In other words, a service should not decide how to create a database repository, logger, or HTTP client. It should only declare what it needs, and assembly code (composition root) should provide it.

## Benefits

- **Testability**: Easy to mock dependencies
- **Flexibility**: Easy to swap implementations
- **Loose Coupling**: Components don't depend on concrete types
- **Maintainability**: Changes in one component don't affect others

DI also improves startup clarity: you can see the full dependency graph in one place during application wiring.

## Constructor Injection

Constructor injection is the most common and safest DI style in Go. Dependencies are required at creation time, which prevents partially initialized objects.

```go
type UserService struct {
    repo repository.UserRepository
    logger *log.Logger
}

func NewUserService(repo repository.UserRepository, logger *log.Logger) *UserService {
    return &UserService{
        repo:   repo,
        logger: logger,
    }
}
```

This pattern makes required dependencies explicit and discoverable from the constructor signature.

## Interface-Based DI

In Go, interfaces are implicitly implemented, which makes DI ergonomic. Consumers depend on behavior contracts, not concrete implementations.

```go
type Repository interface {
    GetUser(id int) (*User, error)
}

type UserService struct {
    repo Repository
}

func (s *UserService) GetUser(id int) (*User, error) {
    return s.repo.GetUser(id)
}
```

This allows seamless swapping between production repositories and in-memory fakes during tests.

## Wire Pattern

The wire pattern means creating dependencies in one assembly function and injecting them into higher-level services.

```go
func setupDependencies() *UserService {
    db := database.Connect()
    repo := repository.NewPostgresUserRepository(db)
    logger := log.New(os.Stdout, "USER ", log.LstdFlags)
    return NewUserService(repo, logger)
}
```

Keep this pattern near app startup (`main` or container package) so business code remains independent from construction details.

## Using Wire (Code Generation)

The Wire tool generates dependency injection code:

Wire is optional. For small projects, manual wiring is often enough. For larger projects with many services, generated wiring can reduce boilerplate and wiring mistakes.

```bash
go install github.com/google/wire/cmd/wire@latest
```

```go
func provideUserRepository(db *sql.DB) *repository.PostgresUserRepository {
    return repository.NewPostgresUserRepository(db)
}

func setupUserService() *UserService {
    wire.Build(
        database.Connect,
        provideUserRepository,
        NewUserService,
    )
    return nil
}
```

## Assignment: Implement Dependency Injection

### Goal  
Create a robust DI pattern for easy testing and reconfiguration.

This assignment establishes a DI-first architecture where repositories and services can be replaced per test type (unit/integration) without changing core logic.

### Tasks

#### 1. Define Repository Interfaces

Define interfaces by consumer needs, not by database implementation details. Keep contracts focused and minimal.

Create `pkg/repository/interfaces.go`:

```go
package repository

import (
	"context"
	"github.com/yourusername/bookshelf-api/pkg/domain"
)

// UserRepository defines the interface for user data access
type UserRepository interface {
	Save(ctx context.Context, user *domain.User) error
	FindByID(ctx context.Context, id domain.UserID) (*domain.User, error)
	FindByEmail(ctx context.Context, email string) (*domain.User, error)
	Delete(ctx context.Context, id domain.UserID) error
	List(ctx context.Context, limit, offset int) ([]*domain.User, error)
}

// BookRepository defines the interface for book data access
type BookRepository interface {
	Save(ctx context.Context, book *domain.Book) error
	FindByID(ctx context.Context, id domain.BookID) (*domain.Book, error)
	FindByISBN(ctx context.Context, isbn string) (*domain.Book, error)
	List(ctx context.Context, limit, offset int) ([]*domain.Book, error)
	Delete(ctx context.Context, id domain.BookID) error
}
```

#### 2. Create Fake Repositories for Testing

In-memory fakes should be deterministic, thread-safe where needed, and fast. They are ideal for unit tests that validate service behavior without external systems.

Create `tests/mocks/mock_user_repo.go`:

```go
package mocks

import (
	"context"
	"sync"
	"github.com/yourusername/bookshelf-api/pkg/domain"
)

// InMemoryUserRepository is a fake implementation
type InMemoryUserRepository struct {
	users map[string]*domain.User
	mu    sync.RWMutex
}

func NewInMemoryUserRepository() *InMemoryUserRepository {
	return &InMemoryUserRepository{
		users: make(map[string]*domain.User),
	}
}

func (r *InMemoryUserRepository) Save(ctx context.Context, user *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.users[user.ID.String()] = user
	return nil
}

func (r *InMemoryUserRepository) FindByID(ctx context.Context, id domain.UserID) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	user, ok := r.users[id.String()]
	if !ok {
		return nil, domain.NewNotFoundError("user", id.String())
	}
	return user, nil
}

func (r *InMemoryUserRepository) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, user := range r.users {
		if user.Email == email {
			return user, nil
		}
	}
	return nil, domain.NewNotFoundError("user", email)
}

func (r *InMemoryUserRepository) Delete(ctx context.Context, id domain.UserID) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.users, id.String())
	return nil
}

func (r *InMemoryUserRepository) List(ctx context.Context, limit, offset int) ([]*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	users := make([]*domain.User, 0)
	for _, u := range r.users {
		users = append(users, u)
	}
	return users, nil
}
```

#### 3. Update Service Container

The service container becomes your composition root: one place where dependencies are assembled and passed into services.

Update `pkg/service/container.go` to accept repositories:

```go
type Container struct {
	UserService       *domain.UserService
	BookService       *domain.BookService  
	ReviewService     *domain.ReviewService
	ShelfService      *domain.ShelfService
	BulkImportService *domain.BulkImportService
	
	UserRepository  repository.UserRepository    // NEW
	BookRepository  repository.BookRepository    // NEW
	
	Logger *slog.Logger
}

func NewContainer(
	logger *slog.Logger,
	userRepo repository.UserRepository,
	bookRepo repository.BookRepository,
) *Container {
	// ... services initialization ...
	
	return &Container{
		UserService:     userService,
		BookService:     bookService,
		ReviewService:   reviewService,
		ShelfService:    shelfService,
		UserRepository:  userRepo,
		BookRepository:  bookRepo,
		Logger:          logger,
	}
}
```

#### 4. Use in Tests

Tests should inject dependencies explicitly so test setup is obvious and reproducible.

```go
// In test file
func TestCreateUser(t *testing.T) {
	userRepo := mocks.NewInMemoryUserRepository()
	bookRepo := mocks.NewInMemoryBookRepository()
	
	container := service.NewContainer(
		logger.NewNullLogger(),
		userRepo,
		bookRepo,
	)
	
	// Now use container services in tests
	// No database needed!
}
```

### Files Created

```
- pkg/repository/interfaces.go
- tests/mocks/mock_user_repo.go
- tests/mocks/mock_book_repo.go (similar)
```

### What's Next

Next you'll add logging to track DI initialization and injected dependencies.

## DI Lifecycle in This Tutorial

Use this progression to keep architecture consistent:

1. Define interfaces in repository/service boundaries.
2. Inject fakes in unit tests.
3. Inject real infrastructure in integration tests.
4. Keep handlers/services free from direct infrastructure creation.

This lifecycle keeps each test layer focused and avoids accidental coupling.

## Deep Dive: DI Patterns and Test Isolation

### Background

Dependency Injection lets you control what code under test talks to. This is foundational for deterministic tests and safer refactors.

### Why Constructor Injection First

Constructor injection makes dependencies explicit at creation time and prevents partially initialized objects.

```go
func NewHandler(userSvc UserService, bookSvc BookService, log *slog.Logger) *Handler {
	return &Handler{userService: userSvc, bookService: bookSvc, logger: log}
}
```

### Interface Scope Guidance

Define small interfaces by behavior needed by the consumer, not by repository implementation details.

Prefer narrow interfaces such as `FindByID`/`Save` over broad "do everything" contracts.

### Testing Strategy with DI

1. Unit tests inject in-memory fakes.
2. Integration tests inject real Postgres repositories.
3. Contract tests inject real handlers but controlled state setup.

This strategy gives you fast feedback at unit layer and realistic confidence at integration/contract layers.

## Common Anti-Patterns

- Creating concrete repositories directly inside handlers.
- Global singleton service containers.
- Overly broad interfaces with unused methods.
- Hiding dependency creation inside helper functions that are hard to override in tests.
- Mixing environment/config loading inside business services.

### SDET Benefit

DI enables fast and stable test suites by replacing slow external dependencies with deterministic in-process doubles when appropriate.

It also improves failure analysis because dependency boundaries are explicit, making it easier to pinpoint whether a defect is in domain logic, wiring, or infrastructure.

## Quick DI Checklist

- Are all service dependencies injected through constructors rather than created internally?
- Do unit tests inject in-memory fakes instead of real infrastructure?
- Are interfaces narrow — each consumer receives only the methods it needs?
- Is wiring code (container, main) separated from business logic?

