# Variables and Types

## Declaration

### var Statement
```go
var name string = "John"
var age int = 30
var height float64 = 5.9
```

### Short Declaration
```go
name := "John"
age := 30
height := 5.9
```

## Basic Types

- **bool**: true or false
- **string**: Text
- **int**: Signed integers
- **float64**: Floating point numbers
- **complex128**: Complex numbers

## Type Conversion

```go
var i int = 42
var f float64 = float64(i)
var s string = strconv.Itoa(i)
```

## Constants

```go
const pi = 3.14159
const name = "John"
```

## Zero Values

- Numeric types: 0
- Boolean: false
- String: ""
- Pointers, slices, maps, channels, functions, interfaces: nil
