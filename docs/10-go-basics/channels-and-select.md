# Channels and Select

## Channels

Channels allow goroutines to communicate safely.

### Creating Channels

```go
ch := make(chan int)
ch := make(chan string, 10)  // Buffered channel
```

### Sending and Receiving

```go
ch <- 42              // Send
value := <-ch        // Receive
value, ok := <-ch    // Receive with check
```

## Example: Worker Pattern

```go
func worker(id int, jobs <-chan int, results chan<- int) {
    for job := range jobs {
        fmt.Printf("Worker %d processing job %d\n", id, job)
        results <- job * 2
    }
}

func main() {
    jobs := make(chan int, 10)
    results := make(chan int, 10)
    
    for w := 1; w <= 3; w++ {
        go worker(w, jobs, results)
    }
    
    for j := 1; j <= 5; j++ {
        jobs <- j
    }
    close(jobs)
    
    for r := 0; r < 5; r++ {
        fmt.Println(<-results)
    }
}
```

## Select Statement

Select waits on multiple channel operations.

```go
select {
case msg1 := <-ch1:
    fmt.Println("Received:", msg1)
case msg2 := <-ch2:
    fmt.Println("Received:", msg2)
case <-time.After(2 * time.Second):
    fmt.Println("Timeout")
}
```

## Closing Channels

```go
close(ch)
```

Only the sender should close. Receiving from a closed channel returns the zero value.

## Avoid These Patterns

- Closing a closed channel (panic)
- Sending on a closed channel (panic)
- Closing a channel where multiple goroutines are sending (panic)
