# HTTP Client and Server Basics

## HTTP Server

### Simple Server

```go
func handler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, %s!", r.URL.Path[1:])
}

func main() {
    http.HandleFunc("/", handler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### Using Struct-based Handlers

```go
type Handler struct {
    db *sql.DB
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // Handle request
}

func main() {
    h := &Handler{db: db}
    http.ListenAndServe(":8080", h)
}
```

## HTTP Client

### Basic Request

```go
resp, err := http.Get("https://example.com")
if err != nil {
    log.Fatal(err)
}
defer resp.Body.Close()

body, err := io.ReadAll(resp.Body)
fmt.Println(string(body))
```

### POST Request

```go
data := url.Values{}
data.Set("name", "John")

resp, err := http.PostForm("https://example.com/form", data)
if err != nil {
    log.Fatal(err)
}
defer resp.Body.Close()
```

### Custom Client

```go
client := &http.Client{
    Timeout: 10 * time.Second,
}

req, _ := http.NewRequest("GET", "https://example.com", nil)
resp, err := client.Do(req)
```

## Request Body

```go
body := []byte(`{"name":"John"}`)
req, _ := http.NewRequest("POST", "https://example.com/api", bytes.NewBuffer(body))
req.Header.Set("Content-Type", "application/json")
```
