# REST API Design

REST API design is not only about endpoint syntax. It is about defining a stable contract that clients can trust over time. A well-designed API improves developer experience, reduces integration defects, and makes testing predictable.

For SDET workflows, API design quality directly impacts:

- schema validation reliability,
- contract-test stability,
- and clarity of failure diagnostics.

## Principles

These principles help keep APIs consistent, evolvable, and easy to automate.

### 1. Use HTTP Methods Correctly

- **GET**: Retrieve resources (safe, idempotent)
- **POST**: Create new resources
- **PUT**: Replace entire resource (idempotent)
- **PATCH**: Partial update
- **DELETE**: Remove resource (idempotent)

Correct method usage creates predictable semantics for clients and simplifies retry behavior.

### 2. Resource-Based URLs

Resource-oriented URLs describe nouns (entities) rather than verbs (actions). This keeps APIs intuitive and aligns with standard REST conventions.

```
Good:
GET    /api/users
GET    /api/users/123
POST   /api/users
PUT    /api/users/123
DELETE /api/users/123

Bad:
GET /api/getUser?id=123
GET /api/updateUser?id=123
```

Good resource naming reduces ambiguity and helps both humans and tooling navigate the API.

### 3. Status Codes

Status codes are part of the API contract, not implementation detail. They should reflect outcome categories consistently across endpoints.

- **2xx**: Success
  - 200 OK
  - 201 Created
  - 204 No Content

- **4xx**: Client Error
  - 400 Bad Request
  - 401 Unauthorized
  - 404 Not Found
  - 409 Conflict

- **5xx**: Server Error
  - 500 Internal Server Error
  - 503 Service Unavailable

In tests, always assert status code and response body together.

### 4. Request/Response Format

Use JSON for request and response bodies:

```json
{
  "id": 123,
  "name": "John",
  "email": "john@example.com"
}
```

A consistent response envelope improves consumer parsing and reduces repetitive client-side error handling logic.

### 5. Error Responses

Error payloads should include both machine-readable codes and human-readable messages.

```json
{
  "error": "Invalid email format",
  "code": "INVALID_EMAIL",
  "details": {
    "field": "email",
    "value": "not-an-email"
  }
}
```

Clients should branch on error codes (for example, `INVALID_EMAIL`), not free-text messages.

## API Versioning

Versioning protects consumers from breaking changes and allows controlled evolution of APIs.

### URL Path
```
/api/v1/users
/api/v2/users
```

### Header
```
Accept: application/vnd.myapi.v2+json
```

Path versioning is usually simpler to reason about in tutorials and service ecosystems with mixed clients.

## Pagination

Pagination prevents oversized responses and provides deterministic traversal for large datasets.

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100
  }
}
```

Always define clear pagination defaults and limits to avoid accidental high-cost queries.


## Quick Exercises (SDET Focus)

Try these exercises before moving to the next section.

### Exercise 1: Config + Health Validation

Goal: Verify service startup behavior under real config conditions.

1. Create two env profiles: valid and invalid (missing required key).
2. Start service and assert startup succeeds only for valid profile.
3. Call `/health` and assert status and response shape.
4. Add one negative test for malformed env value.

Stretch: Capture startup logs and assert a clear config error message.

### Exercise 2: API Contract Smoke for One Endpoint

Goal: Validate one endpoint end-to-end with deterministic assertions.

1. Pick one endpoint (for example create/list/get flow).
2. Write tests for success, validation error, and not-found path.
3. Assert status code, JSON schema shape, and key business fields.
4. Verify error payload stays stable across runs.

Stretch: Add idempotency or duplicate-request case.

## Assignment: Build REST API Layer for Bookshelf

### Goal
Implement HTTP handlers and routing for the Bookshelf API using Go's `net/http` and the business logic from Section 10.

This assignment translates domain rules into transport-level behavior with stable DTOs, consistent status codes, and predictable response envelopes.

### Tasks

#### 1. Create Response Types - `pkg/handler/response.go`

Response wrappers give every endpoint a uniform success/error structure, making automated validation easier.

```go
package handler

import (
	"encoding/json"
	"net/http"
	"time"
)

// Response is the standard API response wrapper
type Response struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *ErrorInfo  `json:"error,omitempty"`
	Meta    *MetaInfo   `json:"meta,omitempty"`
}

// ErrorInfo contains error details
type ErrorInfo struct {
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
}

// MetaInfo contains metadata about the response
type MetaInfo struct {
	Timestamp string `json:"timestamp"`
	Path      string `json:"path"`
}

// SuccessResponse creates a successful response
func SuccessResponse(data interface{}) *Response {
	return &Response{
		Success: true,
		Data:    data,
		Meta: &MetaInfo{
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		},
	}
}

// ErrorResponse creates an error response
func ErrorResponse(code, message string, details map[string]interface{}) *Response {
	return &Response{
		Success: false,
		Error: &ErrorInfo{
			Code:    code,
			Message: message,
			Details: details,
		},
		Meta: &MetaInfo{
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		},
	}
}

// WriteJSON writes a JSON response
func WriteJSON(w http.ResponseWriter, statusCode int, response *Response) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	return json.NewEncoder(w).Encode(response)
}

// HTTPErrorToCode maps domain errors to HTTP status codes
func HTTPErrorToCode(err error) int {
	if err == nil {
		return http.StatusOK
	}

	switch err.(type) {
	case *domain.ValidationError:
		return http.StatusBadRequest
	case *domain.NotFoundError:
		return http.StatusNotFound
	case *domain.DuplicateError:
		return http.StatusConflict
	case *domain.InvalidStatusError:
		return http.StatusBadRequest
	default:
		return http.StatusInternalServerError
	}
}
```

Mapping domain errors centrally prevents drift in status-code behavior across handlers.

#### 2. Create Request DTOs - `pkg/handler/requests.go`

Request DTOs define the transport contract explicitly and keep parsing concerns out of domain entities.

```go
package handler

// CreateUserRequest is the payload for creating a user
type CreateUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// UpdateUserRequest is the payload for updating a user
type UpdateUserRequest struct {
	Email string `json:"email,omitempty"`
}

// CreateBookRequest is the payload for creating a book
type CreateBookRequest struct {
	Title         string `json:"title"`
	Author        string `json:"author"`
	ISBN          string `json:"isbn"`
	PublishedYear int    `json:"published_year"`
}

// AddToShelfRequest is the payload for adding a book to shelf
type AddToShelfRequest struct {
	BookID string `json:"book_id"`
	Status string `json:"status"` // WANT_TO_READ, CURRENTLY_READING, COMPLETED
}

// CreateReviewRequest is the payload for creating a review
type CreateReviewRequest struct {
	Rating  int    `json:"rating"` // 1-5
	Comment string `json:"comment"`
}

// UpdateReviewRequest is the payload for updating a review
type UpdateReviewRequest struct {
	Rating  int    `json:"rating,omitempty"`
	Comment string `json:"comment,omitempty"`
}
```

#### 3. Create Response DTOs - `pkg/handler/responses.go`

Response DTOs prevent direct leakage of internal domain structure and allow safer API evolution.

```go
package handler

import (
	"github.com/yourusername/bookshelf-api/pkg/domain"
	"time"
)

// UserDTO represents a user in API responses
type UserDTO struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// FromDomainUser converts a domain User to UserDTO
func FromDomainUser(u *domain.User) *UserDTO {
	return &UserDTO{
		ID:        u.ID.String(),
		Email:     u.Email,
		Status:    u.Status,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}

// BookDTO represents a book in API responses
type BookDTO struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	Author        string    `json:"author"`
	ISBN          string    `json:"isbn"`
	PublishedYear int       `json:"published_year"`
	CreatedAt     time.Time `json:"created_at"`
}

// FromDomainBook converts a domain Book to BookDTO
func FromDomainBook(b *domain.Book) *BookDTO {
	return &BookDTO{
		ID:            b.ID.String(),
		Title:         b.Title,
		Author:        b.Author,
		ISBN:          b.ISBN,
		PublishedYear: b.PublishedYear,
		CreatedAt:     b.CreatedAt,
	}
}

// ReviewDTO represents a review in API responses
type ReviewDTO struct {
	ID        string    `json:"id"`
	BookID    string    `json:"book_id"`
	UserID    string    `json:"user_id"`
	Rating    int       `json:"rating"`
	Comment   string    `json:"comment"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// FromDomainReview converts a domain Review to ReviewDTO
func FromDomainReview(r *domain.Review) *ReviewDTO {
	return &ReviewDTO{
		ID:        r.ID.String(),
		BookID:    r.BookID.String(),
		UserID:    r.UserID.String(),
		Rating:    r.Rating,
		Comment:   r.Comment,
		CreatedAt: r.CreatedAt,
		UpdatedAt: r.UpdatedAt,
	}
}
```

#### 4. Create Handler with Dependency Injection - `pkg/handler/handlers.go`

Handlers should be thin orchestration layers: parse, validate, call service/domain logic, and map to transport responses.

```go
package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/yourusername/bookshelf-api/pkg/domain"
)

// Handler contains all HTTP handlers and their dependencies
type Handler struct {
	userService     *domain.UserService
	bookService     *domain.BookService
	reviewService   *domain.ReviewService
	shelfService    *domain.ShelfService
	logger          *slog.Logger
	// In Section 40, add repository interfaces here
}

// NewHandler creates a new Handler with dependencies
func NewHandler(
	userService *domain.UserService,
	bookService *domain.BookService,
	reviewService *domain.ReviewService,
	shelfService *domain.ShelfService,
	logger *slog.Logger,
) *Handler {
	return &Handler{
		userService:   userService,
		bookService:   bookService,
		reviewService: reviewService,
		shelfService:  shelfService,
		logger:        logger,
	}
}

// CreateUser handles POST /api/users
func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		WriteJSON(w, http.StatusMethodNotAllowed, ErrorResponse(
			"METHOD_NOT_ALLOWED",
			"Use POST to create users",
			nil,
		))
		return
	}

	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("failed to decode request", "error", err)
		WriteJSON(w, http.StatusBadRequest, ErrorResponse(
			"INVALID_REQUEST",
			"Failed to parse request body",
			nil,
		))
		return
	}

	// Create user with validation
	user, err := domain.NewUser(req.Email, req.Password)
	if err != nil {
		h.logger.Warn("validation error", "error", err)
		statusCode := HTTPErrorToCode(err)
		WriteJSON(w, statusCode, ErrorResponse(
			"VALIDATION_ERROR",
			err.Error(),
			map[string]interface{}{
				"field": getErrorField(err),
			},
		))
		return
	}

	// TODO: In Section 40, save to repository here
	user.ID = domain.NewUserID(user.Email) // Placeholder ID

	h.logger.Info("user created", "email", user.Email)
	WriteJSON(w, http.StatusCreated, SuccessResponse(FromDomainUser(user)))
}

// GetUser handles GET /api/users/{id}
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		WriteJSON(w, http.StatusMethodNotAllowed, ErrorResponse(
			"METHOD_NOT_ALLOWED",
			"Use GET to retrieve users",
			nil,
		))
		return
	}

	// Parse user ID from URL
	userID := strings.TrimPrefix(r.URL.Path, "/api/users/")
	if userID == "" || userID == "/api/users" {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse(
			"INVALID_REQUEST",
			"User ID is required",
			nil,
		))
		return
	}

	// TODO: In Section 40, load from repository
	// For now, return not found
	WriteJSON(w, http.StatusNotFound, ErrorResponse(
		"NOT_FOUND",
		"User not found",
		map[string]interface{}{
			"id": userID,
		},
	))
}

// CreateBook handles POST /api/books
func (h *Handler) CreateBook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		WriteJSON(w, http.StatusMethodNotAllowed, ErrorResponse(
			"METHOD_NOT_ALLOWED",
			"Use POST to create books",
			nil,
		))
		return
	}

	var req CreateBookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error("failed to decode request", "error", err)
		WriteJSON(w, http.StatusBadRequest, ErrorResponse(
			"INVALID_REQUEST",
			"Failed to parse request body",
			nil,
		))
		return
	}

	book, err := domain.NewBook(req.Title, req.Author, req.ISBN, req.PublishedYear)
	if err != nil {
		h.logger.Warn("validation error", "error", err)
		statusCode := HTTPErrorToCode(err)
		WriteJSON(w, statusCode, ErrorResponse(
			"VALIDATION_ERROR",
			err.Error(),
			nil,
		))
		return
	}

	book.ID = domain.NewBookID(book.ISBN)
	h.logger.Info("book created", "title", book.Title)
	WriteJSON(w, http.StatusCreated, SuccessResponse(FromDomainBook(book)))
}

// ListBooks handles GET /api/books
func (h *Handler) ListBooks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		WriteJSON(w, http.StatusMethodNotAllowed, ErrorResponse(
			"METHOD_NOT_ALLOWED",
			"Use GET to list books",
			nil,
		))
		return
	}

	// TODO: In Section 40, load from repository with pagination
	// For now, return empty list
	WriteJSON(w, http.StatusOK, SuccessResponse([]BookDTO{}))
}

// Helper to extract error field
func getErrorField(err error) string {
	if ve, ok := err.(*domain.ValidationError); ok {
		return ve.Field
	}
	return "unknown"
}
```

This shape supports straightforward unit testing because behavior is segmented and deterministic.

#### 5. Create Router - `pkg/handler/router.go`

Centralized routing keeps endpoint definitions discoverable and enforces consistent middleware application.

```go
package handler

import (
	"log/slog"
	"net/http"
)

// Router sets up all HTTP routes
func NewRouter(h *Handler, logger *slog.Logger) *http.ServeMux {
	mux := http.NewServeMux()

	// User endpoints
	mux.HandleFunc("POST /api/users", loggingMiddleware(h.CreateUser, logger))
	mux.HandleFunc("GET /api/users/{id}", loggingMiddleware(h.GetUser, logger))

	// Book endpoints
	mux.HandleFunc("POST /api/books", loggingMiddleware(h.CreateBook, logger))
	mux.HandleFunc("GET /api/books", loggingMiddleware(h.ListBooks, logger))

	// Health check endpoint
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	return mux
}

// loggingMiddleware logs HTTP requests
func loggingMiddleware(
	handler func(http.ResponseWriter, *http.Request),
	logger *slog.Logger,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
		)
		handler(w, r)
	}
}
```

#### 6. Update main.go - `cmd/server/main.go`

Application bootstrap should wire dependencies once, then hand control to the HTTP server.

```go
package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/yourusername/bookshelf-api/pkg/domain"
	"github.com/yourusername/bookshelf-api/pkg/handler"
)

func main() {
	// Initialize logger
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	// Initialize services
	userService := domain.NewUserService()
	bookService := domain.NewBookService()
	reviewService := domain.NewReviewService()
	shelfService := domain.NewShelfService(userService, bookService, reviewService)

	// Initialize handler
	h := handler.NewHandler(userService, bookService, reviewService, shelfService, logger)

	// Create router
	router := handler.NewRouter(h, logger)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	logger.Info("Starting server", "port", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		logger.Error("server error", "error", err)
		os.Exit(1)
	}
}
```


### Testing the API

Treat these manual checks as smoke validation before writing automated handler and integration tests.

#### 1. Run the Server
```bash
go run cmd/server/main.go
```

#### 2. Test with curl

**Create a user:**
```bash
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"ValidPass123"}'
```

**Create a book:**
```bash
curl -X POST http://localhost:8080/api/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Go Programming","author":"John Doe","isbn":"ISBN123","published_year":2023}'
```

**Get health status:**
```bash
curl http://localhost:8080/health
```

#### 3. Expected Responses

Expected responses define your initial API contract and should be reflected in later contract/golden tests.

**Success (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "john@example.com",
    "email": "john@example.com",
    "status": "ACTIVE",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "validation error on field 'email': invalid email format",
    "details": {
      "field": "email"
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:01Z"
  }
}
```

### Files Created This Section

```
pkg/handler/
├── response.go        # Response wrappers and formatters
├── requests.go        # Request DTOs
├── responses.go       # Response DTOs
├── handlers.go        # HTTP handlers
└── router.go          # Route definitions

cmd/server/
└── main.go            # Updated with services and router
```

### Checklist

- ✅ HTTP handlers for users and books
- ✅ Proper status codes (201 for create, 400 for validation, 404 for not found)
- ✅ Standardized response format
- ✅ Dependency injection of services
- ✅ Basic error handling
- ✅ Logging middleware
- ✅ Running server on port 8080

Keep this checklist as a release gate for this section before moving into the testing chapter.

### What's Next

In **Section 30 (Testing)**, you'll write unit tests for these handlers using test doubles to mock the services.

## Deep Dive: API Design Decisions That Age Well

### Background

API design is a long-term compatibility decision. Once clients integrate, even small response changes can break consumers.

Design decisions made early should prioritize consistency and explicit contracts over short-term convenience.

### Design Guidelines

1. Keep resource naming consistent and pluralized.
2. Use stable JSON envelope structure across endpoints.
3. Separate transport DTOs from domain models.
4. Keep handler logic thin and delegate business rules to services.
5. Keep backward compatibility in mind for every field and status code decision.

### Idempotency Considerations

- `GET`, `PUT`, and `DELETE` should be idempotent.
- `POST` may be non-idempotent unless you support idempotency keys.

### Example: Handler Flow Shape

```go
// Parse -> Validate -> Execute -> Map response
func (h *Handler) CreateBook(w http.ResponseWriter, r *http.Request) {
	// 1) decode request DTO
	// 2) call domain constructor/service
	// 3) map domain object to response DTO
	// 4) return standardized envelope
}
```

### API Error Design Tip

Prefer machine-friendly error codes (`VALIDATION_ERROR`, `NOT_FOUND`) plus human-readable messages. Clients should branch on code, not text.

## Common Anti-Patterns

- Embedding business logic directly inside handlers.
- Returning inconsistent error shapes across endpoints.
- Using ad-hoc status codes for similar failure types.
- Exposing internal model fields unintentionally in responses.

## Quick API Contract Checklist

- Are method semantics aligned with HTTP conventions?
- Are status codes consistent for equivalent failure classes?
- Are DTOs clearly separated from domain models?
- Are error codes machine-friendly and stable?
- Can tests assert the response shape uniformly across endpoints?



## Next Step

Continue with [Dependency Injection](dependency-injection.md).
