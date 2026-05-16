# Mocking with Interfaces

## Why Mock?

- Isolate code under test
- Control external dependencies
- Verify interactions
- Speed up tests

## Interface-Based Mocking

### Real Service

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

## Using testify/mock

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

## Best Practices

- Mock interfaces, not concrete types
- Keep mocks simple
- Test behavior, not implementation
- Use dependency injection
