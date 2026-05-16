# Install and Setup

Environment setup is the first quality gate of any Go project. A reproducible setup process eliminates the most common class of onboarding and CI failures before any code is written.

## Installing Go

### Windows
1. Download from https://golang.org/dl/
2. Run the installer
3. Follow the prompts

### macOS
```bash
brew install go
```

### Linux
```bash
wget https://golang.org/dl/go1.21.0.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
```

## Verify Installation

```bash
go version
```

## Set Up Your Workspace

Create a directory for your Go projects:

```bash
mkdir -p ~/go-projects
cd ~/go-projects
```

## IDE Setup

### VS Code
1. Install Go extension
2. Install Go tools via the extension prompt

### GoLand / IntelliJ IDEA
- Native Go support with excellent refactoring tools

## Assignment: Project Setup for Bookshelf API

### Goal
Set up the project structure for the Bookshelf API microservice that you'll build throughout this tutorial.

### Route Prefix Note
- In early sections, examples use `/api`.
- In capstone, examples use `/api/v1`.
- Both are valid tutorial stages; keep consistency within the current section.

### Prerequisites
- Go 1.21+ installed
- Git installed
- Your favorite text editor or IDE

### Steps

#### 1. Create Project Repository
```bash
# Create project directory
mkdir -p ~/go-projects/bookshelf-api
cd ~/go-projects/bookshelf-api

# Initialize as git repository
git init

# Initialize as Go module
go mod init github.com/yourusername/bookshelf-api
```

#### 2. Create Project Structure
```bash
mkdir -p cmd/server
mkdir -p pkg/domain
mkdir -p pkg/repository
mkdir -p pkg/handler
mkdir -p pkg/service
mkdir -p pkg/config
mkdir -p pkg/logger
mkdir -p tests
```

#### 3. Create README with API Overview
Create `README.md`:

```markdown
# Bookshelf API

A microservice for managing personal bookshelves with users, books, reading lists, and reviews.

## Features

### User Management
- Register new users
- Retrieve user profiles
- Update user information

### Book Management
- Add books to personal bookshelf
- Remove books from bookshelf
- List user's books
- Search and filter books

### Reading Lists
- Create custom reading lists (e.g., "To Read", "Currently Reading")
- Add/remove books from lists
- Track reading progress

### Ratings and Reviews
- Rate books (1-5 stars)
- Write and update reviews
- View reviews for books
- Calculate average ratings

## Project Stack

- **Language**: Go 1.21+
- **Database**: PostgreSQL (introduced in Section 40)
- **HTTP Framework**: net/http (standard library)
- **Testing**: table-driven tests, mocking, Testcontainers
- **CI/CD**: GitHub Actions

## Getting Started

```bash
git clone <repository-url>
cd bookshelf-api
go mod download
go run cmd/server/main.go
```

## API Endpoints (To Be Implemented)

### Users
- POST /api/users - Create user
- GET /api/users/{id} - Get user
- PUT /api/users/{id} - Update user

### Books
- GET /api/books - List books
- POST /api/books - Create book
- GET /api/books/{id} - Get book
- GET /api/books/{id}/reviews - Get book reviews

### Bookshelf
- GET /api/users/{id}/bookshelf - Get user's books
- POST /api/users/{id}/bookshelf - Add book to shelf
- DELETE /api/users/{id}/bookshelf/{bookId} - Remove book from shelf

### Reviews
- POST /api/books/{id}/reviews - Create review
- PUT /api/reviews/{id} - Update review
- DELETE /api/reviews/{id} - Delete review

## Testing Strategy

- **Unit Tests**: Domain logic and business rules
- **Integration Tests**: Database operations with real PostgreSQL
- **Contract Tests**: Service-to-service communication
- **End-to-End Tests**: Full workflow scenarios

Target coverage: 80%+

## Next Steps

1. Section 10 (Go Basics) - Implement domain models
2. Section 20 (Microservices) - Build REST API handlers
3. Section 30 (Testing) - Add unit tests
4. ... and so on through Section 90 (Capstone)
```

#### 4. Create API Specification Document
Create `docs/API_SPEC.md` with the endpoint details from README.

#### 5. Create Architecture Diagram (Conceptual)
Create `docs/ARCHITECTURE.md`:

```markdown
# Bookshelf API Architecture

## Domain Model

```
User
├── Email (unique)
├── Password (hashed)
└── CreatedAt

Book
├── Title
├── Author
├── ISBN
└── PublishedYear

BookshelfEntry
├── UserID (references User)
├── BookID (references Book)
├── Status (WANT_TO_READ, CURRENTLY_READING, COMPLETED)
└── AddedAt

Review
├── BookID (references Book)
├── UserID (references User)
├── Rating (1-5)
├── Comment
└── CreatedAt
```

## Layers

1. **Domain Layer** - Business logic and validation
2. **Repository Layer** - Data persistence (PostgreSQL)
3. **Service Layer** - Orchestration of business logic
4. **Handler Layer** - HTTP request/response
5. **Config/Logger** - Cross-cutting concerns

## Communication

```
HTTP Client
    ↓
Handler (HTTP layer)
    ↓
Service (Business logic)
    ↓
Repository (Data access)
    ↓
PostgreSQL Database
```

## Testing Layers

- **Unit**: Domain → Service (no DB)
- **Integration**: Service → Repository → Real DB
- **E2E**: Full HTTP flow with real DB
```

#### 6. Initialize First Files
Create `cmd/server/main.go` (placeholder):

```go
package main

import "fmt"

func main() {
	fmt.Println("Bookshelf API - Starting in Section 10")
}
```

Create `go.mod` is already created. Verify it exists:

```bash
cat go.mod
```

#### 7. First Git Commit
```bash
git add .
git commit -m "Initial project setup for Bookshelf API"
```

### Verification

By the end of this assignment, you should have:

- ✅ Project directory structure created
- ✅ `go.mod` initialized with module name
- ✅ `README.md` with clear project overview
- ✅ `docs/API_SPEC.md` with endpoint list
- ✅ `docs/ARCHITECTURE.md` with domain model
- ✅ Placeholder `main.go`
- ✅ Initial git commit

### Files Created This Section

```
bookshelf-api/
├── go.mod                           # Go module definition
├── README.md                         # Project overview
├── cmd/
│   └── server/
│       └── main.go                  # Entry point (placeholder)
├── docs/
│   ├── API_SPEC.md                  # Endpoint specifications
│   └── ARCHITECTURE.md              # System architecture
├── pkg/
│   ├── domain/                      # (populated in Section 10)
│   ├── repository/                  # (populated in Section 40)
│   ├── handler/                     # (populated in Section 20)
│   ├── service/                     # (populated in Section 20)
│   ├── config/
│   ├── logger/
│   └── util/
└── tests/                           # (populated in Section 30+)
```

### Troubleshooting

**Q: `go mod init` failed**
- Ensure you're in the correct directory
- Module name should follow GitHub URL format (optional but good practice)

**Q: Directory structure looks wrong**
- Use `tree` command to visualize: `tree -L 2 -a`
- Ensure all directories are created

### What's Next?

In **Section 10 - Go Basics**, you'll:
- Implement domain structs (User, Book, Review, etc.)
- Add validation logic
- Create your first unit tests

## Deep Dive: Environment Readiness and Reproducibility

### Background

Most onboarding friction comes from environment mismatch. A reliable setup process should produce the same result on every machine.

### Readiness checklist

1. Confirm Go and Git versions.
2. Verify module initialization succeeds.
3. Validate folder structure before coding.
4. Run a minimal `go run` smoke check.

### Reproducibility practices

- Commit `go.mod` and `go.sum` early.
- Document setup commands in one canonical location.
- Avoid machine-specific paths in examples.

### SDET recommendation

Treat setup verification as the first test case of the project and capture failures with exact command output for quick troubleshooting.

## Common Anti-Patterns

- Installing Go without verifying the version matches the minimum declared in `go.mod`.
- Appending machine-specific paths to `$PATH` in ways that silently fail in CI.
- Writing code before running `go mod init`, forcing manual module setup later.
- Skipping IDE extension setup and missing real-time format errors and vet warnings.

## Quick Setup Checklist

- Does `go version` report a version at or above the project minimum?
- Is the workspace initialized with `go mod init` before any code is written?
- Does a `go run .` or `go test ./...` succeed in a clean clone?
- Is the IDE configured with `gopls` and auto-format-on-save enabled?

