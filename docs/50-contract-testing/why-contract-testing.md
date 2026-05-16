# Why Contract Testing?

## The Problem: Integration Testing at Scale

With many microservices, full end-to-end tests become:
- Slow and fragile
- Expensive to maintain
- Hard to debug failures
- Dependent on service availability

## What is Contract Testing?

Contract testing verifies that services can communicate correctly by validating the "contract" (expected API structure) between them.

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

## Benefits

- **Fast**: No need for full integration environments
- **Scalable**: Decouple service testing
- **Shift Left**: Find issues early
- **Documentation**: Contracts document APIs
- **Confidence**: Deploy independently

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
