# Why Contract Testing?

Contract testing is a scaling strategy for service integration confidence. It reduces the need to run every consumer-provider combination in full end-to-end environments, while still validating API compatibility before release.

For SDETs, this means faster feedback loops and clearer ownership when integration behavior changes.

## The Problem: Integration Testing at Scale

With many microservices, full end-to-end tests become:
- Slow and fragile
- Expensive to maintain
- Hard to debug failures
- Dependent on service availability

As systems grow, integration drift often becomes a bigger risk than outright outages.

## What is Contract Testing?

Contract testing verifies that services can communicate correctly by validating the "contract" (expected API structure) between them.

In practice, it checks request paths, methods, status codes, and response shapes that consumers depend on.

## Types of Contracts

### Synchronous
- REST API contracts
- gRPC contracts

### Asynchronous
- Message contracts
- Event contracts

## Key Concepts

### Consumer Contract
What the consumer (client) expects from the provider (server).

```
Consumer says: "I expect GET /users/123 to return {id: 123, name: string}"
```

### Provider Contract
What the provider actually provides.

```
Provider says: "I provide GET /users/123 and return {id, name, email}"
```

## Consumer-Driven Contract Testing

1. **Consumer writes tests** defining what they expect
2. **Tests generate contracts** (expectations)
3. **Provider verifies** their API matches contracts
4. **CI runs contract verification** before deployment

This workflow allows independent teams to release safely without requiring synchronized deployments.

## Benefits

- **Fast**: No need for full integration environments
- **Scalable**: Decouple service testing
- **Shift Left**: Find issues early
- **Documentation**: Contracts document APIs
- **Confidence**: Deploy independently

Most importantly, failures point directly to compatibility mismatches, improving triage speed.

## Pact Workflow

```
Consumer Tests → Pact File (Contract) → Provider Verification
```

## Example: User Service Contract

### Consumer (Frontend) Expects:
```json
{
  "GET /api/users/123": {
    "status": 200,
    "body": {
      "id": 123,
      "name": "John"
    }
  }
}
```

### Provider (Backend) Must Provide:
- Endpoint: GET /api/users/123
- Returns 200 status
- Includes at least `id` and `name` fields

## When to Use Contract Testing

✓ Multiple independent services
✓ Frequent deployments
✓ Service teams are separate
✓ Want independent testing

✗ Monolithic applications
✗ Tightly coupled services
✗ Rare deployments

Use this section as a decision gate, not a rule carved in stone.


## Quick Exercises (SDET Focus)

Try these exercises before moving to the next section.

### Exercise 1: Consumer Contract for Error Cases

Goal: Capture both happy and failure behavior in the contract.

1. Define consumer expectations for one success response.
2. Add at least two error interactions (validation + not found).
3. Verify status code, headers, and payload fields.
4. Publish or store contract artifact.

Stretch: Add backward-compatible optional field and update expectations.

### Exercise 2: Provider Verification in CI Style

Goal: Ensure provider remains contract-compatible.

1. Load latest contract artifact in provider test stage.
2. Verify provider responses satisfy all interactions.
3. Fail verification on payload drift.
4. Print actionable mismatch diagnostics.

Stretch: Add branch-based contract version selection.

## Assignment: Define Bookshelf Contract Boundaries

### Goal
Model the Bookshelf app as producer and consumer services so contract testing has a concrete target.

### Scenario

- `bookshelf-api` is the provider for book and review endpoints.
- `reading-ui` (or a separate client package) is the consumer.

### Tasks

1. Document two consumer expectations:
  - `GET /api/books` returns an array with `id`, `title`, `author`, `isbn`, `publishedYear`.
  - `POST /api/users` returns `201` with a user payload containing `id` and `email`.
2. Add one negative contract expectation:
  - invalid `POST /api/users` returns `400` and an error response.
3. Create `docs/CONTRACT_SCOPE.md` with:
  - provider name
  - consumer name
  - initial endpoints covered

### Done Criteria

- Contract scope doc exists and is agreed by both sides.
- Endpoints chosen are stable and versioned for future changes.

## Deep Dive: Contracts as Change Safety Nets

### Why this matters

In distributed systems, many failures are not outages, but integration drift: one service changes a field, status code, or payload shape and silently breaks consumers. Contract tests catch this drift before release.

### What contract tests should validate

1. Resource path and method (`GET /api/books`).
2. Status code expectations (`200`, `201`, `400`, `404`).
3. Required response structure and key fields.
4. Error envelope shape for failure scenarios.

### What they should not over-constrain

- Internal provider implementation details.
- Optional fields the consumer does not use.
- Exact ordering unless contractually required.

### SDET guidance

Design each contract as a user-observable behavior, not as an implementation snapshot. This keeps contracts stable across refactoring.

## Common Anti-Patterns

- Writing contracts that mirror provider internals instead of consumer needs.
- Over-constraining optional fields and making contracts brittle.
- Skipping negative scenarios such as validation and not-found paths.
- Treating contracts as one-time setup and not evolving them with features.

## Quick Boundary Checklist

- Is each contract tied to a real consumer behavior?
- Are required fields/status codes clearly specified?
- Are optional fields modeled with flexibility?
- Are error responses covered for key workflows?
- Can both consumer and provider teams explain ownership?



## Next Step

Continue with [Pact Go Basics](pact-go-basics.md).
