# Unit Testing Strategy

Unit testing is the fastest confidence layer in the capstone. A strong unit portfolio catches logic regressions early and keeps integration and CI costs under control.

This page defines how to build a high-signal, deterministic unit suite.

## Testing Approach

Use table-driven tests with dependency injection and mocking.

Prefer behavior-focused tests over implementation-detail assertions.

## Test Organization

Organize by layer and behavior so failures are easy to triage.

```
tests/
└── unit/
    ├── service/
    │   ├── user_service_test.go
    │   ├── book_service_test.go
    │   └── ...
    ├── repository/
    │   ├── user_repository_test.go
    │   └── ...
    └── handler/
        ├── user_handler_test.go
        └── ...
```

## Service Layer Testing

Service tests should validate business rules, error mapping, and orchestration paths.

### User Service Tests

```go
// tests/unit/service/user_service_test.go

func TestRegisterUser(t *testing.T) {
    tests := []struct {
        name      string
        email     string
        name      string
        password  string
        mockError error
        wantErr   bool
    }{
        {
            name:     "valid registration",
            email:    "user@example.com",
            name:     "John",
            password: "password123",
            wantErr:  false,
        },
        {
            name:     "invalid email",
            email:    "not-an-email",
            wantErr:  true,
        },
        {
            name:     "short password",
            email:    "user@example.com",
            password: "short",
            wantErr:  true,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            mockRepo := &MockUserRepository{}
            service := NewUserService(mockRepo)
            
            user, err := service.RegisterUser(context.Background(), tt.email, tt.name, tt.password)
            
            if (err != nil) != tt.wantErr {
                t.Errorf("got error %v; wantErr %v", err, tt.wantErr)
            }
            
            if !tt.wantErr && user == nil {
                t.Error("expected user; got nil")
            }
        })
    }
}
```

## Repository Layer Testing

Repository unit tests should focus on adapter behavior and mapping, not full SQL semantics.

### Mock Repositories

```go
// tests/unit/repository/mock.go

type MockUserRepository struct {
    users map[int]*User
}

func (m *MockUserRepository) CreateUser(ctx context.Context, user *User) error {
    if user.Email == "" {
        return errors.New("email required")
    }
    m.users[user.ID] = user
    return nil
}

func (m *MockUserRepository) GetUser(ctx context.Context, id int) (*User, error) {
    user, ok := m.users[id]
    if !ok {
        return nil, errors.New("not found")
    }
    return user, nil
}

// ... implement other methods
```

## Handler Layer Testing

Handler tests should assert status, envelope, and key payload fields for each scenario.

### HTTP Handler Tests

```go
// tests/unit/handler/user_handler_test.go

func TestRegisterUserHandler(t *testing.T) {
    tests := []struct {
        name           string
        body           string
        expectedStatus int
        expectedBody   string
    }{
        {
            name: "valid request",
            body: `{"email":"user@example.com","name":"John","password":"pass123"}`,
            expectedStatus: http.StatusCreated,
        },
        {
            name: "invalid JSON",
            body: `invalid`,
            expectedStatus: http.StatusBadRequest,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            mockService := &MockUserService{}
            handler := NewHandler(mockService, /* ... */)
            
            req := httptest.NewRequest("POST", "/api/v1/users", strings.NewReader(tt.body))
            w := httptest.NewRecorder()
            
            handler.RegisterUser(w, req)
            
            if w.Code != tt.expectedStatus {
                t.Errorf("status = %d; want %d", w.Code, tt.expectedStatus)
            }
        })
    }
}
```

## Test Data Builders

Builders reduce fixture duplication and make scenario intent clearer.

### User Builder

```go
// tests/unit/builders.go

type UserBuilder struct {
    user User
}

func NewUserBuilder() *UserBuilder {
    return &UserBuilder{
        user: User{
            ID:    1,
            Email: "test@example.com",
            Name:  "Test User",
        },
    }
}

func (b *UserBuilder) WithEmail(email string) *UserBuilder {
    b.user.Email = email
    return b
}

func (b *UserBuilder) Build() User {
    return b.user
}
```

## Coverage Goals

Coverage goals are directional quality signals; critical-path behavior depth matters most.

- Services: 90%+
- Repositories: 80%+
- Handlers: 75%+

## Running Tests

Run `-race` periodically even for unit suites when concurrency logic exists.

```bash
# Run all unit tests
go test ./tests/unit/...

# With coverage
go test -cover ./tests/unit/...

# Generate coverage report
go test -coverprofile=coverage.out ./tests/unit/...
go tool cover -html=coverage.out
```

## Test Checklist

- [ ] All services tested
- [ ] All repositories have mock implementations
- [ ] All handlers tested
- [ ] Error cases covered
- [ ] Happy path covered
- [ ] Coverage >= 80%
- [ ] All tests pass
- [ ] Race detector passes: `go test -race ./tests/unit/...`

## Next Step

Proceed to [Integration Testing with Testcontainers](integration-testing-with-testcontainers.md)

## Assignment: Unit Test Completion Criteria for Capstone

### Goal
Define non-negotiable unit test quality bar for Bookshelf.

### Required Coverage Areas

1. Domain validation and constructors.
2. Service business rules and error mapping.
3. Handler request parsing and response formatting.
4. Middleware behavior for logging/error paths.

### Minimum Suite

- 30+ unit tests across domain/service/handler.
- Table-driven tests for validation-heavy paths.
- Race-safe tests for concurrency logic.

### Done Criteria

- Unit tests pass with `-race`.
- Coverage for critical packages meets project thresholds.

## Deep Dive: Unit Test Portfolio Design

### Background

A strong unit suite balances breadth (all major components) and depth (edge/failure conditions), while remaining fast enough for frequent execution.

### Portfolio design rules

1. Table-drive validation-heavy logic.
2. Cover both successful behavior and error mapping.
3. Keep mocks minimal and behavior-focused.
4. Prefer deterministic fixtures and builders.

### SDET recommendation

Treat handler tests as API behavior checks: assert status, envelope, and key payload fields for each scenario.

## Common Anti-Patterns

- Over-mocking until tests no longer represent realistic behavior.
- Asserting internals instead of observable outcomes.
- Skipping failure-path and validation scenarios.
- Letting fixture setup dominate test readability.

## Quick Unit Suite Checklist

- Are domain/service/handler layers all represented?
- Are success and failure paths both covered?
- Are table-driven tests used for validation-heavy logic?
- Are fixtures deterministic and reusable?
- Does the suite pass with `-race` and coverage targets?


