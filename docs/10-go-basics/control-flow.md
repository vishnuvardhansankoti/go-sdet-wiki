# Control Flow

## If Statement

```go
if age >= 18 {
    fmt.Println("Adult")
} else if age >= 13 {
    fmt.Println("Teen")
} else {
    fmt.Println("Child")
}
```

## For Loop

### Traditional Loop
```go
for i := 0; i < 10; i++ {
    fmt.Println(i)
}
```

### Range Loop
```go
numbers := []int{1, 2, 3, 4, 5}
for i, num := range numbers {
    fmt.Println(i, num)
}
```

## Switch Statement

```go
switch day {
case "Monday":
    fmt.Println("Start of week")
case "Friday":
    fmt.Println("Almost weekend")
default:
    fmt.Println("Middle of week")
}
```

## Defer Statement

```go
defer fmt.Println("Last")
fmt.Println("First")
fmt.Println("Second")
// Output: First, Second, Last
```
