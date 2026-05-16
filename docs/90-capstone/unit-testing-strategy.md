# Unit Testing Strategy

## Testing Approach

Use table-driven tests with dependency injection and mocking.

## Test Organization

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
    └── api/
        ├── user_handler_test.go
        └── ...
```

## Service Layer Testing

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

### HTTP Handler Tests

```go
// tests/unit/api/user_handler_test.go

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

- Services: 90%+
- Repositories: 80%+
- Handlers: 75%+

## Running Tests

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
