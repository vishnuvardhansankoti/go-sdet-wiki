# Packages in Go

Packages are Go's core unit of code organization, visibility control, and reuse. In production services, package boundaries shape dependency flow, testability, and long-term maintainability.

For SDET-oriented backend systems, package design has direct impact on:

- how easily components can be mocked and tested,
- how clearly responsibilities are separated,
- and how safely teams can evolve code without creating cyclic dependencies.

This section gives you a practical package model for real Go projects and maps it clearly to Java and C++ mental models.

## What Is a Package in Go?

A package is a directory of Go source files compiled together.

- All files in the same directory usually share one package name.
- Functions, types, variables, and constants declared in a package form that package's API surface.
- Other packages import this API using import paths.

Simple example:

```go
// file: mathutil/add.go
package mathutil

func Add(a, b int) int {
    return a + b
}
```

```go
// file: main.go
package main

import (
    "fmt"

    "example.com/myapp/mathutil"
)

func main() {
    fmt.Println(mathutil.Add(2, 3))
}
```


## Why Packages Matter

In small scripts, packages may feel optional. In real microservices, packages enforce structure.

Good package boundaries help you:

- isolate domain logic from HTTP/framework code,
- avoid accidental cross-layer coupling,
- write focused unit tests with fewer mocks,
- keep import graphs understandable.

## Package Naming Rules

Use short, meaningful, lowercase names.

Recommended:

- `domain`
- `service`
- `repository`
- `handler`

Avoid:

- `utils` as a catch-all dumping ground,
- names that repeat package context (`domainmodels`, `serviceimpl`),
- mixed casing (`MyPackage`).

Good names read naturally at call sites, for example: `service.NewBookService()`.

## Exported vs Unexported Identifiers

Go uses capitalization for visibility.

- `BookService` (capitalized) -> exported (visible outside package)
- `bookService` (lowercase) -> unexported (package-private)

```go
package domain

type Book struct {
    ID    string
    Title string
}

func NewBook(title string) Book {
    return Book{Title: title}
}

func validateTitle(title string) bool {
    return title != ""
}
```

Here, `Book` and `NewBook` are package API, while `validateTitle` stays internal.

## Import Basics

Go imports by module path + directory path.

```go
import (
    "fmt"
    "net/http"

    "example.com/bookshelf-api/pkg/domain"
)
```

`go.mod` defines your module root, and import paths are resolved relative to it.

## Import Aliases and Special Imports

Go supports three useful import forms:

1. Alias import

```go
import d "example.com/bookshelf-api/pkg/domain"
```

Use aliases when two packages share the same name or when local clarity improves.

2. Blank import (side effects only)

```go
import _ "github.com/lib/pq"
```

Use this rarely, typically for driver registration in initialization paths.

3. Dot import

```go
import . "math"
```

This injects identifiers into current scope and is usually discouraged outside selective test scenarios because it harms readability.

## Package Initialization and init

A package can define `init()` functions. They run automatically when package is initialized.

```go
package config

import "log"

func init() {
    log.Println("config package initialized")
}
```

Guideline:

- Keep `init()` small and deterministic.
- Avoid hidden behavior that makes tests brittle.
- Prefer explicit constructors in application code.

## Package Layout in Real Projects

Common Go backend shape:

```text
bookshelf-api/
  cmd/
    server/
      main.go
  pkg/
    domain/
    repository/
    service/
    handler/
  internal/
    config/
    middleware/
```

Typical intent:

- `cmd/` -> executable entry points
- `pkg/` -> reusable application packages
- `internal/` -> private implementation packages

## internal Package: Go's Access Boundary

Any package under an `internal/` directory can only be imported by code within the parent tree.

Example:

```text
project/
  internal/config
  pkg/service
```

`internal/config` can be imported by `project` packages, but not by external modules.

This is one of Go's strongest tools for controlling architectural boundaries.

## Package Dependency Direction

Prefer one-way dependencies:

1. `handler` depends on `service`
2. `service` depends on `repository` and `domain`
3. `repository` depends on `domain`
4. `domain` depends on nothing application-specific

Do not invert this direction. It leads to cyclic imports and fragile design.

## Cyclic Imports: What and Why

Go forbids cyclic imports.

If package `A` imports `B`, then `B` cannot import `A`.

This design keeps dependency graphs explicit and maintainable. If you hit a cycle:

- move shared abstractions to a lower-level package,
- introduce an interface boundary,
- or split responsibilities more clearly.

## Packages in Go vs Java and C++

Go package thinking has parallels with Java packages and C++ namespaces, but there are important differences.

### Parallel with Java

Similarities:

- both organize code into named modules/packages,
- both use import statements,
- both reduce naming collisions.

Differences:

1. Visibility model

- Java: `public`, `protected`, package-private, `private`
- Go: exported/unexported via capitalization

2. File-to-type relationship

- Java often uses one public class per file convention
- Go has no class concept and multiple types/functions per file is common

3. Package path alignment

- Java package names often mirror directory structure by convention
- Go package import paths are tightly tied to module and directory structure

### Parallel with C++

Similarities:

- both use scoped names to avoid symbol collisions,
- both support code organization across multiple files.

Differences:

1. Namespace vs package

- C++ namespaces are language scopes and can span files independent of directory layout
- Go packages are directory-based compilation units

2. Header/source model

- C++ commonly separates declaration (`.h/.hpp`) and implementation (`.cpp`)
- Go keeps declarations and implementations directly in `.go` files

3. Dependency complexity

- C++ can suffer from include-order and macro issues
- Go's package/import model is simpler and explicit, with cycle prevention built in

## Quick Comparison Table

| Topic | Go Packages | Java Packages | C++ Namespaces |
| --- | --- | --- | --- |
| Primary unit | Directory package | Package + classes | Namespace scope |
| Visibility | Export by capitalization | Access modifiers | public/private/protected in classes |
| Import/include model | Explicit imports | Explicit imports | `#include` + namespace usage |
| Cycle handling | Cycles forbidden | Cycles possible in class graphs | Include/link complexity possible |
| Header files | No | No | Yes (common) |

## Practical Examples

### Example 1: Domain + Service Separation

`pkg/domain/book.go`:

```go
package domain

type Book struct {
    ID    string
    Title string
}
```

`pkg/service/book_service.go`:

```go
package service

import "example.com/bookshelf-api/pkg/domain"

type BookService struct{}

func (s BookService) NormalizeTitle(b domain.Book) domain.Book {
    // add normalization logic as needed
    return b
}
```

Benefit: service logic depends on domain model without mixing HTTP or storage concerns.

### Example 2: Interface Boundary to Avoid Cycles

`pkg/repository/book_repository.go`:

```go
package repository

import "example.com/bookshelf-api/pkg/domain"

type BookRepository interface {
    Save(book domain.Book) error
}
```

`pkg/service/book_service.go`:

```go
package service

import (
    "example.com/bookshelf-api/pkg/domain"
    "example.com/bookshelf-api/pkg/repository"
)

type BookService struct {
    Repo repository.BookRepository
}

func (s BookService) CreateBook(title string) error {
    return s.Repo.Save(domain.Book{Title: title})
}
```

Benefit: clean dependency direction and testability with repository mocks.

## Common Package Design Mistakes

- Creating giant packages with mixed responsibilities
- Introducing `utils` package for unrelated helpers
- Exporting too much API surface accidentally
- Letting framework code leak into domain package
- Ignoring cycles until refactor becomes expensive

## Quick Exercises (SDET Focus)

Try these exercises before moving to the assignment.

### Exercise 1: Package Boundary Refactor

Goal: Practice separating domain logic from transport/framework concerns.

1. Create `pkg/domain` with a `Book` struct and validation logic.
2. Create `pkg/handler` with HTTP-specific DTOs and parsing.
3. Ensure `pkg/domain` has no `net/http` imports.
4. Write one unit test proving domain validation runs without handler code.

Stretch: Add an `internal/config` package and show it is not imported by `pkg/domain`.

### Exercise 2: Interface-Driven Repository Package

Goal: Practice dependency direction for testability.

1. Define `BookRepository` interface in `pkg/repository`.
2. Inject it into `pkg/service.BookService`.
3. Implement a fake repository in tests to simulate save failures.
4. Write tests asserting service behavior for success and repository error.

Stretch: Add a compile-time interface check to prevent signature drift.

## Assignment: Design Packages for Bookshelf API

### Goal
Define a clear package boundary map for your Bookshelf implementation.

### Tasks

#### 1. Create or validate package structure

```text
pkg/
  domain/
  repository/
  service/
  handler/
internal/
  config/
  middleware/
```

#### 2. Add a minimal domain package API

Create `pkg/domain/book.go`:

```go
package domain

type Book struct {
    ID    string
    Title string
}

func NewBook(id, title string) Book {
    return Book{ID: id, Title: title}
}
```

#### 3. Add repository interface package

Create `pkg/repository/book_repository.go`:

```go
package repository

import "example.com/bookshelf-api/pkg/domain"

type BookRepository interface {
    Save(book domain.Book) error
}
```

Replace `example.com/bookshelf-api` with your module path from `go.mod`.

#### 4. Add service package depending on interface

Create `pkg/service/book_service.go`:

```go
package service

import (
    "example.com/bookshelf-api/pkg/domain"
    "example.com/bookshelf-api/pkg/repository"
)

type BookService struct {
    Repo repository.BookRepository
}

func (s BookService) CreateBook(id, title string) error {
    return s.Repo.Save(domain.NewBook(id, title))
}
```

#### 5. Add a unit test in service package

Create `pkg/service/book_service_test.go`:

```go
package service

import (
    "testing"

    "example.com/bookshelf-api/pkg/domain"
)

type fakeRepo struct {
    saved []domain.Book
}

func (f *fakeRepo) Save(book domain.Book) error {
    f.saved = append(f.saved, book)
    return nil
}

func TestBookService_CreateBook(t *testing.T) {
    repo := &fakeRepo{}
    svc := BookService{Repo: repo}

    err := svc.CreateBook("b1", "Go in Action")
    if err != nil {
        t.Fatalf("CreateBook returned error: %v", err)
    }

    if len(repo.saved) != 1 {
        t.Fatalf("expected 1 saved book, got %d", len(repo.saved))
    }
}
```

#### 6. Enforce boundary rules

- Keep shared business entities in `pkg/domain`.
- Keep HTTP-specific request/response types in `pkg/handler`.
- Keep configuration loading in `internal/config`.
- Ensure no package import cycles.

### Expected Output

```text
pkg/
  domain/book.go
  repository/book_repository.go
  service/book_service.go
  service/book_service_test.go
```

### Verification

```bash
go list ./...
go build ./...
go test ./pkg/service -run BookService -count=1
```

If cycle errors appear, inspect dependency direction and extract shared abstractions into lower-level packages.

### Extension

Add `pkg/handler/book_handler.go` that depends on `pkg/service` only (and not on repository directly), then verify dependency direction still remains one-way.

## Deep Dive: Package Design as a Quality Lever

### Why SDETs Should Care

Package boundaries define test boundaries.

When architecture is package-clean:

- unit tests become fast and focused,
- integration tests become intentional,
- and flaky cross-layer coupling is reduced.

### Review Checklist

- Does each package have one clear responsibility?
- Are exported APIs minimal and intentional?
- Is dependency direction one-way?
- Are domain packages free from transport/framework details?
- Are package-level side effects (`init`) small and deterministic?

## Next Step

Continue with [Control Flow](control-flow.md), then revisit this chapter while designing your Bookshelf package boundaries.
