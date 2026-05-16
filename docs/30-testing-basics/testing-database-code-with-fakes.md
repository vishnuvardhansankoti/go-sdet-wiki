# Testing Database Code with Fakes

## Fake Implementation

Create a fake in-memory implementation for testing.

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

## Using the Fake in Tests

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

## Spy Pattern

Track calls to the fake:

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
