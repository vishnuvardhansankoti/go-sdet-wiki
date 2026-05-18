# Testing Reltio MDM with Go

This appendix provides a detailed, production-oriented approach to testing Reltio MDM integrations with Go. The goal is to help you build a test strategy that is fast enough for daily development, strong enough for release confidence, and stable enough to run in CI without flaky outcomes.

Most Reltio test failures in real projects come from one of four areas:

- Environment drift across tenants and configuration
- Inconsistent test data ownership and cleanup
- Mixing fast unit checks with slow external integration checks
- Weak assertions that only validate transport success, not MDM semantics

This guide addresses these directly with structure, examples, and repeatable patterns.

## What This Appendix Covers

You will find:

- A practical test pyramid for Reltio-backed systems
- Design guidance for a reusable Go Reltio client test harness
- Concrete examples for entity lifecycle, relation flow, search, and negative cases
- Retry and eventual consistency strategies that stay bounded and explicit
- CI profile design for pull requests, nightly runs, and release gates

## Why Go for Reltio MDM Testing

Go is a strong fit for integration-heavy test suites because it gives you:

- Fast test execution with built-in concurrency
- A simple standard testing package
- Good HTTP tooling for API-level assertions
- Easy packaging of test helpers for reuse across teams

Go also encourages small, composable helpers. That makes it easier to keep your tests readable while centralizing boilerplate like auth token acquisition, request tracing, fixture creation, and cleanup.

## Reltio Testing Principles

Use these principles to keep your suite maintainable:

1. Test behavior, not raw payload shape alone.
2. Make every external test environment-aware and profile-aware.
3. Treat test data as owned resources that must be cleaned.
4. Keep retries bounded and only where eventual consistency is expected.
5. Separate developer feedback loops from full system validation.

## Test Scope for Reltio

For Reltio-backed systems, split tests into layers:

1. Contract tests for your Reltio client wrapper
2. Integration tests against non-production Reltio tenants
3. End-to-end tests for business flows that depend on MDM entities

Use short-running tests in pull requests and full suites in scheduled or release pipelines.

Layer intent:

- Contract tests confirm your Go client serializes requests and maps responses correctly.
- Integration tests validate tenant configuration, permissions, and MDM behavior.
- End-to-end tests verify downstream system behavior using MDM data as the source of truth.

## Coverage Map for Reltio Integrations

For most teams, a good baseline coverage map includes:

- Entity create/read/update/delete behavior
- Relation create/read/delete and endpoint correctness
- Search/query discoverability for newly created data
- Error handling for schema, auth, and validation failures
- Idempotent cleanup for all created resources

Keep this map visible in your team docs and use it to decide what belongs in each test profile.

## Suggested Project Layout

```text
tests/
  reltio/
    client_test.go
    entities_test.go
    relations_test.go
    search_test.go
    testdata/
      sample_entity.json
pkg/
  reltio/
    client.go
    models.go
    errors.go
```

Keep request builders and response validation helpers in shared packages so test files stay focused on behavior.

Recommended additions:

- A dedicated fixture package for test payload factories
- A polling helper for consistency-sensitive reads
- A shared cleanup utility that handles not-found as success

## Minimal Client Surface to Test

A minimal Go client interface for tests might include:

```go
type Client interface {
    CreateEntity(ctx context.Context, req CreateEntityRequest) (Entity, error)
    GetEntity(ctx context.Context, uri string) (Entity, error)
    DeleteEntity(ctx context.Context, uri string) error

    CreateRelation(ctx context.Context, req CreateRelationRequest) (Relation, error)
    GetRelation(ctx context.Context, uri string) (Relation, error)
    DeleteRelation(ctx context.Context, uri string) error

    SearchEntities(ctx context.Context, filter string) ([]Entity, error)
}
```

Even if your real client is larger, this baseline clarifies the API surface your tests depend on.

## Configuration and Secrets

Store connection details in environment variables:

- RELTIO_BASE_URL
- RELTIO_TENANT
- RELTIO_CLIENT_ID
- RELTIO_CLIENT_SECRET
- RELTIO_TEST_PROFILE

Never hardcode credentials in tests. In CI, inject these values using secure secret stores.

Use a small guard to skip integration tests when environment variables are missing:

```go
func RequireReltioEnv(t *testing.T) {
    t.Helper()
    required := []string{
        "RELTIO_BASE_URL",
        "RELTIO_TENANT",
        "RELTIO_CLIENT_ID",
        "RELTIO_CLIENT_SECRET",
    }
    for _, k := range required {
        if os.Getenv(k) == "" {
            t.Skipf("missing required env: %s", k)
        }
    }
}
```

This avoids accidental failures for contributors running tests locally without tenant access.

## Minimal Go Client Test Example

```go
package reltio_test

import (
    "context"
    "testing"
    "time"

    "example.com/yourapp/pkg/reltio"
)

func TestCreateAndFetchEntity(t *testing.T) {
    t.Parallel()

    cfg := reltio.ConfigFromEnv()
    client, err := reltio.NewClient(cfg)
    if err != nil {
        t.Fatalf("new client: %v", err)
    }

    ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
    defer cancel()

    createReq := reltio.CreateEntityRequest{
        Type: "configuration/entityTypes/Person",
        Attributes: map[string]any{
            "FirstName": []map[string]string{{"value": "Test"}},
            "LastName":  []map[string]string{{"value": "User"}},
        },
    }

    entity, err := client.CreateEntity(ctx, createReq)
    if err != nil {
        t.Fatalf("create entity: %v", err)
    }

    got, err := client.GetEntity(ctx, entity.URI)
    if err != nil {
        t.Fatalf("get entity: %v", err)
    }

    if got.URI == "" {
        t.Fatalf("expected non-empty entity URI")
    }
}
```

This is a smoke-level entity lifecycle check. It is ideal for pull requests and quick validation after client changes.

## Expanded Example with Cleanup and Semantic Assertions

```go
func TestEntityLifecycle_WithCleanupAndFieldChecks(t *testing.T) {
    t.Parallel()
    RequireReltioEnv(t)

    cfg := reltio.ConfigFromEnv()
    client, err := reltio.NewClient(cfg)
    if err != nil {
        t.Fatalf("new client: %v", err)
    }

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    req := reltio.CreateEntityRequest{
        Type: "configuration/entityTypes/Person",
        Attributes: map[string]any{
            "FirstName": []map[string]string{{"value": "Integration"}},
            "LastName":  []map[string]string{{"value": "Test"}},
        },
    }

    created, err := client.CreateEntity(ctx, req)
    if err != nil {
        t.Fatalf("create entity: %v", err)
    }

    t.Cleanup(func() {
        _ = client.DeleteEntity(context.Background(), created.URI)
    })

    got, err := client.GetEntity(ctx, created.URI)
    if err != nil {
        t.Fatalf("get entity: %v", err)
    }

    if got.URI == "" {
        t.Fatalf("expected non-empty URI")
    }

    if got.Type != "configuration/entityTypes/Person" {
        t.Fatalf("unexpected type: %s", got.Type)
    }
}
```

The main improvement is semantic assertions plus deterministic cleanup.

## Testing Relations in Reltio

When validating relation flows:

1. Create source and target entities in setup
2. Create a relation between entities
3. Read relation and assert role/type fields
4. Clean up created data

Prefer unique test identifiers to avoid collisions between concurrent test runs.

For deeper relation scenarios, use the companion appendix:

- [Reltio Relation MDM Testing with Go](reltio-relation-mdm-testing.md)

## Search Validation Example

Search behavior is often where integration regressions appear first.

```go
func TestSearchFindsCreatedEntity(t *testing.T) {
    t.Parallel()
    RequireReltioEnv(t)

    cfg := reltio.ConfigFromEnv()
    client, err := reltio.NewClient(cfg)
    if err != nil {
        t.Fatalf("new client: %v", err)
    }

    ctx, cancel := context.WithTimeout(context.Background(), 40*time.Second)
    defer cancel()

    unique := fmt.Sprintf("go-sdet-%d", time.Now().UnixNano())
    created, err := client.CreateEntity(ctx, reltio.CreateEntityRequest{
        Type: "configuration/entityTypes/Person",
        Attributes: map[string]any{
            "LastName": []map[string]string{{"value": unique}},
        },
    })
    if err != nil {
        t.Fatalf("create entity: %v", err)
    }
    t.Cleanup(func() { _ = client.DeleteEntity(context.Background(), created.URI) })

    // Adjust filter syntax to your Reltio query style.
    result, err := client.SearchEntities(ctx, fmt.Sprintf("equals(LastName,'%s')", unique))
    if err != nil {
        t.Fatalf("search entities: %v", err)
    }

    if len(result) == 0 {
        t.Fatalf("expected at least one search result for %s", unique)
    }
}
```

If your tenant is eventually consistent for search, pair this with bounded polling.

## Bounded Retry Helper for Transient Failures

Keep retries explicit and narrow in scope:

```go
func Retry(max int, delay time.Duration, fn func() error) error {
    var last error
    for i := 0; i < max; i++ {
        if err := fn(); err == nil {
            return nil
        } else {
            last = err
        }
        time.Sleep(delay)
    }
    return fmt.Errorf("retry failed after %d attempts: %w", max, last)
}
```

Use this only for known transient cases such as temporary network instability or short consistency delays.

## Negative Test Example

```go
func TestCreateEntity_InvalidTypeReturnsError(t *testing.T) {
    t.Parallel()
    RequireReltioEnv(t)

    cfg := reltio.ConfigFromEnv()
    client, err := reltio.NewClient(cfg)
    if err != nil {
        t.Fatalf("new client: %v", err)
    }

    ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
    defer cancel()

    _, err = client.CreateEntity(ctx, reltio.CreateEntityRequest{
        Type: "configuration/entityTypes/NotReal",
    })
    if err == nil {
        t.Fatalf("expected create entity to fail for invalid type")
    }
}
```

Negative tests protect your client contract and permission boundaries.

## Reliable Test Data Strategy

- Generate deterministic test payloads from fixtures
- Use idempotent cleanup where possible
- Tag test-created records with a recognizable marker
- Keep one shared utility for retries on transient API errors

Reltio APIs can return transient failures under load. Add bounded retries with backoff for non-deterministic network issues.

Additional recommendations:

- Keep fixtures minimal and focused on test intent
- Do not reuse mutable shared entities across tests
- Record request IDs in logs to accelerate failure diagnosis
- Prefer one fixture factory per domain entity type

## Test Profile Design

Use explicit profiles controlled by environment variables or naming:

- Smoke: fast lifecycle checks and core assertions
- Full: expanded matrix with search, negative, and consistency scenarios
- Release: full suite in release-candidate tenant configuration

Profiles help you keep pull request feedback fast while preserving broader confidence before release.

## CI Pipeline Guidance

Use profiles consistently across both appendices:

- Smoke profile: smoke-level tests for pull requests
- Full profile: full relation and search scenarios on nightly runs
- Release profile: full suite against release-candidate tenant

Example commands:

```bash
go test ./... -short -run Reltio
go test ./tests/reltio -v -count=1
```

Optional profile-based commands:

```bash
RELTIO_TEST_PROFILE=smoke go test ./tests/reltio -run Reltio -count=1
RELTIO_TEST_PROFILE=full go test ./tests/reltio -run Reltio -count=1 -v
```

A typical CI flow:

1. Pull request: smoke profile
2. Nightly schedule: full profile
3. Pre-release: full profile against release-candidate tenant

## Common Pitfalls

- Mixing unit and external integration tests in the same package without tagging
- Running destructive tests against shared environments without cleanup
- Ignoring API rate limits and tenant throttling behavior
- Depending on mutable shared data instead of creating test-owned entities

Also avoid:

- Asserting only status codes without business field checks
- Adding global retries that hide true failures
- Treating flaky tests as normal instead of isolating root causes

## Troubleshooting Workflow

When a test fails intermittently, follow this order:

1. Validate tenant config and credentials used by the failing job.
2. Check whether failure is transport, auth, validation, or consistency-related.
3. Correlate request IDs and timestamps with platform logs.
4. Re-run only the failed scenario with verbose logging.
5. Decide whether to tighten assertions, setup, or retry boundaries.

This reduces guesswork and prevents overbroad fixes.

## Appendix Checklist

- Is every Reltio integration test environment-scoped?
- Are credentials sourced only from secure env variables?
- Are retries bounded and explicit?
- Is cleanup performed for created entities and relations?
- Are slow tests separated from pull request smoke tests?

## Summary

Effective Reltio testing in Go is built on three ideas:

- layered coverage,
- test-owned data with deterministic cleanup,
- and profile-based CI execution.

Start small with one smoke lifecycle test, then expand coverage with relation, search, and negative scenarios as your integration matures.

## Related Appendix

For relation-focused scenarios, see [Reltio Relation MDM Testing with Go](reltio-relation-mdm-testing.md).


## Next Step

Continue with [Reltio Relation MDM Testing with Go](reltio-relation-mdm-testing.md).
