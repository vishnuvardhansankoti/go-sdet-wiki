# Dependency Injection

## What is DI?

Dependency Injection is a technique where objects receive their dependencies from external sources rather than creating them.

## Benefits

- **Testability**: Easy to mock dependencies
- **Flexibility**: Easy to swap implementations
- **Loose Coupling**: Components don't depend on concrete types
- **Maintainability**: Changes in one component don't affect others

## Constructor Injection

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

## Interface-Based DI

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

## Wire Pattern

```go
func setupDependencies() *UserService {
    db := database.Connect()
    repo := repository.NewPostgresUserRepository(db)
    logger := log.New(os.Stdout, "USER ", log.LstdFlags)
    return NewUserService(repo, logger)
}
```

## Using Wire (Code Generation)

The Wire tool generates dependency injection code:

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
