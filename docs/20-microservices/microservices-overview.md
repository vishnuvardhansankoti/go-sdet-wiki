# Microservices Overview

Microservices architecture breaks a system into smaller services that each own a focused business capability. This style is powerful, but it also introduces operational and testing complexity. Understanding both sides is essential before adopting it.

## What is a Microservice?

A microservice is a small, independently deployable service that performs a specific business capability.

Key idea: "small" is about business scope and ownership, not line count. A microservice should be understandable by a team, deployable on its own, and replaceable without rewriting the whole platform.

## Characteristics

Healthy microservices usually share these design traits:

- **Single Responsibility**: One reason to change
- **Independently Deployable**: Can deploy without affecting others
- **Loosely Coupled**: Minimal dependencies on other services
- **Highly Cohesive**: Related functionality grouped together

If a service depends heavily on internals of another service, the architecture may be distributed but not truly decoupled.

## Microservices vs Monolith

Both approaches can be valid. The right choice depends on team size, deployment maturity, and domain complexity.

- Monolith strengths: simpler operations, easier local debugging, fewer distributed failure modes.
- Microservice strengths: independent scaling/deployment, clearer ownership, isolated blast radius.

A practical path is often "modular monolith first, microservices later" when boundaries are proven.

## Communication Patterns

Services communicate either synchronously (request/response) or asynchronously (event/message driven).

### Synchronous
- REST APIs (HTTP)
- gRPC

Synchronous calls are easier to reason about but increase coupling at runtime. Downstream latency and failures directly affect upstream services.

### Asynchronous
- Message Queues (RabbitMQ, Kafka)
- Event Bus

Asynchronous messaging improves decoupling and resilience, but increases eventual consistency concerns and debugging complexity.

## Why Go for Microservices?

Go is a strong microservices language because it balances performance, simplicity, and operational friendliness.

- **Performance**: Low memory footprint
- **Concurrency**: Handles thousands of concurrent connections
- **Deployment**: Single binary
- **Standard Library**: Everything needed for HTTP/REST

In practice, this means faster startup, lower infrastructure overhead, and less runtime complexity for many backend workloads.

## Go Microservice Stack

A production-grade Go microservice usually combines runtime, persistence, observability, and quality tooling.

- **Framework**: net/http, Gin, Echo, or similar
- **Database**: PostgreSQL, MongoDB, Redis
- **Logging**: Structured logging with JSON output
- **Configuration**: Environment variables or config files
- **Observability**: Metrics, traces, logs
- **Testing**: Table-driven tests, mocking, integration tests

The stack should stay as small as possible early on. Add complexity only when system requirements justify it.

## Service Boundary Heuristics

Use these heuristics when deciding boundaries:

1. Group operations that change together.
2. Separate components with distinct scaling patterns.
3. Avoid splitting tightly coupled transactions too early.
4. Align boundaries with team ownership where possible.

Poor boundaries create constant cross-service chatter and fragile contracts.

## Deep Dive: Microservice Thinking for SDETs

### Background

Microservices are less about splitting code and more about splitting ownership, deployment, and failure boundaries. A service should be independently understandable, testable, and releasable.

For SDETs, this means validating both local correctness and cross-service behavior under partial failures, version changes, and latency variation.

### Domain Boundaries in Bookshelf

Potential service boundaries as the system grows:

1. User profile service
2. Catalog service (books)
3. Shelf service (user-book state)
4. Review service (ratings/comments)

You may keep these in one codebase initially, but design interfaces as if they could become separate services later.

This approach (designing seams early) reduces migration risk if future extraction is required.

### Tradeoffs

Benefits:
- Independent deployability
- Team autonomy
- Scalability by hotspot

Costs:
- More operational complexity
- Cross-service communication failures
- Versioning and contract management overhead

Make these tradeoffs explicit in architecture decisions instead of assuming microservices are always the default best choice.

### SDET Perspective

Microservice quality is multi-layered:

1. Unit tests for domain logic
2. Integration tests for persistence and boundaries
3. Contract tests for inter-service compatibility
4. End-to-end smoke tests for critical journeys

Each layer catches a different class of defect. Skipping contract tests in microservices often leads to integration breakages discovered too late.

### Practical Example

If `ShelfService` depends on `BookService` and `UserService`, failure in one dependency should produce deterministic error behavior. Define that behavior early and test it as a contract.

## Common Anti-Patterns

- Splitting services too early without clear domain boundaries.
- Shared database across services with hidden coupling.
- Chatty synchronous dependencies for simple workflows.
- Lack of versioned API contracts between services.
- Treating observability as an afterthought.

## Quick Architecture Checklist

- Is each service boundary tied to a clear business capability?
- Can each service be deployed independently?
- Are failure behaviors and retry rules documented?
- Are inter-service contracts tested in CI?
- Are logs, metrics, and traces sufficient for debugging?

