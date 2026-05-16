# Introduction to Testcontainers

Testcontainers helps SDETs and backend engineers validate real infrastructure behavior without maintaining shared local databases. Instead of relying on long-lived test environments, each test run can create disposable dependencies on demand.

This section introduces not only what Testcontainers is, but how to use it strategically in a layered test pyramid.

## What is Testcontainers?

Testcontainers is a library that provides lightweight, throwaway instances of common databases, message brokers, and other services. It uses Docker to spin up containers for testing.

In practice, this means your integration tests run against real service implementations with realistic startup, networking, and protocol behavior.

## Why Use Testcontainers?

### Benefits

- **Real Services**: Test with actual database/service instead of mocks
- **Isolation**: Each test gets a fresh container
- **Reproducibility**: Containers ensure consistent test environments
- **Easy Setup**: No manual database setup needed
- **CI/CD Friendly**: Works in containers and local development

These benefits directly improve trust in test outcomes. When the service under test is real, false confidence from overly simplified mocks is reduced.

### When to Use

- Integration tests
- API end-to-end tests
- Testing database migrations
- Complex business logic requiring actual services

Use Testcontainers when correctness depends on behavior that fakes cannot faithfully model (SQL constraints, transactions, real serialization, connection lifecycle).

### When NOT to Use

- Unit tests (use mocks)
- Performance-critical tests (containers add overhead)
- Quick validation tests

If a behavior can be validated with a fast deterministic unit test, prefer unit scope first and reserve Testcontainers for integration risk.

## Common Use Cases

1. **Database Testing**: PostgreSQL, MySQL, MongoDB
2. **Message Brokers**: RabbitMQ, Kafka
3. **Cache Testing**: Redis, Memcached
4. **Search Engines**: Elasticsearch
5. **API Testing**: External service simulation

Prioritize use cases that represent production-like contracts and state transitions.

## Testcontainers for Go

The Go port of Testcontainers provides a clean API for managing containers in tests.

```bash
go get github.com/testcontainers/testcontainers-go
```

Start with core package plus only the modules your project actually needs.

## Basic Workflow

1. Define container
2. Start container
3. Get connection details
4. Run tests
5. Container automatically cleaned up

Treat this as a strict lifecycle. Flaky integration suites usually break because readiness checks, teardown, or state reset is inconsistent.

## Choosing the Right Test Layer

Use a simple decision model:

1. Unit test when logic is isolated and dependency behavior is irrelevant.
2. Integration test with Testcontainers when correctness depends on real dependency behavior.
3. End-to-end test when validating user-visible workflows across multiple boundaries.

This keeps total suite runtime reasonable while preserving confidence where it matters.

## Assignment: Introduce Bookshelf Integration Test Layer

### Goal
Add an integration testing layer that runs against real PostgreSQL containers.

This creates the bridge between fast unit checks and full API end-to-end tests.

### Tasks

1. Create `tests/integration/` directory.
2. Add `tests/integration/postgres_test_helper.go` with shared container setup.
3. Decide split:
	- Unit tests: `pkg/domain`, `pkg/handler` using fakes
	- Integration tests: repository + API with real Postgres

Document this split so contributors can place new tests in the correct layer without guesswork.

### Done Criteria

- Team can explain when to use unit vs integration tests
- Integration helper file exists and is reused

Also ensure local and CI usage instructions are discoverable in project docs.

## Deep Dive: Deterministic Integration Testing

### Background

Integration tests should validate real infrastructure behavior while remaining deterministic. Testcontainers gives you realistic dependencies without shared environment drift.

Determinism is the core quality property. Without it, integration suites become expensive and untrusted.

### Determinism Principles

1. Start from known schema state each run.
2. Avoid cross-test shared mutable data.
3. Set explicit wait strategies and timeouts.
4. Keep test setup code centralized in helpers.

Add one more principle:

5. Keep assertions business-focused, not only connectivity-focused.

### Unit vs Integration Rule of Thumb

- Unit tests: logic correctness in isolation.
- Integration tests: repository behavior, SQL constraints, transaction semantics, HTTP+DB wiring.

When in doubt, ask: does this behavior rely on database engine semantics? If yes, integration scope is usually justified.

### SDET Benefit

By running integration tests against real Postgres in both local and CI, you catch schema mismatches and SQL behavior differences early.

## Common Anti-Patterns

- Treating Testcontainers as replacement for all test layers.
- Sharing one container across unrelated tests without controlled state resets.
- Verifying only startup success but not data behavior.
- Ignoring teardown failures and leaving orphan resources.

## Quick Adoption Checklist

- Is the unit/integration boundary documented?
- Do integration helpers centralize setup and teardown?
- Are readiness checks and timeouts explicit?
- Are high-value repository and API paths covered first?
- Can the same tests run reliably in local and CI?


