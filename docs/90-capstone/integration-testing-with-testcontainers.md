# Integration Testing with Testcontainers

Integration tests validate real persistence and wiring behavior that unit tests cannot guarantee. In the capstone, this layer proves repository correctness, transaction semantics, and API-to-database integration.

This guide focuses on deterministic setup, clear assertions, and CI-friendly stability.

## Setup Testcontainers

Pin dependency versions and image tags to keep runtime behavior reproducible.

```bash
go get github.com/testcontainers/testcontainers-go
go get github.com/testcontainers/testcontainers-go/modules/postgres
```

## Database Helper

A shared helper should encapsulate container lifecycle, readiness checks, and cleanup.

```go
// tests/integration/setup.go

func setupPostgres(t *testing.T) (*sql.DB, func()) {
    ctx := context.Background()
    
    container, err := postgres.RunContainer(ctx,
        testcontainers.WithImage("postgres:15-alpine"),
        postgres.WithInitScripts("tests/fixtures/schema.sql"),
        postgres.WithDatabase("bookshelf_test"),
        postgres.WithUsername("postgres"),
        postgres.WithPassword("password"),
    )
    if err != nil {
        t.Fatalf("failed to start postgres: %v", err)
    }
    
    connStr, err := container.ConnectionString(ctx)
    if err != nil {
        t.Fatalf("failed to get connection string: %v", err)
    }
    
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        t.Fatalf("failed to open database: %v", err)
    }
    
    if err := db.Ping(); err != nil {
        t.Fatalf("failed to ping database: %v", err)
    }
    
    cleanup := func() {
        db.Close()
        if err := container.Terminate(ctx); err != nil {
            t.Logf("failed to terminate container: %v", err)
        }
    }
    
    return db, cleanup
}
```

## Repository Tests

Repository tests should emphasize constraints, not-found behavior, and error translation.

### User Repository

```go
// tests/integration/repository/user_repository_test.go

func TestUserRepositoryCreateAndGet(t *testing.T) {
    db, cleanup := setupPostgres(t)
    defer cleanup()
    
    repo := repository.NewPostgresUserRepository(db)
    ctx := context.Background()
    
    user := &domain.User{
        Email: "test@example.com",
        Name:  "Test User",
    }
    
    // Create
    err := repo.CreateUser(ctx, user)
    if err != nil {
        t.Fatalf("create failed: %v", err)
    }
    
    if user.ID <= 0 {
        t.Errorf("expected positive ID; got %d", user.ID)
    }
    
    // Retrieve
    retrieved, err := repo.GetUser(ctx, user.ID)
    if err != nil {
        t.Fatalf("get failed: %v", err)
    }
    
    if retrieved.Email != user.Email {
        t.Errorf("email = %s; want %s", retrieved.Email, user.Email)
    }
}

func TestUserRepositoryDuplicateEmail(t *testing.T) {
    db, cleanup := setupPostgres(t)
    defer cleanup()
    
    repo := repository.NewPostgresUserRepository(db)
    ctx := context.Background()
    
    user1 := &domain.User{Email: "duplicate@example.com", Name: "User 1"}
    user2 := &domain.User{Email: "duplicate@example.com", Name: "User 2"}
    
    err := repo.CreateUser(ctx, user1)
    if err != nil {
        t.Fatalf("first create failed: %v", err)
    }
    
    err = repo.CreateUser(ctx, user2)
    if err == nil {
        t.Error("expected error for duplicate email")
    }
}
```

## Service Integration Tests

Service integration tests validate orchestration with real persistence, not just repository call sequencing.

```go
// tests/integration/service/user_service_test.go

func TestUserServiceRegisterAndGet(t *testing.T) {
    db, cleanup := setupPostgres(t)
    defer cleanup()
    
    repo := repository.NewPostgresUserRepository(db)
    svc := service.NewUserService(repo)
    ctx := context.Background()
    
    user, err := svc.RegisterUser(ctx, "user@example.com", "John", "password123")
    if err != nil {
        t.Fatalf("register failed: %v", err)
    }
    
    retrieved, err := svc.GetUser(ctx, user.ID)
    if err != nil {
        t.Fatalf("get failed: %v", err)
    }
    
    if retrieved.Email != user.Email {
        t.Errorf("email mismatch")
    }
}
```

## API Integration Tests

API integration tests should assert transport behavior plus persistence side effects.

```go
// tests/integration/handler/handler_test.go

func TestUserRegistrationEndToEnd(t *testing.T) {
    db, cleanup := setupPostgres(t)
    defer cleanup()
    
    // Setup services
    userRepo := repository.NewPostgresUserRepository(db)
    userSvc := service.NewUserService(userRepo)
    
    // Create handler
    apiHandler := handler.NewHandler(userSvc, /* ... */)
    
    // Create test server
    server := httptest.NewServer(http.HandlerFunc(apiHandler.RegisterUser))
    defer server.Close()
    
    // Test registration
    body := `{"email":"user@example.com","name":"John","password":"pass123"}`
    resp, err := http.Post(server.URL, "application/json", strings.NewReader(body))
    if err != nil {
        t.Fatalf("request failed: %v", err)
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusCreated {
        t.Errorf("status = %d; want %d", resp.StatusCode, http.StatusCreated)
    }
}
```

## Running Integration Tests

Use explicit timeout budgets and focused commands in local and CI flows.

```bash
# Run integration tests
go test -tags=integration -timeout=5m ./tests/integration/...

# With verbose output
go test -tags=integration -v -timeout=5m ./tests/integration/...
```

## Test Checklist

- [ ] Repositories tested with real database
- [ ] Services tested with real repositories
- [ ] API endpoints tested end-to-end
- [ ] Transaction handling verified
- [ ] Constraint violations handled correctly
- [ ] All tests pass
- [ ] Tests timeout appropriately

## Next Step

Proceed to [Contract Testing Strategy](contract-testing-strategy.md)

## Assignment: End-to-End Integration Readiness

### Goal
Use Testcontainers to verify repository and API behavior against real Postgres.

### Tasks

1. Add schema init scripts under `tests/integration/testdata`.
2. Build shared Postgres container helper.
3. Cover repository CRUD + constraint errors.
4. Cover API flows via `httptest.NewServer`.

### Verification

```bash
go test -v -timeout=20m ./tests/integration/...
```

### Done Criteria

- Integration suite is stable locally and in CI.
- Tests clean up resources and do not leak containers.

## Deep Dive: Integration Stability Engineering

### Background

Integration suites provide high confidence but can become slow or flaky without disciplined setup and cleanup patterns.

### Stability checklist

1. Reuse shared container setup helpers.
2. Seed deterministic test data per scenario.
3. Enforce timeouts for test runs and container startup.
4. Capture logs/artifacts on failure for diagnostics.

### SDET recommendation

Prioritize integration tests for database constraints, transaction behavior, and handler-to-repository wiring where mocks provide weak confidence.

## Common Anti-Patterns

- Treating `db.Ping()` success as sufficient integration coverage.
- Sharing mutable test data across scenarios without reset strategy.
- Missing timeout boundaries for container startup and test execution.
- Ignoring failure diagnostics from container/application logs.

## Quick Integration Stability Checklist

- Is setup deterministic and centralized?
- Are success and failure DB behaviors both covered?
- Are API tests validating side effects and envelopes?
- Are timeouts and cleanup paths enforced?
- Are suites stable across repeated local/CI runs?


