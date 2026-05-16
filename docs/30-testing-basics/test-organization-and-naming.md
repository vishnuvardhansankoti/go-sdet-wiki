# Test Organization and Naming

## File Organization

### Convention

```
mypackage/
├── main.go
├── handler.go
├── handler_test.go
├── service.go
└── service_test.go
```

Test files live alongside the code they test.

## Test Naming

### Naming Convention

```go
func TestFunctionName(t *testing.T) {}
func TestFunctionNameWithInput(t *testing.T) {}
func TestFunctionNameErrorCase(t *testing.T) {}
```

### Descriptive Names

```go
// Good
func TestCreateUserWithValidEmail(t *testing.T) {}
func TestCreateUserWithInvalidEmail(t *testing.T) {}
func TestCreateUserWithDuplicateEmail(t *testing.T) {}

// Less helpful
func TestCreateUser(t *testing.T) {}
func TestUser(t *testing.T) {}
```

## Subtests

```go
func TestUserService(t *testing.T) {
    t.Run("create user", func(t *testing.T) {
        // Test code
    })
    
    t.Run("get user", func(t *testing.T) {
        // Test code
    })
    
    t.Run("delete user", func(t *testing.T) {
        // Test code
    })
}
```

## Test Packages

### Internal Tests
```go
// user_test.go (same package)
package user

func TestExportedFunction(t *testing.T) {}
```

### External Tests
```go
// user_test.go (test package)
package user_test

func TestExportedFunction(t *testing.T) {}
```

## Directory Structure for Complex Projects

```
project/
├── pkg/
│   ├── domain/
│   │   ├── user.go
│   │   └── user_test.go
│   └── service/
│       ├── user_service.go
│       └── user_service_test.go
└── tests/
    ├── integration/
    ├── fixtures/
    └── helpers.go
```

## Best Practices

- Keep tests close to the code
- Use descriptive test names
- Organize with subtests
- One assertion per test (or related assertions)
- Use external test packages for integration tests
- Keep fixtures in `tests/fixtures` directory
