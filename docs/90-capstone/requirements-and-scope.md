# Requirements and Scope

Requirements quality determines capstone delivery quality. A clear scope creates predictable implementation, test planning, and CI governance.

This page should be treated as a contract between product intent and engineering execution.

## Project: Bookshelf API

A microservice-based API for managing personal bookshelves and book recommendations.

## Functional Requirements

Each functional item should map to at least one success scenario and one failure scenario.

### User Management
- User registration with email
- User login with password
- User profile management
- Password reset functionality

### Book Management
- Add books to personal bookshelf
- Remove books from bookshelf
- List all books in bookshelf
- Search books by title or author
- Get book details

### Reading Lists
- Create reading lists (e.g., "To Read", "Currently Reading", "Completed")
- Add/remove books from reading lists
- List books in a reading list
- Mark books as complete

### Ratings and Reviews
- Rate books (1-5 stars)
- Write reviews for books
- Update reviews
- Delete reviews
- View reviews for a book

## Non-Functional Requirements

Non-functional requirements are release criteria, not optional aspirations.

### Performance
- Response time < 200ms for 95% of requests
- Support 100+ concurrent users

### Reliability
- 99.5% uptime
- Graceful error handling
- Data consistency

### Security
- Password hashing with bcrypt
- Input validation on all endpoints
- SQL injection prevention
- Rate limiting (optional)

### Maintainability
- Well-documented code
- Comprehensive tests (80%+ coverage)
- Clear API documentation

## Scope

Scope boundaries are what keep this capstone finishable and testable.

### In Scope
- User CRUD operations
- Book inventory management
- Reading lists
- Ratings and reviews
- API endpoints
- Unit tests
- Integration tests
- Basic CI/CD

### Out of Scope
- User authentication (JWT/OAuth) - simplified for this exercise
- Book recommendations algorithm
- Advanced search/filtering
- Front-end application
- Production deployment setup
- Advanced security features

Keep deferred features visible to avoid accidental scope creep.

## Tech Stack

### Language & Framework
- Go 1.21+
- net/http for HTTP server

### Database
- PostgreSQL for data storage

### Testing
- testing package for unit tests
- testcontainers-go for integration tests
- Pact for contract testing
- httptest for API testing

### CI/CD
- GitHub Actions

### Containerization
- Docker and Docker Compose

## API Overview

### Endpoints Summary

**Users**
- POST /users - Register
- GET /users/{id} - Get user
- PUT /users/{id} - Update user

**Books**
- GET /books - List books
- GET /books/{id} - Get book details
- POST /bookshelf - Add to bookshelf
- DELETE /bookshelf/{id} - Remove from bookshelf
- GET /bookshelf - Get user's bookshelf

**Reading Lists**
- POST /reading-lists - Create list
- GET /reading-lists - List user's lists
- POST /reading-lists/{id}/books - Add book
- DELETE /reading-lists/{id}/books/{bookId} - Remove book
- PATCH /reading-lists/{id}/books/{bookId} - Mark complete

**Reviews**
- POST /books/{id}/reviews - Create review
- GET /books/{id}/reviews - Get reviews
- PUT /reviews/{id} - Update review
- DELETE /reviews/{id} - Delete review

## Database Schema

```sql
-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Books
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    isbn VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bookshelf
CREATE TABLE bookshelf (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    book_id INT REFERENCES books(id),
    added_at TIMESTAMP DEFAULT NOW()
);

-- Reading Lists
CREATE TABLE reading_lists (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reading List Items
CREATE TABLE reading_list_items (
    id SERIAL PRIMARY KEY,
    reading_list_id INT REFERENCES reading_lists(id),
    book_id INT REFERENCES books(id),
    completed BOOLEAN DEFAULT FALSE,
    added_at TIMESTAMP DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    book_id INT REFERENCES books(id),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Success Criteria

Use this checklist as the project-level Definition of Done.

- [ ] All endpoints implemented
- [ ] 80%+ test coverage
- [ ] All tests passing
- [ ] CI/CD pipeline working
- [ ] Documentation complete
- [ ] No race conditions (pass `-race` tests)

## Project Structure

```
bookshelf-api/
├── cmd/
│   └── server/
│       └── main.go
├── pkg/
│   ├── domain/
│   ├── repository/
│   ├── service/
│   ├── handler/
│   ├── config/
│   └── middleware/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── contract/
│   └── fixtures/
├── go.mod
├── docker-compose.yml
├── Dockerfile
├── .github/workflows/
└── README.md
```

## Next Step

Proceed to [Domain and Data Model](domain-and-data-model.md)

## Assignment: Finalize Scope for Bookshelf v1

### Goal
Lock v1 scope so implementation and tests stay focused.

### Must Have (v1)

- Users: create and fetch
- Books: create and list
- Shelf entries: add and list
- Reviews: create and list
- Health endpoint

### Deferred (v2)

- Auth and RBAC
- Recommendation engine
- Full-text search
- Advanced analytics

### Done Criteria

- `docs/CAPSTONE_SCOPE.md` lists v1/v2 split.
- Acceptance criteria are testable and map to endpoints.

## Deep Dive: Scope Governance for Delivery Confidence

### Background

Most capstone delays come from scope creep. A clear v1 boundary protects timeline, test stability, and implementation quality.

### Governance model

1. Convert each functional requirement into testable acceptance criteria.
2. Tag every requirement as `v1 must-have` or `v2 deferred`.
3. Reject unplanned feature additions after scope freeze.
4. Track requirement-to-test mapping in a single checklist.

### SDET recommendation

For each v1 endpoint, define at least one success scenario and one failure scenario before coding.

## Common Anti-Patterns

- Defining requirements without measurable acceptance criteria.
- Mixing v1 and v2 features during implementation.
- Adding endpoints without updating scope and tests.
- Ignoring non-functional requirements until final week.

## Quick Scope Governance Checklist

- Is every v1 requirement testable?
- Is deferred scope explicitly documented?
- Are endpoint and acceptance mappings maintained?
- Are performance/reliability constraints represented in CI checks?
- Are scope changes reviewed before implementation?


