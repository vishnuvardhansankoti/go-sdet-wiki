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

#### REST API (HTTP/JSON)

REST is the most common synchronous pattern for service-to-service and client-to-service communication.

- **Protocol and format**: HTTP with JSON payloads.
- **Strengths**:
	- Easy to inspect and debug with common tools (`curl`, browser dev tools, Postman).
	- Human-readable payloads and broad ecosystem support.
	- Natural fit for public APIs and frontend/mobile integration.
- **Tradeoffs**:
	- JSON serialization can be slower and larger than binary protocols.
	- API contracts are often less strict unless you enforce OpenAPI/schema validation.
	- Can become chatty if endpoints are poorly designed.

How REST works in practice:

1. Clients call resource-oriented endpoints (`/users`, `/orders/{id}`, `/books/{id}/reviews`).
2. HTTP methods communicate intent (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
3. The server returns status codes and JSON payloads.
4. Clients interpret both payload and status code to decide behavior.
5. Caching, retries, auth, and rate limits are handled at HTTP/API gateway layers.

REST design principles that improve service quality:

- Use nouns for resources and keep URI structure consistent.
- Keep operations idempotent where expected (`GET`, `PUT`, `DELETE`).
- Return clear status codes (`200`, `201`, `204`, `400`, `404`, `409`, `500`).
- Standardize error payloads so consumers can handle failures predictably.
- Use pagination/filter/sort conventions for list endpoints.
- Version APIs deliberately (URI versioning or header-based versioning).

Operational guidance for microservices:

- Set client and server timeouts to prevent request pileups.
- Add retry with backoff only for safe/idempotent operations.
- Use correlation/request IDs for distributed tracing.
- Enforce schema validation at the edge (OpenAPI + runtime validation).
- Apply gateway controls: authentication, authorization, rate limiting, and quotas.

SDET testing focus for REST APIs:

1. Contract tests against OpenAPI schema (request + response validation).
2. Endpoint tests for status code correctness and stable error formats.
3. Integration tests for persistence side effects and transaction boundaries.
4. Non-functional checks for pagination, filtering, rate limiting, and idempotency.

Use REST when:

1. External clients (web, mobile, partners) consume the API.
2. Team interoperability and ease of debugging are priorities.
3. Throughput/latency requirements are moderate.
4. You need broad compatibility across many languages and tools.

Common use cases:

- API gateway to domain services.
- Public-facing CRUD APIs (catalog, user profile, order lookup).
- Admin/reporting endpoints where readability matters more than raw performance.

#### gRPC (HTTP/2 + Protobuf)

gRPC is a high-performance RPC framework with strongly typed contracts.

- **Protocol and format**: HTTP/2 with Protocol Buffers (binary).
- **Strengths**:
	- Faster serialization and smaller payloads than JSON in many workloads.
	- Strongly typed `.proto` contracts with generated client/server code.
	- Built-in support for unary and streaming communication.
	- Good fit for internal platforms where schema discipline is important.
- **Tradeoffs**:
	- Less human-readable on the wire; debugging usually needs specialized tooling.
	- Browser support is indirect (often requires gRPC-Web or gateway translation).
	- Requires schema management and code generation workflow.

How gRPC works in practice:

1. You define request/response messages and service methods in a `.proto` file.
2. Build tools generate server interfaces and typed clients for your language.
3. The server implements those generated interfaces.
4. Clients call remote methods as normal function calls.
5. gRPC serializes data with Protobuf and sends it over HTTP/2.

Compared to JSON APIs, this gives stricter contracts and efficient payloads, but also requires disciplined schema versioning.

RPC patterns supported by gRPC:

- **Unary RPC**: one request, one response (most CRUD-like operations).
- **Server streaming**: one request, many responses (log/telemetry feeds, progress updates).
- **Client streaming**: many requests, one response (batch upload/aggregation patterns).
- **Bidirectional streaming**: many-to-many stream (real-time collaboration or event pipelines).

Operational guidance for microservices:

- Always set **deadlines/timeouts** on calls to avoid hanging requests.
- Use retries carefully, and only for idempotent operations.
- Map failures to clear gRPC status codes (`InvalidArgument`, `NotFound`, `Unavailable`, `DeadlineExceeded`).
- Use interceptors/middleware for auth, logging, tracing, and metrics.
- Prefer mTLS for internal service-to-service traffic when required by security policy.

SDET testing focus for gRPC services:

1. Contract compatibility tests for `.proto` evolution.
2. Unit tests for status code mapping and validation behavior.
3. Integration tests with real gRPC server + dependencies (DB, queues, cache).
4. Streaming tests for backpressure, cancellation, and reconnect behavior.

Use gRPC when:

1. Low latency and high throughput are critical.
2. Internal service-to-service calls dominate traffic.
3. You need strict contracts and generated typed clients.
4. Streaming is needed (live updates, telemetry, event feed style pull).

Common use cases:

- High-volume internal calls between core services.
- Real-time or near real-time streaming (pricing, telemetry, notification fanout).
- Platform APIs shared by multiple backend teams with strict versioning.

#### REST vs gRPC: Practical Selection Guide

Choose **REST** if your priority is accessibility, broad client support, and operational simplicity.

Choose **gRPC** if your priority is efficient internal communication, strict contracts, and lower latency at scale.

In many real systems, both coexist:

- REST at the edge (client-facing APIs),
- gRPC inside the platform (service-to-service communication),
- plus an API gateway/BFF translating between them when needed.

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


## Quick Exercises (SDET Focus)

Try these exercises before moving to the next section.

### Exercise 1: Config + Health Validation

Goal: Verify service startup behavior under real config conditions.

1. Create two env profiles: valid and invalid (missing required key).
2. Start service and assert startup succeeds only for valid profile.
3. Call `/health` and assert status and response shape.
4. Add one negative test for malformed env value.

Stretch: Capture startup logs and assert a clear config error message.

### Exercise 2: API Contract Smoke for One Endpoint

Goal: Validate one endpoint end-to-end with deterministic assertions.

1. Pick one endpoint (for example create/list/get flow).
2. Write tests for success, validation error, and not-found path.
3. Assert status code, JSON schema shape, and key business fields.
4. Verify error payload stays stable across runs.

Stretch: Add idempotency or duplicate-request case.

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



## Next Step

Continue with [Project Folder Structure](project-folder-structure.md).
