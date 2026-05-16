# REST API Design

## Principles

### 1. Use HTTP Methods Correctly

- **GET**: Retrieve resources (safe, idempotent)
- **POST**: Create new resources
- **PUT**: Replace entire resource (idempotent)
- **PATCH**: Partial update
- **DELETE**: Remove resource (idempotent)

### 2. Resource-Based URLs

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

### 3. Status Codes

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

### 4. Request/Response Format

Use JSON for request and response bodies:

```json
{
  "id": 123,
  "name": "John",
  "email": "john@example.com"
}
```

### 5. Error Responses

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

## API Versioning

### URL Path
```
/api/v1/users
/api/v2/users
```

### Header
```
Accept: application/vnd.myapi.v2+json
```

## Pagination

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
