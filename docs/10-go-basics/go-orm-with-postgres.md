# Go ORM with PostgreSQL

Object-Relational Mapping (ORM) helps Go applications work with relational databases by mapping database tables and rows to Go structs and objects. Instead of writing every `INSERT`, `SELECT`, `UPDATE`, and `DELETE` statement by hand, you model data as Go types and let the ORM handle repetitive SQL generation.

In Go, ORMs are useful when you want faster development, consistent data mapping, and cleaner repository code. They are not a replacement for understanding SQL. A good Go engineer still needs to know joins, indexes, transactions, constraints, and how PostgreSQL behaves under load.

In this section, you will learn:

- what an ORM is and where it fits in a Go codebase,
- how ORM models map Go structs to PostgreSQL tables,
- how to design clear models for real business entities,
- when an ORM is a good fit and when raw SQL may be better,
- how to connect to PostgreSQL and perform common CRUD operations with GORM.

## What Is an ORM?

An ORM is a library that translates between object-oriented or struct-based application code and relational database tables.

Without an ORM, you often write code like this:

```go
row := db.QueryRowContext(ctx, `SELECT id, email, name FROM users WHERE id = $1`, userID)
```

With an ORM, you usually write something closer to this:

```go
var user User
err := db.First(&user, userID).Error
```

The ORM understands:

- which table a model belongs to,
- which struct fields map to which columns,
- which field is the primary key,
- how related records connect through foreign keys,
- how to insert, update, load, and delete records.

This can remove a large amount of boilerplate, especially in services that perform standard CRUD work.

## Why ORMs Matter in Go

Go developers often prefer explicit code, so ORMs in Go are usually used more carefully than in some other ecosystems. That is a good thing. The best use of an ORM is to reduce repetitive persistence code while keeping query behavior understandable.

Benefits:

- Faster feature delivery for common CRUD workflows
- Less repetitive row scanning and SQL assembly
- Better consistency between models and repository code
- Easier onboarding for teams that work with domain structs first

Trade-offs:

- Generated SQL can be harder to reason about if you do not inspect it
- Complex reporting queries may become awkward
- Poor model design can leak persistence concerns into domain logic
- Performance issues can appear if you overuse eager loading or large object graphs

In practice, many Go teams use a hybrid approach:

- ORM for standard create/read/update/delete flows
- raw SQL for reporting, bulk operations, and performance-sensitive queries

## Popular Go ORM Options

The Go ecosystem has several libraries in this space:

- **GORM**: the most widely used general-purpose ORM for Go
- **Bun**: SQL-first ORM with a strong balance between model mapping and query control
- **Ent**: schema-driven entity framework with code generation

For this page, the examples use **GORM** with **PostgreSQL** because it is common, well-documented, and easy to use in teaching examples.

## How ORM Models Work

An ORM model is a Go struct that represents a table. Each field typically maps to a column, and tags or conventions describe how that mapping should work.

### Basic Model Structure

```go
type User struct {
    ID        uint
    Email     string
    Name      string
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

At a high level:

- `User` maps to a `users` table
- `ID` maps to the primary key
- `Email` and `Name` map to columns
- `CreatedAt` and `UpdatedAt` are timestamp fields commonly managed by the ORM

This pattern is simple, readable, and fits naturally with Go's struct-oriented design.

### Detailed Introduction to ORM Models

ORM models do more than hold data. They define how the application sees persistence.

An ORM model usually captures:

1. **Identity**: the primary key that uniquely identifies a row
2. **Attributes**: business data such as title, email, or status
3. **Relationships**: links to other models through foreign keys
4. **Constraints**: uniqueness, nullability, size, and indexes
5. **Lifecycle metadata**: timestamps like creation and update time

Good ORM models are explicit enough to reflect real database rules but small enough to stay readable.

### Field Mapping with Tags

GORM uses struct tags to control column shape and constraints.

```go
type User struct {
    ID        uint      `gorm:"primaryKey"`
    Email     string    `gorm:"type:varchar(255);not null;uniqueIndex"`
    Name      string    `gorm:"type:varchar(120);not null"`
    Status    string    `gorm:"type:varchar(20);not null;default:'active'"`
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

Here is what those tags communicate:

- `primaryKey` marks the identifier column
- `type:varchar(255)` sets a PostgreSQL-friendly column type
- `not null` prevents missing required values
- `uniqueIndex` creates a uniqueness rule for fields like email
- `default:'active'` lets PostgreSQL or the ORM provide a default value

These rules matter because your model is not only an application struct. It is also part of your database contract.

### Relationships Between Models

ORMs become especially useful when modeling relations.

```go
type Book struct {
    ID        uint      `gorm:"primaryKey"`
    Title     string    `gorm:"type:varchar(255);not null"`
    Author    string    `gorm:"type:varchar(255);not null"`
    ISBN      string    `gorm:"type:varchar(20);uniqueIndex"`
    Reviews   []Review  `gorm:"foreignKey:BookID"`
    CreatedAt time.Time
    UpdatedAt time.Time
}

type Review struct {
    ID        uint      `gorm:"primaryKey"`
    BookID    uint      `gorm:"not null;index"`
    UserID    uint      `gorm:"not null;index"`
    Rating    int       `gorm:"not null"`
    Comment   string    `gorm:"type:text"`
    Book      Book      `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
    User      User      `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

This model design tells the ORM:

- one `Book` can have many `Review` records,
- each `Review` belongs to one `Book`,
- each `Review` also belongs to one `User`,
- PostgreSQL should enforce foreign-key behavior.

### Model Design Guidelines

Keep these principles in mind when building ORM models:

- Model business entities, not HTTP payloads
- Keep validation and business rules in services or domain methods, not only in tags
- Use database constraints for data integrity, not just application checks
- Prefer explicit field names and clear indexes
- Be careful with nullable columns; use pointers or nullable types when null has meaning

For example, if a biography is optional:

```go
type Author struct {
    ID        uint    `gorm:"primaryKey"`
    Name      string  `gorm:"type:varchar(255);not null"`
    Bio       *string `gorm:"type:text"`
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

Using `*string` makes the difference between "empty string" and "no value stored" explicit.

## PostgreSQL Example with GORM

### Install Dependencies

```bash
go get gorm.io/gorm
go get gorm.io/driver/postgres
```

### Connect to PostgreSQL

```go
package main

import (
    "log"

    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

func openDB() *gorm.DB {
    dsn := "host=localhost user=postgres password=postgres dbname=bookshelf port=5432 sslmode=disable TimeZone=UTC"

    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatalf("failed to connect to postgres: %v", err)
    }

    return db
}
```

This example uses PostgreSQL as the backing store, which is a strong default for real applications because it supports transactions, indexes, constraints, JSON columns, and advanced querying.

### Define Models

```go
type User struct {
    ID        uint      `gorm:"primaryKey"`
    Email     string    `gorm:"type:varchar(255);not null;uniqueIndex"`
    Name      string    `gorm:"type:varchar(120);not null"`
    CreatedAt time.Time
    UpdatedAt time.Time
}

type Book struct {
    ID        uint      `gorm:"primaryKey"`
    Title     string    `gorm:"type:varchar(255);not null;index"`
    Author    string    `gorm:"type:varchar(255);not null"`
    ISBN      string    `gorm:"type:varchar(20);uniqueIndex"`
    CreatedAt time.Time
    UpdatedAt time.Time
}

type Review struct {
    ID        uint      `gorm:"primaryKey"`
    UserID    uint      `gorm:"not null;index"`
    BookID    uint      `gorm:"not null;index"`
    Rating    int       `gorm:"not null"`
    Comment   string    `gorm:"type:text"`
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

### Create Tables

```go
func migrate(db *gorm.DB) error {
    return db.AutoMigrate(&User{}, &Book{}, &Review{})
}
```

`AutoMigrate` is convenient for learning, prototypes, and simple projects. In larger systems, teams usually switch to explicit SQL migration files so schema changes are reviewed and versioned more carefully.

## Common CRUD Examples

### Insert a Record

```go
user := User{
    Email: "alice@example.com",
    Name:  "Alice",
}

if err := db.Create(&user).Error; err != nil {
    return err
}
```

After `Create`, GORM usually populates generated fields such as `ID`, `CreatedAt`, and `UpdatedAt`.

### Read a Record

```go
var book Book
if err := db.First(&book, 1).Error; err != nil {
    return err
}
```

For conditional lookup:

```go
var user User
if err := db.Where("email = ?", "alice@example.com").First(&user).Error; err != nil {
    return err
}
```

### Update a Record

```go
if err := db.Model(&user).Updates(User{
    Name: "Alice Johnson",
}).Error; err != nil {
    return err
}
```

### Delete a Record

```go
if err := db.Delete(&Review{}, 10).Error; err != nil {
    return err
}
```

## Loading Relationships

When working with relational data, you often need parent-child records together.

```go
var book Book
if err := db.Preload("Reviews").First(&book, 1).Error; err != nil {
    return err
}
```

`Preload` is useful, but use it intentionally. Loading too many relationships at once can produce slow queries and large responses.

## Transaction Example

PostgreSQL is frequently chosen because strong transactional behavior matters in real systems.

```go
err := db.Transaction(func(tx *gorm.DB) error {
    user := User{
        Email: "reader@example.com",
        Name:  "Reader One",
    }
    if err := tx.Create(&user).Error; err != nil {
        return err
    }

    review := Review{
        UserID:  user.ID,
        BookID:  1,
        Rating:  5,
        Comment: "Excellent reference for test engineers.",
    }
    if err := tx.Create(&review).Error; err != nil {
        return err
    }

    return nil
})
if err != nil {
    return err
}
```

This pattern is important when multiple writes must either succeed together or fail together.

## Relevant Use Cases for Go ORMs

ORMs are a good fit when the application mostly performs entity-based persistence and the team values fast iteration.

Good use cases:

- Internal business applications with standard CRUD screens and APIs
- Microservices with clear domain entities such as users, books, orders, or reviews
- Admin tools and back-office systems
- Prototypes and early-stage services where delivery speed matters
- Testable repository layers where model mapping would otherwise be repetitive

Use raw SQL or a SQL-first tool when:

- queries are reporting-heavy or analytics-heavy,
- you need hand-optimized joins and query plans,
- you perform large bulk imports or updates,
- database behavior must be fully explicit and predictable at the SQL level.

## ORM Models in Real Project Design

A common mistake is to make ORM models carry every responsibility in the system. Keep the layers clear:

- **ORM model**: persistence mapping
- **domain logic**: business rules and invariants
- **service layer**: orchestration and transactions
- **handler layer**: HTTP request and response concerns

For example, a `Review` model can store `Rating`, `Comment`, `BookID`, and `UserID`, but the rule "a user can only review a book once" should also be protected by:

1. a unique database constraint,
2. repository error handling,
3. service-level business logic and tests.

That combination gives you better correctness than relying on application code alone.

## Best Practices

- Learn SQL even if you use an ORM
- Keep models small and business-oriented
- Add indexes and constraints intentionally
- Use PostgreSQL integration tests for real query and constraint behavior
- Inspect generated SQL when debugging slow or incorrect queries
- Avoid hiding important business rules inside framework magic

For SDET workflows, remember that ORM-based code should still be validated with real database integration tests. In-memory assumptions often miss constraint behavior, transaction semantics, and query differences.

## Quick Exercises

### Exercise 1: Model a Simple Catalog

Goal: Practice mapping structs to PostgreSQL tables.

1. Create `Author`, `Book`, and `Review` models using GORM tags.
2. Add primary keys, required fields, and at least one unique index.
3. Run `AutoMigrate` against a local PostgreSQL instance.
4. Insert one author, one book, and one review.

Stretch: Add a one-to-many relationship from `Author` to `Book`.

### Exercise 2: Query by Business Fields

Goal: Use ORM queries instead of only primary-key lookups.

1. Create three books in PostgreSQL.
2. Query books by author name.
3. Query a single user by email.
4. Return a useful error when no record is found.

Stretch: Add sorting by title.

### Exercise 3: Validate Transaction Safety

Goal: Confirm multiple writes behave atomically.

1. Start a transaction.
2. Create a user and a review in the same transaction.
3. Force the second write to fail.
4. Verify PostgreSQL rolls back both changes.

Stretch: Add an integration test for the rollback path.

## Assignment: Build a GORM Repository for PostgreSQL

### Goal

Implement a repository layer for the Bookshelf API using GORM and PostgreSQL.

### Tasks

1. Create a `UserRepository` backed by `*gorm.DB`.
2. Implement `CreateUser`, `GetUserByEmail`, and `UpdateUser`.
3. Add a `BookRepository` with `CreateBook` and `ListBooks`.
4. Add integration tests that verify:
   - unique email constraint behavior,
   - successful record creation,
   - query results from real PostgreSQL data.

### Suggested Project Structure

```text
pkg/
├── domain/
│   ├── user.go
│   └── book.go
├── repository/
│   ├── user_repository.go
│   └── book_repository.go
└── storage/
    └── postgres.go
```

This approach keeps PostgreSQL wiring separate from business logic while still benefiting from ORM model mapping.
