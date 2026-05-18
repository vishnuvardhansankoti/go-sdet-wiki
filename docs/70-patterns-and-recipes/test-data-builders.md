# Test Data Builders

Test data builders improve readability and maintainability by separating scenario intent from object-construction noise. They are especially valuable when domain models become larger and tests require many variations.

This guide explains how to design builders that remain predictable, reusable, and easy to evolve.

## Builder Pattern for Tests

The builder pattern makes it easy to create test data with flexible configuration.

A good builder makes the common case simple and edge cases explicit.

## Basic Builder

Start with valid defaults so tests only customize fields relevant to the behavior under test.

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

Builder usage should highlight scenario differences, not construction mechanics.

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

For object graphs, builders should avoid hidden side effects and keep defaults coherent.

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

Complex builders are most useful when they encapsulate repetitive setup while preserving test intent.

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

Factory builders provide named presets for business-relevant test personas.

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

Sequence builders are useful for list-oriented scenarios and deterministic fixture sets.

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

Builder-driven test tables keep setup concise and assertions focused.

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

Additional guidance:

- Keep builders in test-only packages.
- Validate defaults periodically as domain rules evolve.
- Avoid embedding randomness in builder defaults.


## Quick Exercises (SDET Focus)

Try these exercises before moving to the next section.

### Exercise 1: Reproduce and Stabilize a Flaky Test

Goal: Practice a repeatable flake-debugging workflow.

1. Select one flaky test scenario.
2. Run it repeatedly and capture failure evidence.
3. Identify root cause (timing, shared state, ordering, etc.).
4. Apply one stabilization fix and re-run to confirm.

Stretch: Add a regression test that would have caught the original flake.

### Exercise 2: Add a Reusable Test Helper Pattern

Goal: Improve readability and reduce duplication.

1. Identify repeated setup/assertion code in tests.
2. Extract a helper (builder, fixture, or assertion helper).
3. Refactor at least two tests to use it.
4. Verify tests remain clear and deterministic.

Stretch: Document when to use and avoid this helper.

## Assignment: Builders for Bookshelf Test Data

### Goal
Create reusable builders for Users, Books, Reviews, and Shelf Entries to simplify tests.

This assignment standardizes fixture construction across Bookshelf tests.

### Tasks

1. Create `tests/fixtures/builders.go` with:
    - `UserBuilder`
    - `BookBuilder`
    - `ReviewBuilder`
    - `ShelfEntryBuilder`
2. Provide sensible defaults and chainable methods.
3. Add preset factories:
    - `ValidUserBuilder()`
    - `ClassicBookBuilder()`
    - `FiveStarReviewBuilder()`
4. Refactor existing tests to use builders instead of inline object setup.

Example:

```go
book := fixtures.NewBookBuilder().
	WithTitle("The Go Workshop").
	WithAuthor("SDET Team").
	WithISBN("9780000000001").
	WithPublishedYear(2024).
	Build()
```

### Done Criteria

- Repeated test object setup is reduced.
- Tests are easier to read and maintain.

Also ensure builder names and methods reflect domain terminology clearly.

## Deep Dive: Builder Design for Test Scalability

### Background

As tests grow, inline setup creates duplication and hides intent. Builders centralize defaults and make scenario differences explicit.

### Builder quality criteria

1. Safe defaults produce valid domain objects.
2. Chainable methods express only scenario-specific variation.
3. Preset factories map to common business scenarios.
4. Builders avoid hidden side effects.

### Practical usage pattern

- Arrange: construct baseline object with default builder.
- Customize: override only relevant fields (`WithEmail`, `WithStatus`).
- Assert: focus on behavior under test, not object construction noise.

### SDET recommendation

Keep builders in test/fixture packages and version them with domain model changes to avoid silent drift.

## Common Anti-Patterns

- Using builders with invalid defaults that require constant overrides.
- Hiding business logic inside builder methods.
- Sharing mutable builder instances across tests.
- Creating overly generic builders with unclear domain intent.

## Quick Builder Quality Checklist

- Do defaults produce valid domain entities?
- Are chain methods focused and predictable?
- Are preset factories aligned to common scenarios?
- Are builders test-only and side-effect free?
- Do tests read as behavior narratives rather than setup scripts?




## Next Step

Continue with [Flaky Test Diagnostics](flaky-test-diagnostics.md).
