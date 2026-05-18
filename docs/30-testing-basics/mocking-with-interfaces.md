# Mocking with Interfaces

Mocking with interfaces is a core testing technique in Go. It allows you to test business behavior in isolation by replacing slow or unstable dependencies such as databases, message brokers, and external APIs.

In this section, the key idea is simple: define behavior contracts with interfaces, then provide test doubles that let your tests run fast and deterministically.

## Why Mock?

- Isolate code under test
- Control external dependencies
- Verify interactions
- Speed up tests

When tests rely on real infrastructure for every scenario, feedback gets slow and failures become harder to diagnose. Mocking and fakes reduce noise and keep tests focused on service logic.

## Interface-Based Mocking

Go makes interface-based testing natural because interfaces are implicitly implemented. You can inject any type that satisfies the required methods.

### Real Service

This service depends on a repository and email sender. In tests, both can be replaced with controlled doubles.

```go
type EmailService interface {
    Send(to, subject, body string) error
}

type UserService struct {
    repo  UserRepository
    email EmailService
}

func (s *UserService) CreateUser(name, email string) error {
    user := &User{Name: name, Email: email}
    if err := s.repo.Save(user); err != nil {
        return err
    }
    return s.email.Send(email, "Welcome", "Welcome to our service!")
}
```

### Mock Implementation

This mock records whether a method was called and can simulate success/failure by returning a configured error.

```go
type MockEmailService struct {
    SendCalled bool
    SendError  error
}

func (m *MockEmailService) Send(to, subject, body string) error {
    m.SendCalled = true
    return m.SendError
}

func TestCreateUser(t *testing.T) {
    mockEmail := &MockEmailService{}
    mockRepo := &MockUserRepository{}
    
    service := &UserService{
        repo:  mockRepo,
        email: mockEmail,
    }
    
    err := service.CreateUser("John", "john@example.com")
    
    if err != nil {
        t.Errorf("unexpected error: %v", err)
    }
    
    if !mockEmail.SendCalled {
        t.Error("email.Send was not called")
    }
}
```

This style is useful when you need to verify interaction behavior, for example that welcome email is sent after successful user creation.

## Using testify/mock

The testify mock package provides expectation APIs that can reduce boilerplate when interaction verification is important.

```bash
go get github.com/stretchr/testify
```

```go
import "github.com/stretchr/testify/mock"

type MockEmailService struct {
    mock.Mock
}

func (m *MockEmailService) Send(to, subject, body string) error {
    args := m.Called(to, subject, body)
    return args.Error(0)
}

func TestCreateUser(t *testing.T) {
    mockEmail := new(MockEmailService)
    mockEmail.On("Send",
        "john@example.com",
        "Welcome",
        "Welcome to our service!",
    ).Return(nil)
    
    service := &UserService{email: mockEmail}
    err := service.CreateUser("John", "john@example.com")
    
    if err != nil {
        t.Errorf("unexpected error: %v", err)
    }
    
    mockEmail.AssertCalled(t, "Send",
        "john@example.com",
        "Welcome",
        "Welcome to our service!",
    )
}
```

Use expectation-heavy mocking carefully. It is powerful, but overuse can make tests brittle if they assert incidental call details.

## Best Practices

- Mock interfaces, not concrete types
- Keep mocks simple
- Test behavior, not implementation
- Use dependency injection

Additional guidance:

- Prefer fakes for stateful CRUD behavior.
- Reserve strict mocks for protocol/interaction contracts.
- Keep assertions focused on observable outcomes.


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

## Assignment: Mock Repositories for Service Tests (Bookshelf)

### Goal
Use interface-based mocking for service tests without real DB.

This assignment helps you build a fast unit-test layer where domain and service behavior is verified independently from infrastructure.

### Tasks

1. Create or update `tests/mocks/mock_repositories.go`.
2. Implement `InMemoryUserRepository` and `InMemoryBookRepository` for tests.
3. Write tests for service behavior using these fakes.

Example test target:

```go
func TestShelfService_AddBookToShelf_Success(t *testing.T) {
    userSvc := domain.NewUserService()
    bookSvc := domain.NewBookService()
    reviewSvc := domain.NewReviewService()
    shelfSvc := domain.NewShelfService(userSvc, bookSvc, reviewSvc)

    entry, err := shelfSvc.AddBookToShelf(
        domain.NewUserID("reader-1"),
        domain.NewBookID("isbn-1"),
        domain.StatusWantToRead,
    )
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if entry.Status != domain.StatusWantToRead {
        t.Fatalf("status=%s", entry.Status)
    }
}
```

Focus assertions on business result and expected state transition, not only on internal method calls.

### Done Criteria

- Mocks compile and are reused across tests
- Service tests run without network/database dependencies

Also ensure tests remain deterministic when run repeatedly and in parallel.

## Deep Dive: Choosing Between Mock, Fake, Stub, and Spy

### Background

Different test doubles solve different problems. Overusing strict mocks can make tests brittle.

Choosing the right double improves signal-to-noise ratio in tests and lowers maintenance cost over time.

### Quick Guide

1. Stub: returns fixed output, no call tracking.
2. Fake: lightweight in-memory implementation.
3. Spy: records usage details for assertions.
4. Mock: pre-programmed expectations and verification.

### Recommendation for Bookshelf

- Prefer fakes for repository behavior tests.
- Use spies when you must assert interaction counts.
- Use strict mocks sparingly for behavior contracts.

Most Bookshelf service tests will be cleaner with in-memory fakes because they naturally model repository state transitions.

### Anti-Patterns

- Verifying every call argument when not relevant.
- Mocking domain models or pure functions.
- Embedding production logic into fake implementations.

Another anti-pattern is using one giant mock type for many interfaces. Keep doubles focused per dependency.

### Practical Example

A fake repository with map storage is usually more maintainable than a highly scripted mock for CRUD-heavy services.

## Common Anti-Patterns

- Verifying every call argument when only return behavior matters, making tests brittle.
- Mocking domain models or pure functions that have no external dependencies.
- Embedding production logic inside fake implementations, duplicating behavior under test.
- Using one giant mock type for many interfaces instead of one focused double per dependency.
- Reaching for a mocking framework before trying a handwritten in-memory fake.

## Quick Decision Checklist

- Do you need only return values? Use a stub.
- Do you need realistic in-memory behavior? Use a fake.
- Do you need to verify call count/args? Use a spy or mock.
- Do you need strict interaction contract checks? Use mock expectations.

## SDET Perspective

Well-chosen test doubles shorten feedback loops and improve reliability. They let you reserve heavier integration tests for boundary validation while keeping most behavior checks fast and local.




## Next Step

Continue with [Testing HTTP Handlers](testing-http-handlers.md).
