# Implementation Guide

## Project Setup

### 1. Create Project Structure

```bash
mkdir bookshelf-api
cd bookshelf-api

go mod init github.com/yourusername/bookshelf-api

mkdir -p cmd/server pkg/{domain,repository,service,api} internal/{config,middleware} tests/{unit,integration,contract,fixtures}
```

### 2. Initialize Go Modules

```bash
go mod init github.com/yourusername/bookshelf-api

# Add dependencies
go get github.com/lib/pq              # PostgreSQL driver
go get github.com/google/uuid         # UUID generation
```

## Implementation Phases

### Phase 1: Domain Layer

Create domain entities and interfaces in `pkg/domain/`:

```go
// user.go
type User struct {
    ID        int
    Email     string
    Name      string
    CreatedAt time.Time
}

// book.go
type Book struct {
    ID        int
    Title     string
    Author    string
    ISBN      string
    CreatedAt time.Time
}

// Define all entities and interfaces
```

### Phase 2: Repository Layer

Implement database access in `pkg/repository/`:

```go
// postgres.go
type PostgresUserRepository struct {
    db *sql.DB
}

func (r *PostgresUserRepository) CreateUser(ctx context.Context, user *User) error {
    // Implementation
}

// ... implement all repository methods
```

### Phase 3: Service Layer

Implement business logic in `pkg/service/`:

```go
// user_service.go
type UserService struct {
    repo domain.UserRepository
}

func (s *UserService) RegisterUser(ctx context.Context, email, name, password string) (*User, error) {
    // Validate input
    // Hash password
    // Create user
}

// ... implement all service methods
```

### Phase 4: API Layer

Implement HTTP handlers in `pkg/api/`:

```go
// handler.go
type Handler struct {
    userService domain.UserService
    // ... other services
}

func (h *Handler) RegisterUser(w http.ResponseWriter, r *http.Request) {
    // Parse request
    // Call service
    // Return response
}

// ... implement all endpoints
```

### Phase 5: Main Application

Create entry point in `cmd/server/main.go`:

```go
func main() {
    // Load configuration
    cfg := config.Load()
    
    // Connect to database
    db, err := sql.Open("postgres", cfg.DatabaseURL)
    // Handle error
    
    // Create repositories
    userRepo := repository.NewPostgresUserRepository(db)
    // ... create other repositories
    
    // Create services
    userService := service.NewUserService(userRepo)
    // ... create other services
    
    // Create handler
    handler := api.NewHandler(userService, /* ... */)
    
    // Start server
    http.HandleFunc("/api/v1/", handler.Route)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Development Workflow

### 1. Setup Database

```bash
# Start PostgreSQL with Docker
docker run -d \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=bookshelf \
  -p 5432:5432 \
  postgres:15

# Create tables
psql -h localhost -U postgres -d bookshelf < schema.sql
```

### 2. Run Server

```bash
go run cmd/server/main.go
```

### 3. Test Endpoints

```bash
# Create user
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","name":"John","password":"pass123"}'

# Get user
curl http://localhost:8080/api/v1/users/1 \
  -H "X-User-ID: 1"
```

## Key Implementation Details

### Database Connection

```go
type Config struct {
    DatabaseURL string
}

func ConnectDB(url string) (*sql.DB, error) {
    db, err := sql.Open("postgres", url)
    if err != nil {
        return nil, err
    }
    
    if err := db.Ping(); err != nil {
        return nil, err
    }
    
    return db, nil
}
```

### Error Handling

```go
type ErrorResponse struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Details map[string]interface{} `json:"details"`
}

func writeError(w http.ResponseWriter, statusCode int, code, message string) {
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(ErrorResponse{
        Code:    code,
        Message: message,
    })
}
```

### Request/Response Encoding

```go
func writeJSON(w http.ResponseWriter, data interface{}) error {
    w.Header().Set("Content-Type", "application/json")
    return json.NewEncoder(w).Encode(map[string]interface{}{
        "data": data,
    })
}

func readJSON(r *http.Request, v interface{}) error {
    return json.NewDecoder(r.Body).Decode(v)
}
```

### Context Extraction

```go
func getUserIDFromContext(r *http.Request) (int, error) {
    userIDStr := r.Header.Get("X-User-ID")
    userID, err := strconv.Atoi(userIDStr)
    if err != nil {
        return 0, fmt.Errorf("invalid user ID")
    }
    return userID, nil
}
```

## Checklist

- [ ] Project structure created
- [ ] Dependencies added
- [ ] Domain entities defined
- [ ] Database repositories implemented
- [ ] Business services implemented
- [ ] HTTP handlers implemented
- [ ] Server starts without errors
- [ ] Basic endpoint works

## Next Step

Proceed to [Unit Testing Strategy](unit-testing-strategy.md)
