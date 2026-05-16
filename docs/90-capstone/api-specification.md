# API Specification

The API specification is the canonical compatibility document for implementation, testing, and contract verification. If this page is precise, downstream development and CI diagnostics become significantly easier.

Treat API changes as governed changes with explicit review and test impact.

## Authentication

For simplicity, this capstone uses a UserID header. In production, use JWT.

Documenting this simplification avoids confusion between tutorial constraints and production expectations.

```
X-User-ID: 1
```

## Response Format

Consistent response envelopes are essential for consumer reliability and contract test stability.

### Success Response

```json
{
  "data": {},
  "error": null
}
```

### Error Response

```json
{
  "data": null,
  "error": {
    "code": "INVALID_INPUT",
    "message": "User not found",
    "details": {}
  }
}
```

## Error Codes

- `INVALID_INPUT` - 400 Bad Request
- `NOT_FOUND` - 404 Not Found
- `CONFLICT` - 409 Conflict
- `INTERNAL_ERROR` - 500 Internal Server Error

Map these codes consistently from domain/service errors to transport responses.

## Endpoints

Each endpoint section should define request schema, success response, and at least one representative failure.

### Users

#### Register User
```
POST /api/v1/users
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securepassword"
}

Response: 201 Created
{
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Get User
```
GET /api/v1/users/{id}
X-User-ID: 1

Response: 200 OK
{
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Books

#### List Books
```
GET /api/v1/books?limit=20&offset=0

Response: 200 OK
{
  "data": [
    {
      "id": 1,
      "title": "Go Programming",
      "author": "John Doe",
      "isbn": "1234567890"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

#### Get Book
```
GET /api/v1/books/{id}

Response: 200 OK
{
  "data": {
    "id": 1,
    "title": "Go Programming",
    "author": "John Doe",
    "isbn": "1234567890"
  }
}
```

### Bookshelf

#### Add Book to Bookshelf
```
POST /api/v1/bookshelf
X-User-ID: 1
Content-Type: application/json

{
  "book_id": 1
}

Response: 201 Created
{
  "data": {
    "id": 1,
    "user_id": 1,
    "book_id": 1,
    "added_at": "2024-01-01T00:00:00Z"
  }
}
```

#### List User's Books
```
GET /api/v1/bookshelf
X-User-ID: 1

Response: 200 OK
{
  "data": [
    {
      "id": 1,
      "title": "Go Programming",
      "author": "John Doe",
      "isbn": "1234567890",
      "added_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Remove Book from Bookshelf
```
DELETE /api/v1/bookshelf/{id}
X-User-ID: 1

Response: 204 No Content
```

### Reading Lists

#### Create Reading List
```
POST /api/v1/reading-lists
X-User-ID: 1
Content-Type: application/json

{
  "name": "To Read in 2024"
}

Response: 201 Created
{
  "data": {
    "id": 1,
    "user_id": 1,
    "name": "To Read in 2024",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### List User's Reading Lists
```
GET /api/v1/reading-lists
X-User-ID: 1

Response: 200 OK
{
  "data": [
    {
      "id": 1,
      "name": "To Read in 2024",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Add Book to Reading List
```
POST /api/v1/reading-lists/{id}/books
X-User-ID: 1
Content-Type: application/json

{
  "book_id": 1
}

Response: 201 Created
{
  "data": {
    "id": 1,
    "reading_list_id": 1,
    "book_id": 1,
    "completed": false,
    "added_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Mark Book Complete
```
PATCH /api/v1/reading-lists/{id}/books/{book_id}
X-User-ID: 1
Content-Type: application/json

{
  "completed": true
}

Response: 200 OK
{
  "data": {
    "completed": true
  }
}
```

#### Remove Book from Reading List
```
DELETE /api/v1/reading-lists/{id}/books/{book_id}
X-User-ID: 1

Response: 204 No Content
```

### Reviews

#### Create Review
```
POST /api/v1/books/{id}/reviews
X-User-ID: 1
Content-Type: application/json

{
  "rating": 5,
  "text": "Excellent book!"
}

Response: 201 Created
{
  "data": {
    "id": 1,
    "user_id": 1,
    "book_id": 1,
    "rating": 5,
    "text": "Excellent book!",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### List Reviews for Book
```
GET /api/v1/books/{id}/reviews

Response: 200 OK
{
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "rating": 5,
      "text": "Excellent book!",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Update Review
```
PUT /api/v1/reviews/{id}
X-User-ID: 1
Content-Type: application/json

{
  "rating": 4,
  "text": "Very good book"
}

Response: 200 OK
{
  "data": {
    "id": 1,
    "rating": 4,
    "text": "Very good book",
    "updated_at": "2024-01-02T00:00:00Z"
  }
}
```

#### Delete Review
```
DELETE /api/v1/reviews/{id}
X-User-ID: 1

Response: 204 No Content
```

## Status Codes

- 200 OK - Successful GET/PUT
- 201 Created - Successful POST (resource created)
- 204 No Content - Successful DELETE
- 400 Bad Request - Invalid input
- 404 Not Found - Resource not found
- 409 Conflict - Duplicate entry
- 500 Internal Server Error - Server error

## Validation Rules

Validation rules must match domain constructor and service-level checks exactly.

### User
- Email: Valid email format, unique
- Name: Non-empty, max 255 chars
- Password: Min 8 characters

### Book
- Title: Non-empty, max 255 chars
- Author: Max 255 chars
- ISBN: Valid ISBN format (optional)

### Review
- Rating: 1-5 inclusive
- Text: Max 5000 chars

## Next Step

Proceed to [Implementation Guide](implementation-guide.md)

## Assignment: Freeze Bookshelf API Contract

### Goal
Prepare a stable API contract for implementation and contract testing.

### Tasks

1. Confirm canonical prefix: `/api/v1`.
2. Ensure every endpoint has:
  - request schema
  - response schema
  - error schema
  - status codes
3. Align validation rules with domain constructors.
4. Add explicit examples for:
  - success
  - validation failure
  - not found

### Done Criteria

- API spec can be used directly by consumer and provider contract tests.
- Error code mapping is consistent across all endpoints.

## Deep Dive: API Contract Quality Controls

### Background

An API specification is executable documentation when it is consistent enough to drive tests, mocks, and provider verification without interpretation gaps.

### Contract quality checklist

1. Every endpoint defines request, success response, and error response.
2. Status codes align with domain error mapping.
3. Field names and casing are consistent across all examples.
4. Validation constraints are explicitly reflected in error examples.

### SDET recommendation

Treat spec diffs as high-risk changes: require review from both API implementers and test owners.

## Common Anti-Patterns

- Inconsistent response envelope fields across endpoints.
- Returning different error code semantics for similar failures.
- Updating implementation without reflecting spec examples.
- Omitting failure examples for validation and not-found scenarios.

## Quick API Contract Checklist

- Do all endpoints include success and error examples?
- Are status codes aligned with documented error codes?
- Are field names and casing consistent throughout?
- Are validation constraints reflected in error responses?
- Are spec changes reviewed by both provider and consumer sides?


