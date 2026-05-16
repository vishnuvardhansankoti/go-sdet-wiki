# Integration Testing with Testcontainers

## Setup Testcontainers

```bash
go get github.com/testcontainers/testcontainers-go
go get github.com/testcontainers/testcontainers-go/modules/postgres
```

## Database Helper

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

```go
// tests/integration/api/api_test.go

func TestUserRegistrationEndToEnd(t *testing.T) {
    db, cleanup := setupPostgres(t)
    defer cleanup()
    
    // Setup services
    userRepo := repository.NewPostgresUserRepository(db)
    userSvc := service.NewUserService(userRepo)
    
    // Create handler
    handler := api.NewHandler(userSvc, /* ... */)
    
    // Create test server
    server := httptest.NewServer(http.HandlerFunc(handler.RegisterUser))
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
