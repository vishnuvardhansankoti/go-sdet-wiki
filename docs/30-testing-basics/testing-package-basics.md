# Testing Package Basics

## Running Tests

```bash
go test ./...
go test -v ./...
go test -run TestUserService ./...
```

## Basic Test Function

```go
func TestAdd(t *testing.T) {
    result := Add(2, 3)
    expected := 5
    
    if result != expected {
        t.Errorf("Add(2, 3) = %d; want %d", result, expected)
    }
}
```

## Test Assertions

### Using t.Errorf()
```go
if result != expected {
    t.Errorf("got %v, want %v", result, expected)
}
```

### Using t.Fatalf() (Stops Test)
```go
if result != expected {
    t.Fatalf("got %v, want %v", result, expected)
}
```

### Using t.FailNow()
```go
if err != nil {
    t.FailNow()
}
```

## Setup and Teardown

### Using TestMain
```go
func TestMain(m *testing.M) {
    // Setup
    fmt.Println("Setting up tests...")
    
    code := m.Run()
    
    // Teardown
    fmt.Println("Tearing down tests...")
    
    os.Exit(code)
}
```

### Using Setup/Teardown Functions
```go
func setup() {
    // Initialize test fixtures
}

func teardown() {
    // Clean up
}

func TestSomething(t *testing.T) {
    setup()
    defer teardown()
    
    // Test code
}
```

## Skip and Parallel Tests

### Skip Tests
```go
func TestSkipped(t *testing.T) {
    if runtime.GOOS == "windows" {
        t.Skip("Skipping on Windows")
    }
}
```

### Parallel Tests
```go
func TestParallel(t *testing.T) {
    t.Parallel()
    // Test code
}
```

## Coverage

```bash
go test -cover ./...
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```
