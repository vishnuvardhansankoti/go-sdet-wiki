# Introduction to Testcontainers

## What is Testcontainers?

Testcontainers is a library that provides lightweight, throwaway instances of common databases, message brokers, and other services. It uses Docker to spin up containers for testing.

## Why Use Testcontainers?

### Benefits

- **Real Services**: Test with actual database/service instead of mocks
- **Isolation**: Each test gets a fresh container
- **Reproducibility**: Containers ensure consistent test environments
- **Easy Setup**: No manual database setup needed
- **CI/CD Friendly**: Works in containers and local development

### When to Use

- Integration tests
- API end-to-end tests
- Testing database migrations
- Complex business logic requiring actual services

### When NOT to Use

- Unit tests (use mocks)
- Performance-critical tests (containers add overhead)
- Quick validation tests

## Common Use Cases

1. **Database Testing**: PostgreSQL, MySQL, MongoDB
2. **Message Brokers**: RabbitMQ, Kafka
3. **Cache Testing**: Redis, Memcached
4. **Search Engines**: Elasticsearch
5. **API Testing**: External service simulation

## Testcontainers for Go

The Go port of Testcontainers provides a clean API for managing containers in tests.

```bash
go get github.com/testcontainers/testcontainers-go
```

## Basic Workflow

1. Define container
2. Start container
3. Get connection details
4. Run tests
5. Container automatically cleaned up
