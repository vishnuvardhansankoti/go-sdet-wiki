# Functions and Methods

## Basic Function

```go
func greet(name string) string {
    return "Hello, " + name
}
```

## Multiple Return Values

```go
func divide(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}
```

## Named Return Values

```go
func swap(a, b int) (x, y int) {
    x = b
    y = a
    return
}
```

## Methods

A method is a function with a receiver argument.

```go
type Person struct {
    Name string
}

func (p Person) Greet() string {
    return "Hello, " + p.Name
}
```

## Variadic Functions

```go
func sum(nums ...int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

sum(1, 2, 3, 4, 5)
```

## Anonymous Functions and Closures

```go
increment := func(x int) int {
    return x + 1
}
fmt.Println(increment(5))
```
