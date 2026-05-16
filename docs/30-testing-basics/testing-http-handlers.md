# Testing HTTP Handlers

## net/http/httptest Package

### Testing a Handler

```go
func TestHelloHandler(t *testing.T) {
    handler := http.HandlerFunc(HelloHandler)
    
    req := httptest.NewRequest("GET", "/hello", nil)
    w := httptest.NewRecorder()
    
    handler.ServeHTTP(w, req)
    
    if w.Code != http.StatusOK {
        t.Errorf("status = %d; want %d", w.Code, http.StatusOK)
    }
    
    if w.Body.String() != "Hello, World!" {
        t.Errorf("body = %s; want Hello, World!", w.Body.String())
    }
}
```

## Testing Middleware

```go
func TestLoggingMiddleware(t *testing.T) {
    var logOutput string
    
    handler := loggingMiddleware(
        http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            w.WriteHeader(http.StatusOK)
        }),
    )
    
    req := httptest.NewRequest("GET", "/test", nil)
    w := httptest.NewRecorder()
    
    handler.ServeHTTP(w, req)
    
    if w.Code != http.StatusOK {
        t.Errorf("status = %d; want %d", w.Code, http.StatusOK)
    }
}
```

## Testing JSON Endpoints

```go
import "encoding/json"

type User struct {
    Name string `json:"name"`
    Age  int    `json:"age"`
}

func TestCreateUserHandler(t *testing.T) {
    body := `{"name":"John","age":30}`
    
    req := httptest.NewRequest("POST", "/users", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    
    w := httptest.NewRecorder()
    
    CreateUserHandler(w, req)
    
    if w.Code != http.StatusCreated {
        t.Errorf("status = %d; want %d", w.Code, http.StatusCreated)
    }
    
    var result User
    json.NewDecoder(w.Body).Decode(&result)
    
    if result.Name != "John" {
        t.Errorf("name = %s; want John", result.Name)
    }
}
```

## Testing with Custom Client

```go
func TestWithCustomServer(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("Hello"))
    }))
    defer server.Close()
    
    resp, err := http.Get(server.URL)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusOK {
        t.Errorf("status = %d; want %d", resp.StatusCode, http.StatusOK)
    }
}
```
