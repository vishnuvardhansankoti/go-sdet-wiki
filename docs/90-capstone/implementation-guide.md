# Implementation Guide

Implementation quality depends on sequence discipline. Building from stable core layers outward reduces rework and keeps tests meaningful throughout the project.

This guide should be used as a runbook, not just a reference list.

## Project Setup

Start with reproducible structure and dependency setup so all contributors share the same baseline.

### 1. Create Project Structure

```bash
mkdir bookshelf-api
cd bookshelf-api

go mod init github.com/yourusername/bookshelf-api

mkdir -p cmd/server pkg/{domain,repository,service,handler,config,middleware} tests/{unit,integration,contract,fixtures}
```

### 2. Initialize Go Modules

```bash
# Add dependencies
go get github.com/lib/pq              # PostgreSQL driver
go get github.com/google/uuid         # UUID generation
```

## Implementation Phases

The phase order matters: domain and repository decisions influence service and handler behavior.

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

### Phase 4: Handler Layer

Implement HTTP handlers in `pkg/handler/`:

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
    apiHandler := handler.NewHandler(userService, /* ... */)
    
    // Start server
    http.HandleFunc("/api/v1/", apiHandler.Route)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

Keep wiring explicit and testable; avoid hidden global initialization.

## Development Workflow

Validate each phase with targeted checks before moving forward.

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

These implementation details should be standardized early to avoid cross-layer inconsistencies.

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

Treat this as a milestone gate before expanding endpoint scope.

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

## Assignment: Capstone Implementation Runbook

### Goal
Execute implementation in a strict sequence to avoid rework.

### Sequence

1. Configuration + logger initialization.
2. Repository implementations.
3. Service wiring/container.
4. Handler wiring + router + middleware.
5. Main entrypoint and health checks.

### Verification Commands

```bash
go build ./...
go test ./pkg/domain ./pkg/handler -v
```

### Done Criteria

- Application boots cleanly.
- Core endpoints are callable with sample requests.

## Deep Dive: Implementation Sequencing to Minimize Rework

### Background

Implementation order directly affects defect rate. Building from core domain to edges reduces rewrites and keeps test feedback meaningful.

### Recommended order

1. Finalize configuration and startup wiring.
2. Implement repositories and persistence error mapping.
3. Implement services with domain validation and orchestration.
4. Implement handlers and response envelopes last.

### Verification cadence

- Run package-level tests after each layer completion.
- Validate one end-to-end happy path early.
- Add negative-path checks before expanding endpoint count.

### SDET recommendation

Fail builds on compile/lint issues immediately to avoid accumulating integration debt.

## Common Anti-Patterns

- Implementing handlers before domain/repository contracts are stable.
- Mixing infrastructure and business logic in service methods.
- Deferring error-envelope consistency decisions until late stages.
- Expanding endpoint count without completing layer-by-layer verification.

## Quick Implementation Checklist

- Is startup/configuration wiring deterministic?
- Are repositories validated against real DB behavior?
- Are services enforcing domain rules consistently?
- Are handlers returning consistent envelopes and status codes?
- Is each phase verified before moving to the next?


