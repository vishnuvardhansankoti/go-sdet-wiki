# Testing Database Code with Fakes

Testing database-dependent code with fakes is a powerful way to keep unit tests fast, deterministic, and focused on business logic. Instead of hitting a real database for every scenario, you simulate persistence behavior in memory.

This approach is especially useful when you want rapid feedback during development and CI.

## Fake Implementation

Create a fake in-memory implementation for testing.

A fake is different from a mock: it has working behavior (for example, map-backed storage) rather than only predefined expectations.

```go
type UserRepository interface {
    GetUser(id int) (*User, error)
    SaveUser(user *User) error
    DeleteUser(id int) error
}

type FakeUserRepository struct {
    users map[int]*User
}

func NewFakeUserRepository() *FakeUserRepository {
    return &FakeUserRepository{
        users: make(map[int]*User),
    }
}

func (f *FakeUserRepository) GetUser(id int) (*User, error) {
    user, ok := f.users[id]
    if !ok {
        return nil, errors.New("user not found")
    }
    return user, nil
}

func (f *FakeUserRepository) SaveUser(user *User) error {
    if user.Name == "" {
        return errors.New("name cannot be empty")
    }
    f.users[user.ID] = user
    return nil
}

func (f *FakeUserRepository) DeleteUser(id int) error {
    delete(f.users, id)
    return nil
}
```

Design note: keep fake behavior aligned with repository contract so tests remain meaningful.

## Using the Fake in Tests

In this pattern, the service under test uses the fake repository exactly like it would use the real repository.

```go
func TestGetUser(t *testing.T) {
    repo := NewFakeUserRepository()
    
    testUser := &User{ID: 1, Name: "John"}
    repo.SaveUser(testUser)
    
    user, err := repo.GetUser(1)
    
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    
    if user.Name != "John" {
        t.Errorf("name = %s; want John", user.Name)
    }
}
```

This gives you realistic behavior checks without network, container, or database setup overhead.

## Spy Pattern

Track calls to the fake:

Spies are useful when interaction count/order matters, such as verifying that save is called after validation.

```go
type SpyUserRepository struct {
    GetUserCalls int
    SaveUserCalls int
}

func (s *SpyUserRepository) GetUser(id int) (*User, error) {
    s.GetUserCalls++
    return &User{ID: id, Name: "Test"}, nil
}

func (s *SpyUserRepository) SaveUser(user *User) error {
    s.SaveUserCalls++
    return nil
}

func TestCallsRepository(t *testing.T) {
    repo := &SpyUserRepository{}
    service := NewUserService(repo)
    
    service.GetUser(1)
    
    if repo.GetUserCalls != 1 {
        t.Errorf("GetUser calls = %d; want 1", repo.GetUserCalls)
    }
}
```

## Stub Pattern

Return preset values:

Stubs are best for simple branch coverage where only one dependency outcome is needed.

```go
type StubUserRepository struct {
    User *User
    Error error
}

func (s *StubUserRepository) GetUser(id int) (*User, error) {
    return s.User, s.Error
}

func TestUserNotFound(t *testing.T) {
    repo := &StubUserRepository{
        User:  nil,
        Error: errors.New("not found"),
    }
    
    _, err := repo.GetUser(999)
    
    if err == nil {
        t.Error("expected error")
    }
}
```

Use stubs for narrow scenarios; use fakes when stateful behavior is required.


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

## Assignment: Build Fake Repositories for Bookshelf

### Goal
Implement fake repositories that mimic persistence behavior for unit tests.

The goal is not to reproduce every database feature. It is to preserve the repository contract expected by services.

### Tasks

1. Create `tests/mocks/fake_book_repository.go` with map + mutex.
2. Support operations:
    - `Save`
    - `FindByID`
    - `List`
    - `Delete`
3. Return `domain.NewNotFoundError(...)` when missing.
4. Add tests in `tests/unit/fake_repository_test.go`.

Expected test cases:

- `TestFakeBookRepository_SaveAndFindByID`
- `TestFakeBookRepository_FindByID_NotFound`
- `TestFakeBookRepository_List`

### Done Criteria

- Fake repository behavior matches interface contract
- Unit tests are deterministic and fast

Also ensure fake repositories are safe for parallel test execution when needed.

## Deep Dive: Contract-Accurate Fakes

### Background

Fakes are useful only when they preserve the observable contract of the real repository. If fake behavior diverges from production semantics, tests become misleading.

Think of fakes as "contract simulators," not shortcuts.

### Contract Areas to Mirror

1. Not found behavior
2. Duplicate key behavior
3. Ordering and pagination semantics (if applicable)
4. Mutating operation side effects

Add only the behaviors your service relies on. Avoid overengineering fake internals.

### Concurrency Safety

If production code can call repositories concurrently, fakes should use mutex protection to avoid race conditions in tests.

Run fake-based tests with `-race` periodically to catch unsafe test doubles early.

### Example: Deterministic List Ordering

```go
// Sort fake results before returning if production contract expects stable order.
sort.Slice(books, func(i, j int) bool { return books[i].ID < books[j].ID })
```

### SDET Guidance

Use fakes for logic-level tests and move transaction/isolation behavior checks to integration tests with real Postgres.

## Fake vs Integration Test Boundary

Use fakes when validating:

- service branching logic,
- error mapping,
- domain orchestration behavior.

Use real DB integration tests when validating:

- SQL correctness,
- constraints/index behavior,
- transaction/isolation semantics,
- query performance characteristics.

## Common Anti-Patterns

- Putting production-only SQL assumptions into fake implementations.
- Returning unrealistic fake behavior that hides real edge cases.
- Ignoring ordering/pagination semantics expected by consumers.
- Sharing mutable fake state across tests without reset.

## Quick Quality Checklist

- Does fake behavior mirror repository contract?
- Are not-found and duplicate scenarios covered?
- Is fake state reset between tests?
- Are fake operations race-safe when tests run in parallel?
- Are DB-specific behaviors validated separately in integration tests?




## Next Step

Continue with [Test Organization and Naming](test-organization-and-naming.md).
