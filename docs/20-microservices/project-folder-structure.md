# Project Folder Structure

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

### cmd/
Entry points. Each subdirectory is an executable.

### pkg/
Reusable packages that can be imported by other projects.

### internal/
Private packages not meant for external use.

### tests/
Test files, fixtures, and test utilities.

## Common Patterns

### Domain Driven Design
```
pkg/
├── domain/           # Business entities
├── repository/       # Data access
├── service/          # Business logic
└── api/              # HTTP handlers
```

### Layered Architecture
```
cmd/          # Entry point
internal/
├── api/      # HTTP layer
├── service/  # Business logic
└── storage/  # Data layer
```

## Benefits

- Clear separation of concerns
- Easy to navigate
- Scalable structure
- Testable organization
