# Test Data Builders

## Builder Pattern for Tests

The builder pattern makes it easy to create test data with flexible configuration.

## Basic Builder

```go
package myapp

// User domain model
type User struct {
    ID    int
    Name  string
    Email string
    Role  string
    Age   int
}

// UserBuilder for tests
type UserBuilder struct {
    user User
}

func NewUserBuilder() *UserBuilder {
    return &UserBuilder{
        user: User{
            ID:    1,
            Name:  "John",
            Email: "john@example.com",
            Role:  "user",
            Age:   30,
        },
    }
}

func (b *UserBuilder) WithID(id int) *UserBuilder {
    b.user.ID = id
    return b
}

func (b *UserBuilder) WithName(name string) *UserBuilder {
    b.user.Name = name
    return b
}

func (b *UserBuilder) WithEmail(email string) *UserBuilder {
    b.user.Email = email
    return b
}

func (b *UserBuilder) WithRole(role string) *UserBuilder {
    b.user.Role = role
    return b
}

func (b *UserBuilder) Build() User {
    return b.user
}
```

### Using the Builder

```go
func TestUserService(t *testing.T) {
    // Simple case with defaults
    user1 := NewUserBuilder().Build()
    
    // Customize specific fields
    user2 := NewUserBuilder().
        WithName("Jane").
        WithEmail("jane@example.com").
        Build()
    
    // Build multiple variations
    users := []User{
        NewUserBuilder().WithRole("admin").Build(),
        NewUserBuilder().WithRole("user").Build(),
        NewUserBuilder().WithRole("guest").Build(),
    }
    
    // Use in test
    service := NewUserService()
    for _, user := range users {
        result := service.ProcessUser(user)
        // Assert result
    }
}
```

## Builder with Complex Objects

```go
type Order struct {
    ID        int
    UserID    int
    Items     []OrderItem
    Total     float64
    Status    string
    CreatedAt time.Time
}

type OrderItem struct {
    ProductID int
    Quantity  int
    Price     float64
}

type OrderBuilder struct {
    order Order
}

func NewOrderBuilder() *OrderBuilder {
    return &OrderBuilder{
        order: Order{
            ID:        1,
            UserID:    1,
            Items:     []OrderItem{},
            Total:     99.99,
            Status:    "pending",
            CreatedAt: time.Now(),
        },
    }
}

func (b *OrderBuilder) WithItem(productID, quantity int, price float64) *OrderBuilder {
    b.order.Items = append(b.order.Items, OrderItem{
        ProductID: productID,
        Quantity:  quantity,
        Price:     price,
    })
    return b
}

func (b *OrderBuilder) WithStatus(status string) *OrderBuilder {
    b.order.Status = status
    return b
}

func (b *OrderBuilder) Build() Order {
    return b.order
}
```

### Using Complex Builder

```go
func TestOrderProcessing(t *testing.T) {
    order := NewOrderBuilder().
        WithItem(1, 2, 25.00).
        WithItem(2, 1, 49.99).
        WithStatus("confirmed").
        Build()
    
    // Total will be recalculated
    total := order.CalculateTotal()
    
    if total != 99.99 {
        t.Errorf("expected 99.99, got %f", total)
    }
}
```

## Factory Builders

### Preset Scenarios

```go
// Builders for common test scenarios
func AdminUserBuilder() *UserBuilder {
    return NewUserBuilder().
        WithRole("admin").
        WithEmail("admin@example.com")
}

func PremiumUserBuilder() *UserBuilder {
    return NewUserBuilder().
        WithRole("premium").
        WithName("Premium User")
}

// In tests
func TestAdminPermissions(t *testing.T) {
    user := AdminUserBuilder().Build()
    
    hasPermission := user.HasPermission("create_user")
    if !hasPermission {
        t.Error("admin should have create_user permission")
    }
}
```

## Builder with Sequences

```go
type SequenceBuilder struct {
    users []User
}

func NewSequenceBuilder() *SequenceBuilder {
    return &SequenceBuilder{users: []User{}}
}

func (b *SequenceBuilder) AddUser(name, email string) *SequenceBuilder {
    user := NewUserBuilder().
        WithID(len(b.users) + 1).
        WithName(name).
        WithEmail(email).
        Build()
    b.users = append(b.users, user)
    return b
}

func (b *SequenceBuilder) Build() []User {
    return b.users
}

// Usage
users := NewSequenceBuilder().
    AddUser("Alice", "alice@example.com").
    AddUser("Bob", "bob@example.com").
    AddUser("Charlie", "charlie@example.com").
    Build()
```

## Testing with Builders

```go
func TestUserRepository(t *testing.T) {
    tests := []struct {
        name     string
        builder  func() User
        validate func(*testing.T, User)
    }{
        {
            name: "create admin user",
            builder: func() User {
                return AdminUserBuilder().Build()
            },
            validate: func(t *testing.T, u User) {
                if u.Role != "admin" {
                    t.Errorf("expected admin role")
                }
            },
        },
        {
            name: "create standard user",
            builder: func() User {
                return NewUserBuilder().Build()
            },
            validate: func(t *testing.T, u User) {
                if u.Role != "user" {
                    t.Errorf("expected user role")
                }
            },
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            user := tt.builder()
            tt.validate(t, user)
        })
    }
}
```

## Best Practices

- Provide sensible defaults
- Make builders chainable
- Keep builders close to tests
- Create factory methods for common scenarios
- Don't over-engineer builders
- Use for complex object graphs
