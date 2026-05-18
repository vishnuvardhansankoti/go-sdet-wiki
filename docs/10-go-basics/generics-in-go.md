# Generics in Go

Generics let you write reusable functions and types that work with multiple concrete types while keeping compile-time type safety.

Before generics (introduced in Go 1.18), developers often had to choose between:

- repeating near-identical code for `int`, `float64`, `string`, and so on, or
- using `interface{}` with type assertions, which pushed many errors to runtime.

With generics, you can keep APIs both reusable and safe.

## Why Generics Matter

For SDET and backend development, generics are useful when you need:

- common utility functions over many data types,
- typed helper libraries for tests,
- reusable data structures (stacks, queues, sets),
- predictable compile-time checks instead of runtime type casting.

Use generics when behavior is truly type-agnostic. If logic is specific to one domain type, normal concrete code is still clearer.

## Core Concepts

### 1. Type Parameters

A generic function declares type parameters in square brackets.

```go
func Identity[T any](v T) T {
    return v
}
```

- `T` is a type parameter.
- `any` means `T` can be any type.

Usage:

```go
a := Identity[int](42)
b := Identity("go") // type argument can often be inferred
```

### 2. Constraints

Constraints restrict what operations are allowed on a type parameter.

```go
func Equal[T comparable](a, b T) bool {
    return a == b
}
```

`comparable` allows `==` and `!=`.

If you need arithmetic (`+`, `<`, etc.), define or import a numeric constraint.

### 3. Type Inference

Go can usually infer type arguments from function arguments.

```go
type Number interface {
    ~int | ~int64 | ~float64
}

func Add[T Number](a, b T) T {
    return a + b
}

sum := Add(3, 5) // inferred as Add[int]
```

You can still write explicit type arguments when needed.

```go
sum := Add[int](3, 5)
```

## Detailed Explanation with Examples

### Generic Function: Minimum Value

```go
package main

import "fmt"

type Ordered interface {
    ~int | ~int64 | ~float64 | ~string
}

func Min[T Ordered](a, b T) T {
    if a < b {
        return a
    }
    return b
}

func main() {
    fmt.Println(Min(10, 3))
    fmt.Println(Min(4.5, 6.2))
    fmt.Println(Min("go", "java"))
}
```

Notes:

- `Ordered` is a custom constraint.
- `~int` means types whose underlying type is `int` are allowed.
- One implementation works across several ordered types.

### Generic Type: Stack

```go
package main

import "fmt"

type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(v T) {
    s.items = append(s.items, v)
}

func (s *Stack[T]) Pop() (T, bool) {
    var zero T
    if len(s.items) == 0 {
        return zero, false
    }

    last := len(s.items) - 1
    v := s.items[last]
    s.items = s.items[:last]
    return v, true
}

func main() {
    intStack := Stack[int]{}
    intStack.Push(100)
    intStack.Push(200)

    if v, ok := intStack.Pop(); ok {
        fmt.Println(v)
    }

    stringStack := Stack[string]{}
    stringStack.Push("alpha")
    stringStack.Push("beta")

    if v, ok := stringStack.Pop(); ok {
        fmt.Println(v)
    }
}
```

This avoids duplicate `IntStack`, `StringStack`, and similar types.

### Generic Test Helper Example

```go
func AssertEqual[T comparable](got, want T) error {
    if got != want {
        return fmt.Errorf("got %v, want %v", got, want)
    }
    return nil
}
```

In test helpers, this keeps call sites clean and type-safe for `int`, `string`, `bool`, and custom comparable IDs.

## Practical Use Cases

Generics are especially helpful in these scenarios:

- Collection utilities (`Map`, `Filter`, `Contains`) used across many model types.
- Reusable data structures like stack, queue, set, ring buffer.
- Typed caching wrappers (`Cache[K comparable, V any]`).
- Shared assertion helpers in test packages.
- Generic retry or result wrappers where payload type varies.

Example generic `Contains` helper:

```go
func Contains[T comparable](items []T, target T) bool {
    for _, item := range items {
        if item == target {
            return true
        }
    }
    return false
}
```

## When Not to Use Generics

Avoid generics if they reduce clarity.

- If only one type will ever be used, keep it concrete.
- If behavior differs significantly per type, interfaces or explicit implementations are often cleaner.
- Do not force generic abstractions too early; extract them when duplication appears.

## Parallels with C++, C#, and Java

### Go vs C++ Templates

- C++ templates are very powerful and metaprogramming-heavy.
- Go generics are intentionally simpler and easier to read.
- Go favors constraints and straightforward type parameter usage over template metaprogramming tricks.

### Go vs C# Generics

- C# generics and Go generics both support constrained type parameters.
- C# has richer runtime reflection and class/interface constraint features.
- Go keeps constraints interface-based and tends to push simpler generic designs.

### Go vs Java Generics

- Java generics are primarily type-erased at runtime.
- Go generics are checked at compile time with explicit type sets/constraints.
- Go does not use wildcard syntax like `? extends`; constraints are expressed in interfaces.

### Side-by-Side Concept Mapping

| Concept | Go | C++ | C# | Java |
|---|---|---|---|---|
| Generic function | `func F[T any](x T)` | `template<typename T>` | `T F<T>(T x)` | `<T> T f(T x)` |
| Constraint | `T comparable` / custom interface | Concepts / SFINAE | `where T : ...` | `T extends ...` |
| Reusable generic type | `type Box[T any] struct { ... }` | `template<class T> class Box` | `class Box<T>` | `class Box<T>` |
| Type inference at callsite | Often inferred | Often inferred | Often inferred | Often inferred |

## SDET-Focused Mini Exercise

1. Create generic function `FirstOrDefault[T any](items []T, def T) T`.
2. Return `def` when slice is empty.
3. Write table-driven tests for `[]int`, `[]string`, and a custom type `UserID`.
4. Add one failure-oriented test where an empty slice should return default.

Stretch:

Implement `Unique[T comparable](items []T) []T` and use it in test data setup.

## Common Pitfalls

- Over-constraining type parameters (making APIs harder to use).
- Under-constraining type parameters and then trying unsupported operations.
- Replacing clear domain interfaces with unnecessary generic abstractions.
- Building generic frameworks before concrete use cases exist.

## Next Step

Continue with [Concurrency: Goroutines](concurrency-goroutines.md).
