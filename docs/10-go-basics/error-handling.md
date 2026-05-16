# Error Handling

## The error Interface

Go treats errors as values. The `error` interface is simple:

```go
type error interface {
    Error() string
}
```

## Creating Errors

### Using errors.New()

```go
err := errors.New("something went wrong")
```

### Using fmt.Errorf()

```go
err := fmt.Errorf("invalid input: %s", input)
```

### Custom Error Types

```go
type ValidationError struct {
    Field string
    Issue string
}

func (e ValidationError) Error() string {
    return fmt.Sprintf("validation error on %s: %s", e.Field, e.Issue)
}
```

## Checking Errors

### Basic Check

```go
result, err := someFunction()
if err != nil {
    log.Fatal(err)
}
```

### Type Assertion

```go
if err, ok := err.(ValidationError); ok {
    fmt.Printf("Field: %s, Issue: %s\n", err.Field, err.Issue)
}
```

### Using errors.Is() and errors.As()

```go
if errors.Is(err, io.EOF) {
    fmt.Println("End of file")
}

var targetErr ValidationError
if errors.As(err, &targetErr) {
    fmt.Printf("Field: %s\n", targetErr.Field)
}
```

## Wrapping Errors

Go 1.13 introduced error wrapping:

```go
if err != nil {
    return fmt.Errorf("failed to process: %w", err)
}
```
