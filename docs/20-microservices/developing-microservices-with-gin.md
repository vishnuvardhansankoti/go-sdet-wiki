# Developing Microservices with Gin

Gin is a lightweight, fast HTTP web framework for Go that is well suited for microservices. It gives you routing, middleware, request binding, validation, and clean JSON handling without forcing a heavy application structure.

For microservices work, Gin is a practical middle ground:

- lighter than large opinionated frameworks,
- easier to structure than bare `net/http` for most teams,
- and expressive enough to keep handlers readable as the service grows.

## What Gin Solves

Microservices usually need the same basic transport features:

- route registration,
- request parsing,
- response serialization,
- middleware for auth, logging, and tracing,
- consistent error handling,
- and validation at the boundary.

Gin provides these capabilities in a compact API, which reduces boilerplate in each service while still leaving architecture decisions in your hands.

## When to Use Gin

Gin is a strong fit when you want to build:

- CRUD-style microservices,
- internal APIs for service-to-service communication,
- public JSON APIs with clear request/response contracts,
- lightweight gateways or BFFs,
- and services that need middleware-driven request handling.

It is usually a good choice when your service is mostly HTTP and JSON. If you need a very small dependency surface and full control, `net/http` may still be enough. If you want strong conventions and a larger ecosystem, other frameworks may fit better.

## Core Concepts

### 1. Router Groups

Router groups let you organize endpoints by domain and apply shared middleware.

```go
package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	v1 := r.Group("/api/v1")
	{
		users := v1.Group("/users")
		{
			users.GET("", listUsers)
			users.POST("", createUser)
			users.GET(":id", getUser)
		}
	}

	r.Run(":8080")
}

func listUsers(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": []string{}})
}

func createUser(c *gin.Context) {}
func getUser(c *gin.Context) {}
```

Group-based routing keeps related endpoints together and makes versioning easier later.

### 2. Binding and Validation

Gin can bind JSON directly into request structs and validate fields with tags.

```go
type CreateOrderRequest struct {
	CustomerID string `json:"customer_id" binding:"required"`
	Amount     int    `json:"amount" binding:"required,gt=0"`
	Currency   string `json:"currency" binding:"required,len=3"`
}

func createOrder(c *gin.Context) {
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request payload",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "order created",
	})
}
```

This keeps validation close to the transport layer and prevents bad input from reaching business logic.

### 3. Middleware

Middleware is the right place for cross-cutting concerns such as authentication, request IDs, and logging.

```go
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-Id")
		if requestID == "" {
			requestID = "generated-request-id"
		}

		c.Set("request_id", requestID)
		c.Next()
	}
}

func main() {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(RequestIDMiddleware())
}
```

Well-placed middleware keeps handlers focused on business behavior instead of repetitive plumbing.

### 4. JSON Responses

Gin makes JSON responses concise and consistent.

```go
func getHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"service": "catalog",
	})
}
```

For real services, prefer a stable response schema over ad hoc maps so clients and tests can depend on it.

## Example Microservice Structure

A clean Gin service usually separates transport, service, and data access layers.

```text
cmd/catalog/main.go
internal/handler/
internal/service/
internal/repository/
internal/model/
internal/middleware/
```

Example responsibilities:

- `handler`: HTTP request/response handling,
- `service`: business rules,
- `repository`: database access,
- `middleware`: auth, logging, tracing, rate limiting.

That split makes handlers thin and easier to test.

## Practical Example: Books Service

Imagine a books microservice that needs to create and fetch books.

### Handler

```go
type BookHandler struct {
	service BookService
}

func NewBookHandler(service BookService) *BookHandler {
	return &BookHandler{service: service}
}

func (h *BookHandler) CreateBook(c *gin.Context) {
	var req CreateBookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	book, err := h.service.Create(c.Request.Context(), req.Title, req.Author)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create book"})
		return
	}

	c.JSON(http.StatusCreated, book)
}
```

### Service

```go
type BookService interface {
	Create(ctx context.Context, title, author string) (*Book, error)
	GetByID(ctx context.Context, id string) (*Book, error)
}
```

### Routes

```go
func RegisterRoutes(r *gin.Engine, handler *BookHandler) {
	v1 := r.Group("/api/v1")
	books := v1.Group("/books")
	books.POST("", handler.CreateBook)
	books.GET(":id", handler.GetBook)
}
```

This pattern keeps the transport layer replaceable and the business layer testable.

## Common Use Cases

### Internal CRUD Services

Gin works well for services that manage one domain and expose a small JSON API.

Example: inventory, users, orders, billing, notifications.

### API Gateway or BFF

When you need a thin layer that aggregates downstream APIs and shapes responses for a client, Gin is a good fit because middleware and route composition are straightforward.

### Admin APIs

Gin is useful for internal admin tools where fast delivery and clean JSON endpoints matter more than a large framework ecosystem.

### Testing-Friendly Services

Because Gin handlers are just functions with a `*gin.Context`, they are easy to exercise in unit tests and HTTP-level tests.

## Testing Gin Services

Test the transport boundary separately from the business logic.

### Handler Test Example

```go
func TestCreateBook(t *testing.T) {
	r := gin.New()
	service := newMockBookService()
	handler := NewBookHandler(service)
	r.POST("/books", handler.CreateBook)

	body := strings.NewReader(`{"title":"Clean Code","author":"Robert Martin"}`)
	req := httptest.NewRequest(http.MethodPost, "/books", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", rec.Code)
	}
}
```

### What to Assert

- status code,
- JSON schema or key fields,
- validation error shape,
- and business outcome, not implementation details.

This makes failures easier to diagnose and keeps tests stable across refactors.

## Design Tips

### Keep Handlers Thin

Handlers should parse input, call a service, and write a response. Avoid putting business rules directly into route handlers.

### Centralize Errors

Define a small error mapping layer so domain errors become predictable HTTP responses.

### Use Middlewares Deliberately

Apply auth, correlation ID, logging, and panic recovery globally. Keep endpoint-specific behavior close to the route group.

### Version Your Routes

Use `/api/v1`, `/api/v2`, and so on when you expect clients to depend on the service over time.

### Prefer Stable DTOs

Do not expose database entities directly. Use request and response structs that can evolve without leaking internal details.

## Common Mistakes

- putting business logic inside handlers,
- returning inconsistent error payloads,
- skipping request validation,
- letting route groups grow without versioning,
- and treating middleware as a dumping ground for unrelated logic.

## Quick Exercises (SDET Focus)

Try these exercises before moving to the next section.

### Exercise 1: Create a Health Endpoint

Goal: Build a service health endpoint with deterministic output.

1. Create `GET /health`.
2. Return JSON with `status`, `service`, and `timestamp`.
3. Add one test for the success case.
4. Add one test for content type and response shape.

Stretch: Include readiness data from a mocked dependency.

### Exercise 2: Add Validation to a Create Endpoint

Goal: Validate input before business logic runs.

1. Add a `POST /books` endpoint.
2. Require `title` and `author` fields.
3. Return `400 Bad Request` for invalid JSON.
4. Return `201 Created` for valid input.

Stretch: Assert that invalid payloads never call the service layer.

## Assignment: Build a Gin-Based Microservice

### Goal
Build the Bookshelf microservice with Gin. The service should expose the core Bookshelf routes, use middleware, validate input, and include tests.

This assignment combines routing, request handling, and testable service design so you can practice the full HTTP layer of the Bookshelf project.

### Tasks

#### 1. Initialize the Project

Create a new Go module and install Gin.

```bash
go mod init example.com/catalog-service
go get github.com/gin-gonic/gin
```

Create a simple service layout:

```text
cmd/server/main.go
internal/handler/
internal/service/
internal/model/
internal/middleware/
```

#### 2. Implement Two Endpoints

Create at least two Bookshelf endpoints, such as:

- `GET /health`
- `POST /books`
- `GET /books/:id`

Return stable JSON responses and use `ShouldBindJSON` for request parsing.

#### 3. Add Middleware

Implement at least one middleware for:

- request ID propagation,
- structured logging,
- or simple auth checking.

Keep the middleware reusable across route groups.

#### 4. Separate Business Logic

Move business rules into a service interface so the handler can be tested with a fake implementation.

#### 5. Write Tests

Add tests for:

- a successful request,
- a validation failure,
- and a not-found or dependency-failure case.

Use `httptest` and assert status code plus response body fields.

### Acceptance Criteria

- The service starts with Gin and serves JSON endpoints.
- The service models the Bookshelf project domain rather than a generic example.
- Validation failures return `400` with a clear error body.
- The handler layer does not contain business rules.
- At least one middleware is active on all routes.
- The service has tests for success and failure paths.

### Stretch Goals

- Add route versioning with `/api/v1`.
- Add graceful shutdown in `main.go`.
- Add a custom error response type.
- Add a fake repository to support unit tests.

## Next Step

Continue with [REST API Design](rest-api-design.md).