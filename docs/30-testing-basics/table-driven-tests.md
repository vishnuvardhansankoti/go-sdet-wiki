# Table-Driven Tests

## Pattern

Table-driven tests organize test cases in a data structure.

## Basic Example

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -2, -3, -5},
        {"mixed signs", -2, 3, 1},
        {"zero", 0, 0, 0},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := Add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("got %d, want %d", result, tt.expected)
            }
        })
    }
}
```

## Complex Example with Errors

```go
func TestParseJSON(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    User
        wantErr bool
    }{
        {
            name:  "valid JSON",
            input: `{"name":"John","age":30}`,
            want:  User{Name: "John", Age: 30},
        },
        {
            name:    "invalid JSON",
            input:   `invalid`,
            wantErr: true,
        },
        {
            name:    "empty name",
            input:   `{"name":"","age":30}`,
            wantErr: true,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseJSON(tt.input)
            
            if tt.wantErr {
                if err == nil {
                    t.Errorf("want error, got nil")
                }
                return
            }
            
            if err != nil {
                t.Errorf("unexpected error: %v", err)
                return
            }
            
            if got != tt.want {
                t.Errorf("got %v, want %v", got, tt.want)
            }
        })
    }
}
```

## Benefits

- Easy to add new test cases
- Clear organization
- Readable test output
- Maintainable tests
- Easy to see coverage
