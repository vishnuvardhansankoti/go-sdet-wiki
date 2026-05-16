# Structs and Interfaces

## Structs

### Definition

```go
type Person struct {
    Name string
    Age  int
    City string
}
```

### Creating Instances

```go
p1 := Person{"John", 30, "NYC"}
p2 := Person{
    Name: "Jane",
    Age:  28,
    City: "LA",
}
```

## Interfaces

### Definition

```go
type Writer interface {
    Write(p []byte) (n int, err error)
}

type Reader interface {
    Read(p []byte) (n int, err error)
}
```

### Implementing Interfaces

```go
type File struct {
    data string
}

func (f File) Write(p []byte) (int, error) {
    f.data = string(p)
    return len(p), nil
}

func (f File) Read(p []byte) (int, error) {
    copy(p, f.data)
    return len(f.data), nil
}
```

### Embedding

```go
type ReadWriter interface {
    Reader
    Writer
}
```

## Empty Interface

The `interface{}` type can hold any value.

```go
var i interface{} = "hello"
var i interface{} = 42
var i interface{} = []int{1, 2, 3}
```
