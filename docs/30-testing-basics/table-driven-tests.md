# Table-Driven Tests

Table-driven tests are one of the most idiomatic and powerful testing patterns in Go. Instead of writing separate test functions for each scenario, you define test cases as data and execute them through a shared test flow.

This approach improves readability, reduces duplication, and makes coverage gaps easier to detect.

## Pattern

Table-driven tests organize test cases in a data structure.

The usual shape is:

1. Define a test-case struct.
2. Populate a slice of cases.
3. Iterate over cases with `t.Run`.
4. Assert expected result/error for each case.

This creates a consistent, scalable test style across the codebase.

## Basic Example

This example validates arithmetic behavior using a compact case table. Notice how each case name explains intent.

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

Why this works well:

- adding a new scenario requires adding only one row,
- failure output includes case name,
- all related behavior stays in one test function.

## Complex Example with Errors

Table-driven tests are especially useful when both success and failure paths must be covered consistently.

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

In real services, this style is ideal for validation logic, parsing, mapping functions, and business-rule enforcement.

## Benefits

- Easy to add new test cases
- Clear organization
- Readable test output
- Maintainable tests
- Easy to see coverage

Additional practical benefits:

- standard structure across teams,
- easier code review for missing edge cases,
- simpler migration when requirements change.


## Quick Exercises (SDET Focus)

Try these exercises before moving to the next section.

### Exercise 1: Table-Driven Boundary Tests

Goal: Improve correctness coverage with compact test cases.

1. Select one function with input validation.
2. Write table-driven tests for min, max, empty, and invalid values.
3. Assert expected result and expected error path.
4. Add case names that clearly describe intent.

Stretch: Add fuzz-style randomized inputs for one field.

### Exercise 2: Replace Real Dependency with Test Double

Goal: Make tests deterministic and fast.

1. Introduce a small interface for one external dependency.
2. Implement fake/stub behavior for success and failure paths.
3. Assert function behavior for both paths.
4. Ensure tests run without network/database access.

Stretch: Measure and compare runtime before/after dependency isolation.

## Assignment: Table-Driven Validation Tests (Bookshelf)

### Goal
Use table-driven tests for core validation rules in the Bookshelf domain.

This assignment establishes a repeatable validation-test pattern that can be reused across domain, handler, and DTO checks.

### Tasks

1. Add table-driven tests for `ValidateEmail` in `pkg/domain/user_test.go`.
2. Add table-driven tests for `ValidatePassword` in `pkg/domain/user_test.go`.
3. Add table-driven tests for `ValidateRating` in `pkg/domain/review_test.go`.

Example structure:

```go
func TestValidateRating(t *testing.T) {
    tests := []struct {
        name    string
        rating  int
        wantErr bool
    }{
        {"min", 1, false},
        {"max", 5, false},
        {"below-range", 0, true},
        {"above-range", 6, true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidateRating(tt.rating)
            if (err != nil) != tt.wantErr {
                t.Fatalf("ValidateRating(%d) error=%v wantErr=%v", tt.rating, err, tt.wantErr)
            }
        })
    }
}
```

Use descriptive case names such as `missing-at-symbol`, `too-short-password`, and `rating-above-max` to make failures instantly understandable.

### Done Criteria

- Each validator has one table-driven test
- Tests use `t.Run` with descriptive case names

Also ensure boundary conditions are included (min, max, just-below, just-above).

## Deep Dive: Table-Driven Tests at Scale

### Background

Table-driven tests are the standard Go pattern because they reduce duplication and make edge-case coverage explicit.

At scale, this pattern keeps test suites maintainable as domain rules evolve.

### Design Recommendations

1. Name every case with intent, not only input values.
2. Include boundary and invalid cases.
3. Keep expected outputs close to inputs.
4. Use helper assertion functions for repeated checks.
5. Keep case structs minimal and focused per behavior.
6. Separate success and error-heavy tables when readability drops.

### Example: Error Substring Checks

```go
tests := []struct {
    name    string
    input   string
    wantErr string
}{
    {"missing at-symbol", "reader.example.com", "invalid email"},
}

for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        err := ValidateEmail(tt.input)
        if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
            t.Fatalf("unexpected error: %v", err)
        }
    })
}
```

When possible, prefer typed error checks (`errors.Is`/`errors.As`) over string matching. Use substring checks only when typed errors are not available.

### SDET Benefit

When requirements change, add rows, not new test functions. This keeps your suite maintainable and auditable.

## Common Anti-Patterns

- One giant table mixing unrelated behaviors.
- Ambiguous case names like `case1`, `case2`.
- Repeating complex setup logic inside every `t.Run`.
- Asserting too many unrelated outcomes in one case.

## Quick Quality Checklist

- Does each row represent one clear behavior?
- Are boundary and invalid inputs covered?
- Are failure messages specific and actionable?
- Is setup shared cleanly without hiding intent?
- Can someone add a new case in under a minute?




## Next Step

Continue with [Mocking with Interfaces](mocking-with-interfaces.md).
