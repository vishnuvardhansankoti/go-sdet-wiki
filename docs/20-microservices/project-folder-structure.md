# Project Folder Structure

Folder structure is architecture made visible. A good layout makes ownership clear, reduces coupling, and helps teams scale features without creating confusion.

For SDET-oriented systems, structure also improves test strategy because boundaries map naturally to test layers (domain, handler, integration).

## Recommended Layout

```
project-name/
├── cmd/
│   └── server/
│       └── main.go
├── pkg/
│   ├── api/
│   ├── service/
│   ├── repository/
│   └── domain/
├── internal/
│   ├── config/
│   ├── middleware/
│   └── errors/
├── tests/
│   ├── integration/
│   └── fixtures/
├── go.mod
├── go.sum
├── Dockerfile
├── docker-compose.yml
├── Makefile
└── README.md
```

## Directory Purposes

Each folder should have a clear responsibility. When boundaries are clear, code review and debugging become faster.

### cmd/
Entry points. Each subdirectory is an executable.

Keep startup/bootstrap logic here: configuration loading, logger setup, dependency wiring, and server start.

### pkg/
Reusable packages that can be imported by other projects.

Use this for stable application modules such as domain logic, handlers, repositories, and services.

### internal/
Private packages not meant for external use.

Use `internal` for implementation details that should not be imported outside this module.

### tests/
Test files, fixtures, and test utilities.

Keep integration harnesses, fixtures, and reusable test helpers here to separate test infrastructure from production code.

## Common Patterns

Different teams choose slightly different layouts. What matters most is consistency and dependency discipline.

### Domain Driven Design
```
pkg/
├── domain/           # Business entities
├── repository/       # Data access
├── service/          # Business logic
└── api/              # HTTP handlers
```

This pattern emphasizes domain language and business rules as first-class design elements.

### Layered Architecture
```
cmd/          # Entry point
internal/
├── api/      # HTTP layer
├── service/  # Business logic
└── storage/  # Data layer
```

This pattern emphasizes flow by technical layers and is often easier for new teams to adopt.

## Benefits

- Clear separation of concerns
- Easy to navigate
- Scalable structure
- Testable organization

A consistent layout also reduces onboarding time for new contributors.


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

## Assignment: Organize Bookshelf Project Structure

### Goal
Implement the recommended folder structure for the Bookshelf API microservice.

This step creates the foundation for all later sections. A clean structure now prevents expensive reorganization later.

### Current State Review

You currently have code scattered. Organize into proper directories.

Before moving files, define ownership rules per folder so future code additions stay consistent.

### Tasks

#### 1. Create Package Directories

Create these directories first so future code moves and additions have clear destinations.

```bash
mkdir -p pkg/service
mkdir -p pkg/repository  
mkdir -p pkg/middleware
mkdir -p pkg/logger
mkdir -p pkg/config
mkdir -p tests/fixtures
mkdir -p tests/mocks
mkdir -p tests/unit
mkdir -p tests/integration
```

#### 2. Create Service Container

The service container acts as a composition root for in-process dependencies and keeps wiring away from handlers.

Create `pkg/service/container.go`:

```go
package service

import (
	"log/slog"
	"github.com/yourusername/bookshelf-api/pkg/domain"
)

// Container holds all service instances  
type Container struct {
	UserService       *domain.UserService
	BookService       *domain.BookService
	ReviewService     *domain.ReviewService
	ShelfService      *domain.ShelfService
	BulkImportService *domain.BulkImportService
	Logger            *slog.Logger
}

// NewContainer creates and initializes all services
func NewContainer(logger *slog.Logger) *Container {
	userService := domain.NewUserService()
	bookService := domain.NewBookService()
	reviewService := domain.NewReviewService()
	shelfService := domain.NewShelfService(userService, bookService, reviewService)
	bulkImportService := domain.NewBulkImportService(4)

	return &Container{
		UserService:       userService,
		BookService:       bookService,
		ReviewService:     reviewService,
		ShelfService:      shelfService,
		BulkImportService: bulkImportService,
		Logger:            logger,
	}
}
```

This pattern simplifies tests because you can construct alternate containers with fake dependencies.

#### 3. Expected Structure After

Use this as the target baseline. Small variations are fine as long as dependency direction remains clear.

```
bookshelf-api/
├── cmd/server/main.go
├── pkg/
│   ├── domain/          (models, business logic)
│   ├── handler/         (HTTP handlers)
│   ├── service/         (service container)
│   ├── repository/      (data access interfaces)
│   ├── middleware/      (HTTP middleware)
│   ├── logger/          (logging setup)
│   └── config/          (configuration)
├── tests/
│   ├── fixtures/        (test data)
│   ├── mocks/           (mock implementations)
│   ├── unit/            (unit tests)
│   └── integration/     (integration tests)
├── docs/
│   ├── API_SPEC.md
│   ├── ARCHITECTURE.md
│   └── PROJECT_STRUCTURE.md
└── go.mod
```

### Verification

```bash
go build ./...
```

If build fails after moving files, fix import paths first before adding new functionality.

### What's Next

Next pages will implement each of these packages.

## Deep Dive: Folder Structure as a Quality Tool

### Background

A clear folder layout lowers cognitive load, shortens onboarding time, and keeps test scope obvious. Structure is not cosmetic; it directly impacts maintainability.

As systems scale, unclear layout causes accidental cross-layer dependencies and brittle tests.

### Dependency Direction Rule

Prefer one-way dependencies:

1. `handler` depends on `service`
2. `service` depends on `domain` and repository interfaces
3. `domain` depends on no infrastructure packages

This enables focused tests and cleaner refactoring.

If this direction is violated, change impact spreads across layers and releases become riskier.

### Practical Guardrails

- Keep HTTP-specific types in `pkg/handler`.
- Keep domain invariants in `pkg/domain`.
- Keep wiring/bootstrap logic in `cmd/server`.
- Keep test fixtures and mocks under `tests/`.

Also avoid putting business rules inside handler DTO transformation code.

### Example: Change Impact

If you change JSON response shape, only `handler` tests should need updates. If domain validation changes, primarily `domain` and service tests should fail.

This is a healthy signal that boundaries are working as intended.

### SDET Benefit

Folder boundaries map directly to test layers:

- Domain unit tests
- Handler tests with fakes
- Integration tests in `tests/integration`

These boundaries make it easier to diagnose failures by layer and reduce flaky cross-layer test coupling.

## Common Anti-Patterns

- Putting database calls directly inside handlers.
- Sharing mutable global state across packages.
- Mixing test-only utilities into production packages.
- Circular imports caused by unclear boundaries.

## Quick Structure Checklist

- Does each folder have one clear responsibility?
- Are dependencies flowing in one direction?
- Are tests grouped by layer and purpose?
- Is startup wiring isolated from business logic?
- Can newcomers find core flow (`cmd` -> handler -> service -> repository) quickly?



## Next Step

Continue with [REST API Design](rest-api-design.md).
